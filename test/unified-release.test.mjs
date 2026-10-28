import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const pkg=JSON.parse(await read('package.json'));
const index=await read('index.html');
const server=await read('bridge/server.mjs');
const officialPath=`mobile-builds/Arena-Live-v${pkg.version}-movil.html`;
const offline=await read(officialPath);

test('single full game version matches server and offline package',()=>{
  const short=pkg.version.split('.').slice(0,2).join('.');
  assert.match(index,new RegExp(`<title>Arena Live v${short.replaceAll('.','\\.')} — TikTok LIVE`));
  assert.ok(index.includes(`const ARENA_RELEASE_VERSION = '${short}';`));
  assert.ok(index.includes(`version: '${pkg.version}',`));
  assert.ok(offline.includes(`<meta name="arena-portable-version" content="${pkg.version}">`));
  assert.match(server,/pathname==='\\/mobile'/);
  assert.match(server,/dist',`Arena-Live-v\\$\\{VERSION\\}-movil\\.html`/);
});

test('official mobile build embeds the exact modules of the full game, not an independent engine',async()=>{
  assert.doesNotMatch(offline,/<(?:script|link)\\b[^>]+(?:src|href)\\s*=/i);
  const raw=offline.match(/<script id="arena-mobile-build">const ARENA_PORTABLE_BUILD=Object\\.freeze\\((\\{[^;]+\\})\\);<\\/script>/)?.[1];
  assert.ok(raw,'Official mobile manifest missing');
  const build=JSON.parse(raw);
  assert.equal(build.version,pkg.version);
  assert.equal(build.edition,'mobile-offline');
  for(const path of ['index.html','styles/arena-ui.css',...['core','render','audio','settings','balance-evidence'].map(n=>`engine/arena-${n}.js`),'portable/mobile.css','portable/mobile-runtime.js','portable/mobile-touch.js']){
    const source=(await read(path)).replace(/\\r\\n?/g,'\\n');
    const fingerprint=createHash('sha1').update('blob '+Buffer.byteLength(source)+'\\0').update(source).digest('hex');
    assert.equal(build.sourceBlobs[path],fingerprint,`stale official mobile source: ${path}`);
    if(path.startsWith('engine/'))assert.ok(offline.includes(source.replace(/<\\/script/gi,'<\\\\/script')),`missing original engine: ${path}`);
  }
  assert.ok(offline.includes('arenaMobileControlShelf'));
  assert.ok(offline.includes('arenaMobileTestsShortcut'));
});
