import {randomUUID} from 'node:crypto';
import {LiveSession} from './live-session.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { normalizeTikTokChat, normalizeCreatorHandle } from './chat-normalize.mjs';
import { normalizeTikTokLike, normalizeTikTokShare, normalizeTikTokSupport, normalizeTikTokRoomUser, normalizeTikTokMember } from './social-normalize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const HOST = '127.0.0.1'; // Intentional: never expose game control endpoints to the LAN/Internet.
const PORT = Number(process.env.PORT || 4173);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('Puerto inválido.');
const { version: VERSION } = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
const TIKTOK_USERNAME = normalizeCreatorHandle(process.env.TIKTOK_USERNAME || 'polkent.live');
const ORIGIN = `http://${HOST}:${PORT}`;
const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
const connectedSockets = new Set();
let controller = null;
const recentEventIds = new Map();
const recentLikeIds = new Map();
const recentShareIds = new Map();
const recentSupportIds = new Map();
let liveViewerCount=null;

function snapshot() {
  return {
    type: 'status', ...liveSession.status, account: `@${TIKTOK_USERNAME}`,
    viewers: connectedSockets.size, localWindows: connectedSockets.size, liveViewerCount,
    capabilities:{comments:true,socialEvents:true,taps:true,shares:true,follows:true,gifts:true,subscriptions:true,audience:true}, controllerConnected: controller?.readyState === WebSocket.OPEN,
    version: VERSION
  };
}
function push(ws, payload) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}
function updateStatus() {
  const message = snapshot();
  for (const ws of connectedSockets) push(ws, { ...message, isController: ws === controller,clientId:ws.clientId,canClaimControl:!controller });
}
function sendToController(payload) {
  if (controller?.readyState !== WebSocket.OPEN) return false;
  // Preserve all chat routing / throttles in the game itself: do not call support().
  push(controller, payload);
  return true;
}
function publishChat(event) {
  const chat = normalizeTikTokChat(event);
  if (!chat) return;
  if (chat.eventId) {
    if (recentEventIds.has(chat.eventId)) return;
    recentEventIds.set(chat.eventId, Date.now());
    if (recentEventIds.size > 3000) {
      for (const [key, time] of recentEventIds) {
        if (Date.now() - time > 120_000 || recentEventIds.size > 2500) recentEventIds.delete(key);
        else break;
      }
    }
  }
  sendToController(chat);
}
function publishShare(event) {
  const share=normalizeTikTokShare(event);
  if(!share)return;
  if(share.eventId) {
    if(recentShareIds.has(share.eventId))return;
    recentShareIds.set(share.eventId,Date.now());
    if(recentShareIds.size>2000)for(const [key,time] of recentShareIds) {
      if(Date.now()-time>120000||recentShareIds.size>1500)recentShareIds.delete(key);
      else break;
    }
  }
  sendToController(share);
}
function publishTikTokSupport(kind,event){
  const social=normalizeTikTokSupport(kind,event);
  if(!social)return;
  // No repeat for the same event. Event IDs are scoped by type; guard memory.
  const key=social.eventId?kind+':'+social.eventId:'';
  if(key){
    if(recentSupportIds.has(key))return;
    recentSupportIds.set(key,Date.now());
    if(recentSupportIds.size>2000)for(const [id,time] of recentSupportIds){
      if(Date.now()-time>120000||recentSupportIds.size>1500)recentSupportIds.delete(id);
      else break;
    }
  }
  sendToController(social);
}
function publishRoomUser(event){
  const value=normalizeTikTokRoomUser(event);
  if(!value)return;
  liveViewerCount=value.count;
  sendToController(value);
}
function publishMember(event){
  const value=normalizeTikTokMember(event);
  if(value)sendToController(value); // Informational; joining still requires a tap.
}
function publishLike(event) {
  const like = normalizeTikTokLike(event);
  if (!like) return;
  if (like.eventId) {
    if (recentLikeIds.has(like.eventId)) return;
    recentLikeIds.set(like.eventId, Date.now());
    if (recentLikeIds.size > 2000) {
      for (const [key, timestamp] of recentLikeIds) {
        if (Date.now() - timestamp > 120000 || recentLikeIds.size > 1500) recentLikeIds.delete(key);
        else break;
      }
    }
  }
  sendToController(like);
}

