import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const css=await readFile(new URL('../portable/mobile.css',import.meta.url),'utf8');
const runtime=await readFile(new URL('../portable/mobile-runtime.js',import.meta.url),'utf8');
const touch=await readFile(new URL('../portable/mobile-touch.js',import.meta.url),'utf8');

test('v0.40.5 uses one canonical mobile stylesheet, not stacked RC patches',()=>{
    assert.match(css,/CANONICAL MOBILE LAYOUT/);
    for(const obsolete of ['MOBILE RESTORE RC2','MOBILE RESTORE RC3','MOBILE RESTORE RC4','MOBILE RC5','NON-SHRINK MOBILE CONTRACT']){
        assert.doesNotMatch(css,new RegExp(obsolete));
    }
    assert.ok(Buffer.byteLength(css,'utf8')<65000);
});
test('the legacy operator toolbar is not mounted in the mobile controls',()=>{
    assert.match(touch,/actionLayer\.id='arenaMobileActionLayer'/);
    assert.match(touch,/actionLayer\.appendChild\(button\)/);
    assert.doesNotMatch(touch,/shelf\.appendChild\(bar\)/);
    assert.match(runtime,/\['arenaMobileActionLayer','touchControlDock'\]/);
    assert.match(css,/#arenaMobileActionLayer/);
});
test('old rectangular toolbar cannot render through player or streamer controls',()=>{
    assert.match(css,/#arenaMobileActionLayer\{[^}]*background:none!important/);
    assert.match(css,/#arenaMobileControlShelf\{[^}]*background:none!important/);
    assert.match(css,/#arenaStreamerSkillsDock\{display:none!important\}/);
    assert.match(css,/#arenaStreamerSkillsDock\{position:fixed!important/);
    assert.match(touch,/function arenaMobileBindPanelDrag/);
    assert.match(touch,/function arenaMobileInstallSettingsDragging/);
    assert.doesNotMatch(css,/#arenaMobileControlShelf #arenaHeaderActions/);
});
test('portrait game maximizes independently from all overlays',()=>{
    assert.match(runtime,/function arenaPortableFitMobileStage\(\)/);
    assert.match(runtime,/--arena-mobile-reserved-bottom','0px'/);
    assert.doesNotMatch(runtime,/viewportHeight-top-band/);
    assert.match(runtime,/const fraction=arenaPortableProfile\.mode===ARENA_MOBILE_MODES\.DIRECTOR\?\.87:\.73/);
    assert.match(css,/#card-9x16:fullscreen #viewport9x16/);
    assert.match(css,/max-height:calc\(100dvh - 54px\)!important/);
});
test('joystick can overhang the frame below the arena horizon',()=>{
    assert.match(runtime,/box\.top\+box\.height\*fraction/);
    assert.match(css,/#touchControlDock\{display:flex!important/);
    assert.match(touch,/const arenaMobileLayoutDefaults=Object\.freeze/);
    assert.match(touch,/root\.dataset\.mobileAutoSeparated='true'/);
    assert.match(css,/overflow:visible!important/);
});
test('player has three original click handlers and modes stay exclusive',()=>{
    for(const name of ['arenaMobileJump','arenaMobileAttack','arenaMobilePower']){
        assert.ok(touch.includes("'"+name+"'"));
    }
    assert.match(css,/data-mobile-mode="director"\] #arenaMobileActionLayer\{display:none!important\}/);
    assert.match(runtime,/DIRECTOR:'director'/);
    assert.match(touch,/function arenaMobileCanControl\(\)/);
});
test('Streamer retains the original five commands and labels',()=>{
    assert.match(touch,/const source=document\.querySelector\('#arenaPanelPowers \.arena-skill-buttons'\)/);
    assert.match(touch,/dock\.appendChild\(source\)/);
    assert.match(css,/repeat\(5,minmax\(0,1fr\)\)/);
    for(let i=1;i<=5;i++)assert.ok(css.includes('>button:nth-child('+i+')'));
});
test('Streamer panel is transparent across nested backgrounds, not text',()=>{
    assert.match(touch,/max="100"/);
    assert.match(touch,/Math\.min\(100,/);
    assert.match(touch,/--arena-tests-background-alpha/);
    assert.match(css,/#arenaPortableTestHead\{[^}]*--arena-tests-background-alpha/);
    assert.match(css,/#arenaPortableTestBody\{[^}]*--arena-tests-background-alpha/);
    assert.match(css,/#arenaPortableTestDrawer input:not\(\[type=range\]\)/);
    assert.match(css,/opacity:1!important/);
});
test('test panel can be dragged, scrolled and minimized without resizing the game',()=>{
    assert.match(touch,/function arenaMobileInstallTestDragging\(drawer\)/);
    assert.match(touch,/function arenaMobilePositionTestDrawer\(\)/);
    assert.match(touch,/classList\.toggle\('is-collapsed'\)/);
    assert.match(css,/#arenaPortableTestBody\{[^}]*overflow-y:auto!important/);
    assert.match(css,/#arenaPortableTestDrawer\.is-collapsed:not\(\[hidden\]\)/);
});
test('X, same menu button and Android Back consume overlays first',()=>{
    assert.match(runtime,/button\.id='arenaMobileMenuClose'/);
    assert.match(runtime,/button\.textContent='×'/);
    assert.match(runtime,/function arenaMobileCloseTopPanel\(\)/);
    assert.match(runtime,/window\.addEventListener\('popstate'/);
    assert.match(css,/#arenaMobileMenuClose\{[^}]*justify-content:center!important/);
    assert.doesNotMatch(css,/#arenaMobileMenuClose svg/);
});
test('mobile fullscreen formats up to 9:21 are separate from OBS',()=>{
    assert.match(runtime,/ARENA_MOBILE_FRAME_FORMATS=Object\.freeze\(\['auto','16','19\.5','20','21'\]\)/);
    assert.match(runtime,/window\.ArenaMobileFrame=Object\.freeze/);
    assert.match(touch,/Independiente de OBS/);
    assert.match(css,/#arenaMobileFrameGuide:not\(\[hidden\]\)/);
});
test('Prota status and new-game panel remain available',()=>{
    assert.match(runtime,/playerStatus\.textContent='Prota fuera de combate'/);
    assert.match(runtime,/--arena-prota-right/);
    assert.match(runtime,/arenaPortableSetupOpen/);
    assert.match(css,/arena-mobile-setup-open #arenaPortableSetup:not\(\[hidden\]\)/);
});
test('JavaScript modules have valid syntax',()=>{
    assert.doesNotThrow(()=>new Function(runtime));
    assert.doesNotThrow(()=>new Function(touch));
});

test('offline start button and form both cancel native navigation before starting',()=>{
    assert.match(runtime,/arenaPortableStart'\)\.onclick=event=>\{event\.preventDefault\(\);startPortableSession\(\)/);
    assert.match(runtime,/arenaPortableForm'\)\.onsubmit=event=>\{event\.preventDefault\(\);startPortableSession\(\)/);
    assert.match(runtime,/const startPortableSession=\(\)=>arenaPortableStart/);
});

test('original header, no framed toolbar and independent touch surface',()=>{
    assert.match(css,/#arenaTopBarInner\{[^}]*flex-direction:row!important/);
    assert.match(css,/#arenaMobileFloating\{[^}]*background:transparent!important;[^}]*border:0!important/);
    assert.doesNotMatch(css,/#arenaMobilePause\{[^}]*position:fixed!important/);
    assert.match(css,/#arenaMobileControlShelf\{[^}]*position:fixed!important/);
    assert.match(runtime,/--arena-mobile-reserved-bottom','0px'/);
    assert.match(touch,/arenaLiveMobileButtonsV2/);
});

test('independent mobile layers, natural radios and bounded draggable panels',()=>{
    assert.match(css,/data-mobile-phase="COMBAT"/);
    assert.match(css,/#arenaMobileTouchModeOptions label\{display:grid;grid-template-columns:20px/);
    assert.match(css,/#arenaMobileControlSettings input\[type=radio\]\{width:18px/);
    assert.match(css,/#arenaStreamerSkillsDock\{position:fixed!important/);
    assert.match(touch,/skills\.parentElement!==host\)host\.appendChild/);
    assert.match(touch,/style\.setProperty\('top',Math\.round\(y\)\+'px','important'\)/);
});

test('player setup falls back to streamer mode if the protagonist could not join',()=>{
    assert.match(runtime,/const joined=!join\|\|fighters\.some/);
    assert.match(runtime,/const effectiveMode=joined\?selectedMode:ARENA_MOBILE_MODES\.DIRECTOR/);
    assert.match(runtime,/arenaPortableSetMode\(effectiveMode,\{remember:false\}\)/);
});

test('mobile entry decisions delegate to the canonical shared rules',()=>{
    assert.match(runtime,/const reason=arenaEntryLocked\(true\)/);
    assert.doesNotMatch(runtime,/rejoinRuleMode==='timed'&&matchTimeSeconds<=0/);
});
