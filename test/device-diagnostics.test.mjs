import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MOBILE_ASSETS} from '../tools/build-mobile.mjs';
import {parseDeviceOptions,readDeviceBridgeStatus,summarizeDeviceGpu,runDeviceNodeTask,diagnoseDevice,inspectDeviceMobile} from '../tools/diagnose-device.mjs';
const projectRoot=new URL('../',import.meta.url);
const pkg=JSON.parse(await readFile(new URL('package.json',projectRoot),'utf8'));
const staleVersion=pkg.version==='0.0.0'?'0.0.1':'0.0.0';

test('device options accept output paths with spaces and reject malformed ports, missing values and unknown options',()=>{
 const options=parseDeviceOptions(['--output','folder with spaces','--port','4180','--skip-gpu','--install-browser']);
 assert.equal(options.port,4180);assert.equal(options.skipGpu,true);assert.equal(options.installBrowser,true);
 assert.ok(options.outputRoot.endsWith('folder with spaces'));
 for(const args of [['--port','0'],['--port','65536'],['--port','1.5'],['--port','4173@external.test'],['--port'],['--output','--skip-gpu'],['--unknown']])assert.throws(()=>parseDeviceOptions(args));
});

test('bridge evidence uses only a loopback GET and removes accounts, raw errors, room IDs and messages',async()=>{
 let calls=0;
 const value=await readDeviceBridgeStatus(4173,async(url,options)=>{
  calls++;assert.equal(url,'http://127.0.0.1:4173/api/status');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
  return{ok:true,json:async()=>({version:'0.42.0',phase:'connected',localWindows:2,liveViewerCount:25,controllerConnected:true,connectedSince:'2026-11-02T12:00:00Z',account:'private-account',lastError:'private-token',roomId:'private-room',messages:['private-chat']})};
 });
 assert.equal(calls,1);assert.equal(value.status,'observed');assert.equal(value.phase,'connected');assert.equal(value.localWindows,2);assert.equal(value.connectedSince,'2026-11-02T12:00:00.000Z');
 assert.doesNotMatch(JSON.stringify(value),/private-|account|lastError|roomId|messages/);
 assert.deepEqual(await readDeviceBridgeStatus('4173@external.test',()=>{throw Error('Must never fetch');}),{status:'invalid-port'});
});

test('unavailable, redirected, malformed and HTTP-error local servers remain unverified',async()=>{
 assert.deepEqual(await readDeviceBridgeStatus(4173,async()=>{throw Error('private response');}),{status:'unavailable'});
 assert.deepEqual(await readDeviceBridgeStatus(4173,async()=>({ok:false,status:503})),{status:'http-error',httpStatus:503});
 for(const value of [null,[],{version:'0.42.0',phase:'invented'},{version:'not-arena',phase:'connected'}]){
  assert.deepEqual(await readDeviceBridgeStatus(4173,async()=>({ok:true,json:async()=>value})),{status:'invalid-response'});
 }
});

test('GPU summaries distinguish software from a reported adapter and reject failed, partial or wrong-version loads',()=>{
 const raw={passed:24,errors:0,checks:Array(24).fill('check'),sourceHashes:[{source:'current',version:'0.42.0'}],measurements:[{source:'current',count:128,alive:128,finite:true}],environment:{browser:'153',drawTiming:'command submission',graphics:{renderer:'ANGLE SwiftShader',featureStatus:{'2d_canvas':'unavailable_software'}}}};
 const summary=summarizeDeviceGpu(raw,'0.42.0');assert.equal(summary.rendererType,'software');assert.equal(summary.canvas2d,'unavailable_software');
 raw.environment.graphics.renderer='ANGLE NVIDIA';assert.equal(summarizeDeviceGpu(raw,'0.42.0').rendererType,'reported-adapter');
 delete raw.environment.graphics.renderer;assert.equal(summarizeDeviceGpu(raw,'0.42.0').rendererType,'unreported');
 assert.equal(summarizeDeviceGpu(raw,'0.43.0'),null);
 for(const changes of [{errors:1},{passed:1},{checks:[]},{measurements:[]},{measurements:[{source:'current',count:128,alive:127,finite:true}]}])assert.equal(summarizeDeviceGpu({...raw,...changes},'0.42.0'),null);
});

