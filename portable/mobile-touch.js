// Touch-first controls and a movable test panel for the standalone phone edition.
// Desktop/OBS retains its own controls; this adapter never changes combat rules.
const ARENA_MOBILE_TAP_GAP=325;
const ARENA_MOBILE_LAYOUT_KEY='arenaLiveMobileButtonsV1';
const arenaMobileLayoutDefaults=Object.freeze({touchJoystick:[13,50],arenaMobilePower:[46,50],arenaMobileJump:[67,50],arenaMobileAttack:[89,50]});
let arenaMobileLayout={size:70,points:Object.fromEntries(Object.entries(arenaMobileLayoutDefaults).map(([k,v])=>[k,[...v]]))};
let arenaMobileEditing=false;
try{const saved=JSON.parse(localStorage.getItem(ARENA_MOBILE_LAYOUT_KEY)||'null');if(saved&&Number.isFinite(saved.size))arenaMobileLayout.size=Math.max(56,Math.min(94,saved.size));for(const [id,p]of Object.entries(saved?.points||{})){if(Object.hasOwn(arenaMobileLayoutDefaults,id)&&Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))arenaMobileLayout.points[id]=[Math.max(7,Math.min(93,p[0])),Math.max(8,Math.min(95,p[1]))];}}catch(_){}
const ARENA_MOBILE_HOLD_MS=460;
const ARENA_MOBILE_SWIPE_PX=34;
const arenaMobileTouchState={pointerId:null,startX:0,startY:0,x:0,y:0,tapCount:0,lastTapAt:0,lastTapX:0,lastTapY:0,jumpRetry:null};
const arenaMobileActionState={pointerId:null,startX:0,startY:0,x:0,y:0,startedAt:0,moved:false,special:false,hold:null};
const arenaMobileTestState={open:false,active:'arenaPanelPowers'};
function arenaMobileActor(){
    return fighters.find(f=>f.isStreamer&&!f.eliminated)||null;
}
function arenaMobileCanControl(){
    return arenaPortableProfile.mode===ARENA_MOBILE_MODES.PLAYER&&!arenaPortableSetupOpen&&!isGamePaused&&!isSettingsOpen&&gameState==='COMBAT'&&streamerManualControl&&!!arenaMobileActor();
}
function arenaMobileClearDirections(){
    keys.a=false;keys.d=false;keys.w=false;keys.s=false;
}
function arenaMobileTouchTarget(view,event){
    const actor=arenaMobileActor(),rect=view.getBoundingClientRect();
    if(!actor||rect.width<=0||rect.height<=0)return {x:rect.width/2,y:rect.height/2};
    const portrait=view.id==='viewport9x16';
    const width=portrait?540:960,height=portrait?960:540;
    const camX=portrait?camera9x16.x:WORLD_W*.5;
    const camY=portrait?camera9x16.y:WORLD_H*.54;
    const zoom=portrait?camera9x16.zoom:(activeMode==='iso'?1.12:1);
    return {x:rect.width*(.5+(actor.x-camX)*zoom/width),
            y:rect.height*(.56+(actor.y-(actor.z||0)-camY)*zoom/height)};
}
function arenaMobileApplyDirection(view,x,y){
    if(!arenaMobileCanControl()){arenaMobileClearDirections();return;}
    const rect=view.getBoundingClientRect(),actor=arenaMobileTouchTarget(view);
    const dx=x-rect.left-actor.x,dy=y-rect.top-actor.y;
    const dead=Math.max(18,Math.min(35,rect.width*.065));
    keys.a=dx < -dead;keys.d=dx>dead;
    keys.w=activeMode==='iso'&&dy < -dead;
    keys.s=activeMode==='iso'&&dy>dead;
    const fighter=arenaMobileActor();
    if(fighter && Math.abs(dx)>dead)fighter.facing=dx>0?1:-1;
}
function arenaMobileClearHold(){const a=arenaMobileActionState;if(a.hold!==null){clearTimeout(a.hold);a.hold=null;}}
function arenaMobileClearRetry(){if(arenaMobileTouchState.jumpRetry!==null){clearTimeout(arenaMobileTouchState.jumpRetry);arenaMobileTouchState.jumpRetry=null;}}
function arenaMobileResetAction(){arenaMobileClearHold();const a=arenaMobileActionState;a.pointerId=null;a.moved=false;a.special=false;}
function arenaMobileResetTouch(){
    arenaMobileTouchState.pointerId=null;arenaMobileResetAction();arenaMobileClearDirections();
    document.querySelectorAll('.arena-mobile-contact').forEach(n=>n.hidden=true);
}
function arenaMobileSecondJump(){
    arenaMobileClearRetry();
    const deadline=performance.now()+430;
    const attempt=()=>{
        arenaMobileTouchState.jumpRetry=null;
        if(!arenaMobileCanControl())return;
        const fighter=arenaMobileActor();
        if(!fighter||fighter.jumpsLeft<=0)return;
        if(fighter.doubleJumpCooldown>0 && performance.now()<deadline){
            arenaMobileTouchState.jumpRetry=setTimeout(attempt,35);return;
        }
        if(activeMode==='iso')performIsometricJump(fighter,true);
        else if(!fighter.onGround)triggerManualJump();
    };
    attempt();
}
function arenaMobileJumpTap(x=0,y=0){
    const st=arenaMobileTouchState,now=performance.now();
    if(now-st.lastTapAt<=ARENA_MOBILE_TAP_GAP&&Math.hypot(x-st.lastTapX,y-st.lastTapY)<65)st.tapCount++;
    else st.tapCount=1;
    st.lastTapAt=now;st.lastTapX=x;st.lastTapY=y;
    if(st.tapCount===1){triggerManualJump();if(navigator.vibrate)navigator.vibrate(8);}
    else {st.tapCount=0;arenaMobileSecondJump();if(navigator.vibrate)navigator.vibrate([12,35,12]);}
}
function arenaMobileTouchPoint(view,x,y){
    const dot=view.querySelector('.arena-mobile-contact');
    if(!dot)return;
    const rect=view.getBoundingClientRect();
    dot.hidden=false;dot.style.left=(x-rect.left)+'px';dot.style.top=(y-rect.top)+'px';
}
// Táctil total: both thumbs work at the same time, with separate pointer IDs.
// Left half steers; right half provides instant jump, swipe attack and hold power.
function arenaMobileTouchStart(event){
    if(event.pointerType==='mouse'||!arenaMobileCanControl())return;
    if(event.target instanceof Element&&event.target.closest('button,input,select,textarea,summary,a,dialog,#touchControlDock,#arenaPortableSetup,#arenaMobileFloating,#arenaHeaderActions,#arenaOperatorPopover,#arenaPortableTestDrawer,.arena-onboarding'))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(arenaPortableProfile.touchMode!=='touch')return;
    const view=event.currentTarget,rect=view.getBoundingClientRect();
    if(event.clientX-rect.left>=rect.width*.53){
        const a=arenaMobileActionState;if(a.pointerId!==null)return;
        a.pointerId=event.pointerId;a.startX=a.x=event.clientX;a.startY=a.y=event.clientY;
        a.startedAt=performance.now();a.moved=false;a.special=false;
        a.hold=setTimeout(()=>{
            a.hold=null;
            if(a.pointerId===event.pointerId&&!a.moved&&arenaMobileCanControl()){
                a.special=true;
                if(triggerProtagonistSpecialAttack()&&navigator.vibrate)navigator.vibrate(16);
            }
        },ARENA_MOBILE_HOLD_MS);
    }else{
        const st=arenaMobileTouchState;if(st.pointerId!==null)return;
        st.pointerId=event.pointerId;st.startX=st.x=event.clientX;st.startY=st.y=event.clientY;
        arenaMobileTouchPoint(view,st.x,st.y);
    }
    try{view.setPointerCapture(event.pointerId);}catch(_){}
}
function arenaMobileTouchMove(event){
    if(arenaMobileActionState.pointerId===event.pointerId){
        event.preventDefault();event.stopImmediatePropagation();
        const a=arenaMobileActionState;a.x=event.clientX;a.y=event.clientY;
        if(Math.hypot(a.x-a.startX,a.y-a.startY)>16){a.moved=true;arenaMobileClearHold();}
        return;
    }
    const st=arenaMobileTouchState;
    if(st.pointerId!==event.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();
    st.x=event.clientX;st.y=event.clientY;
    const dx=st.x-st.startX,dy=st.y-st.startY,dead=13;
    keys.a=dx< -dead;keys.d=dx>dead;
    keys.w=activeMode==='iso'&&dy< -dead;keys.s=activeMode==='iso'&&dy>dead;
    const fighter=arenaMobileActor();
    if(fighter&&Math.abs(dx)>dead)fighter.facing=dx>0?1:-1;
    arenaMobileTouchPoint(event.currentTarget,st.x,st.y);
}
function arenaMobileTouchEnd(event){
    if(arenaMobileActionState.pointerId===event.pointerId){
        event.preventDefault();event.stopImmediatePropagation();
        const a=arenaMobileActionState;a.x=event.clientX;a.y=event.clientY;
        const dx=a.x-a.startX,dy=a.y-a.startY,elapsed=performance.now()-a.startedAt;
        const special=a.special,moved=a.moved;
        arenaMobileResetAction();
        if(!arenaMobileCanControl()||special)return;
        if(!moved&&elapsed>=ARENA_MOBILE_HOLD_MS){
            if(triggerProtagonistSpecialAttack()&&navigator.vibrate)navigator.vibrate(16);
        }else if(Math.hypot(dx,dy)>=ARENA_MOBILE_SWIPE_PX&&elapsed<=500){
            const fighter=arenaMobileActor();
            if(fighter){if(Math.abs(dx)>6)fighter.facing=dx>0?1:-1;performMeleeAttack(fighter);}
            arenaMobileTouchState.tapCount=0;
        }else if(!moved&&elapsed<ARENA_MOBILE_HOLD_MS){
            arenaMobileJumpTap(a.x,a.y);
        }
        return;
    }
    if(arenaMobileTouchState.pointerId!==event.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();
    arenaMobileTouchState.pointerId=null;arenaMobileClearDirections();
    document.querySelectorAll('.arena-mobile-contact').forEach(n=>n.hidden=true);
}
function arenaMobileTouchCancel(event){
    if(arenaMobileActionState.pointerId===event.pointerId){event.stopImmediatePropagation();arenaMobileResetAction();return;}
    if(arenaMobileTouchState.pointerId!==event.pointerId)return;
    event.stopImmediatePropagation();arenaMobileTouchState.pointerId=null;arenaMobileClearDirections();
    document.querySelectorAll('.arena-mobile-contact').forEach(n=>n.hidden=true);
}
function arenaMobileTestPanel(){
    return document.getElementById(arenaMobileTestState.active);
}
function arenaMobileMountTestDrawer(){
    const drawer=document.getElementById('arenaPortableTestDrawer');
    if(!drawer)return;
    // The 9:16 viewport and the compact skill shelf must never clip advanced tests.
    // Native fullscreen hides normal document siblings; move the SAME drawer into
    // the fullscreen card (not into the 9:16 video) and restore it afterward.
    const fullscreen=document.fullscreenElement;
    const card=fullscreen?.matches?.('#card-9x16,#card-16x9')
        ?fullscreen:fullscreen?.querySelector?.('#card-9x16,#card-16x9');
    const host=card||document.body;
    if(drawer.parentElement!==host)host.appendChild(drawer);
    drawer.style.removeProperty('top');
    drawer.style.removeProperty('left');
    drawer.style.removeProperty('right');
    drawer.style.removeProperty('bottom');
}
function arenaMobileSelectTestPanel(id){
    const allowed=['arenaPanelPowers','arenaPanelPlayers','arenaPanelScenarios','arenaPanelSocial','arenaPanelSimulation'];
    if(!allowed.includes(id))return false;
    const host=document.getElementById('arenaMobilePanelHost');
    const mount=document.getElementById('arenaPortableTestBody');
    if(!host||!mount)return false;
    const prior=mount.querySelector('.arena-work-panel');
    if(prior)host.appendChild(prior);
    const panel=document.getElementById(id);
    if(!panel)return false;
    mount.appendChild(panel);panel.hidden=false;panel.open=true;
    panel.style.cssText='';panel.querySelector('.arena-panel-body')?.style.removeProperty('height');
    arenaMobileTestState.active=id;
    document.getElementById('arenaPortableTestSelect').value=id;
    refreshArenaTargetPanel();
    return true;
}
function arenaMobileShowTestDrawer(open=true){
    const drawer=document.getElementById('arenaPortableTestDrawer');
    if(!drawer)return;
    arenaMobileTestState.open=!!open;
    if(open){
        closeArenaOperatorPopover(false);
        if(isSettingsOpen)toggleSettingsModal(false);
        arenaMobileMountTestDrawer();
        arenaMobileSelectTestPanel(arenaMobileTestState.active);
    }else{
        const panel=drawer.querySelector('.arena-work-panel');
        if(panel)document.getElementById('arenaMobilePanelHost')?.appendChild(panel);
    }
    drawer.hidden=!open;
    drawer.classList.remove('is-collapsed'); // Always reopen with actual options visible.
    document.getElementById('arenaMobileControlShelf')?.classList.toggle('has-open-tests',!!open);
    for(const id of ['card-9x16','card-16x9'])document.getElementById(id)?.classList.toggle('arena-tests-visible',!!open);
    const shortcut=document.getElementById('arenaMobileTestsShortcut');
    if(shortcut){shortcut.setAttribute('aria-expanded',String(!!open));shortcut.setAttribute('aria-controls','arenaPortableTestDrawer');}
    const fab=document.getElementById('arenaMobileTestFab');
    if(fab)fab.setAttribute('aria-expanded',String(!!open));
    // A fixed drawer is already visible: scrolling the document would move the game.
}
function arenaMobileInstallTestDrawer(){
    const drawer=document.createElement('aside');
    drawer.id='arenaPortableTestDrawer';drawer.hidden=true;
    drawer.setAttribute('role','region');drawer.setAttribute('aria-live','off');
    drawer.setAttribute('aria-label','Opciones del Modo Streamer');
    drawer.innerHTML='<div id="arenaPortableTestHead"><span>🎛 Modo Streamer</span><button type="button" id="arenaPortableTestCollapse" aria-label="Minimizar panel">−</button><button type="button" id="arenaPortableTestClose" aria-label="Cerrar pruebas">×</button></div><label class="arena-portable-test-picker">Herramienta<select id="arenaPortableTestSelect"><option value="arenaPanelPowers">Jugador y comandos</option><option value="arenaPanelPlayers">Participantes y K.O.</option><option value="arenaPanelScenarios">Escenarios</option><option value="arenaPanelSocial">Interacciones</option><option value="arenaPanelSimulation">Simulación</option></select></label><div id="arenaPortableTestBody"></div>';
    document.body.appendChild(drawer);
    drawer.querySelector('#arenaPortableTestSelect').addEventListener('change',event=>arenaMobileSelectTestPanel(event.target.value));
    drawer.querySelector('#arenaPortableTestClose').onclick=()=>arenaMobileShowTestDrawer(false);
    drawer.querySelector('#arenaPortableTestCollapse').onclick=()=>{
        drawer.classList.toggle('is-collapsed');
        drawer.querySelector('#arenaPortableTestCollapse').textContent=drawer.classList.contains('is-collapsed')?'+':'−';
        drawer.querySelector('#arenaPortableTestCollapse').setAttribute('aria-label',drawer.classList.contains('is-collapsed')?'Expandir panel':'Minimizar panel');
    };
    // Compact tests are docked below the video, not draggable across the fight.
    arenaMobileMountTestDrawer();
    const fab=document.createElement('button');fab.id='arenaMobileTestFab';fab.type='button';
    fab.textContent='🎛 Modo Streamer';fab.title='Opciones del Modo Streamer';fab.setAttribute('aria-label','Abrir opciones del Modo Streamer');fab.setAttribute('aria-expanded','false');fab.hidden=true;
    fab.onclick=()=>arenaMobileShowTestDrawer(!arenaMobileTestState.open);
    // Keep the existing control ID for compatibility; access is through the main Menu.
    document.getElementById('arenaOperatorPopover')?.appendChild(fab);
    const menu=document.querySelector('#arenaOperatorPopover [data-operator-panel="mobile"] [data-forward-control="arenaDualTestsToggle"]');
    if(menu){
        menu.textContent='🎛 Opciones del Modo Streamer';
        menu.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();arenaMobileShowTestDrawer(true);},true);
    }
    document.addEventListener('fullscreenchange',()=>requestAnimationFrame(arenaMobileMountTestDrawer));
    window.addEventListener('resize',()=>{
        requestAnimationFrame(()=>{
            arenaMobileMountTestDrawer();
            if(arenaMobileTestState.open)arenaMobileSelectTestPanel(arenaMobileTestState.active);
        });
    });
    const previousFocus=setMonitorFocus;
    setMonitorFocus=function(focus){previousFocus(focus);arenaMobileMountTestDrawer();};
}
function arenaMobileInstallStreamerSkills(){
    // Keep the exact original five skill buttons and their onclick handlers.
    const source=document.querySelector('#arenaPanelPowers .arena-skill-buttons');
    if(!source)return;
    const dock=document.createElement('nav');
    dock.id='arenaStreamerSkillsDock';
    dock.setAttribute('aria-label','Habilidades del modo streamer');
    dock.appendChild(source);
    document.body.appendChild(dock);
    arenaMobileMountTestDrawer();
}
function arenaMobileSaveLayout(){try{localStorage.setItem(ARENA_MOBILE_LAYOUT_KEY,JSON.stringify(arenaMobileLayout));}catch(_){}}
function arenaMobileApplyLayout(){
    const shelf=document.getElementById('arenaMobileControlShelf');
    const bar=document.getElementById('arenaHeaderActions');if(!shelf||!bar)return;
    const analog=document.getElementById('touchControlDock');
    if(analog&&analog.parentElement!==shelf)shelf.appendChild(analog);
    if(bar.parentElement!==shelf)shelf.appendChild(bar);
    const bounds=shelf.getBoundingClientRect();
    // Keep each full hit-target visible on narrow devices, after rotation and
    // when the user increases button size. Percentages remain stored in settings.
    const size=Math.max(56,Math.min(94,arenaMobileLayout.size));
    document.documentElement.style.setProperty('--arena-mobile-button-size',size+'px');
    for(const [id,position]of Object.entries(arenaMobileLayout.points)){
        const btn=document.getElementById(id);if(!btn)continue;
        const radius=size/2+4;
        const x=Math.min(Math.max(radius,bounds.width*position[0]/100),Math.max(radius,bounds.width-radius));
        const y=Math.min(Math.max(radius,bounds.height*position[1]/100),Math.max(radius,bounds.height-radius));
        if(id==='arenaMobileMoreBtn')continue; // old layouts may still contain a floating menu position
        if(id==='touchJoystick'){analog?.style.setProperty('--mobile-joy-x',x+'px');analog?.style.setProperty('--mobile-joy-y',y+'px');}
        else {btn.style.setProperty('--mobile-x',x+'px');btn.style.setProperty('--mobile-y',y+'px');}
        btn.setAttribute('data-mobile-positioned','true');
        btn.setAttribute('aria-description',arenaMobileEditing?'Desliza para colocar el botón':'Posición ajustable desde Ajustes');
    }
    document.documentElement.classList.toggle('arena-mobile-edit-controls',arenaMobileEditing);
    const edit=document.getElementById('arenaMobileEditDone');if(edit)edit.hidden=!arenaMobileEditing;
    const slider=document.getElementById('arenaMobileSize');if(slider)slider.value=String(size);
    const text=document.getElementById('arenaMobileSizeValue');if(text)text.textContent=size+' px';
}
function arenaMobileEditButtons(on=true){
    if(on&&arenaPortableProfile.touchMode!=='joystick')return;
    arenaMobileEditing=!!on;
    if(arenaMobileEditing){
        if(isSettingsOpen)toggleSettingsModal(false);
        closeArenaOperatorPopover(false);
        arenaMobileShowTestDrawer(false);
        document.dispatchEvent(new Event('arena-touch-disable'));
    }else arenaMobileSaveLayout();
    arenaMobileApplyLayout();
}
function arenaMobileSetButtonSize(size){
    arenaMobileLayout.size=Math.max(56,Math.min(94,Number(size)||70));
    arenaMobileApplyLayout();arenaMobileSaveLayout();
}
function arenaMobileResetButtons(){
    arenaMobileLayout={size:70,points:Object.fromEntries(Object.entries(arenaMobileLayoutDefaults).map(([k,v])=>[k,[...v]]))};
    arenaMobileSaveLayout();arenaMobileApplyLayout();
}
function arenaMobileInstallLayoutSettings(){
    const sections=[...document.querySelectorAll('#settingsGeneralPanel>.arena-settings-section')];
    const section=sections.find(section=>section.dataset.settingsCategory==='controls');
    const target=section?.querySelector('.arena-settings-content')||document.getElementById('settingsPanelsScroll');
    if(!target)return;
    const control=document.createElement('section');control.id='arenaMobileControlSettings';control.setAttribute('aria-label','Acomodar botones');
    control.innerHTML='<h3>📱 Modo jugador: controles</h3><fieldset id="arenaMobileTouchModeOptions"><legend>Elige cómo controlar al protagonista</legend><label><input type="radio" name="arenaMobileTouchMode" value="touch"> Táctil total — sin botones sobre el juego</label><label><input type="radio" name="arenaMobileTouchMode" value="joystick"> Joystick — analógico izquierdo y botones acomodables</label></fieldset><p id="arenaMobileTouchHelp">Elige un esquema de controles. Tus preferencias se guardan.</p><div id="arenaMobileArrangeSettings"><p>Mueve el analógico y los botones a posiciones cómodas. Guarda cada cambio para próximas partidas.</p><button type="button" id="arenaMobileArrange">✥ Acomodar analógico y botones</button><label for="arenaMobileSize">Tamaño de botones <output id="arenaMobileSizeValue">70 px</output></label><input id="arenaMobileSize" type="range" min="56" max="94" step="2" value="70"><button type="button" id="arenaMobileReset">↺ Restablecer posiciones</button><small>Salto: 1 toque. Doble salto: 2 toques rápidos en ↑. Mueve el analógico izquierdo para desplazarte.</small></div>';
    target.appendChild(control);
    // HUD transparency has one canonical control in Pantalla y HUD, shared
    // with desktop. Do not create or move a second opacity slider here.
    const note=document.createElement('small');
    note.textContent='La transparencia de menús y HUD está en Pantalla y HUD.';
    control.appendChild(note);
    control.querySelectorAll('input[name="arenaMobileTouchMode"]').forEach(input=>input.onchange=()=>{if(input.checked)arenaMobileSetTouchMode(input.value);});
    arenaMobileSyncTouchMode();
    control.querySelector('#arenaMobileArrange').onclick=()=>arenaMobileEditButtons(true);
    control.querySelector('#arenaMobileSize').oninput=e=>arenaMobileSetButtonSize(e.target.value);
    control.querySelector('#arenaMobileReset').onclick=arenaMobileResetButtons;
}
function arenaMobileSetTouchMode(mode){
    if(!['joystick','touch'].includes(mode))return false;
    document.dispatchEvent(new Event('arena-touch-disable'));
    if(arenaMobileEditing)arenaMobileEditButtons(false);
    arenaPortableProfile.touchMode=mode;arenaPortableRemember();
    arenaMobileSyncTouchMode();return true;
}
function arenaMobileSyncTouchMode(){
    const mode=arenaPortableProfile.touchMode;
    document.documentElement.dataset.mobileTouchMode=mode;
    document.querySelectorAll('input[name="arenaMobileTouchMode"]').forEach(input=>input.checked=input.value===mode);
    const advanced=document.getElementById('arenaMobileArrangeSettings');if(advanced)advanced.hidden=mode!=='joystick';
    const help=document.getElementById('arenaMobileTouchHelp');if(help)help.textContent=mode==='touch'?'Táctil total: dedo izquierdo para movimiento; con el derecho toca para saltar, dos toques para doble salto, desliza para golpear y mantén para el poder.':'Joystick: mueve el analógico izquierdo y usa Salto, Golpe y Poder. Puedes acomodar los cuatro controles.';
    if(typeof arenaMobileApplyLayout==='function')arenaMobileApplyLayout();
}
function arenaMobileInstallControlDragging(){
    for(const id of Object.keys(arenaMobileLayoutDefaults)){
        const btn=document.getElementById(id);if(!btn)continue;
        let drag=null;
        btn.addEventListener('pointerdown',event=>{
            if(!arenaMobileEditing)return;
            event.preventDefault();event.stopImmediatePropagation();
            drag=event.pointerId;
            try{btn.setPointerCapture(event.pointerId);}catch(_){}
        },true);
        btn.addEventListener('pointermove',event=>{
            if(!arenaMobileEditing||drag!==event.pointerId)return;
            event.preventDefault();event.stopImmediatePropagation();
            const view=btn.closest('#arenaMobileControlShelf');
            if(!view)return;
            const rect=view.getBoundingClientRect();
            const radius=arenaMobileLayout.size/2+3;
            const x=Math.max(radius,Math.min(rect.width-radius,event.clientX-rect.left));
            const y=Math.max(radius,Math.min(rect.height-radius,event.clientY-rect.top));
            arenaMobileLayout.points[id]=[Math.round(x/rect.width*1000)/10,Math.round(y/rect.height*1000)/10];
            arenaMobileApplyLayout();
        },true);
        const release=event=>{if(drag!==event.pointerId)return;event.preventDefault();event.stopImmediatePropagation();drag=null;arenaMobileSaveLayout();};
        btn.addEventListener('pointerup',release,true);btn.addEventListener('pointercancel',release,true);
        btn.addEventListener('click',event=>{if(arenaMobileEditing){event.preventDefault();event.stopImmediatePropagation();}},true);
    }
    // Action buttons live in the viewport but must not also trigger the legacy
    // viewport gesture listener when the user presses them.
    for(const id of ['arenaMobileJump','arenaMobileAttack','arenaMobilePower']){
        const action=document.getElementById(id);
        for(const type of ['pointerdown','pointerup','pointercancel'])action?.addEventListener(type,event=>event.stopPropagation());
    }
    const jump=document.getElementById('arenaMobileJump');
    if(jump){
        jump.onclick=null;
        jump.addEventListener('click',event=>{
            if(arenaMobileEditing||!arenaMobileCanControl())return;
            arenaMobileJumpTap();
        });
    }
    const done=document.createElement('button');done.id='arenaMobileEditDone';done.type='button';
    done.textContent='✓ Guardar posiciones';done.hidden=true;
    done.onclick=()=>arenaMobileEditButtons(false);
    document.getElementById('arenaMobileFloating')?.appendChild(done);
    arenaMobileInstallLayoutSettings();
    window.addEventListener('resize',()=>requestAnimationFrame(arenaMobileApplyLayout));
    document.addEventListener('fullscreenchange',()=>requestAnimationFrame(arenaMobileApplyLayout));
    arenaMobileApplyLayout();
}

