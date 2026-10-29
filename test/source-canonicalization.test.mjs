import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,css,tool,readme]=await Promise.all([
  read('index.html'),
  read('portable/mobile.css'),
  read('tools/clean-merged-branches.mjs'),
  read('README.md')
]);

test('PC and OBS own one canonical application style block',()=>{
  assert.equal((html.match(/<style(?:\s[^>]*)?>/g)||[]).length,1);
  assert.equal((html.match(/<\/style>/g)||[]).length,1);
  assert.match(html,/<style id="arena-app-styles">/);
  for(const section of ['arena-prota-selector','arena-audience-onboarding-v020',
    'arena-clean-broadcast','arena-responsive-touch-and-toolbar','arena-fullscreen-capture',
    'arena-visual-polish-v01','arena-workspace-v03','arena-training-panel']){
    assert.ok(html.includes('/* '+section+' */'),'Lost integrated CSS section '+section);
  }
  assert.equal((html.match(/src="engine\/arena-game\.js\?v=0\.40"/g)||[]).length,1);
});

test('mobile stylesheet retains one native layout and usable fullscreen controls',()=>{
  assert.match(css,/CANONICAL MOBILE LAYOUT/);
  assert.match(css,/#arenaMobileControlShelf/);
  assert.match(css,/#arenaStreamerSkillsDock/);
  assert.match(css,/#arenaPortableTestDrawer/);
  assert.match(css,/@media\(min-width:420px\)/);
  assert.ok(Buffer.byteLength(css,'utf8')<58000,'obsolete CSS declarations reintroduced');
});

test('all eleven historical branches are in the safe retire list',()=>{
  for(const name of [
    'feat/mobile-touch-joystick-layout',
    'fix/fullscreen-panels-v037-centering',
    'fix/mobile-tests-panel-visibility',
    'fix/mobile-v037-top-controls',
    'fix/mobile-v0405-clean-rebuild',
    'fix/streamer-tests-overlay-constant-arena',
    'fix/v040-auto-build-mobile-on-start',
    'fix/v0401-mobile-streamer-power-rail',
    'refactor/official-v0405-index-cleanup',
    'release/arena-live-v040-full',
    'restore/mobile-v037-contract'
  ])assert.ok(tool.includes('"'+name+'"'),'Branch missing from cleanup: '+name);
  assert.match(tool,/merge-base/);
  assert.match(tool,/--force-with-lease/);
  assert.match(readme,/se conservan en el historial Git/);
});
