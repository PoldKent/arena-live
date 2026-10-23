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
  const place = document.getElementById('arenaBridgeMount') || document.getElementById('audienceSimulatorPanel') || document.querySelector('main') || document.body;
  document.getElementById('arenaBridgeUnavailable')?.remove();
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

  // Dedicated, read-only TikTok LIVE mirror. Rate limits affect gameplay, not this inbox.
  // A 50,000-message memory guard protects long streams; export is available at any point.
  const incoming = [];
  const MAX_INCOMING_HISTORY = 50000;
  const LIVE_WINDOW = 450;
  const HISTORY_PAGE = 250;
  let droppedHistory = 0;
  let followLive = true;
  let browseEnd = 0;
  const inbox = document.getElementById('arenaTikTokChatFeed');
  const countInbox = document.getElementById('arenaTikTokChatCount');
  const statusInbox = document.getElementById('arenaTikTokChatStatus');
  const buttonOlder = document.getElementById('arenaTikTokChatOlder');
  const buttonLatest = document.getElementById('arenaTikTokChatLatest');
  const buttonExport = document.getElementById('arenaTikTokChatExport');
  let inboxRefreshFrame = 0;
  function scheduleInboxRefresh() {
    if (inboxRefreshFrame) return;
    inboxRefreshFrame = requestAnimationFrame(() => {
      inboxRefreshFrame = 0;
      if (inbox && followLive) inbox.scrollTop = inbox.scrollHeight;
      updateInboxControls();
      count.textContent = `Mensajes recibidos: ${state.received}`;
    });
  }

  function chatRow(entry) {
    const line = document.createElement('div');
    line.className = 'arena-tiktok-chat-line' + (/^\s*!/.test(entry.message) ? ' is-command' : '');
    const when = document.createElement('time');
    when.textContent = entry.when;
    const name = document.createElement('strong');
    name.textContent = entry.username;
    const body = document.createElement('span');
    body.textContent = entry.message;
    line.append(when, name, body);
    return line;
  }
  function updateInboxControls() {
    if (!inbox) return;
    const visible = inbox.querySelectorAll('.arena-tiktok-chat-line').length;
    const total = incoming.length + droppedHistory;
    countInbox.textContent = `${total.toLocaleString()} recibidos · ${visible} visibles${droppedHistory ? ` · ${droppedHistory} fuera de memoria` : ''}`;
    buttonOlder.disabled = incoming.length === 0 || (followLive ? incoming.length <= LIVE_WINDOW : browseEnd <= HISTORY_PAGE);
    buttonLatest.disabled = followLive;
  }
  function renderInbox(endIndex, follow = false) {
    if (!inbox) return;
    followLive = follow;
    browseEnd = Math.max(0, Math.min(incoming.length, endIndex));
    const start = Math.max(0, browseEnd - LIVE_WINDOW);
    const fragment = document.createDocumentFragment();
    incoming.slice(start, browseEnd).forEach(entry => fragment.appendChild(chatRow(entry)));
    inbox.replaceChildren(fragment);
    if (followLive) inbox.scrollTop = inbox.scrollHeight;
    else inbox.scrollTop = 0;
    updateInboxControls();
  }
  function recordIncomingChat(data) {
    const entry = {
      when: new Date().toLocaleTimeString(),
      username: String(data.username).slice(0, 100),
      message: String(data.message).slice(0, 500)
    };
    if (incoming.length >= MAX_INCOMING_HISTORY) {
      incoming.shift(); droppedHistory += 1;
      if (!followLive) browseEnd = Math.max(0, browseEnd - 1);
    }
    incoming.push(entry);
    if (!inbox) return;
    // New arrivals always return to live, as selected in the workspace survey.
    if (!followLive) { renderInbox(incoming.length, true); return; }
    const placeholder = document.getElementById('arenaTikTokChatEmpty');
    if (placeholder) placeholder.remove();
    inbox.appendChild(chatRow(entry));
    while (inbox.children.length > LIVE_WINDOW) inbox.removeChild(inbox.firstChild);
    browseEnd = incoming.length;
    // Appends stay immediate; scroll/layout and counters run once per frame even
    // when many comments arrive together. Gameplay still receives every event.
    scheduleInboxRefresh();
  }
  buttonOlder?.addEventListener('click', () => {
    const end = followLive ? Math.max(1, incoming.length - LIVE_WINDOW) : Math.max(1, browseEnd - HISTORY_PAGE);
    renderInbox(end, false);
  });
  buttonLatest?.addEventListener('click', () => renderInbox(incoming.length, true));
  buttonExport?.addEventListener('click', () => {
    const header = `Arena Live · TikTok @${state.account.replace(/^@/, '')}\nMensajes recibidos en esta sesión: ${incoming.length + droppedHistory}\n` +
      (droppedHistory ? `Primeros ${droppedHistory} mensajes ya no están en memoria.\n` : '');
    const data = header + incoming.map(({when,username,message}) => `[${when}] ${username}: ${message.replace(/[\r\n]+/g, ' ')}`).join('\n');
    const url = URL.createObjectURL(new Blob([data], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = `arena-live-tiktok-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
  function updateLiveChatStatus() {
    if (!statusInbox) return;
    const states = {disconnected:'Desconectado',connecting:'Conectando…',connected:'LIVE conectado',error:'Error LIVE'};
    statusInbox.textContent = state.connected && state.controller ? states[state.phase] || states.disconnected : 'Sin recepción';
    statusInbox.style.color = state.phase === 'connected' && state.controller ? '#4ade80' : '#facc15';
  }
  updateInboxControls();
  updateLiveChatStatus();

  function refresh(message = '') {
    const titles = { disconnected: 'LIVE desconectado', connecting: 'Conectando con TikTok…', connected: 'LIVE conectado', error: 'Error de conexión' };
    const duplicate = state.connected && state.statusReceived && !state.controller;
    indicator.textContent = message || (duplicate ? 'El juego está abierto en otra pestaña: esta no recibe el chat.' : (state.connected && !state.statusReceived ? 'Esperando estado del puente…' : titles[state.phase] || 'Puente desconectado'));
    buttonConnect.disabled = duplicate || !state.connected || !state.statusReceived || ['connected', 'connecting'].includes(state.phase);
    buttonDisconnect.disabled = duplicate || !state.connected || state.phase === 'disconnected';
    buttonTest.disabled = duplicate || !state.connected || !state.statusReceived;
    for (const b of [buttonConnect, buttonDisconnect, buttonTest]) b.style.opacity = b.disabled ? '.4' : '1';
    count.textContent = `Mensajes recibidos: ${state.received}`;
    updateLiveChatStatus();
    window.dispatchEvent(new CustomEvent('arena-bridge-status', {detail: {
      phase: state.phase, message: indicator.textContent,
      canConnect: !buttonConnect.disabled, canDisconnect: !buttonDisconnect.disabled
    }}));
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
        // Show EVERY event delivered by the bridge, even if gameplay later rate-limits it.
        recordIncomingChat(data);
        state.received += 1;
        if (window.ArenaLive?.sendChat) {
          window.ArenaLive.sendChat({ username: data.username, platformKey: 'tiktok', message: data.message });
        }
        // Connection state did not change. Rebuilding/distributing toolbar state
        // per comment used to flood the DOM/localization observer during bursts.
        scheduleInboxRefresh();
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

