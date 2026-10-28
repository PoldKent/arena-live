import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const pkg=JSON.parse(await read('package.json'));
const index=await read('index.html');
const server=await read('bridge/server.mjs');
const officialPath='mobile-builds/Arena-Live-v'+pkg.version+'-movil.html';
const offline=await read(officialPath);

test('the single full-game version matches the server and offline package',()=>{
  const short=pkg.version.split('.').slice(0,2).join('.');
  assert.ok(index.includes('<title>Arena Live v'+short+' — TikTok LIVE'));
  assert.ok(index.includes("const ARENA_RELEASE_VERSION = '"+short+"';"));
  assert.ok(index.includes("version: '"+pkg.version+"',"));
  assert.ok(offline.includes('<meta name="arena-portable-version" content="'+pkg.version+'">'));
  assert.ok(server.includes("pathname==='/mobile'"));
  assert.ok(server.includes('Arena-Live-v${VERSION}-movil.html'));
});

test('the official mobile package embeds the exact full-game engine rather than a separate engine',async()=>{
  assert.doesNotMatch(offline,/<(?:script|link)\b[^>]+(?:src|href)\s*=/i);
  const start='<script id="arena-mobile-build">const ARENA_PORTABLE_BUILD=Object.freeze(';
  const raw=offline.split(start)[1]?.split(');</script>')[0];
  assert.ok(raw,'The official mobile manifest is missing');
  const manifest=JSON.parse(raw);
  assert.equal(manifest.version,pkg.version);
  assert.equal(manifest.edition,'mobile-offline');
  const paths=['index.html','styles/arena-ui.css',
    ...['core','render','audio','settings','balance-evidence'].map(name=>'engine/arena-'+name+'.js'),
    'portable/mobile.css','portable/mobile-runtime.js','portable/mobile-touch.js'];
  for(const path of paths){
    const source=(await read(path)).replace(/\r\n?/g,'\n');
    const fingerprint=createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex');
    assert.equal(manifest.sourceBlobs[path],fingerprint,'Stale official mobile source: '+path);
    if(path.startsWith('engine/'))assert.ok(offline.includes(source.replace(/<\/script/gi,'<\\/script')),'Missing original engine: '+path);
  }
  assert.ok(offline.includes('arenaMobileControlShelf'));
  assert.ok(offline.includes('arenaMobileTestsShortcut'));
});
