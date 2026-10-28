// Loaded inline after the unchanged classic engine, before its load bootstrap.
// This adapter changes presentation and test setup, never combat decisions.
const ARENA_PORTABLE_KEY='arenaLivePortableV1';
const ARENA_PORTABLE_NOTICE_KEY='arenaLiveMobileNoticeHiddenV1';
const ARENA_PORTABLE_GUIDE_KEY='arenaLiveMobileShowGuideV1';
let arenaPortableSuspended=false,arenaPortableSetupOpen=false,arenaPortablePreviousPause=false;
let arenaPortableGuideVisible=false;
try{arenaPortableGuideVisible=localStorage.getItem(ARENA_PORTABLE_GUIDE_KEY)==='1';}catch(_){}
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
    dialog.hidden=true;arenaPortableSetupOpen=false;isGamePaused=arenaPortablePreviousPause;
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
    let hideNotice=false;try{hideNotice=localStorage.getItem(ARENA_PORTABLE_NOTICE_KEY)==='1';}catch(_){}
    document.getElementById('arenaPortableNotice').hidden=hideNotice;
    document.getElementById('arenaPortableDontShow').checked=hideNotice;
    arenaPortablePreviousPause=isGamePaused;
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
    arenaPortablePreviousPause=false;
    arenaPortableClose();startCombatFromLobby();updateTouchControlsVisibility();
    return true;
}

function arenaPortableActiveRatio(){
    return document.fullscreenElement?.id==='card-16x9'||(!document.fullscreenElement&&monitorFocus==='16:9')?'16:9':'9:16';
}
function setArenaPortableGuideVisible(enabled,remember=true){
    arenaPortableGuideVisible=!!enabled;
    document.documentElement.classList.toggle('arena-mobile-show-guide',arenaPortableGuideVisible);
    if(remember)try{localStorage.setItem(ARENA_PORTABLE_GUIDE_KEY,arenaPortableGuideVisible?'1':'0');}catch(_){}
    refreshArenaPortableFloatingUI();
}
function refreshArenaPortableFloatingUI(){
    const fullscreen=!!document.fullscreenElement;
    const fs=document.getElementById('arenaPortableFullscreen');
    const guide=document.getElementById('arenaPortableToggleGuide');
    const menuGuide=document.getElementById('arenaPortableGuideMenu');
    if(fs){fs.textContent=fullscreen?'⤡':'⛶';fs.title=fullscreen?'Salir de pantalla completa':'Pantalla completa';fs.setAttribute('aria-label',fs.title);fs.setAttribute('aria-pressed',String(fullscreen));}
    if(guide){guide.textContent=arenaPortableGuideVisible?'◉':'?';guide.title=arenaPortableGuideVisible?'Ocultar instrucciones':'Mostrar instrucciones';guide.setAttribute('aria-label',guide.title);}
    if(menuGuide){menuGuide.textContent=arenaPortableGuideVisible?'🙈 Ocultar instrucciones':'❔ Mostrar instrucciones';menuGuide.setAttribute('aria-pressed',String(arenaPortableGuideVisible));}
    const menuFS=document.getElementById('arenaPortableFullscreenMenu');
    if(menuFS)menuFS.textContent=fullscreen?'⤡ Salir de pantalla completa':'⛶ Pantalla completa';
}
function arenaPortableReport(message){
    const toast=document.getElementById('arenaPortableToast');
    if(toast){toast.textContent=message;toast.hidden=false;}
    const status=document.getElementById('arenaPortableFeedback');if(status)status.textContent=message;
}
async function arenaPortableToggleFullscreen(){
    closeArenaOperatorPopover(false);
    const ratio=arenaPortableActiveRatio();
    if(!document.fullscreenEnabled){
        arenaPortableReport('El navegador no permite pantalla completa. Abre el archivo en Chrome y prueba de nuevo.');
        return false;
    }
    try{
        // Reuse the battle's existing fullscreen handler, never duplicate game state.
        const ok=await toggleArenaFullscreen(ratio);
        if(!ok)throw new Error('fullscreen denied');
        refreshArenaPortableFloatingUI();
        return true;
    }catch(_){
        arenaPortableReport('No se pudo activar pantalla completa en este navegador.');
        return false;
    }
}
function installArenaPortableFloatingUI(){
    const hud=document.createElement('nav');
    hud.id='arenaMobileFloating';
    hud.setAttribute('aria-label','Accesos flotantes del juego');
    hud.innerHTML='<button type="button" id="arenaPortableToggleGuide" aria-label="Mostrar instrucciones" title="Mostrar instrucciones">?</button><button type="button" id="arenaPortableFullscreen" aria-label="Pantalla completa" title="Pantalla completa">⛶</button><output id="arenaPortableToast" role="status" hidden></output>';
    document.body.appendChild(hud);
    hud.querySelector('#arenaPortableToggleGuide').addEventListener('click',()=>setArenaPortableGuideVisible(!arenaPortableGuideVisible));
    hud.querySelector('#arenaPortableFullscreen').addEventListener('click',()=>{void arenaPortableToggleFullscreen();});
    hud.querySelector('#arenaPortableToast').onclick=event=>{event.currentTarget.hidden=true;};
    const menu=document.querySelector('#arenaOperatorPopover [data-operator-panel="mobile"]');
    if(menu){
        const heading=document.createElement('div');
        heading.className='arena-portable-menu-heading';
        heading.textContent='ARENA LIVE · OPCIONES';
        menu.prepend(heading);
        const actions=document.createElement('div');
        actions.className='arena-portable-menu-extra';
        actions.innerHTML='<button type="button" id="arenaPortableFullscreenMenu">⛶ Pantalla completa</button><button type="button" id="arenaPortableGuideMenu" aria-pressed="false">❔ Mostrar instrucciones</button><button type="button" id="arenaPortablePauseMenu">⏸ Pausar / continuar</button><button type="button" id="arenaPortableAbout">ⓘ Sobre Arena Live</button><output id="arenaPortableFeedback" role="status" aria-live="polite"></output>';
        menu.insertBefore(actions,menu.children[1]||null);
        actions.querySelector('#arenaPortableFullscreenMenu').onclick=()=>{void arenaPortableToggleFullscreen();};
        actions.querySelector('#arenaPortableGuideMenu').onclick=()=>{setArenaPortableGuideVisible(!arenaPortableGuideVisible);closeArenaOperatorPopover(false);};
        actions.querySelector('#arenaPortablePauseMenu').onclick=()=>{document.getElementById('arenaDualPauseBtn')?.click();closeArenaOperatorPopover(false);};
        actions.querySelector('#arenaPortableAbout').onclick=()=>{
            closeArenaOperatorPopover(false);arenaPortableOpen();
            document.getElementById('arenaPortableNotice').hidden=false;
        };
        const prota=document.getElementById('arenaProtaClassToolbar');
        if(prota)menu.appendChild(prota); // Move the original select, keep its listeners and value.
        const join=document.createElement('button');join.type='button';join.id='arenaPortableJoinMenu';join.textContent='👑 Unirse como Prota';
        join.onclick=()=>{document.getElementById('btnStreamerJoin')?.click();closeArenaOperatorPopover(false);};
        menu.appendChild(join);
    }
    const bottom=document.getElementById('arenaMobileMoreBtn');
    if(bottom)bottom.textContent='☰ Menú';
    refreshArenaPortableFloatingUI();
}

