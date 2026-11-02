// Device evidence uses the existing load test; it never controls a live match.
import {access,mkdir,readFile,writeFile} from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {arch,cpus,freemem,platform,release,totalmem} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {MOBILE_ASSETS,unpackMobile} from './build-mobile.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const phases=new Set(['connected','disconnected','connecting','reconnecting','error']);
const nonnegative=value=>Number.isFinite(value)&&value>=0?value:null;

export function parseDeviceOptions(args){
    const options={port:4173,skipGpu:false,installBrowser:false,outputRoot:join(ROOT,'reports/device')};
    for(let i=0;i<args.length;i++){
        const arg=args[i];
        if(arg==='--skip-gpu')options.skipGpu=true;
        else if(arg==='--install-browser')options.installBrowser=true;
        else if(arg==='--output'||arg==='--port'){
            const value=args[++i];
            if(!value||value.startsWith('--'))throw Error('Falta el valor de '+arg);
            if(arg==='--output')options.outputRoot=resolve(value);
            else{if(!/^\d+$/.test(value)||Number(value)<1||Number(value)>65535)throw Error('Puerto inválido.');options.port=Number(value);}
        }else throw Error('Opción desconocida: '+arg);
    }
    return options;
}

export async function readDeviceBridgeStatus(port,fetcher=fetch){
    if(!Number.isInteger(port)||port<1||port>65535)return{status:'invalid-port'};
    try{
        const response=await fetcher('http://127.0.0.1:'+port+'/api/status',{
            method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(3000)
        });
        if(!response.ok)return{status:'http-error',httpStatus:response.status};
        const value=await response.json();
        if(!value||typeof value.version!=='string'||value.version.length>32||!/^\d+\.\d+\.\d+$/.test(value.version)||!phases.has(value.phase))return{status:'invalid-response'};
        // Deliberate allowlist: account, room IDs, chat and raw errors stay out.
        return{status:'observed',version:value.version,phase:value.phase,
            localWindows:nonnegative(value.localWindows),liveViewerCount:nonnegative(value.liveViewerCount),
            controllerConnected:typeof value.controllerConnected==='boolean'?value.controllerConnected:null,
            connectedSince:typeof value.connectedSince==='string'&&Number.isFinite(Date.parse(value.connectedSince))?new Date(value.connectedSince).toISOString():null};
    }catch{return{status:'unavailable'};}
}

export function summarizeDeviceGpu(report,version){
    const current=report?.sourceHashes?.find(row=>row.source==='current');
    if(!Number.isInteger(report?.passed)||report.passed<24||!Array.isArray(report.checks)||report.checks.length!==report.passed||report.errors!==0||current?.version!==version)return null;
    const workload128=report.measurements?.find(row=>row.source==='current'&&row.count===128);
    if(!workload128||workload128.finite!==true||workload128.alive!==128)return null;
    const graphics=report.environment?.graphics;
    const renderer=typeof graphics?.renderer==='string'?graphics.renderer:null;
    return{status:'passed',checks:report.passed,version:current.version,browser:report.environment?.browser,
        renderer,rendererType:!renderer?'unreported':/swiftshader|llvmpipe|softpipe|lavapipe|software|microsoft basic render/i.test(renderer)?'software':'reported-adapter',
        canvas2d:graphics?.featureStatus?.['2d_canvas']??null,
        compositing:graphics?.featureStatus?.gpu_compositing??null,
        rasterization:graphics?.featureStatus?.rasterization??null,
        timing:report.environment?.drawTiming,
        workload128,
        note:'Adaptador del navegador de prueba. No certifica la aceleración del navegador de la emisión, OBS ni un teléfono.'};
}

export function runDeviceNodeTask(args,{cwd=ROOT,env=process.env,logFile,timeout=180000}={}){
    const fd=openSync(logFile,'w');
    try{
        const result=spawnSync(process.execPath,args,{cwd,env,stdio:['ignore',fd,fd],shell:false,windowsHide:true,timeout});
        return{exitCode:result.status,errorCode:result.error?.code??null,signal:result.signal??null};
    }finally{closeSync(fd);}
}

async function fingerprint(file){
    const data=await readFile(file);
    const normalized=Buffer.from(data.toString('utf8').replace(/\r\n?/g,'\n'));
    return{bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),
        gitBlob:createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex'),
        normalizedGitBlob:createHash('sha1').update('blob '+normalized.length+'\0').update(normalized).digest('hex')};
}
async function exists(file){try{await access(file);return true;}catch{return false;}}

export function inspectDeviceMobile(html,sources,version){
    try{
        const packed=html.match(/"([A-Za-z0-9+/=]{10000,})"/)?.[1];
        if(!packed)return{status:'invalid'};
        const raw=unpackMobile(packed).match(/<script id="arena-mobile-build">const ARENA_PORTABLE_BUILD=Object\.freeze\((\{[^;]+\})\);<\/script>/)?.[1];
        const build=JSON.parse(raw);
        if(build.version!==version||build.edition!=='mobile-offline'||Object.keys(build.sourceBlobs).sort().join('|')!==[...MOBILE_ASSETS].sort().join('|'))return{status:'invalid'};
        const mismatches=MOBILE_ASSETS.filter(file=>sources[file]?.normalizedGitBlob!==build.sourceBlobs[file]);
        return{status:mismatches.length?'source-mismatch':'verified',mismatches};
    }catch{return{status:'invalid'};}
}

