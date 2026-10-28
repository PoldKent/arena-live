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
