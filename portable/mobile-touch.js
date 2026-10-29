// Touch-first controls and a movable test panel for the standalone phone edition.
// Desktop/OBS retains its own controls; this adapter never changes combat rules.
const ARENA_MOBILE_TAP_GAP=325;
const ARENA_MOBILE_LAYOUT_KEY='arenaLiveMobileButtonsV2';
const ARENA_MOBILE_LAYOUT_LEGACY_KEY='arenaLiveMobileButtonsV1';
// Two-handed Gameboy layout: analog left, power/jump/attack on a staggered right cluster.
const arenaMobileLayoutDefaults=Object.freeze({touchJoystick:[15,50],arenaMobilePower:[60,74],arenaMobileJump:[75,22],arenaMobileAttack:[90,74]});
const arenaMobileRC2Defaults={touchJoystick:[14,50],arenaMobilePower:[58,70],arenaMobileJump:[74,30],arenaMobileAttack:[88,70]};
const arenaMobileLegacyDefaults={touchJoystick:[13,50],arenaMobilePower:[46,50],arenaMobileJump:[67,50],arenaMobileAttack:[89,50]};
let arenaMobileLayout={size:70,points:Object.fromEntries(Object.entries(arenaMobileLayoutDefaults).map(([k,v])=>[k,[...v]]))};
let arenaMobileEditing=false;
try{
    const current=JSON.parse(localStorage.getItem(ARENA_MOBILE_LAYOUT_KEY)||'null');
    const legacy=current?null:JSON.parse(localStorage.getItem(ARENA_MOBILE_LAYOUT_LEGACY_KEY)||'null');
    // Old default positions were widely spaced and often clipped the buttons.
    // Migrate ONLY user-customized coordinates; preserve their size preference.
    const saved=current||legacy;
    if(saved&&Number.isFinite(saved.size))arenaMobileLayout.size=Math.max(56,Math.min(94,saved.size));
    for(const [id,p] of Object.entries(saved?.points||{})){
        if(!Object.hasOwn(arenaMobileLayoutDefaults,id)||!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))continue;
        const isOldDefault=(!current&&arenaMobileLegacyDefaults[id].every((n,i)=>Math.abs(n-p[i])<0.5))||
            (!!current&&arenaMobileRC2Defaults[id].every((n,i)=>Math.abs(n-p[i])<0.5));
        if(!isOldDefault)arenaMobileLayout.points[id]=[Math.max(7,Math.min(93,p[0])),Math.max(8,Math.min(95,p[1]))];
    }
}catch(_){}
const ARENA_MOBILE_HOLD_MS=460;
const ARENA_MOBILE_SWIPE_PX=34;
const arenaMobileTouchState={pointerId:null,startX:0,startY:0,x:0,y:0,tapCount:0,lastTapAt:0,lastTapX:0,lastTapY:0,jumpRetry:null};
const arenaMobileActionState={pointerId:null,startX:0,startY:0,x:0,y:0,startedAt:0,moved:false,special:false,hold:null,aim:'forward'};
function arenaMobileClaimTouchContact(e){const ids=window.ArenaMobileContacts||(window.ArenaMobileContacts=new Set());if(ids.has(e.pointerId))return true;if(ids.size>=5)return false;ids.add(e.pointerId);return true;}
function arenaMobileReleaseTouchContact(e){window.ArenaMobileContacts?.delete(e.pointerId);}
function arenaMobileCurrentAim(){return window.ArenaMobileJoystickAim==='up'?'up':window.ArenaMobileJoystickAim==='down'?'down':'forward';}
const ARENA_MOBILE_TEST_PREFS_KEY='arenaLiveMobileTestPanelV2';
const arenaMobileTestState={open:false,active:'arenaPanelPowers',position:null,transparency:0,drag:null};
try {
    const saved=JSON.parse(localStorage.getItem(ARENA_MOBILE_TEST_PREFS_KEY)||'null');
    if(saved&&Number.isFinite(saved.transparency))
        arenaMobileTestState.transparency=Math.min(100,Math.max(0,saved.transparency));
    if(saved?.position&&Number.isFinite(saved.position.x)&&Number.isFinite(saved.position.y))
        arenaMobileTestState.position={x:Math.min(1,Math.max(0,saved.position.x)),y:Math.min(1,Math.max(0,saved.position.y))};
} catch (_) {}
function arenaMobileSaveTestPrefs(){
    try {localStorage.setItem(ARENA_MOBILE_TEST_PREFS_KEY,JSON.stringify({
        transparency:arenaMobileTestState.transparency,position:arenaMobileTestState.position
    }));} catch (_) {}
}
function arenaMobileApplyTestOpacity(){
    const drawer=document.getElementById('arenaPortableTestDrawer');
    if(!drawer)return;
    // Preserve full text/controls legibility; only the drawer backdrop fades.
    drawer.style.setProperty('--arena-tests-opacity','1');
    drawer.style.setProperty('--arena-tests-background-alpha',String(1-arenaMobileTestState.transparency/100));
    const input=document.getElementById('arenaPortableTestTransparency');
    if(input){input.value=String(arenaMobileTestState.transparency);input.setAttribute('aria-valuetext',arenaMobileTestState.transparency+'% de transparencia');}
    const label=document.getElementById('arenaPortableTransparencyValue');
    if(label)label.textContent=arenaMobileTestState.transparency+'%';
}
function arenaMobileTestSurface(){
    const fullscreen=document.fullscreenElement;
    if(fullscreen?.matches?.('#card-9x16,#card-16x9'))return fullscreen.getBoundingClientRect();
    if(document.documentElement.classList.contains('arena-mobile-theater'))return document.getElementById(monitorFocus==='16:9'?'card-16x9':'card-9x16').getBoundingClientRect();
    return {left:0,top:0,width:window.innerWidth,height:window.innerHeight};
}
function arenaMobileTestLimits(drawer){
    const rect=drawer.getBoundingClientRect(),surface=arenaMobileTestSurface();
    const maxX=Math.max(0,surface.width-rect.width-6);
    let maxY=Math.max(0,surface.height-rect.height-6);
    const rail=document.getElementById('arenaStreamerSkillsDock');
    if(rail&&getComputedStyle(rail).display!=='none'){
        const box=rail.getBoundingClientRect();
        if(box.height>=30&&box.top>=surface.top&&box.top<surface.top+surface.height)
            maxY=Math.min(maxY,Math.max(0,box.top-surface.top-rect.height-7));
    }
    return {surface,maxX,maxY};
}
function arenaMobilePlaceTestPanel(){
    const drawer=document.getElementById('arenaPortableTestDrawer'),position=arenaMobileTestState.position;
    if(!drawer||!position||drawer.hidden||arenaMobileTestState.drag)return;
    const rect=drawer.getBoundingClientRect();
    if(rect.width<40||rect.height<20)return;
    const {maxX,maxY}=arenaMobileTestLimits(drawer);
    const x=Math.round(6+Math.max(0,maxX-6)*position.x);
    const y=Math.round(6+Math.max(0,maxY-6)*position.y);
    drawer.classList.add('is-positioned');
    drawer.style.setProperty('--arena-tests-x',x+'px');
    drawer.style.setProperty('--arena-tests-y',y+'px');
}
function arenaMobileInstallTestDragging(drawer){
    const head=drawer.querySelector('#arenaPortableTestHead');
    head.addEventListener('pointerdown',event=>{
        if(event.button!==0||event.target.closest('button,input,label,select'))return;
        const surface=arenaMobileTestSurface(),rect=drawer.getBoundingClientRect();
        arenaMobileTestState.drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,
            x:rect.left-surface.left,y:rect.top-surface.top};
        event.preventDefault();
        try{head.setPointerCapture(event.pointerId);}catch(_){}
        head.classList.add('is-dragging');
    });
    head.addEventListener('pointermove',event=>{
        const drag=arenaMobileTestState.drag;
        if(!drag||drag.id!==event.pointerId)return;
        const {maxX,maxY}=arenaMobileTestLimits(drawer);
        const x=Math.min(maxX,Math.max(6,drag.x+event.clientX-drag.startX));
        const y=Math.min(maxY,Math.max(6,drag.y+event.clientY-drag.startY));
        drawer.classList.add('is-positioned');
        drawer.style.setProperty('--arena-tests-x',Math.round(x)+'px');
        drawer.style.setProperty('--arena-tests-y',Math.round(y)+'px');
        arenaMobileTestState.position={x:maxX>6?(x-6)/(maxX-6):0,y:maxY>6?(y-6)/(maxY-6):0};
        event.preventDefault();
    });
    const finish=event=>{
        if(!arenaMobileTestState.drag||arenaMobileTestState.drag.id!==event.pointerId)return;
        arenaMobileTestState.drag=null;
        head.classList.remove('is-dragging');
        arenaMobileSaveTestPrefs();
    };
    head.addEventListener('pointerup',finish);
    head.addEventListener('pointercancel',finish);
    head.addEventListener('lostpointercapture',finish);
    drawer.querySelector('#arenaPortableTestTransparency').addEventListener('input',event=>{
        arenaMobileTestState.transparency=Math.min(100,Math.max(0,Number(event.target.value)||0));
        arenaMobileApplyTestOpacity();
        arenaMobileSaveTestPrefs();
    });
    arenaMobileApplyTestOpacity();
}
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
function arenaMobileResetAction(){arenaMobileClearHold();const a=arenaMobileActionState;if(a.pointerId!==null)arenaMobileReleaseTouchContact({pointerId:a.pointerId});a.pointerId=null;a.moved=false;a.special=false;a.aim='forward';}
function arenaMobileResetTouch(){
    if(arenaMobileTouchState.pointerId!==null)arenaMobileReleaseTouchContact({pointerId:arenaMobileTouchState.pointerId});
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
    if(arenaPortableProfile.touchMode!=='touch')return;
    event.preventDefault();event.stopImmediatePropagation();
    if(!arenaMobileClaimTouchContact(event))return;
    const view=event.currentTarget,rect=view.getBoundingClientRect();
    if(event.clientX-rect.left>=rect.width*.53){
        const a=arenaMobileActionState;if(a.pointerId!==null){arenaMobileReleaseTouchContact(event);return;}
        a.pointerId=event.pointerId;a.startX=a.x=event.clientX;a.startY=a.y=event.clientY;
        a.startedAt=performance.now();a.moved=false;a.special=false;a.aim='forward';
        a.hold=setTimeout(()=>{
            a.hold=null;
            if(a.pointerId===event.pointerId&&(!a.moved||a.aim!=='forward')&&arenaMobileCanControl()){
                a.special=true;
                if(triggerProtagonistSpecialAttack(a.aim)&&navigator.vibrate)navigator.vibrate(16);
            }
        },ARENA_MOBILE_HOLD_MS);
    }else{
        const st=arenaMobileTouchState;if(st.pointerId!==null){arenaMobileReleaseTouchContact(event);return;}
        st.pointerId=event.pointerId;st.startX=st.x=event.clientX;st.startY=st.y=event.clientY;
        arenaMobileTouchPoint(view,st.x,st.y);
    }
    try{view.setPointerCapture(event.pointerId);}catch(_){}
}
function arenaMobileTouchMove(event){
    if(arenaMobileActionState.pointerId===event.pointerId){
        event.preventDefault();event.stopImmediatePropagation();
        const a=arenaMobileActionState;a.x=event.clientX;a.y=event.clientY;
        const dx=a.x-a.startX,dy=a.y-a.startY;
        if(Math.abs(dy)>20&&Math.abs(dy)>Math.abs(dx)*1.25)a.aim=dy<0?'up':'down';
        else if(Math.abs(dx)>20)a.aim='forward';
        if(Math.hypot(dx,dy)>16){a.moved=true;if(a.aim==='forward'||Math.abs(dy)>120)arenaMobileClearHold();}
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
        const special=a.special,moved=a.moved,aim=a.aim;
        arenaMobileResetAction();
        if(!arenaMobileCanControl()||special)return;
        if(elapsed>=ARENA_MOBILE_HOLD_MS&&(!moved||aim!=='forward')){
            if(triggerProtagonistSpecialAttack(aim)&&navigator.vibrate)navigator.vibrate(16);
        }else if(Math.hypot(dx,dy)>=ARENA_MOBILE_SWIPE_PX&&elapsed<=500){
            const fighter=arenaMobileActor();
            if(fighter){
                const attackAim=Math.abs(dy)>Math.abs(dx)*1.2?(dy<0?'up':'down'):'forward';
                if(attackAim==='forward'&&Math.abs(dx)>6)fighter.facing=dx>0?1:-1;
                performMeleeAttack(fighter,attackAim);
            }
            arenaMobileTouchState.tapCount=0;
        }else if(!moved&&elapsed<ARENA_MOBILE_HOLD_MS){
            arenaMobileJumpTap(a.x,a.y);
        }
        return;
    }
    if(arenaMobileTouchState.pointerId!==event.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();
    arenaMobileReleaseTouchContact(event);arenaMobileTouchState.pointerId=null;arenaMobileClearDirections();
    document.querySelectorAll('.arena-mobile-contact').forEach(n=>n.hidden=true);
}
function arenaMobileTouchCancel(event){
    if(arenaMobileActionState.pointerId===event.pointerId){event.stopImmediatePropagation();arenaMobileResetAction();return;}
    if(arenaMobileTouchState.pointerId!==event.pointerId)return;
    event.stopImmediatePropagation();arenaMobileReleaseTouchContact(event);arenaMobileTouchState.pointerId=null;arenaMobileClearDirections();
    document.querySelectorAll('.arena-mobile-contact').forEach(n=>n.hidden=true);
}
function arenaMobileTestPanel(){
    return document.getElementById(arenaMobileTestState.active);
}
function arenaMobileKeepStreamerSkillsVisible(){
    if(arenaPortableProfile.mode!==ARENA_MOBILE_MODES.DIRECTOR)return;
    const shelf=document.getElementById('arenaMobileControlShelf');
    const skills=document.getElementById('arenaStreamerSkillsDock');
    if(!shelf||!skills)return;
    // Do not clone or rebuild the five buttons: move the original node only.
    if(skills.parentElement!==shelf)shelf.appendChild(skills);
    skills.hidden=false;
}
function arenaMobilePositionTestDrawer(){
    const drawer=document.getElementById('arenaPortableTestDrawer');
    if(!drawer)return;
    arenaMobileKeepStreamerSkillsVisible();
    const skills=document.getElementById('arenaStreamerSkillsDock');
    const fullscreen=document.fullscreenElement;
    const host=fullscreen?.matches?.('#card-9x16,#card-16x9')?fullscreen:(document.documentElement.classList.contains('arena-mobile-theater')?document.getElementById(monitorFocus==='16:9'?'card-16x9':'card-9x16'):null);
    const bottom=host?host.getBoundingClientRect().bottom:window.innerHeight;
    const rail=skills?.getBoundingClientRect();
    const usable=rail&&rail.height>=30&&rail.top>=0&&rail.top<bottom;
    const clearance=usable?Math.ceil(bottom-rail.top+8):86;
    // A hidden or unmounted rail must never push the tests offscreen.
    drawer.style.setProperty('--arena-tests-bottom',Math.max(72,Math.min(bottom*.5,clearance))+'px');
    arenaMobileApplyTestOpacity();
    arenaMobilePlaceTestPanel();
}
function arenaMobileMountTestDrawer(){
    const drawer=document.getElementById('arenaPortableTestDrawer');
    if(!drawer)return;
    // The 9:16 viewport and the compact skill shelf must never clip advanced tests.
    // Native fullscreen hides normal document siblings; move the SAME drawer into
    // the fullscreen card (not into the 9:16 video) and restore it afterward.
    const fullscreen=document.fullscreenElement;
    const card=fullscreen?.matches?.('#card-9x16,#card-16x9')
        ?fullscreen:fullscreen?.querySelector?.('#card-9x16,#card-16x9') ||
        (document.documentElement.classList.contains('arena-mobile-theater')?document.getElementById(monitorFocus==='16:9'?'card-16x9':'card-9x16'):null);
    const host=card||document.body;
    if(drawer.parentElement!==host)host.appendChild(drawer);
    // Position and opacity persist across opening, rotation and fullscreen.
    requestAnimationFrame(arenaMobilePositionTestDrawer);
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
    arenaMobileKeepStreamerSkillsVisible();
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
    document.getElementById('arenaPortableTestCollapse')?.setAttribute('aria-label','Minimizar panel');
    const collapse=document.getElementById('arenaPortableTestCollapse');if(collapse)collapse.textContent='−';
    document.getElementById('arenaMobileControlShelf')?.classList.toggle('has-open-tests',!!open);
    for(const id of ['card-9x16','card-16x9'])document.getElementById(id)?.classList.toggle('arena-tests-visible',!!open);
    const shortcut=document.getElementById('arenaMobileTestsShortcut');
    if(shortcut){shortcut.setAttribute('aria-expanded',String(!!open));shortcut.setAttribute('aria-controls','arenaPortableTestDrawer');}
    const fab=document.getElementById('arenaMobileTestFab');
    if(fab)fab.setAttribute('aria-expanded',String(!!open));
    // Do not resize the game or move the existing five active power buttons.
    if(open)requestAnimationFrame(arenaMobilePositionTestDrawer);
}
function arenaMobileInstallTestDrawer(){
    const drawer=document.createElement('aside');
    drawer.id='arenaPortableTestDrawer';drawer.hidden=true;
    drawer.setAttribute('role','region');drawer.setAttribute('aria-live','off');
    drawer.setAttribute('aria-label','Opciones del Modo Streamer');
    drawer.innerHTML='<div id="arenaPortableTestHead" title="Arrastra para mover el panel"><span>🎛 Modo Streamer</span><label class="arena-tests-transparency" title="Transparencia del panel"><span>◐</span><input type="range" id="arenaPortableTestTransparency" min="0" max="100" step="5" value="0" aria-label="Transparencia del panel de pruebas"><output id="arenaPortableTransparencyValue">0%</output></label><button type="button" id="arenaPortableTestCollapse" aria-label="Minimizar panel">−</button><button type="button" id="arenaPortableTestClose" aria-label="Cerrar pruebas">×</button></div><label class="arena-portable-test-picker">Herramienta<select id="arenaPortableTestSelect"><option value="arenaPanelPowers">Jugador y comandos</option><option value="arenaPanelPlayers">Participantes y K.O.</option><option value="arenaPanelScenarios">Escenarios</option><option value="arenaPanelSocial">Interacciones</option><option value="arenaPanelSimulation">Simulación</option></select></label><div id="arenaPortableTestBody"></div>';
    document.body.appendChild(drawer);
    arenaMobileInstallTestDragging(drawer);
    drawer.querySelector('#arenaPortableTestSelect').addEventListener('change',event=>arenaMobileSelectTestPanel(event.target.value));
    drawer.querySelector('#arenaPortableTestClose').onclick=()=>arenaMobileShowTestDrawer(false);
    drawer.querySelector('#arenaPortableTestCollapse').onclick=()=>{
        drawer.classList.toggle('is-collapsed');
        drawer.querySelector('#arenaPortableTestCollapse').textContent=drawer.classList.contains('is-collapsed')?'+':'−';
        drawer.querySelector('#arenaPortableTestCollapse').setAttribute('aria-label',drawer.classList.contains('is-collapsed')?'Expandir panel':'Minimizar panel');
        requestAnimationFrame(arenaMobilePositionTestDrawer);
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
    document.addEventListener('fullscreenchange',()=>requestAnimationFrame(()=>{
        arenaMobileMountTestDrawer();
        arenaMobileKeepStreamerSkillsVisible();
        arenaMobilePositionTestDrawer();
    }));
    window.addEventListener('resize',()=>{
        requestAnimationFrame(()=>{
            arenaMobileMountTestDrawer();
            if(arenaMobileTestState.open){
                arenaMobileSelectTestPanel(arenaMobileTestState.active);
                arenaMobilePositionTestDrawer();
            }
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
    if(!shelf)return;
    // Move the three ORIGINAL action buttons, preserving their handlers.
    // The old operator toolbar never becomes part of the touch overlay.
    let actionLayer=document.getElementById('arenaMobileActionLayer');
    if(!actionLayer){
        actionLayer=document.createElement('nav');
        actionLayer.id='arenaMobileActionLayer';
        actionLayer.setAttribute('aria-label','Acciones táctiles del protagonista');
        shelf.appendChild(actionLayer);
    }
    for(const id of ['arenaMobileJump','arenaMobileAttack','arenaMobilePower']){
        const button=document.getElementById(id);
        if(button&&button.parentElement!==actionLayer)actionLayer.appendChild(button);
    }
    const analog=document.getElementById('touchControlDock');
    if(analog&&analog.parentElement!==shelf)shelf.appendChild(analog);
    const bounds=shelf.getBoundingClientRect();
    // Keep each full hit-target visible on narrow devices, after rotation and
    // when the user increases button size. Percentages remain stored in settings.
    const desiredSize=Math.max(56,Math.min(94,arenaMobileLayout.size));
    const size=Math.min(desiredSize,Math.max(56,Math.floor(bounds.width*.24)));
    // The Gameboy controls require two staggered rows, not a 94px dock
    // with 70-94px circles. Match dock height to the chosen button size.
    const controlHeight=Math.max(144,Math.ceil(size*2.07));
    const root=document.documentElement;
    root.style.setProperty('--arena-mobile-button-size',size+'px');
    root.style.setProperty('--arena-mobile-player-shelf-height',controlHeight+'px');
    const radius=size/2+4;
    const points={};
    for(const [id,position] of Object.entries(arenaMobileLayout.points)){
        if(!['touchJoystick','arenaMobilePower','arenaMobileJump','arenaMobileAttack'].includes(id))continue;
        const x=Math.min(Math.max(radius,bounds.width*position[0]/100),Math.max(radius,bounds.width-radius));
        const y=id==='touchJoystick'
            ?controlHeight*position[1]/100 // Joystick may extend beyond the arena frame.
            :Math.min(Math.max(radius,controlHeight*position[1]/100),Math.max(radius,controlHeight-radius));
        points[id]=[x,y];
    }
    const actions=['arenaMobilePower','arenaMobileJump','arenaMobileAttack'];
    const collides=()=>actions.some((id,i)=>actions.slice(i+1).some(other=>
        points[id]&&points[other]&&Math.hypot(points[id][0]-points[other][0],points[id][1]-points[other][1])<size+7));
    if(collides()){
        // A saved custom layout may have intersecting hitboxes. Keep the user's
        // saved data, but show safe positions until it is moved again in Edit.
        for(const id of actions){
            const p=arenaMobileLayoutDefaults[id];
            points[id]=[
                Math.min(Math.max(radius,bounds.width*p[0]/100),Math.max(radius,bounds.width-radius)),
                Math.min(Math.max(radius,controlHeight*p[1]/100),Math.max(radius,controlHeight-radius))
            ];
        }
        root.dataset.mobileAutoSeparated='true';
    }else delete root.dataset.mobileAutoSeparated;
    for(const [id,[x,y]] of Object.entries(points)){
        const btn=document.getElementById(id);if(!btn)continue;
        if(id==='touchJoystick'){
            analog?.style.setProperty('--mobile-joy-x',x+'px');
            analog?.style.setProperty('--mobile-joy-y',y+'px');
        }else {
            btn.style.setProperty('--mobile-x',x+'px');
            btn.style.setProperty('--mobile-y',y+'px');
        }
        btn.setAttribute('data-mobile-positioned','true');
        btn.setAttribute('aria-description',arenaMobileEditing?'Desliza para colocar el botón':'Posición ajustable desde Ajustes');
    }
    document.documentElement.classList.toggle('arena-mobile-edit-controls',arenaMobileEditing);
    const edit=document.getElementById('arenaMobileEditDone');if(edit)edit.hidden=!arenaMobileEditing;
    const slider=document.getElementById('arenaMobileSize');if(slider)slider.value=String(desiredSize);
    const text=document.getElementById('arenaMobileSizeValue');
    if(text)text.textContent=size===desiredSize?size+' px':size+' px (adaptado; preferencia '+desiredSize+' px)';
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
    requestAnimationFrame(arenaPortableFitMobileStage);
}
function arenaMobileSetButtonSize(size){
    arenaMobileLayout.size=Math.max(56,Math.min(94,Number(size)||70));
    arenaMobileApplyLayout();arenaMobileSaveLayout();
    requestAnimationFrame(arenaPortableFitMobileStage);
}
function arenaMobileResetButtons(){
    arenaMobileLayout={size:70,points:Object.fromEntries(Object.entries(arenaMobileLayoutDefaults).map(([k,v])=>[k,[...v]]))};
    arenaMobileSaveLayout();arenaMobileApplyLayout();
    requestAnimationFrame(arenaPortableFitMobileStage);
}
function arenaMobileInstallLayoutSettings(){
    const sections=[...document.querySelectorAll('#settingsGeneralPanel>.arena-settings-section')];
    const section=sections.find(section=>section.dataset.settingsCategory==='controls');
    const target=section?.querySelector('.arena-settings-content')||document.getElementById('settingsPanelsScroll');
    if(!target)return;
    const control=document.createElement('section');control.id='arenaMobileControlSettings';control.setAttribute('aria-label','Acomodar botones');
    control.innerHTML='<h3>📱 Modo jugador: controles</h3><fieldset id="arenaMobileTouchModeOptions"><legend>Elige cómo controlar al protagonista</legend><label><input type="radio" name="arenaMobileTouchMode" value="touch"> Táctil total — sin botones sobre el juego</label><label><input type="radio" name="arenaMobileTouchMode" value="joystick"> Joystick — analógico izquierdo y botones acomodables</label></fieldset><p id="arenaMobileTouchHelp">Elige un esquema de controles. Tus preferencias se guardan.</p><div id="arenaMobileArrangeSettings"><p>Mueve el analógico y los botones a posiciones cómodas. Guarda cada cambio para próximas partidas.</p><button type="button" id="arenaMobileArrange">✥ Acomodar analógico y botones</button><label for="arenaMobileSize">Tamaño de botones <output id="arenaMobileSizeValue">70 px</output></label><input id="arenaMobileSize" type="range" min="56" max="94" step="2" value="70"><button type="button" id="arenaMobileReset">↺ Restablecer posiciones</button><small>Multitáctil: hasta 5 dedos. Apunta ↑ o ↓ con el joystick y pulsa ⚔ (golpe) o ⚡ (especial). ↑ salta; 2 toques hacen doble salto.</small></div>';
    target.appendChild(control);
    const format=document.createElement('section');
    format.id='arenaMobileDisplaySettings';
    format.setAttribute('aria-label','Formato de pantalla completa');
    format.innerHTML='<h3>📐 Pantalla completa</h3><label for="arenaMobileFullscreenFormat">Marco vertical de presentación</label><select id="arenaMobileFullscreenFormat"><option value="auto">Automático · máximo tamaño</option><option value="16">9:16</option><option value="19.5">9:19.5</option><option value="20">9:20</option><option value="21">9:21</option></select><small>El marco es una referencia del formato del teléfono. El escenario real conserva 9:16 y siempre su máximo tamaño; los controles flotan encima y no lo reducen. Independiente de OBS.</small>';
    target.appendChild(format);
    const formatSelect=format.querySelector('select');
    formatSelect.value=window.ArenaMobileFrame?.get?.()||'auto';
    formatSelect.addEventListener('change',()=>window.ArenaMobileFrame?.set?.(formatSelect.value));
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
    arenaMobileSyncTouchMode();
    if(typeof arenaMobileLocalizeAll==='function')arenaMobileLocalizeAll();
    return true;
}
function arenaMobileSyncTouchMode(){
    const mode=arenaPortableProfile.touchMode;
    document.documentElement.dataset.mobileTouchMode=mode;
    document.querySelectorAll('input[name="arenaMobileTouchMode"]').forEach(input=>input.checked=input.value===mode);
    const advanced=document.getElementById('arenaMobileArrangeSettings');if(advanced)advanced.hidden=mode!=='joystick';
    const help=document.getElementById('arenaMobileTouchHelp');if(help)help.textContent=mode==='touch'?'Táctil total: izquierda para moverte. Derecha: toca para saltar, doble toque para doble salto; desliza en cualquier dirección para golpear, o mantén y apunta arriba/abajo para un especial vertical.':'Joystick: hasta 5 dedos simultáneos. Mueve y apunta con el analógico; pulsa ⚔ o ⚡ mientras apuntas arriba/abajo. Tres botones ajustables sin reducir el escenario.';
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
    // Five simultaneous pointers: joystick + three buttons + arena gesture.
    for(const [id,action] of [
        ['arenaMobileJump',()=>arenaMobileJumpTap()],
        ['arenaMobileAttack',()=>arenaMobileMelee(arenaMobileCurrentAim())],
        ['arenaMobilePower',()=>triggerProtagonistSpecialAttack(arenaMobileCurrentAim())]
    ]){
        const button=document.getElementById(id);if(!button)continue;
        button.onclick=null;
        const held=new Set();let lastTouchAt=-1000;
        button.addEventListener('pointerdown',event=>{
            if(!['touch','pen'].includes(event.pointerType)||arenaMobileEditing
                ||arenaPortableProfile.touchMode!=='joystick'||!arenaMobileCanControl())return;
            if(!arenaMobileClaimTouchContact(event))return;
            lastTouchAt=performance.now();held.add(event.pointerId);
            event.preventDefault();event.stopImmediatePropagation();
            try{button.setPointerCapture(event.pointerId);}catch(_){}
            action();
        });
        const release=event=>{
            if(!held.has(event.pointerId))return;
            held.delete(event.pointerId);arenaMobileReleaseTouchContact(event);
            event.preventDefault();event.stopPropagation();
        };
        button.addEventListener('pointerup',release);
        button.addEventListener('pointercancel',release);
        button.addEventListener('lostpointercapture',release);
        button.addEventListener('click',event=>{
            if(performance.now()-lastTouchAt<650&&event.detail!==0){
                event.preventDefault();event.stopImmediatePropagation();return;
            }
            if(arenaMobileEditing||!arenaMobileCanControl())return;
            action();
        },true);
        document.addEventListener('arena-touch-disable',()=>held.clear());
    }
    const done=document.createElement('button');done.id='arenaMobileEditDone';done.type='button';
    done.textContent='✓';done.title='Guardar posiciones';done.setAttribute('aria-label','Guardar posiciones');done.hidden=true;
    done.onclick=()=>arenaMobileEditButtons(false);
    document.getElementById('arenaMobileFloating')?.appendChild(done);
    arenaMobileInstallLayoutSettings();
    window.addEventListener('resize',()=>requestAnimationFrame(arenaMobileApplyLayout));
    document.addEventListener('fullscreenchange',()=>requestAnimationFrame(arenaMobileApplyLayout));
    arenaMobileApplyLayout();
    if(typeof arenaMobileLocalizeAll==='function')arenaMobileLocalizeAll();
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
    document.getElementById('arenaPortableSetup')?.querySelector('.arena-portable-help')?.replaceChildren(document.createTextNode('En Ajustes → Controles: Táctil total (desliza vertical para golpear o mantén para especiales) o Joystick (5 dedos, ↑↓ + Golpe/Poder).'));
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
    // Controls are recreated or relabeled when switching modes or opening tools.
    // Translate visible labels and accessible names after the originating click.
    for(const eventName of ['click','change']){
        document.addEventListener(eventName,()=>queueMicrotask(()=>{
            if(typeof arenaMobileLocalizeAll==='function')arenaMobileLocalizeAll();
        }),true);
    }
    if(typeof arenaMobileLocalizeAll==='function')arenaMobileLocalizeAll();
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
    getState(){return {gestureActive:arenaMobileTouchState.pointerId!==null||arenaMobileActionState.pointerId!==null,tapCount:arenaMobileTouchState.tapCount,contacts:window.ArenaMobileContacts?.size||0,testOpen:arenaMobileTestState.open,testPanel:arenaMobileTestState.active};}
});
