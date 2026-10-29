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
/* Mobile fullscreen format is an outer presentation guide. Never resize or
   crop the true 9:16 world; OBS calibration remains independent. */
const ARENA_MOBILE_FRAME_FORMAT_KEY='arenaMobileFrameFormatV01';
const ARENA_MOBILE_FRAME_FORMATS=Object.freeze(['auto','16','19.5','20','21']);
let arenaMobileFrameFormat='auto';
try{
    const saved=localStorage.getItem(ARENA_MOBILE_FRAME_FORMAT_KEY);
    if(ARENA_MOBILE_FRAME_FORMATS.includes(saved))arenaMobileFrameFormat=saved;
}catch(_){}
function arenaMobileSyncFrameGuide(){
    const guide=document.getElementById('arenaMobileFrameGuide');
    if(!guide)return;
    const root=document.documentElement;
    const fullscreen=!!document.fullscreenElement||arenaPortableTheater;
    const display=fullscreen&&arenaPortableFrameGuideHost?.id==='card-9x16'&&arenaMobileFrameFormat!=='auto';
    guide.hidden=!display;
    root.dataset.mobileFrameFormat=arenaMobileFrameFormat;
    guide.style.setProperty('--arena-mobile-frame-height',arenaMobileFrameFormat==='auto'?'16':arenaMobileFrameFormat);
    if(display)guide.setAttribute('aria-label','Marco de referencia vertical 9:'+arenaMobileFrameFormat);
    const choice=document.getElementById('arenaMobileFullscreenFormat');
    if(choice&&choice.value!==arenaMobileFrameFormat)choice.value=arenaMobileFrameFormat;
}
let arenaPortableFrameGuideHost=null;
function arenaMobileSetFullscreenFormat(format){
    if(!ARENA_MOBILE_FRAME_FORMATS.includes(String(format)))return false;
    arenaMobileFrameFormat=String(format);
    try{localStorage.setItem(ARENA_MOBILE_FRAME_FORMAT_KEY,arenaMobileFrameFormat);}catch(_){}
    arenaMobileSyncFrameGuide();
    return true;
}
function arenaMobileInstallFrameGuide(){
    const guide=document.createElement('div');
    guide.id='arenaMobileFrameGuide';
    guide.hidden=true;
    guide.setAttribute('aria-hidden','true');
    document.body.appendChild(guide);
}

