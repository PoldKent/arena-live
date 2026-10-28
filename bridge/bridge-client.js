/* Arena Live: local TikTok chat bridge. Loaded only by bridge/server.mjs. */
(() => {
  'use strict';
  const state = { socket: null, connected: false, controller: false, statusReceived: false, phase: 'disconnected', account: '@polkent.live', received: 0,sharesReceived:0,shareBoosts:0,followsReceived:0,giftsReceived:0,subscriptionsReceived:0,supportBoosts:0,liveAudience:null,membersSeen:0,tapsReceived:0,testTapsReceived:0,tapBoosts:0,tapJoins:0,unassignedTaps:0,droppedTaps:0,clientId:null,canClaimControl:false };
  const panel = document.createElement('section');
  panel.id = 'arena-live-bridge-panel';
  panel.setAttribute('aria-label', 'TikTok LIVE — conexión local');
  panel.style.cssText = 'background:#0c1a2a;border:1px solid #2563eb;border-radius:12px;color:#e2e8f0;padding:12px;display:flex;flex-wrap:wrap;gap:9px;align-items:center;font:600 13px system-ui,sans-serif;margin-bottom:10px;';
  panel.innerHTML = `
    <span style="font-weight:800">TikTok LIVE</span>
    <span id="bridge-status" role="status" aria-live="polite">Conectando al puente local…</span>
    <button type="button" id="bridge-connect">Conectar LIVE</button>
    <button type="button" id="bridge-disconnect">Desconectar</button>
    <button type="button" id="bridge-claim" hidden>Usar esta partida</button>
    <small>LIVE: 💬 chat · ❤️ taps · 🔄 compartir · ➕ seguir · 💎 regalos · ⭐ suscripciones · 👥 audiencia</small>
    <input id="bridge-test" maxlength="160" value="!guerrero" aria-label="Mensaje de prueba" style="background:#121d2c;color:white;border:1px solid #64748b;border-radius:5px;padding:5px;min-width:105px" />
    <button type="button" id="bridge-send-test">Probar comando</button>
    <button type="button" id="bridge-test-like">Probar 10 taps</button>
    <button type="button" id="bridge-test-share">Probar compartir</button>
    <button type="button" id="bridge-test-follow">Probar seguir</button>
    <button type="button" id="bridge-test-gift">Probar regalo</button>
    <button type="button" id="bridge-test-subscribe">Probar suscripción</button>
    <small id="bridge-count" style="color:#a7b8c9">Mensajes recibidos: 0</small>
    <small id="bridge-taps-count" style="color:#fda4af">❤️ Taps LIVE: 0 · entradas/reingresos: 0 · pruebas: 0 · mejoras: 0</small>
    <small id="bridge-shares-count" style="color:#93c5fd" aria-live="polite">🔁 Compartidos recibidos: 0 · boosts: 0</small>
    <small id="bridge-support-count" style="color:#a7f3d0" aria-live="polite">➕ Seguir: 0 · 💎 Regalos: 0 · ⭐ Suscripciones: 0 · boosts: 0</small>
    <small id="bridge-live-audience" style="color:#a6bcd0" aria-live="polite">👥 Espectadores LIVE: — · entradas a sala: 0</small>
    <small id="bridge-taps-note" style="color:#94a3b8" aria-live="polite"></small>`;
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
  const buttonTestLike = panel.querySelector('#bridge-test-like');
  const buttonTestShare = panel.querySelector('#bridge-test-share');
  const sharesCount = panel.querySelector('#bridge-shares-count');
  const supportCount=panel.querySelector('#bridge-support-count');
  const audienceCount=panel.querySelector('#bridge-live-audience');
  const socialButtons=['follow','gift','subscribe'].map(name=>[name,panel.querySelector('#bridge-test-'+name)]);
  const tapsCount = panel.querySelector('#bridge-taps-count');
  const tapsNote = panel.querySelector('#bridge-taps-note');
  const inputTest = panel.querySelector('#bridge-test');
  const buttonClaim=panel.querySelector('#bridge-claim');

  // TikTok sends individual LIKE batches (count), not one event per physical tap.
  // Merge short bursts by viewer, and limit visual/game effects to 12 per flush.
  // A tap joins in lobby or mid-fight, or re-enters a fallen viewer when permitted
  // by the game's active free, timed or lives rule. Further taps boost an alive fighter.
  const tapBatches = new Map();
  const TAP_FLUSH_MS = 800;
  const MAX_TAP_VIEWERS = 256;
  const MAX_TAP_EFFECTS_PER_FLUSH = 12;
  let tapFlushTimer = null;
  function updateTaps() {
    tapsCount.textContent = `❤️ Taps LIVE: ${state.tapsReceived.toLocaleString()} · entradas/reingresos: ${state.tapJoins.toLocaleString()} · pruebas: ${state.testTapsReceived.toLocaleString()} · mejoras: ${state.tapBoosts.toLocaleString()}`;
    const details = [];
    if (state.unassignedTaps) details.push(`Sin personaje activo: ${state.unassignedTaps.toLocaleString()} taps`);
    if (state.droppedTaps) details.push(`Exceso de espectadores: ${state.droppedTaps.toLocaleString()} taps no procesados`);
    if (tapBatches.size) details.push(`Ráfagas pendientes: ${tapBatches.size}`);
    tapsNote.textContent = details.join(' · ');
  }
  function scheduleTapFlush() {
    if (tapFlushTimer !== null) return;
    tapFlushTimer = setTimeout(() => { tapFlushTimer = null; flushTapBatches(); }, TAP_FLUSH_MS);
  }
  function flushTapBatches() {
    if (!state.connected || !state.controller) { tapBatches.clear(); updateTaps(); return; }
    const game = window.ArenaLive;
    let fighters = typeof game?.getFighters === 'function' ? game.getFighters() : [];
    // Read the roster once per flush. Refresh only following a successful join.
    const indexed = new Map(fighters.filter(f => f.platform === 'tiktok')
      .map(f => [String(f.name).toLocaleLowerCase(), f]));
    let applied = 0;
    for (const [identity, batch] of tapBatches) {
      if (applied >= MAX_TAP_EFFECTS_PER_FLUSH) break;
      tapBatches.delete(identity);
      let fighter = indexed.get(identity);
      if ((!fighter || !fighter.alive) && typeof game?.joinOnTap === 'function') {
        try {
          if (game.joinOnTap({ username: identity, platformKey: 'tiktok' })) {
            state.tapJoins++; // Includes legal re-entries; the game decides the rule.
            fighters = game.getFighters();
            fighter = fighters.find(f => f.platform === 'tiktok' && String(f.name).toLocaleLowerCase() === identity);
            if (fighter) indexed.set(identity, fighter);
          }
        } catch (error) {
          console.warn('Arena Live no pudo inscribir un espectador por tap:', error);
        }
      }
      if (!fighter?.alive || typeof game?.support !== 'function') {
        state.unassignedTaps += batch.received;
        continue;
      }
      try {
        if (game.support({ eventType: 'taps', targetId: fighter.id, tapCount: batch.count })) state.tapBoosts++;
      } catch (error) {
        console.warn('Arena Live no pudo aplicar taps:', error);
      }
      applied++;
    }
    if (tapBatches.size) scheduleTapFlush();
    updateTaps();
  }
  function recordTaps(data) {
    const amount = Number(data.count);
    if (typeof data.username !== 'string' || !Number.isSafeInteger(amount) || amount < 1 || amount > 10000) return;
    const identity = data.username.toLocaleLowerCase();
    if (!identity.startsWith('@')) return;
    if (data.source === 'test') state.testTapsReceived += amount;
    else state.tapsReceived += amount;
    const previous = tapBatches.get(identity);
    if (previous) {
      previous.count = Math.min(100, previous.count + amount);
      previous.received += amount;
    } else if (tapBatches.size < MAX_TAP_VIEWERS) {
      tapBatches.set(identity, { count: Math.min(100, amount), received: amount });
    } else {
      state.droppedTaps += amount;
    }
    updateTaps();
    if (tapBatches.size) scheduleTapFlush();
  }
  function clearTapBatches() {
    clearTimeout(tapFlushTimer);
    tapFlushTimer = null;
    tapBatches.clear();
  }

  // Dedicated, read-only TikTok LIVE mirror. Rate limits affect gameplay, not this inbox.
  // A 50,000-message memory guard protects long streams; export is available at any point.
  const incoming = ArenaCore.createHistory(50000);
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
      droppedHistory += 1;
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
    const states = {disconnected:'Desconectado',connecting:'Conectando…',reconnecting:'Reconectando…',connected:'LIVE conectado',error:'Error LIVE'};
    statusInbox.textContent = state.connected && state.controller ? states[state.phase] || states.disconnected : 'Sin recepción';
    statusInbox.style.color = state.phase === 'connected' && state.controller ? '#4ade80' : '#facc15';
  }
  updateInboxControls();
  updateLiveChatStatus();

  function refresh(message = '') {
    const titles = { disconnected: 'LIVE desconectado', connecting: 'Conectando con TikTok…', reconnecting:'Reconectando con TikTok…', connected: 'LIVE conectado', error: 'Error de conexión' };
    const duplicate = state.connected && state.statusReceived && !state.controller;
    buttonClaim.hidden=!(state.connected&&state.canClaimControl&&!state.controller);
    indicator.textContent = message || (state.connected&&state.canClaimControl&&!state.controller?'Elige Usar esta partida para recibir comentarios.':'') || (duplicate ? 'El juego está abierto en otra pestaña: esta no recibe el chat.' : (state.connected && !state.statusReceived ? 'Esperando estado del puente…' : titles[state.phase] || 'Puente desconectado'));
    buttonConnect.disabled = duplicate || !state.connected || !state.statusReceived || ['connected', 'connecting','reconnecting'].includes(state.phase);
    buttonDisconnect.disabled = duplicate || !state.connected || state.phase === 'disconnected';
    buttonTest.disabled = duplicate || !state.connected || !state.statusReceived;
    buttonTestLike.disabled = buttonTest.disabled;
    buttonTestShare.disabled = buttonTest.disabled;
    for(const [,button] of socialButtons)button.disabled=buttonTest.disabled;
    for (const b of [buttonConnect, buttonDisconnect, buttonTest, buttonTestLike, buttonTestShare,...socialButtons.map(([,button])=>button)]) b.style.opacity = b.disabled ? '.4' : '1';
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
  buttonTestLike.addEventListener('click', async () => {
    try {
      const r = await post('/api/test-like', { username: 'arena_prueba', count: 10 });
      if (!r.sent) refresh('Abre esta página como la ventana principal del juego.');
    } catch (error) { refresh(String(error.message || error)); }
  });
  buttonTestShare.addEventListener('click', async () => {
    try {
      const r=await post('/api/test-share',{username:'arena_prueba'});
      if(!r.sent)refresh('Abre esta página como la ventana principal del juego.');
    } catch(error){refresh(String(error.message||error));}
  });
  for(const [eventType,button] of socialButtons){
    button.addEventListener('click',async()=>{
      try {
        const response=await post('/api/test-social',{eventType,username:'arena_prueba'});
        if(!response.sent)refresh('Abre esta página como la ventana principal del juego.');
      }catch(error){refresh(String(error.message||error));}
    });
  }
  buttonClaim.addEventListener('click',async()=>{try{await post('/api/claim-control',{clientId:state.clientId});}catch(error){refresh(error.message);}});
  let reconnectTimer=null,reconnectAttempt=0,stopped=false;
  window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(reconnectTimer);clearTapBatches();state.socket?.close();});
  function openSocket() {
    if(stopped)return;
    const socket = new WebSocket(`ws://${location.host}/ws`);
    state.socket = socket;
    socket.addEventListener('open', () => { if(state.socket!==socket||stopped)return;reconnectAttempt=0;state.connected = true; refresh(); });
    socket.addEventListener('message', e => {
      if(state.socket!==socket||stopped)return;
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      if (data.type === 'status') {
        state.phase = data.phase;
        state.statusReceived = true;
        state.account = typeof data.account === 'string' ? data.account : state.account;
        state.controller = Boolean(data.isController);state.clientId=data.clientId;state.canClaimControl=Boolean(data.canClaimControl);
        if (!state.controller) clearTapBatches();
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
      } else if(data.type==='social'&&state.controller&&data.platformKey==='tiktok'&&data.eventType==='share') {
        // A real share heals and protects the sharing viewer's own fighter.
        // If they have not joined yet, normal admission/reentry rules apply.
        const username=String(data.username||'');
        const game=window.ArenaLive;
        state.sharesReceived++;
        const targetId=game?.joinOnShare?.({username,platformKey:'tiktok'});
        if(targetId!=null && game.support({eventType:'share',targetId}))state.shareBoosts++;
        sharesCount.textContent=`🔁 Compartidos recibidos: ${state.sharesReceived} · boosts: ${state.shareBoosts}`;
      } else if (data.type==='social' && state.controller && data.platformKey==='tiktok' &&
        ['follow','gift','subscribe'].includes(data.eventType)) {
        const kind=data.eventType;
        if(kind==='follow')state.followsReceived++;
        if(kind==='gift')state.giftsReceived++;
        if(kind==='subscribe')state.subscriptionsReceived++;
        const game=window.ArenaLive;
        // A real contribution belongs to its sender, not the selected test target.
        // Re-entry is still constrained by lives/time/capacity and victory.
        const targetId=game?.joinOnShare?.({username:String(data.username||''),platformKey:'tiktok'});
        if(targetId!=null&&game.support?.({eventType:kind,targetId}))state.supportBoosts++;
        supportCount.textContent=`➕ Seguir: ${state.followsReceived} · 💎 Regalos: ${state.giftsReceived} · ⭐ Suscripciones: ${state.subscriptionsReceived} · boosts: ${state.supportBoosts}`;
      } else if(data.type==='audience'&&state.controller&&data.platformKey==='tiktok') {
        if(data.eventType==='roomUser'&&Number.isSafeInteger(data.count)&&data.count>=0)state.liveAudience=data.count;
        if(data.eventType==='member'&&typeof data.username==='string')state.membersSeen++;
        audienceCount.textContent=`👥 Espectadores LIVE: ${state.liveAudience===null?'—':state.liveAudience.toLocaleString()} · entradas a sala: ${state.membersSeen.toLocaleString()}`;
      } else if (data.type === 'social' && state.controller && data.platformKey === 'tiktok' && data.eventType === 'taps') {
        recordTaps(data);
      }
    });
    socket.addEventListener('close', () => {
      if (state.socket !== socket||stopped) return;
      state.connected = false; state.controller = false; state.statusReceived = false;
      clearTapBatches();
      refresh('Puente local desconectado. Reintentando…');
      reconnectTimer=setTimeout(openSocket,Math.min(30000,1000*2**Math.min(reconnectAttempt++,5)));
    });
    socket.addEventListener('error', () => { /* close event drives reconnection */ });
  }
  openSocket();
})();