test('Node tasks preserve literal arguments and log paths with spaces without invoking a shell',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'arena device spaces '));
 try{
  const logFile=join(dir,'load log.txt'),literal='text $() ; & with spaces';
  const result=runDeviceNodeTask(['-e','console.log(process.argv[1]);console.error("stderr");process.exitCode=3;',literal],{cwd:dir,logFile});
  assert.equal(result.exitCode,3);assert.equal(result.errorCode,null);
  assert.equal((await readFile(logFile,'utf8')).replaceAll('\r\n','\n'),literal+'\nstderr\n');
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('device reports verify the real mobile artifact across CRLF sources, preserve evidence, and keep physical checks pending',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'arena device fixture ')),root=join(dir,'source with spaces'),requests=[];
 let version=pkg.version;
 const server=createServer((req,res)=>{requests.push([req.method,req.url]);res.setHeader('content-type','application/json');res.end(JSON.stringify({version,phase:'connected',account:'private-account',lastError:'private-token',controllerConnected:true}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  await mkdir(root,{recursive:true});await writeFile(join(root,'package.json'),JSON.stringify({version}));
  for(const file of MOBILE_ASSETS){const path=join(root,file);await mkdir(dirname(path),{recursive:true});await writeFile(path,(await readFile(new URL('../'+file,import.meta.url),'utf8')).replace(/\r\n?/g,'\n').replaceAll('\n','\r\n'));}
  const mobilePath='mobile-builds/Arena-Live-v'+pkg.version+'-movil.html',mobile=await readFile(new URL('../'+mobilePath,import.meta.url),'utf8');
  await mkdir(join(root,'mobile-builds'));await writeFile(join(root,mobilePath),mobile);
  const options={...parseDeviceOptions(['--skip-gpu']),port:server.address().port,outputRoot:join(dir,'evidence with spaces')};
  const first=await diagnoseDevice(options,{root}),second=await diagnoseDevice(options,{root});
  assert.equal(first.exitCode,0);assert.equal(first.report.mobile.status,'verified');assert.equal(first.report.load.status,'skipped');assert.equal(first.report.bridge.matchesSourceVersion,true);
  assert.notEqual(first.reportPath,second.reportPath);assert.deepEqual(JSON.parse(await readFile(first.reportPath,'utf8')),first.report);
  assert.ok(Object.values(first.report.manual).every(value=>value==='pending'));assert.doesNotMatch(JSON.stringify(first.report),/private-/);
  assert.ok((await readFile(join(root,'engine/arena-game.js'),'utf8')).includes('\r\n'));
  const sources=structuredClone(first.report.sources);sources['portable/mobile-touch.js'].normalizedGitBlob='wrong';
  assert.deepEqual(inspectDeviceMobile(mobile,sources,pkg.version),{status:'source-mismatch',mismatches:['portable/mobile-touch.js']});
  assert.equal(inspectDeviceMobile(mobile,sources,staleVersion).status,'invalid');assert.equal(inspectDeviceMobile('broken',sources,pkg.version).status,'invalid');
  version=staleVersion;const stale=await diagnoseDevice(options,{root});assert.equal(stale.exitCode,2);assert.equal(stale.report.bridge.matchesSourceVersion,false);
  assert.deepEqual(requests,[['GET','/api/status'],['GET','/api/status'],['GET','/api/status']]);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});

test('failed, malformed and stale GPU evidence cannot pass, while the exact current source can pass with manual checks pending',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'arena device provenance '));
 const keys=['ARENA_BROWSER_EXECUTABLE','ARENA_PERF_BASELINE','ARENA_TEST_SCREENSHOTS'];
 const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{
  const executable=join(dir,'browser fixture');await writeFile(executable,'fixture');process.env.ARENA_BROWSER_EXECUTABLE=executable;
  process.env.ARENA_PERF_BASELINE='old fixture';process.env.ARENA_TEST_SCREENSHOTS='old screenshot folder';
  const hashes=Object.fromEntries(await Promise.all(MOBILE_ASSETS.map(async file=>{const data=await readFile(new URL(file,projectRoot));return[file,createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex')];})));
  const valid={passed:24,errors:0,checks:Array(24).fill('check'),sourceHashes:[{source:'current',version:pkg.version,gitBlob:hashes['index.html'],modules:Object.fromEntries(Object.entries(hashes).filter(([file])=>file.startsWith('engine/')).map(([file,sha])=>['/'+file,sha]))}],measurements:[{source:'current',count:128,alive:128,finite:true}],environment:{graphics:{renderer:'SwiftShader'}}};
  const options={...parseDeviceOptions([]),outputRoot:dir};
  for(const mode of ['failed','malformed','stale','valid']){
   const result=await diagnoseDevice(options,{readStatus:async()=>({status:'unavailable'}),runTask(args,{env,logFile}){
    assert.equal(args.at(-1),'--gpu');assert.equal(env.ARENA_PERF_BASELINE,undefined);assert.equal(env.ARENA_TEST_SCREENSHOTS,undefined);
    writeFileSync(logFile,'fixture');
    const raw=structuredClone(valid);if(mode==='stale')raw.sourceHashes[0].modules['/engine/arena-game.js']='wrong';
    writeFileSync(env.ARENA_PERF_REPORT,mode==='malformed'?'broken':JSON.stringify(raw));
    return{exitCode:mode==='failed'?1:0,errorCode:null,signal:null};
   }});
   assert.equal(result.report.load.status,mode==='valid'?'passed':'failed');assert.equal(result.exitCode,mode==='valid'?0:2);
   assert.ok(Object.values(result.report.manual).every(value=>value==='pending'));
  }
 }finally{for(const key of keys)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];await rm(dir,{recursive:true,force:true});}
});