function arenaPortableFitMobileStage(){
    const ratio=arenaPortableActiveRatio();
    const video=document.getElementById(ratio==='16:9'?'viewport16x9':'viewport9x16');
    const stage=document.getElementById('broadcastStageSection');
    const fullscreen=!!document.fullscreenElement||arenaPortableTheater;
    const root=document.documentElement;
    const viewportHeight=Math.max(1,Math.min(window.innerHeight,window.visualViewport?.height||window.innerHeight));
    const top=fullscreen?56:Math.max(0,stage?.getBoundingClientRect().top||0);
    // UI LAYOUT CONTRACT: only the physical header bounds the scene.
    // Gameboy, Streamer abilities, panels, menus, and their sizes never subtract
    // any height from the game. They may overlay or extend past its 9:16 frame.
    const usable=Math.max(100,Math.floor(viewportHeight-top-(fullscreen?2:0)));
    const next=usable+'px';
    if(root.style.getPropertyValue('--arena-mobile-video-height')!==next)
        root.style.setProperty('--arena-mobile-video-height',next);
    root.style.setProperty('--arena-mobile-reserved-bottom','0px');
    if(typeof arenaMobileKeepStreamerSkillsVisible==='function')arenaMobileKeepStreamerSkillsVisible();
    if(typeof arenaMobileApplyLayout==='function')arenaMobileApplyLayout();
    const shelf=document.getElementById('arenaMobileControlShelf');
    const shelfH=(arenaPortableProfile.mode===ARENA_MOBILE_MODES.DIRECTOR?74:
        Math.max(144,Number.parseFloat(root.style.getPropertyValue('--arena-mobile-player-shelf-height'))||145));
    // The shelf is a transparent overlay anchored to the *physical display*,
    // not a reserve under the video. A large joystick can cross the video edge.
    // Overlay controls live below the visual arena horizon, never in a
    // reserved footer that would reduce the gameplay canvas.
    const box=video?.getBoundingClientRect();
    const fraction=arenaPortableProfile.mode===ARENA_MOBILE_MODES.DIRECTOR?.87:.73;
    const candidate=box&&box.height>80
        ?box.top+box.height*fraction
        :viewportHeight-shelfH*.85;
    const topPx=Math.round(Math.max(56,Math.min(viewportHeight-44,candidate)))+'px';
    if(root.style.getPropertyValue('--arena-mobile-controls-top')!==topPx)
        root.style.setProperty('--arena-mobile-controls-top',topPx);
    if(shelf)shelf.setAttribute('data-overlay-only','true');
    if(typeof arenaMobilePositionTestDrawer==='function')arenaMobilePositionTestDrawer();
    arenaMobileSyncFrameGuide();
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
        button.id='arenaMobileMenuClose';button.type='button';
        button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" focusable="false"><path d="M5 5L19 19M19 5L5 19" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>';
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
    arenaMobileInstallFrameGuide();
    const playerShelf=document.createElement('section');playerShelf.id='arenaMobileControlShelf';playerShelf.setAttribute('aria-label','Controles del juego y herramientas');
    document.getElementById('card-9x16')?.appendChild(playerShelf);
    const playerStatus=document.createElement('output');
    playerStatus.id='arenaMobileProtaStatus';playerStatus.hidden=true;
    playerStatus.setAttribute('role','status');playerStatus.setAttribute('aria-live','polite');
    playerShelf.appendChild(playerStatus);
    function arenaMobileRefreshProtaStatus(){
        if(arenaPortableProfile.mode!==ARENA_MOBILE_MODES.PLAYER||arenaPortableSetupOpen||typeof fighters==='undefined'||gameState!=='COMBAT'){
            playerStatus.hidden=true;return;
        }
        const alive=fighters.filter(f=>!f.eliminated);
        const video=document.getElementById(arenaPortableActiveRatio()==='16:9'?'viewport16x9':'viewport9x16');
        const vr=video?.getBoundingClientRect();
        if(vr&&vr.width>20&&vr.height>30){
            const right=Math.max(8,window.innerWidth-vr.right+7);
            const maxTop=Math.max(58,window.innerHeight-42);
            const top=Math.min(maxTop,Math.max(58,vr.bottom-46));
            playerStatus.style.setProperty('--arena-prota-right',Math.round(right)+'px');
            playerStatus.style.setProperty('--arena-prota-top',Math.round(top)+'px');
        }
        const prota=alive.find(f=>f.isStreamer);
        if(!prota){playerStatus.textContent='Prota fuera de combate';playerStatus.hidden=false;}
        else if(alive.length>=24){playerStatus.textContent='🎮 Prota en combate · '+alive.length+' luchadores';playerStatus.hidden=false;}
        else playerStatus.hidden=true;
    }
    setInterval(arenaMobileRefreshProtaStatus,700);
    const gestureGuide=document.createElement('aside');gestureGuide.id='arenaMobileGestureGuide';gestureGuide.setAttribute('aria-label','Cómo controlar el protagonista');
    gestureGuide.innerHTML='<span class="arena-mobile-gesture-side"><strong>IZQUIERDA</strong> Desliza · mover</span><span class="arena-mobile-gesture-side"><strong>DERECHA</strong> Toca · saltar <i>·</i> Desliza ↑↓←→ · golpear <i>·</i> Mantén + ↑↓ · especial</span>';
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
        const frameGuide=document.getElementById('arenaMobileFrameGuide');
        if(frameGuide){const guideHost=card||document.body;arenaPortableFrameGuideHost=guideHost;
            if(frameGuide.parentElement!==guideHost)guideHost.appendChild(frameGuide);
            arenaMobileSyncFrameGuide();
        }
        if(menu)(fullscreen?card:document.body)?.appendChild(menu);
        if(guide)card?.appendChild(guide);
        const shelfHost=fullscreen?card:document.body;
        if(playerShelf&&shelfHost&&playerShelf.parentElement!==shelfHost)shelfHost.appendChild(playerShelf);
        // The compact tests panel is independent of the skill shelf. Mount it
        // on body in normal mode and inside the fullscreen card when necessary.
        for(const id of ['arenaMobileActionLayer','touchControlDock','arenaStreamerSkillsDock']){const node=document.getElementById(id);if(node)playerShelf?.appendChild(node);}
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
window.ArenaMobileFrame=Object.freeze({set:arenaMobileSetFullscreenFormat,get:()=>arenaMobileFrameFormat});
window.ArenaPortable=Object.freeze({build:ARENA_PORTABLE_BUILD,open:arenaPortableOpen,close:arenaPortableClose,start:arenaPortableStart,setMode:arenaPortableSetMode,setResolution:arenaPortableResolution,
    getProfile(){return Object.freeze({...arenaPortableProfile,fps:arenaRuntime.renderFps});}});

// Mobile-only presentation strings in eight languages. IDs and chat commands never change.
const ARENA_MOBILE_LANGUAGE_CODES=Object.freeze(["es","en","fr","de","zh","ja","pt","it"]);
const ARENA_MOBILE_TRANSLATIONS=Object.freeze([["Modo jugador","Player mode","Mode joueur","Spielermodus","玩家模式","プレイヤーモード","Modo jogador","Modalità giocatore"],["Modo Streamer","Streamer mode","Mode streamer","Streamer-Modus","主播模式","配信者モード","Modo Streamer","Modalità streamer"],["🎮 Modo jugador","🎮 Player mode","🎮 Mode joueur","🎮 Spielermodus","🎮 玩家模式","🎮 プレイヤーモード","🎮 Modo jogador","🎮 Modalità giocatore"],["🎛 Modo Streamer","🎛 Streamer mode","🎛 Mode streamer","🎛 Streamer-Modus","🎛 主播模式","🎛 配信者モード","🎛 Modo Streamer","🎛 Modalità streamer"],["Modo de juego","Game mode","Mode de jeu","Spielmodus","游戏模式","ゲームモード","Modo de jogo","Modalità di gioco"],["ARENA LIVE · OPCIONES","ARENA LIVE · OPTIONS","ARENA LIVE · OPTIONS","ARENA LIVE · OPTIONEN","ARENA LIVE · 选项","ARENA LIVE · オプション","ARENA LIVE · OPÇÕES","ARENA LIVE · OPZIONI"],["❔ Instrucciones","❔ Instructions","❔ Instructions","❔ Anleitung","❔ 说明","❔ 操作説明","❔ Instruções","❔ Istruzioni"],["ⓘ Acerca del juego","ⓘ About the game","ⓘ À propos du jeu","ⓘ Über das Spiel","ⓘ 关于游戏","ⓘ ゲームについて","ⓘ Sobre o jogo","ⓘ Info sul gioco"],["🎮 Partida","🎮 Match","🎮 Partie","🎮 Spiel","🎮 对局","🎮 対戦","🎮 Partida","🎮 Partita"],["Partida","Match","Partie","Spiel","对局","対戦","Partida","Partita"],["Lobby · Nueva · Revancha","Lobby · New · Rematch","Lobby · Nouvelle · Revanche","Lobby · Neu · Rückkampf","大厅 · 新对局 · 再战","ロビー · 新規 · 再戦","Lobby · Nova · Revanche","Lobby · Nuova · Rivincita"],["＋ Nueva partida","＋ New match","＋ Nouvelle partie","＋ Neues Spiel","＋ 新对局","＋ 新しい対戦","＋ Nova partida","＋ Nuova partita"],["🎮 Nueva partida","🎮 New match","🎮 Nouvelle partie","🎮 Neues Spiel","🎮 新对局","🎮 新しい対戦","🎮 Nova partida","🎮 Nuova partita"],["Nueva partida","New match","Nouvelle partie","Neues Spiel","新对局","新しい対戦","Nova partida","Nuova partita"],["🚪 Abrir lobby","🚪 Open lobby","🚪 Ouvrir le lobby","🚪 Lobby öffnen","🚪 打开大厅","🚪 ロビーを開く","🚪 Abrir lobby","🚪 Apri lobby"],["🔄 Revancha","🔄 Rematch","🔄 Revanche","🔄 Rückkampf","🔄 再战","🔄 再戦","🔄 Revanche","🔄 Rivincita"],["🎭 Protagonista","🎭 Main character","🎭 Personnage principal","🎭 Hauptfigur","🎭 主角","🎭 主人公","🎭 Protagonista","🎭 Protagonista"],["Cambiar a Modo Streamer","Switch to streamer mode","Passer au mode streamer","Zum Streamer-Modus wechseln","切换到主播模式","配信者モードに切り替える","Mudar para modo Streamer","Passa alla modalità streamer"],["Cambiar a Modo jugador","Switch to player mode","Passer au mode joueur","Zum Spielermodus wechseln","切换到玩家模式","プレイヤーモードに切り替える","Mudar para modo jogador","Passa alla modalità giocatore"],["Continuar combate","Resume match","Reprendre le combat","Kampf fortsetzen","继续战斗","対戦を再開","Retomar combate","Riprendi combattimento"],["Pausar combate","Pause match","Mettre le combat en pause","Kampf pausieren","暂停战斗","対戦を一時停止","Pausar combate","Pausa combattimento"],["Salir de pantalla completa","Exit fullscreen","Quitter le plein écran","Vollbild verlassen","退出全屏","全画面を終了","Sair da tela cheia","Esci da schermo intero"],["Pantalla completa","Fullscreen","Plein écran","Vollbild","全屏","全画面表示","Tela cheia","Schermo intero"],["Ocultar instrucciones","Hide instructions","Masquer les instructions","Anleitung ausblenden","隐藏说明","操作説明を隠す","Ocultar instruções","Nascondi istruzioni"],["Mostrar instrucciones","Show instructions","Afficher les instructions","Anleitung anzeigen","显示说明","操作説明を表示","Mostrar instruções","Mostra istruzioni"],["🙈 Ocultar instrucciones","🙈 Hide instructions","🙈 Masquer les instructions","🙈 Anleitung ausblenden","🙈 隐藏说明","🙈 操作説明を隠す","🙈 Ocultar instruções","🙈 Nascondi istruzioni"],["❔ Mostrar instrucciones","❔ Show instructions","❔ Afficher les instructions","❔ Anleitung anzeigen","❔ 显示说明","❔ 操作説明を表示","❔ Mostrar instruções","❔ Mostra istruzioni"],["Cerrar menú","Close menu","Fermer le menu","Menü schließen","关闭菜单","メニューを閉じる","Fechar menu","Chiudi menu"],["Abrir menú","Open menu","Ouvrir le menu","Menü öffnen","打开菜单","メニューを開く","Abrir menu","Apri menu"],["Cerrar prueba rápida","Close quick setup","Fermer la configuration rapide","Schnelleinrichtung schließen","关闭快速设置","クイック設定を閉じる","Fechar teste rápido","Chiudi prova rapida"],["Abrir opciones del Modo Streamer","Open streamer options","Ouvrir les options streamer","Streamer-Optionen öffnen","打开主播选项","配信者オプションを開く","Abrir opções do Streamer","Apri opzioni streamer"],["Opciones del Modo Streamer","Streamer options","Options streamer","Streamer-Optionen","主播选项","配信者オプション","Opções do Streamer","Opzioni streamer"],["🎛 Opciones del Modo Streamer","🎛 Streamer options","🎛 Options streamer","🎛 Streamer-Optionen","🎛 主播选项","🎛 配信者オプション","🎛 Opções do Streamer","🎛 Opzioni streamer"],["Arrastra para mover el panel","Drag to move panel","Glisser pour déplacer","Zum Verschieben ziehen","拖动以移动面板","ドラッグで移動","Arraste para mover o painel","Trascina per spostare"],["Transparencia del panel","Panel transparency","Transparence du panneau","Paneltransparenz","面板透明度","パネルの透明度","Transparência do painel","Trasparenza del pannello"],["Transparencia del panel de pruebas","Test panel transparency","Transparence du panneau de test","Testpanel-Transparenz","测试面板透明度","テストパネルの透明度","Transparência do painel de testes","Trasparenza del pannello test"],["Minimizar panel","Minimize panel","Réduire le panneau","Panel minimieren","最小化面板","パネルを最小化","Minimizar painel","Riduci pannello"],["Expandir panel","Expand panel","Agrandir le panneau","Panel erweitern","展开面板","パネルを展開","Expandir painel","Espandi pannello"],["Cerrar pruebas","Close tests","Fermer les tests","Tests schließen","关闭测试","テストを閉じる","Fechar testes","Chiudi test"],["Herramienta","Tool","Outil","Werkzeug","工具","ツール","Ferramenta","Strumento"],["Jugador y comandos","Player and commands","Joueur et commandes","Spieler und Befehle","玩家与指令","プレイヤーとコマンド","Jogador e comandos","Giocatore e comandi"],["Participantes y K.O.","Participants and K.O.","Participants et K.O.","Teilnehmer und K.O.","参与者与 K.O.","参加者と K.O.","Participantes e K.O.","Partecipanti e K.O."],["Escenarios","Scenarios","Scénarios","Szenarien","场景","シナリオ","Cenários","Scenari"],["Interacciones","Interactions","Interactions","Interaktionen","互动","インタラクション","Interações","Interazioni"],["Simulación","Simulation","Simulation","Simulation","模拟","シミュレーション","Simulação","Simulazione"],["Habilidades del modo streamer","Streamer abilities","Compétences du streamer","Streamer-Fähigkeiten","主播技能","配信者のスキル","Habilidades do Streamer","Abilità streamer"],["Acciones táctiles del protagonista","Main-character touch actions","Actions tactiles du personnage principal","Touch-Aktionen der Hauptfigur","主角触控操作","主人公のタッチ操作","Ações táteis do protagonista","Azioni touch del protagonista"],["IZQUIERDA","LEFT","GAUCHE","LINKS","左侧","左側","ESQUERDA","SINISTRA"],["DERECHA","RIGHT","DROITE","RECHTS","右侧","右側","DIREITA","DESTRA"],["Desliza · mover","Swipe · move","Glisser · déplacer","Wischen · bewegen","滑动 · 移动","スワイプ · 移動","Deslize · mover","Scorri · muovi"],["Toca · saltar","Tap · jump","Toucher · sauter","Tippen · springen","点击 · 跳跃","タップ · ジャンプ","Toque · pular","Tocca · salta"],["Desliza ↑↓←→ · golpear","Swipe ↑↓←→ · attack","Glisser ↑↓←→ · frapper","Wischen ↑↓←→ · schlagen","滑动 ↑↓←→ · 攻击","スワイプ ↑↓←→ · 攻撃","Deslize ↑↓←→ · atacar","Scorri ↑↓←→ · colpisci"],["Mantén + ↑↓ · especial","Hold + ↑↓ · special","Maintenir + ↑↓ · spécial","Halten + ↑↓ · Spezial","长按 + ↑↓ · 特技","長押し + ↑↓ · 必殺技","Segure + ↑↓ · especial","Tieni premuto + ↑↓ · speciale"],["ARENA LIVE · ARCHIVO SIN CONEXIÓN","ARENA LIVE · OFFLINE FILE","ARENA LIVE · FICHIER HORS LIGNE","ARENA LIVE · OFFLINE-DATEI","ARENA LIVE · 离线文件","ARENA LIVE · オフライン版","ARENA LIVE · ARQUIVO OFFLINE","ARENA LIVE · FILE OFFLINE"],["Sobre Arena Live","About Arena Live","À propos d’Arena Live","Über Arena Live","关于 Arena Live","Arena Liveについて","Sobre Arena Live","Informazioni su Arena Live"],["🎥 Un juego pensado para streaming","🎥 Built for streaming","🎥 Conçu pour le streaming","🎥 Für Livestreams gemacht","🎥 专为直播设计","🎥 配信向けゲーム","🎥 Feito para lives","🎥 Pensato per le dirette"],["No mostrar de nuevo","Don't show again","Ne plus afficher","Nicht mehr anzeigen","不再显示","今後表示しない","Não mostrar novamente","Non mostrare più"],["Peleadores","Fighters","Combattants","Kämpfer","战斗角色","ファイター","Lutadores","Combattenti"],["Tu clase","Your class","Votre classe","Deine Klasse","你的职业","自分のクラス","Sua classe","La tua classe"],["¿Cómo quieres jugar?","How do you want to play?","Comment voulez-vous jouer ?","Wie möchtest du spielen?","你想怎么玩？","どのモードで遊びますか？","Como você quer jogar?","Come vuoi giocare?"],["▶ Iniciar partida","▶ Start match","▶ Démarrer la partie","▶ Spiel starten","▶ 开始对局","▶ 対戦開始","▶ Iniciar partida","▶ Inizia partita"],["540p · Ahorro","540p · Battery saver","540p · Économie","540p · Sparmodus","540p · 省电","540p · 省電力","540p · Economia","540p · Risparmio"],["720p · Normal","720p · Normal","720p · Normal","720p · Normal","720p · 标准","720p · 標準","720p · Normal","720p · Normale"],["1080p · Detalle","1080p · Detail","1080p · Détails","1080p · Details","1080p · 高清","1080p · 高画質","1080p · Detalhe","1080p · Dettaglio"],["30 FPS · Ahorro","30 FPS · Battery saver","30 FPS · Économie","30 FPS · Sparmodus","30 FPS · 省电","30 FPS · 省電力","30 FPS · Economia","30 FPS · Risparmio"],["Duelo","Duel","Duel","Duell","决斗","デュエル","Duelo","Duello"],["Smash","Smash","Smash","Smash","乱斗","スマッシュ","Smash","Smash"],["Preparar combate","Prepare match","Préparer le combat","Kampf vorbereiten","准备战斗","対戦準備","Preparar combate","Prepara combattimento"],["Sin conexión LIVE","LIVE disconnected","LIVE déconnecté","LIVE nicht verbunden","直播未连接","LIVE未接続","LIVE desconectado","LIVE non connesso"],["· Archivo móvil sin conexión","· Offline mobile file","· Fichier mobile hors ligne","· Offline-Mobilversion","· 离线移动版","· オフラインモバイル版","· Arquivo móvel offline","· File mobile offline"],["Prota fuera de combate","Main character eliminated","Personnage principal éliminé","Hauptfigur ausgeschieden","主角已出局","主人公は脱落しました","Protagonista eliminado","Protagonista eliminato"],["Acomodar botones","Arrange buttons","Disposer les boutons","Tasten anordnen","排列按钮","ボタンを配置","Organizar botões","Disponi pulsanti"],["📱 Modo jugador: controles","📱 Player controls","📱 Commandes du joueur","📱 Spielersteuerung","📱 玩家控制","📱 プレイヤー操作","📱 Controles do jogador","📱 Comandi giocatore"],["✥ Acomodar analógico y botones","✥ Arrange stick and buttons","✥ Disposer joystick et boutons","✥ Stick und Tasten anordnen","✥ 调整摇杆与按钮","✥ スティックとボタンを配置","✥ Organizar analógico e botões","✥ Disponi levetta e pulsanti"],["Tamaño de botones","Button size","Taille des boutons","Tastengröße","按钮大小","ボタンサイズ","Tamanho dos botões","Dimensione pulsanti"],["↺ Restablecer posiciones","↺ Reset positions","↺ Réinitialiser les positions","↺ Positionen zurücksetzen","↺ 重置位置","↺ 位置をリセット","↺ Redefinir posições","↺ Ripristina posizioni"],["Guardar posiciones","Save positions","Enregistrer les positions","Positionen speichern","保存位置","位置を保存","Salvar posições","Salva posizioni"],["Formato de pantalla completa","Fullscreen format","Format plein écran","Vollbildformat","全屏格式","全画面形式","Formato de tela cheia","Formato schermo intero"],["Saltar","Jump","Sauter","Springen","跳跃","ジャンプ","Pular","Salta"],["Golpe básico","Basic attack","Coup de base","Normaler Angriff","普通攻击","通常攻撃","Golpe básico","Attacco base"],["Poder especial","Special ability","Pouvoir spécial","Spezialfähigkeit","特殊技能","必殺技","Poder especial","Potere speciale"],["Ahorro","Battery saver","Économie","Sparmodus","省电","省電力","Economia","Risparmio"]]);
const ARENA_MOBILE_DICTIONARY=new Map(ARENA_MOBILE_TRANSLATIONS.map(row=>[row[0],row]));
const arenaMobileI18nTextSource=new WeakMap(),arenaMobileI18nAttrSource=new WeakMap();
function arenaMobileText(span,lang=currentLanguage){
    const source=String(span??'');const idx=ARENA_MOBILE_LANGUAGE_CODES.indexOf(lang);
    if(idx<=0)return source;
    const direct=ARENA_MOBILE_DICTIONARY.get(source);
    if(direct)return direct[idx];
    const value=source.trim(),row=ARENA_MOBILE_DICTIONARY.get(value);
    if(row){const i=source.indexOf(value);return source.slice(0,i)+row[idx]+source.slice(i+value.length);}
    return typeof localizeText==='function'?localizeText(source,lang):source;
}
function arenaMobileLocalizeAll(){
    if(typeof document==='undefined')return;
    const roots=document.querySelectorAll('#arenaPortableSetup,#arenaMobileFloating,#arenaMobileFullscreenBar,#arenaPortableTestDrawer,#arenaMobileControlSettings,#arenaMobileDisplaySettings,#arenaMobileGestureGuide,#arenaMobileControlShelf,#arenaMobileFrameGuide,#arenaOperatorPopover [data-operator-panel="mobile"],#arenaProtaClassLabel,#arenaTikTokChatStatus');
    for(const root of roots){
        const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
        while((node=walker.nextNode())){
            if(node.parentElement?.closest('script,style,textarea,code,kbd,.arena-work-panel'))continue;
            let state=arenaMobileI18nTextSource.get(node);
            if(!state||state.output!==node.nodeValue){state={source:node.nodeValue,output:node.nodeValue};arenaMobileI18nTextSource.set(node,state);}
            const next=arenaMobileText(state.source);
            if(next!==node.nodeValue)node.nodeValue=next;state.output=next;
        }
        for(const el of [root,...root.querySelectorAll('*')]){
            if(el.closest('.arena-work-panel'))continue;
            let state=arenaMobileI18nAttrSource.get(el);
            if(!state){state={};arenaMobileI18nAttrSource.set(el,state);}
            for(const attribute of ['title','aria-label','aria-description','placeholder']){
                if(!el.hasAttribute(attribute))continue;
                const actual=el.getAttribute(attribute);
                if(!state[attribute]||state[attribute].output!==actual)state[attribute]={source:actual,output:actual};
                const next=arenaMobileText(state[attribute].source);
                if(actual!==next)el.setAttribute(attribute,next);state[attribute].output=next;
            }
        }
    }
}
window.addEventListener('load',()=>arenaMobileLocalizeAll(),{once:true});
