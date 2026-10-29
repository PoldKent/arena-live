import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {unpackMobile} from '../tools/build-mobile.mjs';
import {readEngineSource} from './read-engine-source.mjs';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const pkg=JSON.parse(await read('package.json'));
const index=await read('index.html');
const game=await read('engine/arena-game.js');
const server=await read('bridge/server.mjs');
const officialPath='mobile-builds/Arena-Live-v'+pkg.version+'-movil.html';
const compressed=await read(officialPath);
const encoded=compressed.match(/"([A-Za-z0-9+/=]{10000,})"/)?.[1];
if(!encoded)throw Error('Official mobile compressed payload missing');
const offline=unpackMobile(encoded);

test('official lightweight HTML keeps the original classic engine and LIVE/OBS connections',()=>{
    const short=pkg.version.split('.').slice(0,2).join('.');
    assert.ok(Buffer.byteLength(index,'utf8')<=500000,'official HTML must stay below 500 KB');
    assert.match(index,new RegExp('<title>Arena Live v'+short));
    assert.match(index,/engine\/arena-game\.js\?v=0\.40/);
    assert.match(server,/\/engine\/arena-game\.js/);
    assert.match(server,/pathname === '\/bridge-client\.js'/);
    assert.match(server,/pathname===[ ]*'\/mobile'/);
    assert.ok(game.includes("const ARENA_RELEASE_VERSION = '"+short+"';"));
    assert.ok(game.includes("version: '"+pkg.version+"',"));
    assert.equal(pkg.scripts.prestart,'node tools/build-mobile.mjs');
    assert.equal(pkg.scripts.predev,'node tools/build-mobile.mjs');
});
test('official engine is identical when virtually reconstructed for regression tests',async()=>{
    const reconstructed=await readEngineSource();
    assert.ok(reconstructed.includes('<script>'+game+'</script>'));
    assert.match(reconstructed,/function syncArenaSingleFullscreenPanels\(\)/);
    assert.match(reconstructed,/function updateArenaObsGeometrySummary\(\)/);
    assert.match(reconstructed,/window\.ArenaLive\s*=\s*Object\.freeze/);
});
test('offline mobile remains complete, self-contained, under 500 KB and sourced from official files',async()=>{
    assert.ok(Buffer.byteLength(compressed,'utf8')<=500000,'compressed official mobile export exceeds 500 KB');
    assert.doesNotMatch(compressed,/<(?:script|link)\b[^>]+(?:src|href)\s*=/i);
    assert.match(offline,new RegExp('<meta name="arena-portable-version" content="'+pkg.version.replaceAll('.','\\.')+'">'));
    const raw=offline.match(/<script id="arena-mobile-build">const ARENA_PORTABLE_BUILD=Object\.freeze\((\{[^;]+\})\);<\/script>/)?.[1];
    assert.ok(raw,'The official mobile manifest is missing');
    const manifest=JSON.parse(raw);
    assert.equal(manifest.version,pkg.version);
    assert.equal(manifest.edition,'mobile-offline');
    const paths=['index.html','styles/arena-ui.css',
        ...['core','render','audio','settings','balance-evidence','game'].map(name=>'engine/arena-'+name+'.js'),
        'portable/mobile.css','portable/mobile-runtime.js','portable/mobile-touch.js'];
    for(const path of paths){
        const source=(await read(path)).replace(/\r\n?/g,'\n');
        const fingerprint=createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex');
        assert.equal(manifest.sourceBlobs[path],fingerprint,'Stale official mobile source: '+path);
        if(path.startsWith('engine/')&&!path.includes('arena-game.js'))
            assert.ok(offline.includes(source.replace(/<\/script/gi,'<\\/script')),'Missing original engine: '+path);
    }
    assert.match(offline,/arenaMobileControlShelf/);
    assert.match(offline,/arenaMobileTestsShortcut/);
    assert.match(offline,/triggerProtagonistSpecialAttack/);
});
