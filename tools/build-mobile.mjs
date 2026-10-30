// Reproducible single-file export of the current game. No separate combat fork.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';


/* Native JavaScript LZ dictionary codec. It keeps the complete engine, menus,
 * classes and assets intact while shipping a compact offline HTML. No network,
 * external scripts, lossy minification, or separate combat implementation. */
export function packMobile(input){
    const dict=Object.create(null),created=Object.create(null),chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let word='',size=3,width=2,grow=2,value=0,position=0;
    const output=[];
    const bit=n=>{value=(value<<1)|n;if(position===5){output.push(chars[value]);position=0;value=0;}else position++};
    const bits=(n,count)=>{for(let i=0;i<count;i++){bit(n&1);n>>>=1;}};
    const advance=()=>{if(--grow===0){grow=2**width;width++;}};
    const emit=token=>{
        if(created[token]){
            const code=token.charCodeAt(0);
            if(code<256){bits(0,width);bits(code,8);}else{bits(1,width);bits(code,16);}
            advance();delete created[token];
        }else bits(dict[token],width);
        advance();
    };
    for(let i=0;i<input.length;i++){
        const char=input.charAt(i);
        if(dict[char]===undefined){dict[char]=size++;created[char]=true;}
        const combined=word+char;
        if(dict[combined]!==undefined)word=combined;
        else{emit(word);dict[combined]=size++;word=char;}
    }
    if(word)emit(word);
    bits(2,width);
    while(true){value<<=1;if(position===5){output.push(chars[value]);break;}position++;}
    const data=output.join('');
    return data+'='.repeat((4-data.length%4)%4);
}
export function unpackMobile(input){
    const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const dictionary=[0,1,2],result=[];
    let grow=4,size=4,width=3,word='',data={value:chars.indexOf(input.charAt(0)),position:32,index:1};
    const read=count=>{
        let value=0,power=1;
        for(let i=0;i<count;i++){
            const active=data.value&data.position;
            data.position>>=1;
            if(data.position===0){data.position=32;data.value=chars.indexOf(input.charAt(data.index++));}
            if(active)value+=power;
            power*=2;
        }
        return value;
    };
    const first=read(2);
    let character;
    if(first===0)character=String.fromCharCode(read(8));
    else if(first===1)character=String.fromCharCode(read(16));
    else return '';
    dictionary[3]=character;word=character;result.push(character);
    for(;;){
        if(data.index>input.length)throw Error('Truncated mobile payload');
        let code=read(width);
        if(code===0){dictionary[size++]=String.fromCharCode(read(8));code=size-1;grow--;}
        else if(code===1){dictionary[size++]=String.fromCharCode(read(16));code=size-1;grow--;}
        else if(code===2)return result.join('');
        if(grow===0){grow=2**width;width++;}
        let entry;
        if(dictionary[code])entry=dictionary[code];
        else if(code===size)entry=word+word.charAt(0);
        else throw Error('Invalid mobile payload');
        result.push(entry);dictionary[size++]=word+entry.charAt(0);
        grow--;word=entry;
        if(grow===0){grow=2**width;width++;}
    }
}
export function wrapMobileHtml(unpacked,version){
    const packed=packMobile(unpacked);
    const loading='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Arena Live v'+version+' · Móvil</title></head><body style="background:#0b1425;color:#c5edf7;font:600 16px system-ui;text-align:center;padding:15vh 12px"><p id="arena-mobile-loading">Iniciando Arena Live v'+version+'…</p><script>';
    const boot='function startArena(){try{const content=('+unpackMobile.toString()+')('+JSON.stringify(packed)+');if(!content.includes("ARENA_PORTABLE_BUILD"))throw Error("Archivo incompleto");document.open();document.write(content);document.close();}catch(error){document.body.textContent="No se pudo abrir Arena Live: "+error.message;}}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startArena,{once:true});else startArena();';
    const html=loading+boot+'<\/script></body></html>';
    const maxBytes=750000; // Safety budget for the complete offline HTML; not a runtime restriction.
    const actualBytes=Buffer.byteLength(html,'utf8');
    if(actualBytes>maxBytes)throw Error(`Mobile HTML exceeds the ${maxBytes}-byte limit (${actualBytes} bytes)`);
    return html;
}

