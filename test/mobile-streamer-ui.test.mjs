import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const css=await readFile(new URL('../portable/mobile.css',import.meta.url),'utf8');
const runtime=await readFile(new URL('../portable/mobile-runtime.js',import.meta.url),'utf8');
const touch=await readFile(new URL('../portable/mobile-touch.js',import.meta.url),'utf8');

test('Streamer naming is standard and the legacy director preference stays compatible',()=>{
  assert.match(runtime,/Modo Streamer/);
  assert.doesNotMatch(runtime,/Modo Director/);
  assert.match(runtime,/DIRECTOR:'director'/);
  assert.match(touch,/Opciones del Modo Streamer/);
  assert.doesNotMatch(touch,/Herramientas de direcci/);
});
test('mobile toolbar is top-aligned, preserves native pause and menu actions',()=>{
  assert.match(runtime,/hud\.prepend\(pause\)/);
  assert.match(runtime,/hud\.insertBefore\(topMenu,fullscreenControl\)/);
  assert.match(css,/#arenaMobileFloating #arenaMobilePause/);
  assert.match(css,/#arenaMobileFloating #arenaMobileMoreBtn/);
  assert.match(css,/#arenaMobileFloating #arenaPortableFullscreen/);
  assert.match(css,/#arenaPortableToggleGuide,\s*\nhtml\.arena-mobile-offline #arenaMobileTestFab\{display:none/);
});
test('Streamer abilities are a bottom strip containing the original five class buttons',()=>{
  assert.match(touch,/function arenaMobileInstallStreamerSkills\(\)/);
  assert.match(touch,/const source=document\.querySelector\('#arenaPanelPowers \.arena-skill-buttons'\)/);
  assert.match(touch,/dock\.appendChild\(source\)/);
  assert.match(css,/#arenaStreamerSkillsDock>\.arena-skill-buttons\{[\s\S]*?repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/#arenaStreamerSkillsDock .arena-skill-buttons>button\{[\s\S]*?height:49px/);
  assert.doesNotMatch(runtime,/arenaMobileShowTestDrawer\(true\)/);
});
test('mobile Combat settings have bounded widths, independent scrolling and responsive selects',()=>{
  assert.match(css,/#settingsPanelsScroll\{[\s\S]*?overflow-x:hidden!important;overflow-y:auto!important/);
  assert.match(css,/#settingsGeneralPanel \.arena-settings-content :is\(select,input:not/);
  assert.match(css,/#settingsGeneralPanel \.arena-settings-content select\{[\s\S]*?text-overflow:ellipsis/);
  assert.match(css,/#arenaSettingsTabs\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('Player supports saved touch-total or joystick controls, with no unwanted game overlay',()=>{
  assert.match(runtime,/touchMode:'joystick'/);
  assert.match(runtime,/dataset\.mobileTouchMode/);
  assert.match(touch,/function arenaMobileSetTouchMode\(mode\)/);
  assert.match(touch,/function arenaMobileSyncTouchMode\(\)/);
  assert.match(touch,/name="arenaMobileTouchMode"/);
  assert.match(touch,/Táctil total/);
  assert.match(touch,/Joystick/);
  assert.doesNotMatch(touch,/touchControlDock'\)\?\.remove\(\)/);
  assert.match(touch,/touchJoystick:\[13,50\]/);
  assert.match(runtime,/const header=document\.getElementById\('arenaTopBarInner'\)/);
  assert.match(runtime,/fullscreen\?card:header/);
  assert.match(runtime,/id='arenaMobileGestureGuide'/);
  assert.match(css,/#arenaMobileGestureGuide/);
  assert.match(css,/data-mobile-touch-mode="touch"/);
  assert.match(css,/data-mobile-touch-mode="joystick"/);
  assert.match(css,/#card-9x16:fullscreen #viewport9x16/);
  assert.match(runtime,/id='arenaMobileControlShelf'/);
  assert.match(touch,/const shelf=document.getElementById\('arenaMobileControlShelf'\)/);
  assert.match(css,/#arenaMobileControlShelf #touchJoystick/);
  assert.match(css,/#arenaMobileControlShelf #arenaPortableTestDrawer/);
  assert.match(runtime,/id='arenaMobileModeShortcut'/);
  assert.match(runtime,/id='arenaMobileTestsShortcut'/);
  assert.match(touch,/const arenaMobileActionState=/);
  assert.match(touch,/pointerId===event.pointerId/);
});

test('Pruebas is never clipped by the control shelf and stays visible in fullscreen',()=>{
  assert.match(touch,/const host=card\|\|document\.body/);
  assert.match(touch,/if\(drawer\.parentElement!==host\)host\.appendChild\(drawer\)/);
  assert.match(touch,/drawer\.hidden=!open/);
  assert.match(touch,/drawer\.classList\.remove\('is-collapsed'\)/);
  assert.match(touch,/arena-tests-visible/);
  assert.match(css,/#arenaPortableTestDrawer:not\(\[hidden\]\)\{/);
  assert.match(css,/position:fixed!important/);
  assert.match(css,/#card-9x16:fullscreen #arenaPortableTestDrawer:not/);
  assert.match(css,/#arenaPortableTestBody\{/);
  assert.match(runtime,/arenaMobileMountTestDrawer\(\)/);
  assert.doesNotMatch(runtime,/\['arenaHeaderActions','touchControlDock','arenaStreamerSkillsDock','arenaPortableTestDrawer'\]/);
});

test('v0.36–v0.37 top-right floating capsule is restored without overlapping 9:16',()=>{
  const restored=css.split('/* Restore the v0.36–v0.37 compact top-right capsule')[1];
  assert.ok(restored,'The version 0.37 restoration is present');
  assert.match(restored,/position:fixed!important/);
  assert.match(restored,/right:max\(8px,env\(safe-area-inset-right\)\)!important/);
  assert.match(restored,/border-radius:24px!important/);
  assert.match(restored,/border-radius:50%!important/);
  assert.match(restored,/width:40px!important;height:40px!important/);
  assert.match(css,/min-height:60px!important;z-index:230!important/);
  assert.match(css,/#card-9x16:fullscreen #arenaMobileFloating,[\s\S]*?position:absolute!important/);
  assert.match(css,/padding:calc\(53px \+ env\(safe-area-inset-top\)\)/);
  assert.match(runtime,/hud\.prepend\(pause\)/);
  assert.match(runtime,/id='arenaMobileModeShortcut'/);
  assert.match(runtime,/id='arenaMobileTestsShortcut'/);
  assert.match(runtime,/hud\.insertBefore\(topMenu,fullscreenControl\)/);
  assert.match(touch,/function arenaMobileMountTestDrawer\(\)/);
});

test('Streamer Pruebas is a compact overlay, never reduces the arena or covers five skills',()=>{
  assert.match(touch,/function arenaMobilePositionTestDrawer\(\)/);
  assert.match(touch,/getElementById\('arenaStreamerSkillsDock'\)/);
  assert.match(touch,/const rail=skills\?\.getBoundingClientRect\(\)/);
  assert.match(touch,/drawer\.style\.setProperty\('--arena-tests-bottom'/);
  assert.match(css,/bottom:var\(--arena-tests-bottom,80px\)!important/);
  assert.match(css,/#arenaMobileControlShelf #arenaStreamerSkillsDock\{/);
  assert.match(css,/#arenaStreamerSkillsDock>[.]arena-skill-buttons/);
  assert.doesNotMatch(css,/#card-9x16[.]arena-tests-visible #viewport9x16/);
  assert.doesNotMatch(css,/#card-9x16:has\(#arenaMobileControlShelf[.]has-open-tests\) #viewport9x16/);
  assert.doesNotMatch(css,/#card-9x16:fullscreen[.]arena-tests-visible #viewport9x16/);
  assert.doesNotMatch(css,/#card-9x16:fullscreen:has\(#arenaMobileControlShelf[.]has-open-tests\) #viewport9x16/);
});


test('v0.40.1 keeps all five original Streamer skills visible and the 9:16 fixed when tests open',()=>{
  assert.match(touch,/function arenaMobileKeepStreamerSkillsVisible\(\)/);
  assert.match(touch,/if\(skills\.parentElement!==shelf\)shelf\.appendChild\(skills\)/);
  assert.match(touch,/skills\.hidden=false/);
  assert.match(touch,/arenaMobileKeepStreamerSkillsVisible\(\);\s*if\(open\)/);
  assert.match(css,/v0\.40\.1 · Canonical mobile Streamer contract/);
  const latest=css.split('/* v0.40.1 · Canonical mobile Streamer contract')[1];
  assert.match(latest,/data-mobile-mode="director"\] #arenaMobileControlShelf #arenaStreamerSkillsDock/);
  assert.match(latest,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(latest,/#card-9x16:fullscreen #arenaPortableTestDrawer:not/);
  assert.match(latest,/max-height:calc\(100dvh - 162px\)/);
  assert.doesNotMatch(latest,/\.arena-tests-visible/);
  assert.doesNotMatch(latest,/\.has-open-tests #viewport9x16/);
});
