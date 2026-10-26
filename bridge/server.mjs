import {randomUUID} from 'node:crypto';
import {LiveSession} from './live-session.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { normalizeTikTokChat, normalizeCreatorHandle } from './chat-normalize.mjs';

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

function snapshot() {
  return {
    type: 'status', ...liveSession.status, account: `@${TIKTOK_USERNAME}`,
    viewers: connectedSockets.size, localWindows: connectedSockets.size, capabilities:{comments:true,socialEvents:false}, controllerConnected: controller?.readyState === WebSocket.OPEN,
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
function sendChat(payload) {
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
  sendChat(chat);
}

const liveSession=new LiveSession({
  async createConnection(){const imported=await import('tiktok-live-connector');const C=imported.TikTokLiveConnection||imported.default?.TikTokLiveConnection;if(!C)throw new Error('TikTokLiveConnection no disponible.');return new C(TIKTOK_USERNAME);},
  onChat:publishChat,onStatus:updateStatus
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
      return json(res, 200, { sent: sendChat(chat), chat });
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