function arenaPortableReady() {
    const host=document.createElement('section');host.id='arenaPortableSetup';host.hidden=true;
    host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-labelledby','arenaPortableTitle');host.setAttribute('aria-describedby','arenaPortableDescription');host.setAttribute('data-no-translate','');
    host.innerHTML=`<div class="arena-portable-card"><button type="button" id="arenaPortableClose" aria-label="Cerrar prueba rápida">×</button><div class="arena-portable-kicker">ARENA LIVE · ARCHIVO SIN CONEXIÓN</div><h2 id="arenaPortableTitle">Nueva partida</h2><p id="arenaPortableDescription">Elige los luchadores y comienza a jugar.</p><aside id="arenaPortableNotice" aria-label="Sobre Arena Live"><strong>🎥 Un juego pensado para streaming</strong><p>Arena Live está diseñado para directos: quienes te ven pueden unirse a la arena escribiendo en el chat, elegir su clase y activar poderes con comandos. Esta versión móvil es una prueba sin conexión; simula el chat y sus interacciones.</p><label class="arena-portable-check"><input type="checkbox" id="arenaPortableDontShow"> No mostrar de nuevo</label></aside><form id="arenaPortableForm"><div class="arena-portable-grid"><label>Peleadores<select id="arenaPortableCount">${[2,4,9,32,64,128].map(n=>`<option value="${n}">${n} · ${n===2?'Duelo':n<=8?'Smash':'Arena'}</option>`).join('')}</select></label><label>Tu clase<select id="arenaPortableClass">${Object.keys(CLASS_COMMANDS).map(key=>`<option value="${key}">${escapeHTML(localizedClassName(key))}</option>`).join('')}</select></label><label>Resolución de dibujo<select id="arenaPortableResolution"><option value="540">540p · Ahorro</option><option value="720">720p · Normal</option><option value="1080">1080p · Detalle</option></select></label><label>Fluidez de dibujo<select id="arenaPortableFps"><option value="30">30 FPS · Ahorro</option><option value="60">60 FPS · Fluidez</option></select></label></div><label class="arena-portable-check"><input type="checkbox" id="arenaPortableJoin">Jugar como Prota</label><output id="arenaPortableStatus" role="status"></output><button type="submit" id="arenaPortableStart">▶ Iniciar partida</button></form><p class="arena-portable-help">Movimiento con joystick · acciones táctiles · más opciones en ☰ Menú.</p></div>`;
    document.body.appendChild(host);
    document.getElementById('arenaPortableClose').onclick=arenaPortableClose;
    document.getElementById('arenaPortableDontShow').onchange=event=>{
        try{localStorage.setItem(ARENA_PORTABLE_NOTICE_KEY,event.target.checked?'1':'0');}catch(_){}
    };
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
    document.documentElement.classList.add('arena-mobile-offline');
    for(const id of ['lobbyOverlay9','lobbyOverlay16']){
        const lobby=document.getElementById(id);
        if(lobby){lobby.setAttribute('aria-label','Preparar combate');const heading=lobby.querySelector('.arena-onboarding-card h2');if(heading)heading.textContent='Preparar combate';}
    }
    installArenaPortableFloatingUI();
    const unavailable=document.getElementById('arenaTikTokChatStatus');if(unavailable)unavailable.textContent='Sin conexión LIVE';
    selectArenaChatTab('local',false);
    const footer=document.querySelector('#settingsPauseModal>div>div:last-child');
    if(footer){const note=document.createElement('span');note.textContent=' · Archivo móvil sin conexión';note.setAttribute('data-no-translate','');footer.appendChild(note);}
    function dockForView(){
        const fullscreen=document.fullscreenElement?.id;
        const horizontal=fullscreen==='card-16x9'||(fullscreen!=='card-9x16'&&monitorFocus==='16:9');
        const view=document.getElementById(horizontal?'viewport16x9':'viewport9x16');
        if(!view)return;
        for(const id of ['arenaMobileFloating','arenaHeaderActions','arenaOperatorPopover','arenaPortableTestDrawer']){const node=document.getElementById(id);if(node)view.appendChild(node);}
        const setup=document.getElementById('arenaPortableSetup');
        if(setup)(fullscreen?view:document.body).appendChild(setup);
        refreshArenaPortableFloatingUI();
    }
    // The same analog input also works when the phone rotates into landscape.
    const oldFocus=setMonitorFocus;setMonitorFocus=function(focus){oldFocus(focus);dockForView();};
    dockForView();
    document.addEventListener('fullscreenchange',()=>{
        document.dispatchEvent(new Event('arena-touch-disable'));
        dockForView();
        if(document.fullscreenElement)document.getElementById('arenaMobileFloating')?.querySelector('#arenaPortableFullscreen')?.focus({preventScroll:true});
    });
    window.matchMedia('(orientation:portrait)').addEventListener('change',()=>{
        document.dispatchEvent(new Event('arena-touch-disable'));
        if(!document.fullscreenElement){setMonitorFocus(arenaPreparationDefaultFocus());requestAnimationFrame(fitDualMonitorsSideBySide);}
    });
    document.addEventListener('visibilitychange',()=>{
        arenaPortableSuspended=document.hidden;previousFrameTime=null;simulationAccumulator=0;arenaLastRenderTime=null;
        if(document.hidden)document.dispatchEvent(new Event('arena-touch-disable'));
    });
    setArenaPortableGuideVisible(arenaPortableGuideVisible,false);
    arenaPortableOpen();
}
window.addEventListener('load',arenaPortableReady,{once:true});
window.ArenaPortable=Object.freeze({build:ARENA_PORTABLE_BUILD,open:arenaPortableOpen,close:arenaPortableClose,start:arenaPortableStart,setResolution:arenaPortableResolution,
    getProfile(){return Object.freeze({...arenaPortableProfile,fps:arenaRuntime.renderFps});}});
