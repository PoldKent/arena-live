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
const TIKTOK_USERNAME = normalizeCreatorHandle(process.env.TIKTOK_USERNAME || 'polkent.live');
const ORIGIN = `http://${HOST}:${PORT}`;
const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
const connectedSockets = new Set();
let controller = null;
let connection = null;
let phase = 'disconnected';
let lastError = '';
let connectedSince = null;
const recentEventIds = new Map();

function snapshot() {
  return {
    type: 'status', phase, account: `@${TIKTOK_USERNAME}`, lastError, connectedSince,
    viewers: connectedSockets.size, controllerConnected: controller?.readyState === WebSocket.OPEN
  };
}
function push(ws, payload) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}
function updateStatus() {
  const message = snapshot();
  for (const ws of connectedSockets) push(ws, { ...message, isController: ws === controller });
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

async function connectLive() {
  if (connection || phase === 'connecting') return;
  phase = 'connecting'; lastError = ''; updateStatus();
  let live;
  try {
    const imported = await import('tiktok-live-connector');
    const LiveConnection = imported.TikTokLiveConnection || imported.default?.TikTokLiveConnection;
    if (!LiveConnection) throw new Error('La versión instalada del conector no expone TikTokLiveConnection.');
    live = new LiveConnection(TIKTOK_USERNAME);
    connection = live;
    live.on('chat', publishChat);
    live.on('disconnected', () => {
      if (connection !== live) return;
      connection = null; phase = 'disconnected'; connectedSince = null;
      lastError = 'Se interrumpió la conexión con TikTok.';
      updateStatus();
    });
    live.on('error', err => {
      if (connection !== live) return;
      lastError = String(err?.message || err).slice(0, 240);
      updateStatus();
    });
    await live.connect();
    if (connection !== live) return;
    phase = 'connected'; connectedSince = new Date().toISOString(); lastError = '';
    updateStatus();
  } catch (error) {
    if (live && connection !== live) return;
    connection = null; phase = 'error'; connectedSince = null;
    lastError = String(error?.message || error).slice(0, 240);
    updateStatus();
  }
}
async function disconnectLive() {
  const current = connection;
  connection = null;
  phase = 'disconnected'; lastError = ''; connectedSince = null;
  updateStatus();
  if (current) {
    try { await current.disconnect(); } catch { /* No active connection to close. */ }
  }
}

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
    if (req.method === 'GET' && pathname === '/bridge-client.js') {
      const script = await readFile(resolve(__dirname, 'bridge-client.js'), 'utf8');
      res.writeHead(200, { ...noCache, 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end(script);
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
  connectedSockets.add(ws);
  if (!controller || controller.readyState !== WebSocket.OPEN) controller = ws;
  updateStatus();
  ws.on('close', () => {
    connectedSockets.delete(ws);
    if (ws === controller) controller = [...connectedSockets].find(x => x.readyState === WebSocket.OPEN) || null;
    updateStatus();
  });
  // Intentionally no inbound game-control messages: all operations use local JSON POST endpoints.
});

server.listen(PORT, HOST, () => {
  console.log(`Arena Live: ${ORIGIN}`);
  console.log(`TikTok: @${TIKTOK_USERNAME} (desconectado hasta que pulses Conectar)`);
  console.log('El puente solo escucha en 127.0.0.1. No utiliza contraseña de TikTok.');
});

async function shutdown() {
  await disconnectLive();
  wss.close();
  server.close();
}
process.once('SIGTERM', () => { void shutdown(); });
process.once('SIGINT', () => { void shutdown(); });
