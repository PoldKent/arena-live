import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import {readEngineSource} from './read-engine-source.mjs';

const get=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,game,server]=await Promise.all([
    get('index.html'),get('engine/arena-game.js'),get('bridge/server.mjs')
]);

test('official HTML is below 500 KB without removing the full game',()=>{
    assert.ok(Buffer.byteLength(html,'utf8')<=500000);
    assert.ok(Buffer.byteLength(game,'utf8')>500000,'original engine is retained in its own file');
    assert.match(html,/<title>Arena Live v0\.40/);
    assert.match(html,/id="viewport16x9"/);
    assert.match(html,/id="viewport9x16"/);
    assert.match(html,/id="arenaObsVerticalFormat"/);
    assert.match(html,/id="arenaOperatorPopover"/);
});
test('official classic engine runs at its original position, once, after dependencies',()=>{
    const dependencies=['core','render','audio','settings','balance-evidence','game']
        .map(n=>'engine/arena-'+n+'.js?v=0.40');
    let previous=-1;
    for(const path of dependencies){
        const tag='<script src="'+path+'"></script>';
        assert.equal(html.split(tag).length-1,1,path+' should be loaded once');
        const position=html.indexOf(tag);
        assert.ok(position>previous,path+' has invalid load order');
        previous=position;
    }
    assert.doesNotMatch(html,/\bfunction gameLoop\(timestamp\)/);
    assert.ok(server.includes("'/engine/arena-game.js'"),'server must explicitly allow extracted source');
    assert.doesNotThrow(()=>new Script(game));
});
test('regression source is exactly the original HTML plus its original engine',async()=>{
    const expected=html.replace('<script src="engine/arena-game.js?v=0.40"></script>','<script>'+game+'</script>');
    assert.equal(await readEngineSource(),expected.replace(/\r\n?/g,'\n'));
});
test('extracting the official engine does not alter its LIVE and OBS interfaces',()=>{
    for(const token of [
        'ARENA_RELEASE_VERSION','window.ArenaLive','function setMonitorFocus(',
        'function syncArenaSingleFullscreenPanels(',
        'function updateArenaObsGeometrySummary(',
        'function processChatCommand(','function gameLoop('
    ])assert.ok(game.includes(token),'missing original interface: '+token);
    assert.match(server,/\/bridge-client\.js/);
    assert.match(html,/arena-fullscreen-capture/);
});
