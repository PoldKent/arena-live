import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
const core=await readFile(new URL('engine/arena-core.js',root),'utf8');
test('special source is independent of energy policy and preserves legacy configs',()=>{
 const c=vm.createContext({});vm.runInContext(core,c);
 const normalize=value=>c.ArenaCore.normalizeRuntime(value);
 assert.equal(normalize({}).specialSource,'both');
 assert.equal(normalize({specialPolicy:'audience',specialSource:'commands'}).specialSource,'commands');
 assert.equal(normalize({specialSource:'none'}).specialSource,'none');
 assert.equal(normalize({specialSource:'bad'}).specialSource,'both');
});
test('settings preserve manual pause and dual preview has a separate quick Stream control',()=>{
 assert.match(html,/isSettingsOpen = open;\s*\/\/ Opening or closing settings must not change a manual pause/);
 assert.doesNotMatch(html,/isSettingsOpen = open;\s*isGamePaused = open/);
 assert.match(html,/id="btnViewDual" onclick="setMonitorFocus\('dual'\)"/);
 assert.match(html,/arenaRuntime\.specialSource==='commands'&&origin==='ai'/);
 assert.match(html,/arenaRuntime\.specialSource!=='both'/);
 for(const t of ['match','combat','classes','audience','broadcast','audio','controls','system'])assert.match(html,new RegExp('data-settings-tab="'+t+'"'));
});