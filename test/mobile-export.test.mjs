import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Script} from 'node:vm';
import {buildMobile,packMobile,unpackMobile} from '../tools/build-mobile.mjs';

test('current release is under 500 KB, fully offline and decompresses losslessly',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'arena-mobile-release-'));
    try{
        const a=await buildMobile(join(dir,'one.html'));
        const b=await buildMobile(join(dir,'two.html'));
        assert.equal(a.sha256,b.sha256,'deterministic export');
        assert.ok(a.bytes<=500000,'maximum 500,000 bytes');
        const wrapped=await readFile(a.path,'utf8');
        assert.ok(Buffer.byteLength(wrapped)<=500000);
        assert.ok(wrapped.includes('Arena Live v'+a.version+' · Móvil'),'wrapper title must match build version');
        assert.doesNotMatch(wrapped,/<(?:script|link)\b[^>]+(?:src|href)\s*=/i);
        const encoded=wrapped.match(/"([A-Za-z0-9+/=]{10000,})"/)?.[1];
        assert.ok(encoded,'offline payload embedded in the HTML');
        const html=unpackMobile(encoded);
        assert.ok(html.length>500000,'full unabridged game restored');
        assert.equal(unpackMobile(packMobile(html)),html);
        assert.equal(Buffer.byteLength(html),a.unpackedBytes);
        assert.doesNotMatch(html,/<(?:script|link)\b[^>]+(?:src|href)\s*=/i);
        assert.match(html,/ARENA_PORTABLE_BUILD/);
        assert.match(html,/arena-mobile-offline/);
        assert.match(html,/actionLayer\.id='arenaMobileActionLayer'/);
        assert.match(html,/arenaMobileFrameFormat/);
        assert.match(html,/No mostrar de nuevo/);
        assert.match(html,/id="arenaPortableFullscreen"/);
        assert.match(html,/arenaMobileShowTestDrawer/);
        assert.match(html,/arenaPortableTestTransparency/);
        assert.match(html,/Modo Streamer/);
        assert.match(html,/Modo jugador/);
        for(const name of ['core','render','audio','settings','balance-evidence']){
            const path='engine/arena-'+name+'.js';
            const source=(await readFile(new URL('../'+path,import.meta.url),'utf8')).replace(/\r\n?/g,'\n');
            assert.ok(html.includes(source.replace(/<\/script/gi,'<\\/script')),path+' was not modified');
        }
        const [manifest]=[html.match(/<script id="arena-mobile-build">const ARENA_PORTABLE_BUILD=Object\.freeze\((\{[^;]+\})\);<\/script>/)?.[1]];
        assert.ok(manifest,'embedded source manifest');
        assert.equal(JSON.parse(manifest).version,a.version);
        for(const [,source]of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new Script(source);
    }finally{await rm(dir,{recursive:true,force:true});}
});