export async function diagnoseDevice(options,{root=ROOT,readStatus=readDeviceBridgeStatus,runTask=runDeviceNodeTask}={}){
    const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
    const folder=join(options.outputRoot,new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8));
    await mkdir(folder,{recursive:true});
    console.log('Carpeta de diagnóstico: '+folder);
    const sources=Object.fromEntries(await Promise.all(MOBILE_ASSETS.map(async file=>[file,await fingerprint(join(root,file))])));
    const mobileFile='mobile-builds/Arena-Live-v'+pkg.version+'-movil.html';
    const mobile=await exists(join(root,mobileFile))?{path:mobileFile,...await fingerprint(join(root,mobileFile)),...inspectDeviceMobile(await readFile(join(root,mobileFile),'utf8'),sources,pkg.version)}:{path:mobileFile,status:'missing'};
    const bridge={...await readStatus(options.port),port:options.port};
    if(bridge.status==='observed')bridge.matchesSourceVersion=bridge.version===pkg.version;
    const report={format:'arena-live-device-validation',schema:1,generatedAt:new Date().toISOString(),version:pkg.version,
        host:{platform:platform(),release:release(),arch:arch(),node:process.version,logicalCpus:cpus().length,totalMemoryBytes:totalmem(),freeMemoryBytes:freemem()},
        sources,mobile,bridge,load:{status:'skipped'},manual:{android:'pending',gpuInStreamingBrowser:'pending',tiktokEventsAndReconnect:'pending',obsCaptures:'pending'}};
    if(!options.skipGpu){
        const {chromium}=await import('playwright');
        const executable=process.env.ARENA_BROWSER_EXECUTABLE||chromium.executablePath();
        if(!await exists(executable)&&options.installBrowser&&!process.env.ARENA_BROWSER_EXECUTABLE){
            console.log('Instalando el navegador de pruebas; detalles en browser-install.log.');
            const installed=runTask([join(root,'node_modules/playwright/cli.js'),'install','chromium'],{
                cwd:root,logFile:join(folder,'browser-install.log'),timeout:300000
            });
            report.browserInstall=installed;
        }
        if(!await exists(executable))report.load={status:'needs-browser',instruction:process.env.ARENA_BROWSER_EXECUTABLE?'Corrige la ruta ARENA_BROWSER_EXECUTABLE; el archivo indicado no existe.':'Ejecuta npm.cmd run test:device -- --install-browser'};
        else{
            const env={...process.env,ARENA_TEST_CSS:'styles/arena-ui.css',ARENA_PERF_REPORT:join(folder,'carga-gpu.json')};
            delete env.ARENA_PERF_BASELINE;delete env.ARENA_TEST_SCREENSHOTS;
            console.log('Comprobando 128 peleadores y ambas capturas; detalles en carga-gpu.log.');
            const task=runTask([join(root,'test/performance-browser.mjs'),'--gpu'],{cwd:root,env,logFile:join(folder,'carga-gpu.log')});
            let summary=null;
            if(task.exitCode===0)try{
                const raw=JSON.parse(await readFile(env.ARENA_PERF_REPORT,'utf8'));
                const current=raw.sourceHashes?.find(row=>row.source==='current');
                const matches=current?.gitBlob===sources['index.html'].gitBlob&&Object.entries(sources).filter(([file])=>file.startsWith('engine/')).every(([file,value])=>current?.modules?.['/'+file]===value.gitBlob);
                if(matches)summary=summarizeDeviceGpu(raw,pkg.version);
            }catch{/* A missing, partial or stale report is a failed check. */}
            report.load=summary?{...summary,reportFile:'carga-gpu.json',logFile:'carga-gpu.log'}:{status:'failed',...task,logFile:'carga-gpu.log'};
        }
    }
    const reportPath=join(folder,'diagnostico.json');
    await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
    const exitCode=['failed','needs-browser'].includes(report.load.status)||mobile.status!=='verified'||bridge.matchesSourceVersion===false?2:0;
    return{report,reportPath,exitCode};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
    try{
        const result=await diagnoseDevice(parseDeviceOptions(process.argv.slice(2)));
        console.log('Informe: '+result.reportPath);
        const {load,bridge,mobile}=result.report;
        const loads={passed:'aprobada',skipped:'omitida',failed:'falló','needs-browser':'falta navegador'};
        const phases={connected:'conectado',disconnected:'desconectado',connecting:'conectando',reconnecting:'reconectando',error:'error'};
        console.log('Carga: '+loads[load.status]+' · móvil: '+({verified:'coincide con las fuentes',missing:'falta el archivo',invalid:'archivo no válido','source-mismatch':'difiere de las fuentes'}[mobile.status]));
        console.log('Servidor local, puerto '+bridge.port+': '+(bridge.status==='observed'?'v'+bridge.version+' · TikTok '+phases[bridge.phase]:'no disponible o no verificado'));
        if(load.renderer)console.log('Renderizador del navegador de prueba: '+load.renderer);
        if(bridge.matchesSourceVersion===false)console.error('La versión del servidor difiere de los archivos. Reinícialo con npm.cmd start después de actualizar.');
        if(mobile.mismatches?.length)console.error('Archivos distintos: '+mobile.mismatches.join(', '));
        console.log('Pruebas manuales: docs/VALIDACION-EN-EQUIPO.md (Android, GPU de la emisión, TikTok y OBS).');
        if(result.report.load.instruction)console.log(result.report.load.instruction);
        process.exitCode=result.exitCode;
    }catch(error){console.error('No se pudo completar el diagnóstico: '+error.message);process.exitCode=2;}
}
