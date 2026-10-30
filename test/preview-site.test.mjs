import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const site=resolve(root,'dist/arena-preview');
const read=p=>readFile(resolve(site,p),'utf8');
// Ensure the preview is available when invoked by the general npm test suite.
try{await access(resolve(site,'index.html'));}catch{await import('../tools/build-preview-site.mjs');}

test('device router exposes both editions with an explicit override',async()=>{
    const html=await read('index.html');
    assert.match(html,/userAgentData\?\.mobile/);
    assert.match(html,/params\.get\('mode'\)/);
    assert.match(html,/location\.replace\(/);
    assert.match(html,/\.\/mobile\.html/);
    assert.match(html,/\.\/desktop\//);
    assert.match(html,/noindex,nofollow,noarchive/);
});

test('offline mobile payload and desktop client assets are packaged',async()=>{
    const mobile=await read('mobile.html');
    assert.match(mobile,/Arena Live/);
    assert.match(mobile,/startArena/);
    assert.ok((await stat(resolve(site,'mobile.html'))).size<=750000);
    const desktop=await read('desktop/index.html');
    assert.match(desktop,/arena-preview/);
    assert.match(desktop,/TikTok LIVE necesita el servidor local/);
    for(const p of ['desktop/styles/arena-ui.css',...['core','render','audio','settings','balance-evidence','game'].map(s=>'desktop/engine/arena-'+s+'.js')])await access(resolve(site,p));
});

test('published package contains no Node bridge or repository internals',async()=>{
    for(const p of ['bridge/server.mjs','desktop/bridge/server.mjs','package.json','.git/config','docs/AUDITORIA-INTEGRAL-2026-10-29.md']){
        await assert.rejects(access(resolve(site,p)),{code:'ENOENT'});
    }
    assert.match(await read('robots.txt'),/Disallow: \/?/);
    await access(resolve(site,'.nojekyll'));
});