function installArenaMobileTouch(){
    for(const id of ['viewport16x9','viewport9x16']){
        const view=document.getElementById(id);
        if(!view||view.dataset.arenaDirectTouch==='1')continue;
        view.dataset.arenaDirectTouch='1';
        const dot=document.createElement('div');dot.className='arena-mobile-contact';dot.hidden=true;dot.setAttribute('aria-hidden','true');view.appendChild(dot);
        view.addEventListener('pointerdown',arenaMobileTouchStart,true);
        view.addEventListener('pointermove',arenaMobileTouchMove,true);
        view.addEventListener('pointerup',arenaMobileTouchEnd,true);
        view.addEventListener('pointercancel',arenaMobileTouchCancel,true);
        view.addEventListener('lostpointercapture',arenaMobileTouchCancel,true);
    }
    // Reuse the original analog, including its existing pointer handling and dead zone.
    // The same joystick moves between the 9:16 and 16:9 previews.
    document.getElementById('arenaPortableSetup')?.querySelector('.arena-portable-help')?.replaceChildren(document.createTextNode('En Ajustes → Controles elige Táctil total (gestos sin botones) o Joystick (analógico izquierdo y tres botones ajustables).'));
    const labels={arenaMobileJump:'↑',arenaMobileAttack:'⚔',arenaMobilePower:'⚡',arenaMobileMoreBtn:'☰'};
    for(const [id,label]of Object.entries(labels)){
        const node=document.getElementById(id);if(!node)continue;
        node.textContent=label;node.removeAttribute('data-workspace-copy');node.classList.add('arena-portable-round-control');
        node.title=({arenaMobileJump:'Saltar',arenaMobileAttack:'Golpe básico',arenaMobilePower:'Poder especial',arenaMobileMoreBtn:'Abrir menú'}[id]);
        node.setAttribute('aria-label',node.title);
    }
    arenaMobileInstallTestDrawer();
    arenaMobileInstallStreamerSkills();
    arenaMobileInstallControlDragging();
    const stop=()=>{arenaMobileResetTouch();arenaMobileClearRetry();};
    document.addEventListener('arena-touch-disable',stop);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    window.addEventListener('blur',stop);
}
window.addEventListener('load',installArenaMobileTouch,{once:true});
window.ArenaMobileTouch=Object.freeze({
    openTests:arenaMobileShowTestDrawer,selectTest:arenaMobileSelectTestPanel,editButtons:arenaMobileEditButtons,setButtonSize:arenaMobileSetButtonSize,resetButtons:arenaMobileResetButtons,
    setTouchMode:arenaMobileSetTouchMode,getTouchMode(){return arenaPortableProfile.touchMode;},
    getLayout(){return JSON.parse(JSON.stringify(arenaMobileLayout));},
    getState(){return {gestureActive:arenaMobileTouchState.pointerId!==null||arenaMobileActionState.pointerId!==null,tapCount:arenaMobileTouchState.tapCount,testOpen:arenaMobileTestState.open,testPanel:arenaMobileTestState.active};}
});
