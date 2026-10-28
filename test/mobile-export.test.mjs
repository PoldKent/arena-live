import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Script} from 'node:vm';
import {buildMobile} from '../tools/build-mobile.mjs';

test('portable export is self-contained, deterministic and includes the exact current engine modules',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'arena-mobile-export-'));
    try{
        const a=await buildMobile(join(dir,'a.html')),b=await buildMobile(join(dir,'b.html'));
        assert.equal(a.sha256,b.sha256);
        const html=await readFile(a.path,'utf8');
        assert.ok(a.bytes<1024*1024,'Single file stays under 1 MiB');
        assert.doesNotMatch(html,/<(?:script|link)\b[^>]+(?:src|href)\s*=/i);
        assert.doesNotMatch(html,/@import\s|url\(["']?https?:/i);
        for(const name of ['core','render','audio','settings','balance-evidence']){
            const path=`engine/arena-${name}.js`,source=(await readFile(new URL('../'+path,import.meta.url),'utf8')).replace(/\r\n?/g,'\n');
            assert.ok(html.includes(source.replace(/<\/script/gi,'<\\/script')),path+' is copied without gameplay edits');
        }
        for(const [,source]of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new Script(source);
        assert.match(html,/Archivo autónomo sin conexión a redes/);
        assert.match(html,/arena-mobile-offline/);
        assert.match(html,/id="arenaPortableNotice"/);
        assert.match(html,/No mostrar de nuevo/);
        assert.match(html,/id="arenaPortableFullscreen"/);
        assert.match(html,/id="arenaPortableGuideMenu"/);
        assert.match(html,/arena-mobile-show-guide/);
        assert.match(html,/ARENA_MOBILE_MODES/);
        const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
        const embedded=html.match(/<script id="arena-mobile-build">const ARENA_PORTABLE_BUILD=Object\.freeze\((\{[^;]+\})\);<\/script>/)?.[1];
        assert.ok(embedded,'mobile build manifest exists');
        const manifest=JSON.parse(embedded);
        assert.equal(manifest.version,pkg.version);
        assert.ok(manifest.sourceBlobs?.['index.html']);
        assert.ok(manifest.sourceBlobs?.['portable/mobile-touch.js']);
        assert.match(html,/dock\.id='arenaStreamerSkillsDock'/);
        assert.match(html,/Opciones del Modo Streamer/);

        assert.match(html,/Modo Streamer/);
        assert.doesNotMatch(html,/Modo Director \(Streamer\)/);
        assert.match(html,/Modo jugador/);
        assert.match(html,/id="arenaPortableModeOptions"/);
        assert.match(html,/arenaMobilePause/);
        assert.match(html,/arenaPortableSetMode/);
        const touchSource=await readFile(new URL('../portable/mobile-touch.js',import.meta.url),'utf8');
        assert.ok(html.includes(touchSource),'direct touch module is embedded');
        assert.match(html,/id="arena-mobile-touch"/);
        assert.match(html,/arenaMobileSecondJump/);
        assert.match(html,/arenaMobileShowTestDrawer/);
        assert.match(html,/arenaPortableTestDrawer/);
        assert.doesNotMatch(html,/Listo para tu celular/);
        const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
        assert.match(index,/id="canvas16x9" width="1920" height="1080"/);
        assert.match(index,/id="canvas9x16" width="1080" height="1920"/);
    }finally{await rm(dir,{recursive:true,force:true});}
});
