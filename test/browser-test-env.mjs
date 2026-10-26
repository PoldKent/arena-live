import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {chromium} from 'playwright';
export const root=fileURLToPath(new URL('../',import.meta.url));
export async function openTestApp(port=4176) {
    const server=spawn(process.execPath,['bridge/server.mjs'],{cwd:root,env:{...process.env,PORT:String(port)}});
    let output='';
    await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('Test server timeout: '+output)),10000);
        server.stdout.on('data',data=>{output+=data;if(output.includes('Arena Live:')){clearTimeout(timer);resolve();}});
        server.stderr.on('data',data=>{output+=data;});
        server.once('error',reject);server.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code+': '+output));});
    });
    const options={headless:true,args:['--disable-gpu']};
    if(process.env.ARENA_BROWSER_EXECUTABLE)options.executablePath=process.env.ARENA_BROWSER_EXECUTABLE;
    if(process.env.ARENA_BROWSER_LIBRARY_PATH)options.env={...process.env,LD_LIBRARY_PATH:process.env.ARENA_BROWSER_LIBRARY_PATH};
    let browser;
    try {browser=await chromium.launch(options);}catch(error){server.kill();throw error;}
    return {server,browser,url:'http://127.0.0.1:'+port,
        async close(){await browser.close();if(server.exitCode===null){const exit=once(server,'exit');server.kill('SIGINT');const timeout=setTimeout(()=>server.kill('SIGKILL'),3000);await exit;clearTimeout(timeout);}}
    };
}
