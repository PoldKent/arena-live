import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readEngineSource} from './read-engine-source.mjs';
import {buildMobile,unpackMobile} from '../tools/build-mobile.mjs';
const html=await readEngineSource();
const mobile=await readFile(new URL('../portable/mobile.css',import.meta.url),'utf8');
// The official mobile export is generated from main; older releases remain historical.
// Never require a previously committed copy of the new version to run the suite.
const currentBuild=await buildMobile();
const wrapped=await readFile(currentBuild.path,'utf8');
const encoded=wrapped.match(/"([A-Za-z0-9+/=]{10000,})"/)?.[1];
if(!encoded)throw Error('Missing complete portable game');
const expanded=unpackMobile(encoded);

test('official fullscreen preserves original PC/OBS tool mounts and reversible panels',()=>{
    assert.match(html,/function syncArenaSingleFullscreenPanels\(\)/);
    assert.match(html,/function arenaSingleFsRestorePanel\(\)/);
    assert.match(html,/panel\.before\(marker\)/);
    assert.match(html,/state\.restore\.replaceWith\(state\.active\)/);
    assert.match(html,/arenaSingleFsShowPanel\('arenaPanelPowers'\)/);
    assert.match(html,/arenaSingleFsShowPanel\('arenaPanelChat'\)/);
    assert.match(html,/arenaSingleFullscreenDrawer/);
    assert.match(html,/syncArenaSingleFullscreenSettings\(\);\s*syncArenaSingleFullscreenPanels\(\)/);
});
test('mobile non-shrinking viewport is still built from the same official source',()=>{
    assert.match(mobile,/CANONICAL MOBILE LAYOUT/);
    assert.match(mobile,/#card-9x16:fullscreen #viewport9x16/);
    assert.match(mobile,/#arenaMobileActionLayer/);
    assert.match(mobile,/#arenaPortableTestBody/);
    assert.doesNotMatch(mobile,/#card-9x16\.arena-tests-visible #viewport9x16/);
    assert.match(expanded,/syncArenaSingleFullscreenPanels/);
    assert.match(expanded,/arenaMobileControlShelf/);
    assert.match(expanded,/arenaPortableTestDrawer/);
    assert.match(expanded,/id="arenaMobileFullscreenFormat"/);
});