const liveSession=new LiveSession({
  async createConnection(){
    const imported=await import('tiktok-live-connector');
    const C=imported.TikTokLiveConnection||imported.default?.TikTokLiveConnection;
    if(!C)throw new Error('TikTokLiveConnection no disponible.');
    // 2.5.0 requires an options object; skip historical chat during reconnections.
    return new C(TIKTOK_USERNAME,{processInitialData:false});
  },
  onChat:publishChat,onLike:publishLike,onShare:publishShare,
  onSupport:publishTikTokSupport,onRoomUser:publishRoomUser,onMember:publishMember,onStatus:updateStatus
});
const connectLive=()=>liveSession.connect();
const disconnectLive=()=>liveSession.disconnect();

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': ORIGIN
  });
  res.end(JSON.stringify(body));
}
function isLocalOrigin(req) {
  const rawHost = req.headers.host || '';
  const origin = req.headers.origin;
  return rawHost === `${HOST}:${PORT}` && (!origin || origin === ORIGIN);
}
async function requestBody(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new Error('Content-Type debe ser application/json');
  let text = '';
  for await (const part of req) {
    text += part;
    if (text.length > 4096) throw new Error('Mensaje demasiado largo.');
  }
  return JSON.parse(text || '{}');
}
const noCache = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const server = createServer(async (req, res) => {
  if (!isLocalOrigin(req)) return json(res, 403, { error: 'Acceso no permitido.' });
  const pathname = new URL(req.url || '/', ORIGIN).pathname;
  try {
    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const html = await readFile(resolve(ROOT, 'index.html'), 'utf8');
      const injected = html.replace(/<\/body>\s*<\/html>\s*$/i,
        '<script src="/bridge-client.js" defer></script>\n</body>\n</html>');
      res.writeHead(200, { ...noCache, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(injected);
      return;
    }
    if(req.method==='GET'&&['/engine/arena-core.js','/engine/arena-render.js','/engine/arena-audio.js','/engine/arena-settings.js','/engine/arena-balance-evidence.js'].includes(pathname)){res.writeHead(200,{...noCache,'Content-Type':'text/javascript; charset=utf-8'});res.end(await readFile(resolve(ROOT,pathname.slice(1))));return;}
    if (req.method === 'GET' && pathname === '/bridge-client.js') {
      const script = await readFile(resolve(__dirname, 'bridge-client.js'), 'utf8');
      res.writeHead(200, { ...noCache, 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end(script);
      return;
    }
    if (req.method === 'GET' && pathname === '/styles/arena-ui.css') {
      const css = await readFile(resolve(ROOT, 'styles/arena-ui.css'));
      res.writeHead(200, { ...noCache, 'Content-Type': 'text/css; charset=utf-8' });
      res.end(css);
      return;
    }
    if (req.method === 'GET' && pathname === '/api/status') return json(res, 200, snapshot());
    if (req.method === 'POST' && pathname === '/api/connect') {
      void connectLive();
      return json(res, 202, { status: 'connecting' });
    }
    if (req.method === 'POST' && pathname === '/api/disconnect') {
      void disconnectLive();
      return json(res, 200, { status: 'disconnected' });
    }
    if(req.method==='POST'&&pathname==='/api/claim-control'){
      const {clientId}=await requestBody(req);const client=[...connectedSockets].find(ws=>ws.clientId===clientId&&ws.readyState===WebSocket.OPEN);
      if(!client)return json(res,400,{error:'Ventana no disponible.'});
      if(controller&&controller!==client)return json(res,409,{error:'Otra ventana recibe el chat.'});
      controller=client;updateStatus();return json(res,200,{claimed:true});
    }
    if (req.method === 'POST' && pathname === '/api/test-chat') {
      if (process.env.NODE_ENV === 'production') return json(res, 403, { error: 'Prueba desactivada.' });
      const body = await requestBody(req);
      const chat = normalizeTikTokChat({ uniqueId: body.username || 'arena_prueba', comment: body.message || '!guerrero' });
      if (!chat) return json(res, 400, { error: 'Nombre o mensaje inválido.' });
      return json(res, 200, { sent: sendToController(chat), chat });
    }
    if(req.method==='POST'&&pathname==='/api/test-share'){
      if(process.env.NODE_ENV==='production')return json(res,403,{error:'Prueba desactivada.'});
      const body=await requestBody(req);
      const share=normalizeTikTokShare({user:{displayId:body.username||'arena_prueba'}});
      if(!share)return json(res,400,{error:'Usuario inválido.'});
      return json(res,200,{sent:sendToController({...share,source:'test'})});
    }
    if(req.method==='POST'&&pathname==='/api/test-social'){
      if(process.env.NODE_ENV==='production')return json(res,403,{error:'Prueba desactivada.'});
      const body=await requestBody(req);
      const type=String(body.eventType||'');
      if(!['follow','gift','subscribe'].includes(type))return json(res,400,{error:'Interacción no admitida.'});
      const social=normalizeTikTokSupport(type,{
        user:{displayId:body.username||'arena_prueba'},giftName:'Regalo de prueba',
        repeatCount:1,repeatEnd:true
      });
      if(!social)return json(res,400,{error:'Usuario inválido.'});
      return json(res,200,{sent:sendToController({...social,source:'test'})});
    }
    if (req.method === 'POST' && pathname === '/api/test-like') {
      if (process.env.NODE_ENV === 'production') return json(res, 403, { error: 'Prueba desactivada.' });
      const body = await requestBody(req);
      const like = normalizeTikTokLike({ user: { displayId: body.username || 'arena_prueba' }, count: body.count ?? 10 });
      if (!like) return json(res, 400, { error: 'Usuario o cantidad de taps inválida.' });
      return json(res, 200, { sent: sendToController({ ...like, source: 'test' }) });
    }
    json(res, 404, { error: 'Ruta inexistente.' });
  } catch (e) { json(res, 400, { error: String(e?.message || e).slice(0, 200) }); }
});

server.on('upgrade', (req, socket, head) => {
  if (!isLocalOrigin(req) || new URL(req.url || '/', ORIGIN).pathname !== '/ws') {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});
wss.on('connection', ws => {
  ws.clientId=randomUUID();ws.isAlive=true;ws.on('pong',()=>{ws.isAlive=true;});
  connectedSockets.add(ws);
  if (!controller || controller.readyState !== WebSocket.OPEN) controller = ws;
  updateStatus();
  ws.on('close', () => {
    connectedSockets.delete(ws);
    if (ws === controller) controller = null;
    updateStatus();
  });
  // Intentionally no inbound game-control messages: all operations use local JSON POST endpoints.
});

server.listen(PORT, HOST, () => {
  console.log(`Arena Live: ${ORIGIN}`);
  console.log(`Versión ${VERSION} · TikTok y equilibrio integrados`);
  console.log(`TikTok: @${TIKTOK_USERNAME} (desconectado hasta que pulses Conectar)`);
  console.log('El puente solo escucha en 127.0.0.1. No utiliza contraseña de TikTok.');
});

const heartbeat=setInterval(()=>{for(const ws of connectedSockets){if(!ws.isAlive){ws.terminate();continue;}ws.isAlive=false;ws.ping();}},30000);heartbeat.unref();
let stopping=false;
async function shutdown() {
  if(stopping)return;stopping=true;clearInterval(heartbeat);
  for(const ws of connectedSockets)ws.close(1001,'Servidor detenido');
  const deadline=setTimeout(()=>{server.closeAllConnections();for(const ws of connectedSockets)ws.terminate();},1000);deadline.unref();
  await Promise.allSettled([disconnectLive(),new Promise(r=>wss.close(r)),new Promise(r=>server.close(r))]);
  clearTimeout(deadline);if(process.env.NODE_ENV==='test'&&process.connected)process.disconnect();
}
process.once('SIGTERM', () => { void shutdown(); });
process.once('SIGINT', () => { void shutdown(); });
if(process.env.NODE_ENV==='test'&&process.send)process.on('message',message=>{if(message==='arena-test-shutdown')void shutdown();});
