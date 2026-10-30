// Builds a public-facing PRE-RELEASE preview without exposing the Node bridge.
// Only files in this explicit allowlist are published; do not mirror the source repository.
import {readFile,writeFile,copyFile,mkdir,rm} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildMobile} from './build-mobile.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(root,'dist/arena-preview');
const version=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version;
const desktopAssets=[
    'index.html','styles/arena-ui.css','styles/TAILWIND-LICENSE.txt',
    ...['core','render','audio','settings','balance-evidence','game'].map(name=>'engine/arena-'+name+'.js')
];
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function routerHtml(){
    return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>Arena Live · Pre-release ${escapeHtml(version)}</title>
<style>
:root{color-scheme:dark;font-family:system-ui,Arial,sans-serif}*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% -15%,#174f61 0,transparent 60%),#07131f;color:#edfaff;padding:22px}
main{width:min(100%,530px);padding:clamp(24px,5vw,44px);border:1px solid #3c6875;border-radius:24px;background:#102237;box-shadow:0 28px 85px #0008;text-align:center}
.tag{display:inline-block;padding:6px 13px;border:1px solid #37aeb8;border-radius:99px;color:#8fe7ec;font-size:12px;font-weight:800;letter-spacing:.08em}
h1{font-size:clamp(30px,7vw,46px);margin:18px 0 8px}p{line-height:1.55;color:#b9d0db}
nav{display:grid;gap:12px;margin-top:23px}
a{display:block;padding:15px 18px;border-radius:14px;border:1px solid #5c98a7;background:#183e55;color:#efffff;text-decoration:none;font-weight:750}
a.primary{background:#0d7d84;border-color:#42d3d1}
small{display:block;margin-top:22px;line-height:1.5;color:#91b8c7}
</style></head><body><main><span class="tag">PRE-RELEASE · ${escapeHtml(version)}</span><h1>ARENA LIVE</h1>
<p id="routing">Detectando tu dispositivo para abrir la versión compatible…</p>
<nav><a class="primary" href="./mobile.html">📱 Abrir Arena Live Mobile</a>
<a href="./desktop/">🖥️ Abrir Arena Live para escritorio</a></nav>
<small>Beta de navegador. La integración real con TikTok LIVE y OBS requiere el servidor local de escritorio. La versión móvil funciona sin puente LIVE.</small>
</main><script>
(function(){
  const params=new URLSearchParams(location.search);
  const forced=(params.get('mode')||params.get('version')||'').toLowerCase();
  const ua=navigator.userAgent||'';
  const mobile=forced==='mobile'||(forced!=='desktop'&&(
      navigator.userAgentData?.mobile===true||
      /Android|iPhone|iPod|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)||
      (navigator.maxTouchPoints>1&&matchMedia('(pointer: coarse)').matches&&innerWidth<=820)
  ));
  const target=mobile?'./mobile.html':'./desktop/';
  document.getElementById('routing').textContent='Abriendo '+(mobile?'Arena Live Mobile':'Arena Live para escritorio')+'…';
  location.replace(new URL(target,location.href).href);
})();
</script></body></html>`;
}
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
const mobile=await buildMobile(join(out,'mobile.html'));
for(const asset of desktopAssets){
    if(asset==='index.html')continue;
    const target=resolve(out,'desktop',asset);
    await mkdir(dirname(target),{recursive:true});
    await copyFile(resolve(root,asset),target);
}
let desktop=await readFile(resolve(root,'index.html'),'utf8');
if(!desktop.includes('</head>')||!desktop.includes('</body>'))throw Error('Desktop entrypoint changed');
desktop=desktop.replace('</head>',`<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="arena-preview" content="pre-release">
<style id="arena-preview-banner-css">
#arena-preview-banner{position:fixed;bottom:6px;right:8px;z-index:10000;max-width:94vw;padding:7px 12px;border-radius:9px;background:#0a2439e8;border:1px solid #3e8991;color:#cceff5;font:600 11px/1.4 system-ui;box-shadow:0 3px 15px #0006}
#arena-preview-banner a{color:#8cf2df;margin-left:10px}
</style></head>`);
desktop=desktop.replace('</body>',`<aside id="arena-preview-banner" role="note">PRE-RELEASE web · TikTok LIVE necesita el servidor local <a href="../?mode=mobile">Versión móvil</a></aside></body>`);
await writeFile(resolve(out,'desktop/index.html'),desktop);
await writeFile(resolve(out,'index.html'),routerHtml());
await writeFile(resolve(out,'.nojekyll'),'');
await writeFile(resolve(out,'robots.txt'),'User-agent: *\nDisallow: /\n');
await writeFile(resolve(out,'PREVIEW-NOTES.txt'),`Arena Live web preview ${version}\nPublic browser demo only; no Node bridge.\nDesktop: official client UI; TikTok LIVE/OBS workflows require the locally hosted server.\nMobile: generated standalone offline build.\nNo server files, internal docs or repository history are intentionally copied. Review bundled client code for sensitive data before publishing.\n`);
console.log(JSON.stringify({output:out,version,mobileBytes:mobile.bytes,desktopAssets:desktopAssets.length-1,routes:['/','/mobile.html','/desktop/']},null,2));
