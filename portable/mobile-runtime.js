// Loaded inline after the unchanged classic engine, before its load bootstrap.
// This adapter changes presentation and test setup, never combat decisions.
const ARENA_PORTABLE_KEY='arenaLivePortableV1';
const ARENA_PORTABLE_NOTICE_KEY='arenaLiveMobileNoticeHiddenV1';
const ARENA_PORTABLE_GUIDE_KEY='arenaLiveMobileShowGuideV1';
// User-facing modes: Modo jugador (Protagonista) and Modo Streamer.
const ARENA_MOBILE_MODES=Object.freeze({PLAYER:'player',DIRECTOR:'director'});
let arenaPortableSuspended=false,arenaPortableSetupOpen=false,arenaPortablePreviousPause=false;
let arenaPortableTheater=false;
let arenaPortableDockForView=null;
let arenaPortableGuideVisible=false;
try{arenaPortableGuideVisible=localStorage.getItem(ARENA_PORTABLE_GUIDE_KEY)==='1';}catch(_){}
let arenaPortableProfile={resolution:720,count:32,classKey:'kame',mode:ARENA_MOBILE_MODES.PLAYER,join:true,touchMode:'joystick'};
try {
    const saved=JSON.parse(localStorage.getItem(ARENA_PORTABLE_KEY)||'null');
    if([540,720,1080].includes(saved?.resolution))arenaPortableProfile.resolution=saved.resolution;
    if([2,4,9,32,64,128].includes(saved?.count))arenaPortableProfile.count=saved.count;
    if(Object.hasOwn(CLASS_COMMANDS,saved?.classKey||''))arenaPortableProfile.classKey=saved.classKey;
    if(typeof saved?.join==='boolean')arenaPortableProfile.join=saved.join;
    if(['joystick','touch'].includes(saved?.touchMode))arenaPortableProfile.touchMode=saved.touchMode;
    arenaPortableProfile.mode=[ARENA_MOBILE_MODES.PLAYER,ARENA_MOBILE_MODES.DIRECTOR].includes(saved?.mode)
        ? saved.mode : arenaPortableProfile.join?ARENA_MOBILE_MODES.PLAYER:ARENA_MOBILE_MODES.DIRECTOR;
    arenaPortableProfile.join=arenaPortableProfile.mode===ARENA_MOBILE_MODES.PLAYER;
}catch(_){/* The game also runs when file storage is unavailable. */}
function arenaMobileRuntimeDefaults(saved) {
    if(!saved||typeof saved!=='object'||Array.isArray(saved)){
        arenaRuntime={...arenaRuntime,quality:'performance',renderFps:30};
    }
}
function arenaPortableRemember(){try{localStorage.setItem(ARENA_PORTABLE_KEY,JSON.stringify(arenaPortableProfile));}catch(_){}}
function arenaPortableSyncModeControls(){
    const mode=arenaPortableProfile.mode;
    document.documentElement.dataset.mobileMode=mode;
    document.documentElement.dataset.mobileTouchMode=arenaPortableProfile.touchMode;
    if(typeof arenaMobileSyncTouchMode==='function')arenaMobileSyncTouchMode();
    const selected=document.querySelector('input[name="arenaPortableMode"]:checked');
    if(selected&&selected.value!==mode){const radio=document.querySelector('input[name="arenaPortableMode"][value="'+mode+'"]');if(radio)radio.checked=true;}
    const cls=document.getElementById('arenaPortableClass');
    if(cls)cls.disabled=mode!==ARENA_MOBILE_MODES.PLAYER||arenaCombatRules.classRule!=='any';
    for(const key of [ARENA_MOBILE_MODES.PLAYER,ARENA_MOBILE_MODES.DIRECTOR]){
        const button=document.getElementById('arenaPortableMode'+(key==='player'?'Player':'Director'));
        if(button){button.setAttribute('aria-pressed',String(mode===key));button.classList.toggle('is-selected',mode===key);}
    }
    const title=document.getElementById('arenaPortableModeCurrent');
    if(title)title.textContent=mode===ARENA_MOBILE_MODES.PLAYER?'Modo jugador':'Modo Streamer';
    document.getElementById('arenaMobileMoreBtn')?.setAttribute('aria-label','Menú · '+(mode==='player'?'Modo jugador':'Modo Streamer'));
    refreshArenaPortableFloatingUI();
}
function arenaPortableSetMode(mode,{remember=true,updateGame=true}={}){
    if(![ARENA_MOBILE_MODES.PLAYER,ARENA_MOBILE_MODES.DIRECTOR].includes(mode))return false;
    const previous=arenaPortableProfile.mode;
    if(previous!==mode)document.dispatchEvent(new Event('arena-touch-disable'));
    arenaPortableProfile={...arenaPortableProfile,mode,join:mode===ARENA_MOBILE_MODES.PLAYER};
    if(remember)arenaPortableRemember();
    if(updateGame&&!arenaPortableSetupOpen){
        if(mode===ARENA_MOBILE_MODES.PLAYER){
            if(!streamerManualControl)toggleStreamerManualControl();
            if((gameState==='COMBAT'||gameState==='LOBBY')&&!fighters.some(f=>f.isStreamer&&!f.eliminated)){
                joinAsStreamer();
                if(!fighters.some(f=>f.isStreamer&&!f.eliminated)){
                    // Do not display Player controls without an actual controllable protagonist.
                    arenaPortableProfile={...arenaPortableProfile,mode:ARENA_MOBILE_MODES.DIRECTOR,join:false};
                    if(streamerManualControl)toggleStreamerManualControl();
                    if(remember)arenaPortableRemember();
                    if(typeof arenaMobileShowTestDrawer==='function')arenaMobileShowTestDrawer(false);
                    arenaPortableReport('No se pudo incorporar al protagonista. Sigues en Modo Streamer.');
                    arenaPortableSyncModeControls();refreshArenaPortableFloatingUI();
                    return false;
                }
            }
            if(typeof arenaMobileShowTestDrawer==='function')arenaMobileShowTestDrawer(false);
        }else{
            if(streamerManualControl)toggleStreamerManualControl();
            // Streamer abilities live in the bottom strip; open the advanced panel only on request.
            if(typeof arenaMobileShowTestDrawer==='function')arenaMobileShowTestDrawer(false);
        }
        updateTouchControlsVisibility();
    }
    arenaPortableSyncModeControls();refreshArenaPortableFloatingUI();
    requestAnimationFrame(arenaPortableFitMobileStage);
    return true;
}

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
    dialog.hidden=true;arenaPortableSetupOpen=false;document.documentElement.classList.remove('arena-mobile-setup-open');isGamePaused=arenaPortablePreviousPause;
    requestAnimationFrame(arenaMobileSyncOverlayNavigation);
    previousFrameTime=null;simulationAccumulator=0;arenaLastRenderTime=null;
    updateTouchControlsVisibility();document.getElementById('arenaMobileMoreBtn')?.focus({preventScroll:true});refreshArenaPortableFloatingUI();
}
function arenaPortableOpen() {
    const dialog=document.getElementById('arenaPortableSetup');if(!dialog)return;
    if(isSettingsOpen)toggleSettingsModal(false);
    closeArenaOperatorPopover(false);
    document.getElementById('arenaPortableCount').value=String(arenaPortableProfile.count);
    document.getElementById('arenaPortableClass').value=arenaPortableProfile.classKey;
    document.getElementById('arenaPortableResolution').value=String(arenaPortableProfile.resolution);
    document.getElementById('arenaPortableFps').value=String(arenaRuntime.renderFps);
    const setupMode=document.querySelector('input[name="arenaPortableMode"][value="'+arenaPortableProfile.mode+'"]');
    if(setupMode)setupMode.checked=true;
    arenaPortableSyncModeControls();
    if(arenaCombatRules.classRule!=='any')document.getElementById('arenaPortableClass').value=arenaCombatRules.classRule;
    document.getElementById('arenaPortableStatus').textContent='';
    let hideNotice=false;try{hideNotice=localStorage.getItem(ARENA_PORTABLE_NOTICE_KEY)==='1';}catch(_){}
    document.getElementById('arenaPortableNotice').hidden=hideNotice;
    document.getElementById('arenaPortableDontShow').checked=hideNotice;
    arenaPortablePreviousPause=isGamePaused;
    dialog.hidden=false;arenaPortableSetupOpen=true;document.documentElement.classList.add('arena-mobile-setup-open');isGamePaused=true;
    requestAnimationFrame(arenaMobileSyncOverlayNavigation);
    document.dispatchEvent(new Event('arena-touch-disable'));updateTouchControlsVisibility();
    document.getElementById('arenaPortableCount').focus({preventScroll:true});
}
function arenaPortableStart({count=32,classKey='kame',mode,join}={}) {
    const selectedMode=mode??(typeof join==='boolean'?(join?ARENA_MOBILE_MODES.PLAYER:ARENA_MOBILE_MODES.DIRECTOR):arenaPortableProfile.mode);
    if(![ARENA_MOBILE_MODES.PLAYER,ARENA_MOBILE_MODES.DIRECTOR].includes(selectedMode))return false;
    join=selectedMode===ARENA_MOBILE_MODES.PLAYER;
    if(![2,4,9,32,64,128].includes(Number(count))||!Object.hasOwn(CLASS_COMMANDS,classKey))return false;
    const requested=Number(count),actual=Math.min(requested,getArenaPlayerLimit());
    if(actual<2)return false;
    arenaPortableProfile={...arenaPortableProfile,count:requested,classKey,mode:selectedMode,join};arenaPortableRemember();
    if(isSettingsOpen)toggleSettingsModal(false);
    openLobby(true);applyPlayerCountPreset(actual-(join?1:0));
    if(join){document.getElementById('protagonistClassSelect').value=classKey;if(!streamerManualControl)toggleStreamerManualControl();joinAsStreamer();}
    else if(streamerManualControl)toggleStreamerManualControl();
    if(typeof initAudio==='function')initAudio();
    arenaPortablePreviousPause=false;
    arenaPortableClose();startCombatFromLobby();updateTouchControlsVisibility();
    arenaPortableSetMode(selectedMode,{remember:false});refreshArenaPortableFloatingUI();
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
    const fullscreen=!!document.fullscreenElement||arenaPortableTheater;
    const fs=document.getElementById('arenaPortableFullscreen');
    const pause=document.getElementById('arenaMobilePause');
    const modeShortcut=document.getElementById('arenaMobileModeShortcut');
    if(modeShortcut){const player=arenaPortableProfile.mode===ARENA_MOBILE_MODES.PLAYER;modeShortcut.textContent=player?'🎛':'🎮';modeShortcut.title=player?'Cambiar a Modo Streamer':'Cambiar a Modo jugador';modeShortcut.setAttribute('aria-label',modeShortcut.title);modeShortcut.setAttribute('aria-pressed',String(!player));}
    if(pause){pause.textContent=isGamePaused?'▶':'⏸';pause.title=isGamePaused?'Continuar combate':'Pausar combate';pause.setAttribute('aria-label',pause.title);pause.setAttribute('aria-pressed',String(isGamePaused));}
    const guide=document.getElementById('arenaPortableToggleGuide');
    const menuGuide=document.getElementById('arenaPortableGuideMenu');
    if(fs){fs.textContent=fullscreen?'▣':'⛶';fs.title=fullscreen?'Salir de pantalla completa':'Pantalla completa';fs.setAttribute('aria-label',fs.title);fs.setAttribute('aria-pressed',String(fullscreen));}
    if(guide){guide.textContent=arenaPortableGuideVisible?'◉':'?';guide.title=arenaPortableGuideVisible?'Ocultar instrucciones':'Mostrar instrucciones';guide.setAttribute('aria-label',guide.title);}
    if(menuGuide){menuGuide.textContent=arenaPortableGuideVisible?'🙈 Ocultar instrucciones':'❔ Mostrar instrucciones';menuGuide.setAttribute('aria-pressed',String(arenaPortableGuideVisible));}

}
function arenaPortableReport(message){
    const toast=document.getElementById('arenaPortableToast');
    if(toast){toast.textContent=message;toast.hidden=false;}
    const status=document.getElementById('arenaPortableFeedback');if(status)status.textContent=message;
}
function arenaPortableFitMobileStage(){
    const ratio=arenaPortableActiveRatio();
    const video=document.getElementById(ratio==='16:9'?'viewport16x9':'viewport9x16');
    const stage=document.getElementById('broadcastStageSection');
    const fullscreen=!!document.fullscreenElement||arenaPortableTheater;
    const director=arenaPortableProfile.mode===ARENA_MOBILE_MODES.DIRECTOR;
    const controlsVisible=director||arenaPortableProfile.touchMode==='joystick';
    const viewHeight=Math.max(1,Math.min(window.innerHeight,window.visualViewport?.height||window.innerHeight));
    const top=fullscreen?Math.max(56,56+(window.visualViewport?.offsetTop||0)):Math.max(58,stage?.getBoundingClientRect().top||58);
    const root=document.documentElement;
    const playerBand=Math.max(144,Number.parseFloat(root.style.getPropertyValue('--arena-mobile-player-shelf-height'))||145);
    const band=controlsVisible?(director?78:playerBand):0;
    // Calculate from the real visual viewport, not document/scroll height.
    // This leaves a real control band below the 9:16 video on Android.
    const usable=Math.max(80,Math.floor(viewHeight-top-band-14));
    const next=usable+'px';
    if(root.style.getPropertyValue('--arena-mobile-video-height')!==next)
        root.style.setProperty('--arena-mobile-video-height',next);
    if(typeof arenaMobileKeepStreamerSkillsVisible==='function')arenaMobileKeepStreamerSkillsVisible();
    if(typeof arenaMobileApplyLayout==='function')arenaMobileApplyLayout();
    if(video){
        const rect=video.getBoundingClientRect();
        const desired=rect.bottom+6;
        const maxTop=Math.max(54,viewHeight-band-6);
        const controlTop=Math.round(Math.max(54,Math.min(desired,maxTop)));
        const nextTop=controlTop+'px';
        if(root.style.getPropertyValue('--arena-mobile-controls-top')!==nextTop)
            root.style.setProperty('--arena-mobile-controls-top',nextTop);
    }
    root.style.setProperty('--arena-mobile-reserved-bottom',Math.ceil(band+10)+'px');
    if(typeof arenaMobilePositionTestDrawer==='function')arenaMobilePositionTestDrawer();
}
function arenaPortableSetTheater(enabled){
    arenaPortableTheater=!!enabled;
    document.documentElement.classList.toggle('arena-mobile-theater',arenaPortableTheater);
    arenaPortableDockForView?.();
    requestAnimationFrame(arenaPortableFitMobileStage);
    refreshArenaPortableFloatingUI();
}
async function arenaPortableToggleFullscreen(){
    closeArenaOperatorPopover(false);
    arenaMobileSyncOverlayNavigation();
    if(arenaPortableTheater){arenaPortableSetTheater(false);return true;}
    if(document.fullscreenElement){
        try{await document.exitFullscreen();return true;}catch(_){return false;}
    }
    const ratio=arenaPortableActiveRatio();
    if(document.fullscreenEnabled){
        try{
            const ok=await toggleArenaFullscreen(ratio);
            if(ok&&document.fullscreenElement){
                requestAnimationFrame(arenaPortableFitMobileStage);
                refreshArenaPortableFloatingUI();
                return true;
            }
        }catch(_){/* Some Android content:// viewers disallow native fullscreen. */}
    }
    // Chrome's file/content provider may block requestFullscreen. Keep one
    // real responsive overlay inside the usable browser viewport, not a dead
    // fullscreen button. Browser chrome itself cannot be hidden with CSS.
    arenaPortableSetTheater(true);
    const feedback=document.getElementById('arenaPortableFeedback');
    if(feedback)feedback.textContent='Vista ampliada. Para ocultar las barras de Chrome, abre desde un servidor HTTPS compatible.';
    return true;
}

