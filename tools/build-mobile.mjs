// Reproducible single-file export of the current game. No separate combat fork.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const assets=['index.html','styles/arena-ui.css','styles/TAILWIND-LICENSE.txt',
    ...['core','render','audio','settings','balance-evidence'].map(name=>`engine/arena-${name}.js`),
    'portable/mobile.css','portable/mobile-runtime.js','portable/mobile-touch.js'];
const replaceOnce=(source,from,to)=>{
    if(source.split(from).length!==2)throw Error('Mobile export marker changed: '+from.slice(0,90));
    return source.replace(from,()=>to);
};
const inline=source=>source.replace(/<\/script/gi,'<\\/script');

export async function buildMobile(output) {
    const files=new Map(await Promise.all(assets.map(async path=>[path,(await readFile(resolve(root,path),'utf8')).replace(/\r\n?/g,'\n')])));
    const {version}=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
    // Content fingerprints identify the exact input without requiring a git executable.
    const inputs=Object.fromEntries([...files].map(([path,source])=>[path,createHash('sha256').update(source).digest('hex')]));
    // Match Git blob IDs used by published offline releases. This keeps the
    // embedded asset manifest reproducible from source, with no git executable.
    const sourceBlobs=Object.fromEntries([...files].map(([path,source])=>[
        path,createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex')
    ]));
    const build={version,edition:'mobile-offline',sourceBlobs};
    let html=files.get('index.html');
    html=replaceOnce(html,'width=device-width, initial-scale=1.0','width=device-width, initial-scale=1.0, viewport-fit=cover');
    html=replaceOnce(html,/<title>[^<]+<\/title>/.exec(html)[0],`<title>Arena Live v${version} · Móvil</title>`);
    html=replaceOnce(html,'<link rel="stylesheet" href="styles/arena-ui.css?v='+version.split('.').slice(0,2).join('.')+'">',
        '<style id="arena-bundled-ui">\n/*! Tailwind CSS — MIT License\n'+files.get('styles/TAILWIND-LICENSE.txt')+'*/\n'+files.get('styles/arena-ui.css')+'\n</style>');
    html=html.replace(/^[ \t]*<link[^>]+href="https:\/\/[^>]+>\s*$/gm,'');
    for(const name of ['core','render','audio','settings','balance-evidence']) {
        const path=`engine/arena-${name}.js`;
        html=replaceOnce(html,`<script src="${path}?v=${version.split('.').slice(0,2).join('.')}"></script>`,
            `<script data-bundled-source="${path}">\n${inline(files.get(path))}\n</script>`);
    }
    // The mobile profile is packaging and rendering only; world coordinates,
    // physics, damage, class rules and commands are copied byte for byte.
    html=html.replaceAll('(max-width:767px)','(max-width:1023px)');
    html=replaceOnce(html,"return window.matchMedia && window.matchMedia('(max-width:1023px)').matches ? '9:16' : '16:9';",
        "return window.matchMedia('(orientation:portrait)').matches ? '9:16' : '16:9';");
    html=replaceOnce(html,"arenaRuntime=ArenaCore.normalizeRuntime(saved);}",
        "arenaRuntime=ArenaCore.normalizeRuntime(saved);arenaMobileRuntimeDefaults(saved);}");
    html=replaceOnce(html,'        function gameLoop(timestamp){',
        '        function gameLoop(timestamp){\n            if(document.hidden||arenaPortableSuspended){previousFrameTime=timestamp;simulationAccumulator=0;arenaLastRenderTime=null;requestAnimationFrame(gameLoop);return;}');
    html=replaceOnce(html,'1000/arenaRuntime.renderFps-.5','1000/(isGamePaused?5:arenaRuntime.renderFps)-.5');
    html=replaceOnce(html,"if (isGamePaused || !autoChatEnabled || gameState !== 'COMBAT' || koSequenceActive) return;",
        "if (document.hidden || arenaPortableSuspended || isGamePaused || !autoChatEnabled || gameState !== 'COMBAT' || koSequenceActive) return;");
    html=replaceOnce(html,'            // Both captures share one depth order from the same simulation snapshot.',
        '            arenaMobileSyncCaptures(draw16,draw9);\n            // Both captures share one depth order from the same simulation snapshot.');
    // Avoid allocating full HD backing stores even briefly on a low-memory phone.
    html=replaceOnce(html,'id="canvas16x9" width="1920" height="1080"','id="canvas16x9" width="1" height="1"');
    html=replaceOnce(html,'id="canvas9x16" width="1080" height="1920"','id="canvas9x16" width="1" height="1"');
    html=replaceOnce(html,"edition: 'tiktok',","edition: 'mobile-offline',");
    html=replaceOnce(html,"document.title = `Arena Live v${ARENA_RELEASE_VERSION} · TikTok`;",
        'document.title = `Arena Live v${ARENA_RELEASE_VERSION} · Móvil`;');
    html=replaceOnce(html,'Inicia con npm.cmd start para conectar TikTok LIVE.',
        'Archivo autónomo sin conexión a redes: los comandos y apoyos son pruebas locales.');
    html=replaceOnce(html,'</head>',`<meta name="arena-portable-version" content="${version}">\n<style id="arena-mobile-profile">\n${files.get('portable/mobile.css')}\n</style>\n</head>`);
    html=replaceOnce(html,'</body>',`<script id="arena-mobile-build">const ARENA_PORTABLE_BUILD=Object.freeze(${JSON.stringify(build)});</script>\n<script id="arena-mobile-runtime">\n${inline(files.get('portable/mobile-runtime.js'))}\n</script>\n<script id="arena-mobile-touch">\n${inline(files.get('portable/mobile-touch.js'))}\n</script>\n</body>`);
    if(/<(?:script|link)\b[^>]+(?:src|href)\s*=/i.test(html))throw Error('Mobile export still has an external runtime asset');
    const target=resolve(output||resolve(root,'dist',`Arena-Live-v${version}-movil.html`));
    await mkdir(dirname(target),{recursive:true});await writeFile(target,html);
    return {path:target,version,bytes:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex'),inputs};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
    const flag=process.argv.indexOf('--output');
    if(flag>=0&&!process.argv[flag+1])throw Error('--output needs a file path');
    console.log(JSON.stringify(await buildMobile(flag>=0?process.argv[flag+1]:undefined),null,2));
}
