import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const mobile=await readFile(new URL('../portable/mobile.css',import.meta.url),'utf8');
const exportHtml=await readFile(new URL('../mobile-builds/Arena-Live-v0.40.0-movil.html',import.meta.url),'utf8');

test('single-monitor native fullscreen preserves original PC tools with a reversible DOM mount',()=>{
  assert.match(html,/function syncArenaSingleFullscreenPanels\(\)/);
  assert.match(html,/function arenaSingleFsRestorePanel\(\)/);
  assert.match(html,/panel\.before\(marker\)/);
  assert.match(html,/state\.restore\.replaceWith\(state\.active\)/);
  assert.match(html,/arenaSingleFsShowPanel\('arenaPanelPowers'\)/);
  assert.match(html,/arenaSingleFsShowPanel\('arenaPanelChat'\)/);
  assert.match(html,/arenaSingleFullscreenDrawer/);
  assert.match(html,/syncArenaSingleFullscreenSettings\(\);\s*syncArenaSingleFullscreenPanels\(\)/);
  assert.match(html,/document\.documentElement\.classList\.contains\('arena-mobile-offline'\)/);
});

test('mobile 9:16 is centered as in v0.36/37, and tools stay outside the broadcast image',()=>{
  const block=mobile.split('/* Restore the v0.36/v0.37 centered 9:16 presentation.')[1];
  assert.ok(block);
  assert.match(block,/justify-content:center!important/);
  assert.match(block,/min-height:max\(0px,calc\(100dvh - 76px\)\)/);
  assert.match(mobile,/#card-9x16:fullscreen #arenaPortableTestDrawer:not/);
  assert.doesNotMatch(mobile,/#card-9x16\.arena-tests-visible #viewport9x16/);
  assert.doesNotMatch(mobile,/#card-9x16:has\(#arenaMobileControlShelf\.has-open-tests\) #viewport9x16/);
  assert.match(mobile,/--arena-tests-bottom/);
  assert.match(exportHtml,/syncArenaSingleFullscreenPanels/);
  assert.match(exportHtml,/arenaMobileControlShelf/);
  assert.match(exportHtml,/arenaPortableTestDrawer/);
});