/* Mobile navigation consumes overlays before allowing a fullscreen exit.
   The history marker also lets Android's Back button close the current panel
   without navigating away from the standalone file. */
function arenaMobileCurrentOverlay(){
    const dialog=document.getElementById('arenaPortableSetup');
    if(dialog&&!dialog.hidden)return 'setup';
    if(isSettingsOpen)return 'settings';
    const menu=document.getElementById('arenaOperatorPopover');
    if(menu&&!menu.hidden)return 'menu';
    if(typeof arenaMobileTestState!=='undefined'&&arenaMobileTestState.open)return 'tests';
    return null;
}
function arenaMobileSyncOverlayNavigation(){
    const current=arenaMobileCurrentOverlay();
    const root=document.documentElement;
    root.classList.toggle('arena-mobile-overlay-open',current==='menu'||current==='settings'||current==='setup');
    if(current){
        if(!history.state?.arenaMobilePanel){
            try{history.pushState({...history.state,arenaMobilePanel:true},'');}catch(_){/* content:// may disallow pushState */}
        }
    }else if(history.state?.arenaMobilePanel){
        // Discard just our overlay entry, not the underlying page or fullscreen.
        history.back();
    }
}
function arenaMobileCloseTopPanel(){
    const menu=document.getElementById('arenaOperatorPopover');
    const details=menu&&!menu.hidden?menu.querySelector('.arena-mobile-match-menu[open]'):null;
    if(details){details.open=false;return 'submenu';}
    const dialog=document.getElementById('arenaPortableSetup');
    if(dialog&&!dialog.hidden){arenaPortableClose();return 'setup';}
    if(isSettingsOpen){toggleSettingsModal(false);return 'settings';}
    if(menu&&!menu.hidden){closeArenaOperatorPopover(false);return 'menu';}
    if(typeof arenaMobileTestState!=='undefined'&&arenaMobileTestState.open){
        arenaMobileShowTestDrawer(false);return 'tests';
    }
    return null;
}
function arenaMobileInstallBackAndMenuClose(){
    const menu=document.querySelector('#arenaOperatorPopover [data-operator-panel="mobile"]');
    if(menu&&!document.getElementById('arenaMobileMenuClose')){
        const button=document.createElement('button');
        button.id='arenaMobileMenuClose';button.type='button';button.textContent='×';
        button.title='Cerrar menú';button.setAttribute('aria-label','Cerrar menú');
        // Insert before the grid content so it remains visible at the top.
        (menu.querySelector('.arena-portable-menu-heading')||menu).appendChild(button);
        button.addEventListener('click',event=>{
            event.preventDefault();event.stopPropagation();
            closeArenaOperatorPopover(false);
            arenaMobileSyncOverlayNavigation();
        });
    }
    document.addEventListener('keydown',event=>{
        if(event.key!=='Escape'&&event.key!=='Backspace'&&event.key!=='BrowserBack')return;
        if(event.key==='Backspace'&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
        if(!arenaMobileCurrentOverlay())return;
        event.preventDefault();event.stopImmediatePropagation();
        arenaMobileCloseTopPanel();arenaMobileSyncOverlayNavigation();
    },true);
    window.addEventListener('popstate',()=>{
        const result=arenaMobileCloseTopPanel();
        if(result==='submenu'&&arenaMobileCurrentOverlay()){
            // The first Back leaves an open submenu and returns to the main menu.
            try{history.pushState({...history.state,arenaMobilePanel:true},'');}catch(_){}
        }
        document.documentElement.classList.toggle('arena-mobile-overlay-open',
            ['menu','settings','setup'].includes(arenaMobileCurrentOverlay()));
    });
    // Native menu and settings handlers execute during bubbling; measure their
    // final state on the next frame, including toggle-to-close and outside taps.
    for(const type of ['click','change','toggle']){
        document.addEventListener(type,()=>requestAnimationFrame(arenaMobileSyncOverlayNavigation),true);
    }
    requestAnimationFrame(arenaMobileSyncOverlayNavigation);
}

function installArenaPortableFloatingUI(){
    const hud=document.createElement('nav');
    hud.id='arenaMobileFloating';
    hud.setAttribute('aria-label','Accesos flotantes del juego');
    hud.innerHTML='<button type="button" id="arenaPortableToggleGuide" aria-label="Mostrar instrucciones" title="Mostrar instrucciones">?</button><button type="button" id="arenaPortableFullscreen" aria-label="Pantalla completa" title="Pantalla completa">⛶</button><output id="arenaPortableToast" role="status" hidden></output>';
    document.body.appendChild(hud);
    const fullscreenBar=document.createElement('header');
    fullscreenBar.id='arenaMobileFullscreenBar';
    fullscreenBar.setAttribute('aria-label','Barra de Arena Live en pantalla completa');
    fullscreenBar.hidden=true;
    document.body.appendChild(fullscreenBar);
    const pause=document.createElement('button');
    pause.id='arenaMobilePause';pause.type='button';pause.textContent='⏸';pause.setAttribute('aria-label','Pausar combate');
    pause.onclick=()=>{document.getElementById('arenaDualPauseBtn')?.click();refreshArenaPortableFloatingUI();};
    hud.prepend(pause);
    const shortcut=document.createElement('button');shortcut.id='arenaMobileModeShortcut';shortcut.type='button';shortcut.textContent='🎛';
    shortcut.onclick=()=>arenaPortableSetMode(arenaPortableProfile.mode===ARENA_MOBILE_MODES.PLAYER?ARENA_MOBILE_MODES.DIRECTOR:ARENA_MOBILE_MODES.PLAYER);
    pause.after(shortcut);
    const tests=document.createElement('button');tests.id='arenaMobileTestsShortcut';tests.type='button';tests.textContent='🧪';tests.setAttribute('aria-label','Abrir opciones del Modo Streamer');
    tests.onclick=()=>{if(arenaPortableProfile.mode!==ARENA_MOBILE_MODES.DIRECTOR)arenaPortableSetMode(ARENA_MOBILE_MODES.DIRECTOR);arenaMobileShowTestDrawer(!arenaMobileTestState.open);};
    shortcut.after(tests);
    // The toolbar is outside the battle viewport, including in native fullscreen.
    const topMenu=document.getElementById('arenaMobileMoreBtn');
    const fullscreenControl=hud.querySelector('#arenaPortableFullscreen');
    if(topMenu&&fullscreenControl)hud.insertBefore(topMenu,fullscreenControl);
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
        actions.innerHTML='<div class="arena-mobile-mode-menu"><strong>Modo de juego</strong><button type="button" id="arenaPortableModePlayer" aria-pressed="false">🎮 Modo jugador</button><button type="button" id="arenaPortableModeDirector" aria-pressed="false">🎛 Modo Streamer</button></div><button type="button" id="arenaPortableGuideMenu" aria-pressed="false">❔ Instrucciones</button><button type="button" id="arenaPortableAbout">ⓘ Acerca del juego</button><output id="arenaPortableFeedback" role="status" aria-live="polite"></output>';
        menu.insertBefore(actions,menu.children[1]||null);
        actions.querySelector('#arenaPortableGuideMenu').onclick=()=>{setArenaPortableGuideVisible(!arenaPortableGuideVisible);closeArenaOperatorPopover(false);};
        actions.querySelector('#arenaPortableModePlayer').onclick=()=>{arenaPortableSetMode(ARENA_MOBILE_MODES.PLAYER);closeArenaOperatorPopover(false);};
        actions.querySelector('#arenaPortableModeDirector').onclick=()=>{arenaPortableSetMode(ARENA_MOBILE_MODES.DIRECTOR);closeArenaOperatorPopover(false);};
        actions.querySelector('#arenaPortableAbout').onclick=()=>{
            closeArenaOperatorPopover(false);arenaPortableOpen();
            document.getElementById('arenaPortableNotice').hidden=false;
        };
        // Offline control menu: omit streaming connections and OBS-specific entries.
        for(const key of ['arenaViewMenuBtn','arenaFullscreenMenuBtn','arenaDualChatToggleBtn','arenaDualTikTokConnectBtn','arenaDualTestsToggle','btnFullscreenDual']){
            menu.querySelector('[data-forward-control="'+key+'"]')?.remove();
        }
        const round=document.createElement('details');round.className='arena-mobile-match-menu';
        round.setAttribute('aria-label','Partida');
        round.innerHTML='<summary>🎮 Partida <span>Lobby · Nueva · Revancha</span></summary>';
        const next=document.getElementById('arenaPortableQuick');
        const lobby=menu.querySelector('[data-forward-control="arenaDualLobbyBtn"]');
        const rematch=menu.querySelector('[data-forward-control="arenaDualRematchBtn"]');
        if(next){next.textContent='＋ Nueva partida';round.appendChild(next);}
        if(lobby){lobby.textContent='🚪 Abrir lobby';round.appendChild(lobby);}
        if(rematch){rematch.textContent='🔄 Revancha';round.appendChild(rematch);}
        menu.insertBefore(round,menu.querySelector('[data-forward-control="arenaDualTestsToggle"]')||null);
        const prota=document.getElementById('arenaProtaClassToolbar');
        if(prota)menu.appendChild(prota); // Move the original select, keep its listeners and value.
    }
    const label=document.getElementById('arenaProtaClassLabel');if(label)label.textContent='🎭 Protagonista';
    const bottom=document.getElementById('arenaMobileMoreBtn');
    if(bottom)bottom.textContent='☰';
    arenaPortableSyncModeControls();
    refreshArenaPortableFloatingUI();
}

