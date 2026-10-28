import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {fileURLToPath} from 'node:url';
test('one explicit controller receives comments and server shutdown closes active WebSockets', {timeout:15000},async()=>{
    const port=4181,base='http://127.0.0.1:'+port,clients=[];
    const server=spawn(process.execPath,['bridge/server.mjs'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,PORT:String(port),NODE_ENV:'test'},stdio:['ignore','pipe','pipe','ipc']});
    let output='';
    try{
        await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(output||'Server not ready')),5000);server.stdout.on('data',v=>{output+=v;if(output.includes('Arena Live:')){clearTimeout(timer);resolve();}});server.stderr.on('data',v=>output+=v);server.on('error',reject);});
        async function connect(){const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws',{origin:base});clients.push(ws);const messages=[];ws.on('message',v=>messages.push(JSON.parse(v)));const until=async predicate=>{for(const m of messages)if(predicate(m))return m;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',listener);reject(Error('Missing socket message'));},3000);function listener(v){const m=JSON.parse(v);if(predicate(m)){clearTimeout(timer);ws.off('message',listener);resolve(m);}}ws.on('message',listener);});};await once(ws,'open');return{ws,messages,until};}
        const a=await connect(),b=await connect();const first=await a.until(v=>v.type==='status'),second=await b.until(v=>v.type==='status');assert.equal(first.isController,true);assert.equal(second.isController,false);
        const post=async(path,body={})=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
        let response=await post('/api/test-chat',{username:'hello',message:'!jugar'});assert.equal((await response.json()).sent,true);await a.until(v=>v.type==='chat');assert.equal(b.messages.filter(v=>v.type==='chat').length,0);
        response=await post('/api/test-share',{username:'hello'});assert.equal((await response.json()).sent,true);
        const share=await a.until(v=>v.type==='social'&&v.eventType==='share');
        assert.equal(share.username,'@hello');
        assert.equal(b.messages.filter(v=>v.type==='social').length,0);
        for(const eventType of ['follow','gift','subscribe']){
          response=await post('/api/test-social',{eventType,username:'social_viewer'});
          assert.equal((await response.json()).sent,true);
          const received=await a.until(v=>v.type==='social'&&v.eventType===eventType);
          assert.equal(received.username,'@social_viewer');
        }
        response=await post('/api/test-social',{eventType:'bits'});assert.equal(response.status,400);
        response=await post('/api/claim-control',{clientId:second.clientId});assert.equal(response.status,409);
        a.ws.close();await once(a.ws,'close');await b.until(v=>v.type==='status'&&v.canClaimControl);assert.equal(b.messages.at(-1).isController,false);
        response=await post('/api/test-chat',{message:'!titan'});assert.equal((await response.json()).sent,false);
        response=await post('/api/claim-control',{clientId:second.clientId});assert.equal(response.status,200);await b.until(v=>v.isController===true);
        response=await post('/api/test-chat',{username:'hello',message:'!titan'});assert.equal((await response.json()).sent,true);await b.until(v=>v.type==='chat');assert.equal(b.messages.filter(v=>v.type==='chat').length,1);
        const status=await(await fetch(base+'/api/status')).json();assert.equal(status.localWindows,1);assert.deepEqual(status.capabilities,{comments:true,socialEvents:true,taps:true,shares:true,follows:true,gifts:true,subscriptions:true,audience:true});
        const exited=once(server,'exit');if(process.platform==='win32')server.send('arena-test-shutdown');else server.kill('SIGINT');
        const [code]=await Promise.race([exited,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('Shutdown did not finish with an active WebSocket')),3000);t.unref();})]);assert.equal(code,0);
    }finally{for(const ws of clients)ws.terminate();if(server.exitCode===null)server.kill('SIGKILL');}
});
