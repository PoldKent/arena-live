import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css=await readFile(new URL('../portable/mobile.css',import.meta.url),'utf8');
const runtime=await readFile(new URL('../portable/mobile-runtime.js',import.meta.url),'utf8');
const touch=await readFile(new URL('../portable/mobile-touch.js',import.meta.url),'utf8');

test('mobile role naming and original engine hooks survive unchanged',()=>{
  assert.match(runtime,/Modo Streamer/);
  assert.match(runtime,/Modo jugador/);
  assert.match(runtime,/DIRECTOR:'director'/);
  assert.match(touch,/function arenaMobileCanControl\(\)/);
  assert.match(runtime,/window\.ArenaPortable=Object\.freeze/);
  assert.doesNotMatch(runtime,/Modo Director/);
});
test('top toolbar reuses the actual pause, menu, fullscreen and role switches',()=>{
  assert.match(runtime,/hud\.prepend\(pause\)/);
  assert.match(runtime,/hud\.insertBefore\(topMenu,fullscreenControl\)/);
  assert.match(runtime,/id='arenaMobileModeShortcut'/);
  assert.match(runtime,/id='arenaMobileTestsShortcut'/);
  assert.match(css,/#arenaMobileFullscreenBar #arenaMobileFloating/);
  assert.match(css,/#arenaMobileFloating button:not\(\[hidden\]\)/);
});
test('Streamer retains five original class powers in one independent row',()=>{
  assert.match(touch,/function arenaMobileInstallStreamerSkills\(\)/);
  assert.match(touch,/const source=document\.querySelector\('#arenaPanelPowers \.arena-skill-buttons'\)/);
  assert.match(touch,/dock\.appendChild\(source\)/);
  assert.match(touch,/function arenaMobileKeepStreamerSkillsVisible\(\)/);
  assert.match(css,/repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/data-mobile-mode="director"\] #arenaStreamerSkillsDock \.arena-skill-buttons>button \[data-command-label\]/);
  assert.match(css,/data-mobile-mode="player"\] #arenaStreamerSkillsDock\{display:none!important\}/);
});
test('Player Gameboy actions use separate hit targets without phantom toolbar',()=>{
  assert.match(touch,/const arenaMobileLayoutDefaults=Object\.freeze/);
  assert.match(touch,/const arenaMobileRC2Defaults=/);
  assert.match(touch,/const desiredSize=Math\.max\(56,Math\.min\(94,arenaMobileLayout\.size\)\)/);
  assert.match(touch,/const size=Math\.min\(desiredSize,Math\.max\(56,Math\.floor\(bounds\.width\*\.24\)\)\)/);
  assert.match(touch,/const controlHeight=Math\.max\(144,Math\.ceil\(size\*2\.07\)\)/);
  assert.match(css,/data-mobile-mode="director"\] #arenaMobileControlShelf #arenaHeaderActions\{\s*display:none!important/);
  assert.match(css,/#arenaMobileControlShelf #arenaHeaderActions\.arena-operator-toolbar::before/);
  assert.match(css,/#arenaMobileControlShelf #arenaHeaderActions\.arena-operator-toolbar::after/);
});
test('default Gameboy layout prevents circle overlap at narrow widths and large requested size',()=>{
  const raw=touch.match(/const arenaMobileLayoutDefaults=Object\.freeze\((\{[^;]+\})\);/)?.[1];
  assert.ok(raw,'missing Gameboy defaults');
  const values=Function('return ('+raw+')')();
  for(const width of [320,360,390,560]){
    for(const desired of [70,94]){
      const w=Math.min(width-10,560);
      const size=Math.min(desired,Math.max(56,Math.floor(w*.24)));
      const h=Math.max(144,Math.ceil(size*2.07));
      const r=size/2+4;
      const center=id=>{
        const [x,y]=values[id];
        return [Math.min(Math.max(r,w*x/100),Math.max(r,w-r)),Math.min(Math.max(r,h*y/100),Math.max(r,h-r))];
      };
      const points=['arenaMobilePower','arenaMobileJump','arenaMobileAttack'].map(center);
      for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
        const dist=Math.hypot(points[i][0]-points[j][0],points[i][1]-points[j][1]);
        assert.ok(dist>=size+1,'overlap at '+width+'px and requested '+desired+'px');
      }
    }
  }
});
test('fullscreen maximizes the video without subtracting controls, menu or test-panel height',()=>{
  assert.match(runtime,/function arenaPortableFitMobileStage\(\)/);
  assert.match(runtime,/const usable=Math\.max\(100,Math\.floor\(viewportHeight-top-\(fullscreen\?2:0\)\)\)/);
  assert.doesNotMatch(runtime,/viewportHeight-top-band/);
  assert.match(runtime,/--arena-mobile-reserved-bottom','0px'/);
  assert.match(runtime,/const shelfHost=fullscreen\?card:document\.body/);
  assert.match(css,/v0\.40\.4 NON-SHRINK MOBILE CONTRACT/);
  assert.match(css,/max-height:calc\(100dvh - 56px\)!important/);
  assert.match(css,/position:fixed!important/);
  assert.doesNotMatch(css,/#card-9x16\.arena-tests-visible #viewport9x16/);
});
test('native fullscreen, Android theater and normal mode keep one original HUD',()=>{
  assert.match(runtime,/function arenaPortableSetTheater\(enabled\)/);
  assert.match(runtime,/function arenaPortableToggleFullscreen\(\)/);
  assert.match(runtime,/if\(toolbar\)fullscreenBar\.appendChild\(toolbar\)/);
  assert.match(runtime,/if\(playerShelf&&shelfHost&&playerShelf\.parentElement!==shelfHost\)shelfHost\.appendChild\(playerShelf\)/);
  assert.match(css,/html\.arena-mobile-offline\.arena-mobile-theater #card-9x16/);
});
test('menu X, repeat-menu click, Escape and Android Back consume overlays before fullscreen',()=>{
  assert.match(runtime,/function arenaMobileInstallBackAndMenuClose\(\)/);
  assert.match(runtime,/button\.id='arenaMobileMenuClose'/);
  assert.match(runtime,/event\.key==='Escape'/);
  assert.match(runtime,/event\.key!=='Escape'&&event\.key!=='Backspace'/);
  assert.match(runtime,/window\.addEventListener\('popstate'/);
  assert.match(runtime,/function arenaMobileCloseTopPanel\(\)/);
  assert.match(runtime,/const details=menu&&!menu\.hidden\?menu\.querySelector/);
  assert.match(runtime,/closeArenaOperatorPopover\(false\)/);
  assert.match(css,/#arenaOperatorPopover #arenaMobileMenuClose/);
});
test('setup and menus are isolated from gameplay controls',()=>{
  assert.match(runtime,/classList\.add\('arena-mobile-setup-open'\)/);
  assert.match(runtime,/classList\.remove\('arena-mobile-setup-open'\)/);
  assert.match(runtime,/if\(setup\)\(fullscreen\?card:document\.body\)\.appendChild\(setup\)/);
  assert.match(css,/arena-mobile-setup-open #arenaMobileControlShelf/);
  assert.match(css,/arena-mobile-overlay-open #arenaMobileControlShelf/);
  assert.match(css,/#arenaPortableStart:not\(:disabled\)/);
});
test('tests drawer is draggable, scrollable, bounded and legible at any transparency',()=>{
  assert.match(touch,/function arenaMobilePositionTestDrawer\(\)/);
  assert.match(touch,/function arenaMobileInstallTestDragging\(drawer\)/);
  assert.match(touch,/const host=card\|\|document\.body/);
  assert.match(touch,/--arena-tests-background-alpha/);
  assert.match(css,/#arenaPortableTestDrawer:not\(\[hidden\]\)\{[\s\S]*?opacity:1!important/);
  assert.match(css,/#arenaPortableTestBody\{[\s\S]*?overflow-y:auto!important/);
  assert.match(css,/#arenaStreamerSkillsDock/);
});
test('protagonist status and role compatibility do not modify combat logic',()=>{
  assert.match(runtime,/function arenaMobileRefreshProtaStatus\(\)/);
  assert.match(runtime,/playerStatus\.textContent='Prota fuera de combate'/);
  assert.match(runtime,/alive\.length>=24/);
  assert.match(touch,/function arenaMobileTouchStart\(event\)/);
  assert.match(touch,/arenaMobileJumpTap\(\)/);
  assert.match(touch,/function arenaMobileInstallControlDragging\(\)/);
});

test('mobile formats 9:16, 9:19.5, 9:20, 9:21 and automatic are presentation-only',()=>{
  for(const value of ["'auto'","'16'","'19.5'","'20'","'21'"])assert.ok(runtime.includes(value),value);
  assert.match(runtime,/ARENA_MOBILE_FRAME_FORMAT_KEY='arenaMobileFrameFormatV01'/);
  assert.match(runtime,/function arenaMobileSetFullscreenFormat\(format\)/);
  assert.match(runtime,/window\.ArenaMobileFrame=Object\.freeze/);
  assert.match(touch,/id="arenaMobileFullscreenFormat"/);
  assert.match(touch,/Independiente de OBS/);
  assert.match(css,/#arenaMobileFrameGuide:not\(\[hidden\]\)/);
});
test('Gameboy custom saved positions are visibly separated without losing preferences',()=>{
  assert.match(touch,/const actions=\['arenaMobilePower','arenaMobileJump','arenaMobileAttack'\]/);
  assert.match(touch,/Math\.hypot\(points\[id\]\[0\]-points\[other\]\[0\]/);
  assert.match(touch,/root\.dataset\.mobileAutoSeparated='true'/);
  assert.match(touch,/if\(id==='touchJoystick'\)/);
  assert.match(css,/#arenaMobileControlShelf #arenaHeaderActions\.arena-operator-toolbar\{/);
  assert.match(css,/display:contents!important/);
});
test('menu has perfectly centered vector X and overlays cannot affect the stage size',()=>{
  assert.match(runtime,/button\.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"/);
  assert.match(css,/#arenaMobileMenuClose svg/);
  assert.match(css,/display:grid!important;place-items:center!important/);
  assert.match(css,/arena-mobile-overlay-open #card-9x16:fullscreen > #arenaMobileControlShelf/);
});
test('Streamer power rail retains five colors and is independent of video frame',()=>{
  assert.match(css,/#arenaMobileControlShelf::before/);
  assert.match(css,/#arenaMobileControlShelf #arenaHeaderActions::before/);
  assert.match(css,/data-mobile-mode="director"\] #arenaMobileControlShelf #arenaStreamerSkillsDock/);
  assert.match(css,/data-mobile-mode="director"\] #arenaStreamerSkillsDock \.arena-skill-buttons>button\[data-command-label\]/);
  assert.match(css,/#arenaPortableTestBody/);
});
test('the Prota status is aligned to its video frame rather than physical screen edge',()=>{
  assert.match(runtime,/window\.innerWidth-vr\.right\+7/);
  assert.match(css,/--arena-prota-right/);
  assert.match(css,/position:fixed!important/);
});