function arenaPortableReady() {
    const host=document.createElement('section');host.id='arenaPortableSetup';host.hidden=true;
    host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-labelledby','arenaPortableTitle');host.setAttribute('aria-describedby','arenaPortableDescription');host.setAttribute('data-no-translate','');
    host.innerHTML=`<div class="arena-portable-card"><button type="button" id="arenaPortableClose" aria-label="Cerrar prueba rápida">×</button><div class="arena-portable-kicker">ARENA LIVE · ARCHIVO SIN CONEXIÓN</div><h2 id="arenaPortableTitle">Nueva partida</h2><p id="arenaPortableDescription">Elige los luchadores y comienza a jugar.</p><aside id="arenaPortableNotice" aria-label="Sobre Arena Live"><strong>🎥 Un juego pensado para streaming</strong><p>Arena Live está diseñado para directos: quienes te ven pueden unirse a la arena escribiendo en el chat, elegir su clase y activar poderes con comandos. Esta versión móvil es una prueba sin conexión; simula el chat y sus interacciones.</p><label class="arena-portable-check"><input type="checkbox" id="arenaPortableDontShow"> No mostrar de nuevo</label></aside><form id="arenaPortableForm"><div class="arena-portable-grid"><label>Peleadores<select id="arenaPortableCount">${[2,4,9,32,64,128].map(n=>`<option value="${n}">${n} · ${n===2?'Duelo':n<=8?'Smash':'Arena'}</option>`).join('')}</select></label><label>Tu clase<select id="arenaPortableClass">${Object.keys(CLASS_COMMANDS).map(key=>`<option value="${key}">${escapeHTML(localizedClassName(key))}</option>`).join('')}</select></label><label>Resolución de dibujo<select id="arenaPortableResolution"><option value="540">540p · Ahorro</option><option value="720">720p · Normal</option><option value="1080">1080p · Detalle</option></select></label><label>Fluidez de dibujo<select id="arenaPortableFps"><option value="30">30 FPS · Ahorro</option><option value="60">60 FPS · Fluidez</option></select></label></div><fieldset id="arenaPortableModeOptions"><legend>¿Cómo quieres jugar?</legend><label class="arena-mobile-mode-choice"><input type="radio" name="arenaPortableMode" value="player" checked><span><b>🎮 Modo jugador</b><small>Controla a tu protagonista con gestos. La arena ocupa la pantalla y las pruebas permanecen ocultas.</small></span></label><label class="arena-mobile-mode-choice"><input type="radio" name="arenaPortableMode" value="director"><span><b>🎛 Modo Streamer</b><small>Dirige la partida con jugadores, poderes y comandos de prueba. No requiere conexión a redes.</small></span></label></fieldset><output id="arenaPortableStatus" role="status"></output><button type="submit" id="arenaPortableStart">▶ Iniciar partida</button></form><p class="arena-portable-help">Toca la arena para moverte; desliza rápido para golpear. En ↑, un toque salta y dos toques seguidos hacen doble salto. Mantén pulsado el escenario para usar el poder.</p></div>`;
    document.body.appendChild(host);
    document.getElementById('arenaPortableClose').onclick=arenaPortableClose;
    document.getElementById('arenaPortableDontShow').onchange=event=>{
        try{localStorage.setItem(ARENA_PORTABLE_NOTICE_KEY,event.target.checked?'1':'0');}catch(_){}
    };
    // The initial setup is a draft: choosing a radio does not change an active match
    // until the user explicitly presses "Iniciar partida".
    document.querySelectorAll('input[name="arenaPortableMode"]').forEach(input=>input.addEventListener('change',event=>{
        if(event.target.checked){
            const cls=document.getElementById('arenaPortableClass');
            if(cls)cls.disabled=event.target.value!==ARENA_MOBILE_MODES.PLAYER||arenaCombatRules.classRule!=='any';
        }
    }));
    document.getElementById('arenaPortableResolution').onchange=event=>arenaPortableResolution(event.target.value);
    document.getElementById('arenaPortableFps').onchange=event=>setArenaRuntimeOption('renderFps',event.target.value);
    document.getElementById('arenaPortableCount').onchange=()=>{
        const selected=Number(document.getElementById('arenaPortableCount').value),limit=getArenaPlayerLimit();
        document.getElementById('arenaPortableStatus').textContent=selected>limit?`Tus reglas admiten ${limit} peleadores. Cambia ese límite en Ajustes para probar ${selected}.`:'';
    };
    document.getElementById('arenaPortableForm').onsubmit=event=>{event.preventDefault();arenaPortableStart({count:document.getElementById('arenaPortableCount').value,classKey:document.getElementById('arenaPortableClass').value,mode:document.querySelector('input[name="arenaPortableMode"]:checked')?.value});};
    host.addEventListener('keydown',event=>{
        if(event.key==='Escape'){event.preventDefault();arenaPortableClose();}
        if(event.key!=='Tab')return;
        const nodes=[...host.querySelectorAll('button,select,input')].filter(n=>!n.disabled),first=nodes[0],last=nodes.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    const quick=document.createElement('button');quick.type='button';quick.id='arenaPortableQuick';quick.textContent='🎮 Nueva partida';quick.onclick=arenaPortableOpen;quick.setAttribute('aria-controls',host.id);
    document.querySelector('[data-operator-panel="mobile"]')?.prepend(quick);
    const launch=document.createElement('button');launch.type='button';launch.textContent='🎮 Prueba rápida para celular';launch.onclick=arenaPortableOpen;document.querySelector('#arenaPanelScenarios .arena-panel-body')?.appendChild(launch);
    document.documentElement.classList.add('arena-mobile-offline');
    for(const id of ['lobbyOverlay9','lobbyOverlay16']){
        const lobby=document.getElementById(id);
        if(lobby){lobby.setAttribute('aria-label','Preparar combate');const heading=lobby.querySelector('.arena-onboarding-card h2');if(heading)heading.textContent='Preparar combate';}
    }
    installArenaPortableFloatingUI();
    arenaMobileInstallBackAndMenuClose();
    const playerShelf=document.createElement('section');playerShelf.id='arenaMobileControlShelf';playerShelf.setAttribute('aria-label','Controles del juego y herramientas');
    document.getElementById('card-9x16')?.appendChild(playerShelf);
    const gestureGuide=document.createElement('aside');gestureGuide.id='arenaMobileGestureGuide';gestureGuide.setAttribute('aria-label','Cómo controlar el protagonista');
    gestureGuide.textContent='Táctil total: izquierda, desliza para moverte. Derecha, toca para saltar, dos toques para doble salto; desliza para golpear o mantén pulsado para el poder.';
    document.getElementById('card-9x16')?.appendChild(gestureGuide);
    const unavailable=document.getElementById('arenaTikTokChatStatus');if(unavailable)unavailable.textContent='Sin conexión LIVE';
    selectArenaChatTab('local',false);
    const footer=document.querySelector('#settingsPauseModal>div>div:last-child');
    if(footer){const note=document.createElement('span');note.textContent=' · Archivo móvil sin conexión';note.setAttribute('data-no-translate','');footer.appendChild(note);}
    function dockForView(){
        const fullscreen=document.fullscreenElement?.id || (arenaPortableTheater ? (monitorFocus==='16:9'?'card-16x9':'card-9x16') : null);
        const horizontal=fullscreen==='card-16x9'||(fullscreen!=='card-9x16'&&monitorFocus==='16:9');
        const view=document.getElementById(horizontal?'viewport16x9':'viewport9x16');
        if(!view)return;
        const card=view.closest('#card-9x16,#card-16x9');
        const toolbar=document.getElementById('arenaMobileFloating');
        const menu=document.getElementById('arenaOperatorPopover');
        const guide=document.getElementById('arenaMobileGestureGuide');
        const header=document.getElementById('arenaTopBarInner');
        const fullscreenBar=document.getElementById('arenaMobileFullscreenBar');
        const brand=document.querySelector('.arena-brand-block');
        if(fullscreen&&card&&fullscreenBar){
            fullscreenBar.hidden=false;
            if(fullscreenBar.parentElement!==card)card.appendChild(fullscreenBar);
            if(brand)fullscreenBar.prepend(brand);
            if(toolbar)fullscreenBar.appendChild(toolbar);
        }else{
            if(brand&&header)header.prepend(brand);
            if(toolbar&&header)header.appendChild(toolbar);
            if(fullscreenBar){fullscreenBar.hidden=true;if(fullscreenBar.parentElement!==document.body)document.body.appendChild(fullscreenBar);}
        }
        if(menu)(fullscreen?card:document.body)?.appendChild(menu);
        if(guide)card?.appendChild(guide);
        const shelfHost=fullscreen?card:document.body;
        if(playerShelf&&shelfHost&&playerShelf.parentElement!==shelfHost)shelfHost.appendChild(playerShelf);
        // The compact tests panel is independent of the skill shelf. Mount it
        // on body in normal mode and inside the fullscreen card when necessary.
        for(const id of ['arenaHeaderActions','touchControlDock','arenaStreamerSkillsDock']){const node=document.getElementById(id);if(node)playerShelf?.appendChild(node);}
        if(typeof arenaMobileKeepStreamerSkillsVisible==='function')arenaMobileKeepStreamerSkillsVisible();
        if(typeof arenaMobileMountTestDrawer==='function')arenaMobileMountTestDrawer();
        if(typeof arenaMobileApplyLayout==='function')requestAnimationFrame(arenaMobileApplyLayout);
        const setup=document.getElementById('arenaPortableSetup');
        if(setup)(fullscreen?card:document.body).appendChild(setup);
        refreshArenaPortableFloatingUI();
        requestAnimationFrame(arenaPortableFitMobileStage);
    }
    // Direct touch and floating UI follow the active portrait/landscape view.
    const oldFocus=setMonitorFocus;setMonitorFocus=function(focus){oldFocus(focus);dockForView();};
    arenaPortableDockForView=dockForView;
    dockForView();
    document.addEventListener('fullscreenchange',()=>{
        document.dispatchEvent(new Event('arena-touch-disable'));
        dockForView();
        requestAnimationFrame(arenaPortableFitMobileStage);
        if(document.fullscreenElement)document.getElementById('arenaMobileFloating')?.querySelector('#arenaPortableFullscreen')?.focus({preventScroll:true});
    });
    window.matchMedia('(orientation:portrait)').addEventListener('change',()=>{
        document.dispatchEvent(new Event('arena-touch-disable'));
        if(!document.fullscreenElement&&!arenaPortableTheater){setMonitorFocus(arenaPreparationDefaultFocus());requestAnimationFrame(fitDualMonitorsSideBySide);}else requestAnimationFrame(arenaPortableFitMobileStage);
    });
    document.addEventListener('visibilitychange',()=>{
        arenaPortableSuspended=document.hidden;previousFrameTime=null;simulationAccumulator=0;arenaLastRenderTime=null;
        if(document.hidden)document.dispatchEvent(new Event('arena-touch-disable'));
    });
    window.addEventListener('resize',()=>requestAnimationFrame(arenaPortableFitMobileStage));
    window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(arenaPortableFitMobileStage));
    if(window.ResizeObserver){const ro=new ResizeObserver(()=>requestAnimationFrame(arenaPortableFitMobileStage));ro.observe(document.getElementById('broadcastStageSection'));}
    setArenaPortableGuideVisible(arenaPortableGuideVisible,false);
    arenaPortableSyncModeControls();
    arenaPortableOpen();
}
window.addEventListener('load',arenaPortableReady,{once:true});
window.ArenaPortable=Object.freeze({build:ARENA_PORTABLE_BUILD,open:arenaPortableOpen,close:arenaPortableClose,start:arenaPortableStart,setMode:arenaPortableSetMode,setResolution:arenaPortableResolution,
    getProfile(){return Object.freeze({...arenaPortableProfile,fps:arenaRuntime.renderFps});}});
