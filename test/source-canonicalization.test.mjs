import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,css,readme,pkgText]=await Promise.all([
  read('index.html'),
  read('portable/mobile.css'),
  read('README.md'),
  read('package.json')
]);
const pkg=JSON.parse(pkgText);

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

test('active source has a single mainline policy and no retired cleanup command',()=>{
  assert.match(readme,/se conservan en el historial Git/);
  assert.match(readme,/una sola rama/i);
  assert.doesNotMatch(readme,/clean:branches/);
  assert.equal(Object.hasOwn(pkg.scripts,'clean:branches'),false);
  assert.equal(pkg.version,'0.40.8');
});
