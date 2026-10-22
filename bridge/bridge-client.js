/* Arena Live: local TikTok chat bridge. Loaded only by bridge/server.mjs. */
(() => {
  'use strict';
  const state = { socket: null, connected: false, controller: false, statusReceived: false, phase: 'disconnected', account: '@polkent.live', received: 0 };
  const panel = document.createElement('section');
  panel.id = 'arena-live-bridge-panel';
  panel.setAttribute('aria-label', 'TikTok LIVE — conexión local');
  panel.style.cssText = 'background:#0c1a2a;border:1px solid #2563eb;border-radius:12px;color:#e2e8f0;padding:12px;display:flex;flex-wrap:wrap;gap:9px;align-items:center;font:600 13px system-ui,sans-serif;margin-bottom:10px;';
  panel.innerHTML = `
    <span style="font-weight:800">TikTok LIVE</span>
    <span id="bridge-status" role="status" aria-live="polite">Conectando al puente local…</span>
    <button type="button" id="bridge-connect">Conectar LIVE</button>
    <button type="button" id="bridge-disconnect">Desconectar</button>
    <input id="bridge-test" maxlength="160" value="!guerrero" aria-label="Mensaje de prueba" style="background:#121d2c;color:white;border:1px solid #64748b;border-radius:5px;padding:5px;min-width:105px" />
    <button type="button" id="bridge-send-test">Probar comando</button>
    <small id="bridge-count" style="color:#a7b8c9">Mensajes recibidos: 0</small>`;
  const place = document.getElementById('audienceSimulatorPanel') || document.querySelector('main') || document.body;
  place.prepend(panel);
  panel.querySelectorAll('button').forEach(b => {
    b.style.cssText = 'background:#164e63;color:#effcff;padding:6px 9px;border:1px solid #0891b2;border-radius:6px;cursor:pointer;font:600 12px system-ui,sans-serif';
  });
  const indicator = panel.querySelector('#bridge-status');
  const count = panel.querySelector('#bridge-count');
  const buttonConnect = panel.querySelector('#bridge-connect');
  const buttonDisconnect = panel.querySelector('#bridge-disconnect');
  const buttonTest = panel.querySelector('#bridge-send-test');
  const inputTest = panel.querySelector('#bridge-test');

  function refresh(message = '') {
    const titles = { disconnected: 'LIVE desconectado', connecting: 'Conectando con TikTok…', connected: 'LIVE conectado', error: 'Error de conexión' };
    const duplicate = state.connected && state.statusReceived && !state.controller;
    indicator.textContent = message || (duplicate ? 'El juego está abierto en otra pestaña: esta no recibe el chat.' : (state.connected && !state.statusReceived ? 'Esperando estado del puente…' : titles[state.phase] || 'Puente desconectado'));
    buttonConnect.disabled = duplicate || !state.connected || !state.statusReceived || ['connected', 'connecting'].includes(state.phase);
    buttonDisconnect.disabled = duplicate || !state.connected || state.phase === 'disconnected';
    buttonTest.disabled = duplicate || !state.connected || !state.statusReceived;
    for (const b of [buttonConnect, buttonDisconnect, buttonTest]) b.style.opacity = b.disabled ? '.4' : '1';
    count.textContent = `Mensajes recibidos: ${state.received}`;
  }
  async function post(path, data = {}) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Error HTTP ${response.status}`);
    return result;
  }
  buttonConnect.addEventListener('click', async () => {
    try { await post('/api/connect'); refresh(`Intentando conectar con ${state.account}…`); }
    catch (error) { refresh(String(error.message || error)); }
  });
  buttonDisconnect.addEventListener('click', async () => {
    try { await post('/api/disconnect'); } catch (error) { refresh(String(error.message || error)); }
  });
  buttonTest.addEventListener('click', async () => {
    try {
      const r = await post('/api/test-chat', { username: 'arena_prueba', message: inputTest.value });
      if (!r.sent) refresh('Abre esta página como la ventana principal del juego.');
    } catch (error) { refresh(String(error.message || error)); }
  });
  function openSocket() {
    const socket = new WebSocket(`ws://${location.host}/ws`);
    state.socket = socket;
    socket.addEventListener('open', () => { state.connected = true; refresh(); });
    socket.addEventListener('message', e => {
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      if (data.type === 'status') {
        state.phase = data.phase;
        state.statusReceived = true;
        state.account = typeof data.account === 'string' ? data.account : state.account;
        state.controller = Boolean(data.isController);
        refresh(data.lastError ? `${data.phase}: ${data.lastError}` : '');
      } else if (data.type === 'chat' && state.controller && data.platformKey === 'tiktok') {
        if (typeof data.message !== 'string' || typeof data.username !== 'string') return;
        if (window.ArenaLive?.sendChat) {
          window.ArenaLive.sendChat({ username: data.username, platformKey: 'tiktok', message: data.message });
          state.received += 1;
          refresh();
        }
      }
    });
    socket.addEventListener('close', () => {
      if (state.socket !== socket) return;
      state.connected = false; state.controller = false; state.statusReceived = false;
      refresh('Puente local desconectado. Reintentando…');
      setTimeout(openSocket, 2500);
    });
    socket.addEventListener('error', () => { /* close event drives reconnection */ });
  }
  openSocket();
})();
