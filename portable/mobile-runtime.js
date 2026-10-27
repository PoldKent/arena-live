// Loaded inline after the unchanged classic engine, before its load bootstrap.
// This adapter changes presentation and test setup, never combat decisions.
const ARENA_PORTABLE_KEY='arenaLivePortableV1';
let arenaPortableSuspended=false,arenaPortableSetupOpen=false;
let arenaPortableProfile={resolution:720,count:32,classKey:'kame',join:true};
try {
    const saved=JSON.parse(localStorage.getItem(ARENA_PORTABLE_KEY)||'null');
    if([540,720,1080].includes(saved?.resolution))arenaPortableProfile.resolution=saved.resolution;
    if([2,4,9,32,64,128].includes(saved?.count))arenaPortableProfile.count=saved.count;
    if(Object.hasOwn(CLASS_COMMANDS,saved?.classKey||''))arenaPortableProfile.classKey=saved.classKey;
    if(typeof saved?.join==='boolean')arenaPortableProfile.join=saved.join;
}catch(_){/* The game also runs when file storage is unavailable. */}
function arenaMobileRuntimeDefaults(saved) {
    if(!saved||typeof saved!=='object'||Array.isArray(saved)){
        arenaRuntime={...arenaRuntime,quality:'performance',renderFps:30};
    }
}
function arenaPortableRemember(){try{localStorage.setItem(ARENA_PORTABLE_KEY,JSON.stringify(arenaPortableProfile));}catch(_){}}
function arenaMobileSyncCaptures(draw16,draw9) {
    const short=arenaPortableProfile.resolution,long=short*16/9;
    for(const [canvas,ctx,w,h]of [[canvas16,ctx16,draw16?long:1,draw16?short:1],[canvas9,ctx9,draw9?short:1,draw9?long:1]]){
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;arenaBackgroundCache.delete(ctx);}
    }
}
function arenaPortableResolution(value) {
    const parsed=Number(value);if(![540,720,1080].includes(parsed))return false;
    arenaPortableProfile.resolution=parsed;arenaPortableRemember();
    renderBothScreensSimultaneously();return true;
}
function arenaPortableClose() {
    const dialog=document.getElementById('arenaPortableSetup');if(!dialog)return;
    dialog.hidden=true;arenaPortableSetupOpen=false;isGamePaused=false;
    previousFrameTime=null;simulationAccumulator=0;arenaLastRenderTime=null;
    updateTouchControlsVisibility();document.getElementById('arenaMobileMoreBtn')?.focus({preventScroll:true});
}
function arenaPortableOpen() {
    const dialog=document.getElementById('arenaPortableSetup');if(!dialog)return;
    if(isSettingsOpen)toggleSettingsModal(false);
    closeArenaOperatorPopover(false);
    document.getElementById('arenaPortableCount').value=String(arenaPortableProfile.count);
    document.getElementById('arenaPortableClass').value=arenaPortableProfile.classKey;
    document.getElementById('arenaPortableResolution').value=String(arenaPortableProfile.resolution);
    document.getElementById('arenaPortableFps').value=String(arenaRuntime.renderFps);
    document.getElementById('arenaPortableJoin').checked=arenaPortableProfile.join;
    document.getElementById('arenaPortableClass').disabled=!arenaPortableProfile.join||arenaCombatRules.classRule!=='any';
    if(arenaCombatRules.classRule!=='any')document.getElementById('arenaPortableClass').value=arenaCombatRules.classRule;
    document.getElementById('arenaPortableStatus').textContent='';
    dialog.hidden=false;arenaPortableSetupOpen=true;isGamePaused=true;
    document.dispatchEvent(new Event('arena-touch-disable'));updateTouchControlsVisibility();
    document.getElementById('arenaPortableCount').focus({preventScroll:true});
}
function arenaPortableStart({count=32,classKey='kame',join=true}={}) {
    if(![2,4,9,32,64,128].includes(Number(count))||!Object.hasOwn(CLASS_COMMANDS,classKey)||typeof join!=='boolean')return false;
    const requested=Number(count),actual=Math.min(requested,getArenaPlayerLimit());
    if(actual<2)return false;
    arenaPortableProfile={...arenaPortableProfile,count:requested,classKey,join};arenaPortableRemember();
    if(isSettingsOpen)toggleSettingsModal(false);
    openLobby(true);applyPlayerCountPreset(actual-(join?1:0));
    if(join){document.getElementById('protagonistClassSelect').value=classKey;if(!streamerManualControl)toggleStreamerManualControl();joinAsStreamer();}
    if(typeof initAudio==='function')initAudio();
    arenaPortableClose();startCombatFromLobby();updateTouchControlsVisibility();
    return true;
}
function arenaPortableReady() {
    const host=document.createElement('section');host.id='arenaPortableSetup';host.hidden=true;
    host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-labelledby','arenaPortableTitle');host.setAttribute('aria-describedby','arenaPortableDescription');host.setAttribute('data-no-translate','');
    host.innerHTML=`<div class="arena-portable-card"><button type="button" id="arenaPortableClose" aria-label="Cerrar prueba rápida">×</button><div class="arena-portable-kicker">ARENA LIVE · ARCHIVO SIN CONEXIÓN</div><h2 id="arenaPortableTitle">Listo para tu celular</h2><p id="arenaPortableDescription">Elige una partida. Las clases, sus poderes y las reglas son los mismos del juego principal.</p><form id="arenaPortableForm"><div class="arena-portable-grid"><label>Peleadores<select id="arenaPortableCount">${[2,4,9,32,64,128].map(n=>`<option value="${n}">${n} · ${n===2?'Duelo':n<=8?'Smash':'Arena'}</option>`).join('')}</select></label><label>Tu clase<select id="arenaPortableClass">${Object.keys(CLASS_COMMANDS).map(key=>`<option value="${key}">${escapeHTML(localizedClassName(key))}</option>`).join('')}</select></label><label>Resolución de dibujo<select id="arenaPortableResolution"><option value="540">540p · Ahorro</option><option value="720">720p · Normal</option><option value="1080">1080p · Detalle</option></select></label><label>Fluidez de dibujo<select id="arenaPortableFps"><option value="30">30 FPS · Ahorro</option><option value="60">60 FPS · Fluidez</option></select></label></div><label class="arena-portable-check"><input type="checkbox" id="arenaPortableJoin">Jugar como Prota</label><output id="arenaPortableStatus" role="status"></output><button type="submit" id="arenaPortableStart">▶ Iniciar partida</button></form><p class="arena-portable-help">Mueve el joystick. Usa ↑ Saltar, ⚔ Golpe y ⚡ Poder en la barra inferior. En ☰ Menú están Ajustes, Pruebas y Chat.</p><p class="arena-portable-help">Sin instalar dependencias. TikTok LIVE real requiere el servidor; aquí los comentarios y apoyos son simulados. La calidad cambia el dibujo, no el daño ni la física.</p></div>`;
    document.body.appendChild(host);
    document.getElementById('arenaPortableClose').onclick=arenaPortableClose;
    document.getElementById('arenaPortableJoin').onchange=event=>{document.getElementById('arenaPortableClass').disabled=!event.target.checked||arenaCombatRules.classRule!=='any';};
    document.getElementById('arenaPortableResolution').onchange=event=>arenaPortableResolution(event.target.value);
    document.getElementById('arenaPortableFps').onchange=event=>setArenaRuntimeOption('renderFps',event.target.value);
    document.getElementById('arenaPortableCount').onchange=()=>{
        const selected=Number(document.getElementById('arenaPortableCount').value),limit=getArenaPlayerLimit();
        document.getElementById('arenaPortableStatus').textContent=selected>limit?`Tus reglas admiten ${limit} peleadores. Cambia ese límite en Ajustes para probar ${selected}.`:'';
    };
    document.getElementById('arenaPortableForm').onsubmit=event=>{event.preventDefault();arenaPortableStart({count:document.getElementById('arenaPortableCount').value,classKey:document.getElementById('arenaPortableClass').value,join:document.getElementById('arenaPortableJoin').checked});};
    host.addEventListener('keydown',event=>{
        if(event.key==='Escape'){event.preventDefault();arenaPortableClose();}
        if(event.key!=='Tab')return;
        const nodes=[...host.querySelectorAll('button,select,input')].filter(n=>!n.disabled),first=nodes[0],last=nodes.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    const quick=document.createElement('button');quick.type='button';quick.id='arenaPortableQuick';quick.textContent='🎮 Nueva prueba';quick.onclick=arenaPortableOpen;quick.setAttribute('aria-controls',host.id);
    document.querySelector('[data-operator-panel="mobile"]')?.prepend(quick);
    const launch=document.createElement('button');launch.type='button';launch.textContent='🎮 Prueba rápida para celular';launch.onclick=arenaPortableOpen;document.querySelector('#arenaPanelScenarios .arena-panel-body')?.appendChild(launch);
    const unavailable=document.getElementById('arenaTikTokChatStatus');if(unavailable)unavailable.textContent='Sin conexión LIVE';
    selectArenaChatTab('local',false);
    const footer=document.querySelector('#settingsPauseModal>div>div:last-child');
    if(footer){const note=document.createElement('span');note.textContent=' · Archivo móvil sin conexión';note.setAttribute('data-no-translate','');footer.appendChild(note);}
    const dock=document.getElementById('touchControlDock');
    function dockForView(){const fullscreen=document.fullscreenElement?.id;const horizontal=fullscreen==='card-16x9'||(fullscreen!=='card-9x16'&&monitorFocus==='16:9');document.getElementById(horizontal?'viewport16x9':'viewport9x16')?.appendChild(dock);}
    // The same analog input also works when the phone rotates into landscape.
    const oldFocus=setMonitorFocus;setMonitorFocus=function(focus){oldFocus(focus);dockForView();};
    dockForView();
    document.addEventListener('fullscreenchange',()=>{document.dispatchEvent(new Event('arena-touch-disable'));dockForView();});
    window.matchMedia('(orientation:portrait)').addEventListener('change',()=>{
        document.dispatchEvent(new Event('arena-touch-disable'));
        if(!document.fullscreenElement){setMonitorFocus(arenaPreparationDefaultFocus());requestAnimationFrame(fitDualMonitorsSideBySide);}
    });
    document.addEventListener('visibilitychange',()=>{
        arenaPortableSuspended=document.hidden;previousFrameTime=null;simulationAccumulator=0;arenaLastRenderTime=null;
        if(document.hidden)document.dispatchEvent(new Event('arena-touch-disable'));
    });
    arenaPortableOpen();
}
window.addEventListener('load',arenaPortableReady,{once:true});
window.ArenaPortable=Object.freeze({build:ARENA_PORTABLE_BUILD,open:arenaPortableOpen,close:arenaPortableClose,start:arenaPortableStart,setResolution:arenaPortableResolution,
    getProfile(){return Object.freeze({...arenaPortableProfile,fps:arenaRuntime.renderFps});}});