const root=fileURLToPath(new URL('../',import.meta.url));
const assets=['index.html','styles/arena-ui.css','styles/TAILWIND-LICENSE.txt',
    ...['core','render','audio','settings','balance-evidence'].map(name=>`engine/arena-${name}.js`),
    'engine/arena-game.js',
    'portable/mobile.css','portable/mobile-runtime.js','portable/mobile-touch.js'];
const replaceOnce=(source,from,to)=>{
    if(source.split(from).length!==2)throw Error('Mobile export marker changed: '+from.slice(0,90));
    return source.replace(from,()=>to);
};
const inline=source=>source.replace(/<\/script/gi,'<\\/script');
const omitDesktopView=(source,begin,end)=>{
    const first=source.indexOf(begin),last=source.indexOf(end,first+begin.length);
    if(first<0||last<0||source.indexOf(begin,first+begin.length)>=0||source.indexOf(end,last+end.length)>=0)
        throw Error('Desktop-only packaging boundary changed: '+begin);
    return source.slice(0,first)+source.slice(last+end.length);
};

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
    // Remove only non-license comments from the original inline CSS for distribution.
    // Keep all source CSS and the generated selectors unchanged.
    let html=omitDesktopView(files.get('index.html'),'/* ARENA_DESKTOP_QUICK_CSS_BEGIN */','/* ARENA_DESKTOP_QUICK_CSS_END */')
        .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
        (_,start,css,end)=>start+css.replace(/\/\*(?!\!)[\s\S]*?\*\//g,'')+end);
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
    // Recreate the original classic-script order inside the self-contained
    // mobile HTML. The official PC page loads this source as a separate file.
    // Content remains identical; the portable-only adaptations are below.
    html=replaceOnce(html,`<script src="engine/arena-game.js?v=${version.split('.').slice(0,2).join('.')}"></script>`,
        `<script data-bundled-source="engine/arena-game.js">\n${inline(omitDesktopView(files.get('engine/arena-game.js'),'/* ARENA_DESKTOP_QUICK_BEGIN */','/* ARENA_DESKTOP_QUICK_END */'))}\n</script>`);
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
    html=replaceOnce(html,'</head>',`<meta name="arena-portable-version" content="${version}">\n<style id="arena-mobile-profile">\n${files.get('portable/mobile.css').replace(/\/\*[\s\S]*?\*\//g,'')}\n</style>\n</head>`);
    html=replaceOnce(html,'</body>',`<script id="arena-mobile-build">const ARENA_PORTABLE_BUILD=Object.freeze(${JSON.stringify(build)});</script>\n<script id="arena-mobile-runtime">\n${inline(files.get('portable/mobile-runtime.js'))}\n</script>\n<script id="arena-mobile-touch">\n${inline(files.get('portable/mobile-touch.js'))}\n</script>\n</body>`);
    if(/<(?:script|link)\b[^>]+(?:src|href)\s*=/i.test(html))throw Error('Mobile export still has an external runtime asset');
    const target=resolve(output||resolve(root,'dist',`Arena-Live-v${version}-movil.html`));
    // Preserve the full HTML for regression tests and debugging, but publish
    // only the small, immediately executable, self-unpacking offline file.
    const compact=wrapMobileHtml(html,version);
    if(unpackMobile(packMobile(html))!==html)throw Error('Mobile export did not round-trip without loss');
    await mkdir(dirname(target),{recursive:true});await writeFile(target,compact);
    return {path:target,version,bytes:Buffer.byteLength(compact),unpackedBytes:Buffer.byteLength(html),sha256:createHash('sha256').update(compact).digest('hex'),inputs};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
    const flag=process.argv.indexOf('--output');
    if(flag>=0&&!process.argv[flag+1])throw Error('--output needs a file path');
    console.log(JSON.stringify(await buildMobile(flag>=0?process.argv[flag+1]:undefined),null,2));
}
