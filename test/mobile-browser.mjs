// Real file:// navigation, offline, with phone-sized touch contexts.
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {buildMobile} from '../tools/build-mobile.mjs';

const options={headless:true,args:['--disable-gpu']};
if(process.env.ARENA_BROWSER_EXECUTABLE)options.executablePath=process.env.ARENA_BROWSER_EXECUTABLE;
if(process.env.ARENA_BROWSER_LIBRARY_PATH)options.env={...process.env,LD_LIBRARY_PATH:process.env.ARENA_BROWSER_LIBRARY_PATH};
const temporary=await mkdtemp(join(tmpdir(),'arena-mobile-browser-'));
const output=process.env.ARENA_MOBILE_REPORT_DIR||null;
if(output)await mkdir(output,{recursive:true});
const build=await buildMobile(join(temporary,'Arena-Live-movil.html'));
const browser=await chromium.launch(options);
const checks=[],errors=[],network=[],samples=[];
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS',name);};
try{
    const context=await browser.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,offline:true});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));page.on('request',r=>{if(/^https?:|^wss?:/.test(r.url()))network.push(r.url());});
    await page.addInitScript(()=>{
        const raf=requestAnimationFrame.bind(window);
        window.requestAnimationFrame=cb=>cb.name==='gameLoop'?0:raf(cb);
    });
    await page.goto(pathToFileURL(build.path).href,{waitUntil:'load'});
    await check('opens a single downloaded HTML offline with a touch-friendly quick setup',async()=>{
        await assert.doesNotReject(()=>page.waitForSelector('#arenaPortableSetup:not([hidden])'));
        assert.equal(await page.locator('#arenaPortableCount').inputValue(),'32');
        assert.equal(await page.locator('#arenaPortableResolution').inputValue(),'720');
        assert.equal(await page.locator('#arenaPortableFps').inputValue(),'30');
        assert.equal(await page.evaluate(()=>ArenaLive.getState().paused),true);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        if(output)await page.screenshot({path:join(output,'mobile-start.png')});
    });
    await page.locator('#arenaPortableClass').selectOption('ninja');await page.locator('#arenaPortableStart').tap();
    await check('quick start includes Prota in the selected count and preserves class selection',async()=>{
        const state=await page.evaluate(()=>({state:ArenaLive.getState(),profile:ArenaPortable.getProfile(),fighters:ArenaLive.getFighters()}));
        assert.equal(state.state.activeFighters,32);assert.equal(state.state.mode,'iso');assert.equal(state.state.paused,false);
        assert.equal(state.state.runtime.quality,'performance');assert.equal(state.state.runtime.renderFps,30);
        assert.equal(state.fighters.filter(f=>f.isStreamer).length,1);assert.equal(state.fighters.find(f=>f.isStreamer).classKey,'ninja');
        const size=await page.locator('#arenaMobilePower').boundingBox();assert.ok(size.height>=44&&size.width>=44);
        assert.equal(await page.locator('#arenaMobilePower').isEnabled(),true);
    });
    await check('only the visible portrait capture allocates pixels; 720p uses 56% fewer pixels than full HD',async()=>{
        const dimensions=await page.evaluate(()=>{renderBothScreensSimultaneously();return [canvas16.width,canvas16.height,canvas9.width,canvas9.height];});
        assert.deepEqual(dimensions,[1,1,720,1280]);assert.ok(720*1280/(1080*1920)<.45);
        if(output)await page.screenshot({path:join(output,'mobile-portrait.png')});
    });
    await check('touch actions and class powers reach the command history',async()=>{
        await page.evaluate(()=>{const p=fighters.find(f=>f.isStreamer);p.energy=100;p.aiSpecialCooldown=0;});
        await page.locator('#arenaMobilePower').tap();
        const cast=await page.evaluate(()=>{const p=fighters.find(f=>f.isStreamer),queued=!!p.castingSkill;for(let i=0;i<80;i++)updatePhysicsAndAI();return {queued,text:document.getElementById('chatFeed').textContent};});
        assert.equal(cast.queued,true);assert.match(cast.text,/!rasen/);
        await page.locator('#arenaMobileJump').tap();await page.locator('#arenaMobileAttack').tap();
    });
    await check('all three game modes start from the same engine',async()=>{
        for(const [count,mode]of [[2,'1v1'],[4,'smash'],[9,'iso']]){
            assert.equal(await page.evaluate(count=>ArenaPortable.start({count,join:false}),count),true);
            const state=await page.evaluate(()=>ArenaLive.getState());assert.equal(state.activeFighters,count);assert.equal(state.mode,mode);
        }
    });
    await check('128 fighters run with all classes and visible local commands',async()=>{
        const result=await page.evaluate(()=>{
            ArenaPortable.start({count:128,join:false});setArenaCombatRule('knockback',0);soundEnabled=false;
            const snapshot=ArenaLive.getState(),classes=new Set(fighters.map(f=>f.archetypeKey));
            const started=performance.now();for(let i=0;i<180;i++)updatePhysicsAndAI();const simulation=performance.now()-started;
            const drawing=performance.now();for(let i=0;i<12;i++)renderBothScreensSimultaneously();
            return {snapshot,classes:[...classes],simulationMs:simulation,drawMs:(performance.now()-drawing)/12,commands:document.getElementById('chatFeed').textContent};
        });
        assert.equal(result.snapshot.activeFighters,128);assert.equal(result.classes.length,5);assert.match(result.commands,/!jugar/);
        samples.push({kind:'128 fighters · software Chromium · phone viewport · 720p',simulationSteps:180,...result,commands:undefined});
    });
    await check('drawing quality changes do not change a seeded combat outcome',async()=>{
        const parity=await page.evaluate(()=>{
            const run=(resolution,fps)=>{ArenaPortable.setResolution(resolution);setArenaRuntimeOption('renderFps',fps);ArenaLive.setSeed(48216);arenaFighterSerial=0;ArenaPortable.start({count:128,join:false});
                for(let step=0;step<120;step++){updatePhysicsAndAI();if(step%2===0)renderBothScreensSimultaneously();}
                return {rng:arenaCombatRandom.state(),fighters:fighters.map(f=>[f.name,f.archetypeKey,f.hp,f.energy,f.x,f.y,f.z,f.kills,f.eliminated])};};
            return [run(540,30),run(1080,60)];
        });assert.deepEqual(parity[0],parity[1]);
        await page.evaluate(()=>{ArenaPortable.setResolution(720);setArenaRuntimeOption('renderFps',30);setArenaCombatRule('knockback',1);});
    });
    await check('settings retain rules, class radar and pause/resume behavior',async()=>{
        await page.evaluate(()=>{toggleSettingsModal(true);refreshArenaBalancePanel(true);});
        assert.equal(await page.evaluate(()=>ArenaLive.getState().paused),true);
        assert.equal(await page.locator('#settingsPauseModal').isVisible(),true);
        assert.equal(await page.locator('#arenaMaxPlayers').count(),1);
        assert.ok(await page.locator('#arenaBalanceRadar').count());
        await page.evaluate(()=>{setArenaCombatRule('maxPlayers',64);toggleSettingsModal(false);});
        assert.equal(await page.evaluate(()=>ArenaLive.getState().paused),false);
        await page.evaluate(()=>ArenaPortable.start({count:128,join:false}));assert.equal(await page.evaluate(()=>fighters.length),64);
        await page.evaluate(()=>setArenaCombatRule('maxPlayers',128));
    });
    await check('rotating a phone keeps a horizontal action bar and moves the same joystick into the active view',async()=>{
        await page.setViewportSize({width:844,height:390});
        await page.evaluate(()=>{setMonitorFocus('16:9');ArenaPortable.start({count:9,join:true});renderBothScreensSimultaneously();});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        assert.deepEqual(await page.evaluate(()=>[canvas16.width,canvas16.height,canvas9.width,canvas9.height]),[1280,720,1,1]);
        assert.equal(await page.evaluate(()=>document.getElementById('touchControlDock').parentElement.id),'viewport16x9');
        assert.equal(await page.locator('#arenaMobileMoreBtn').isVisible(),true);
        const bar=await page.locator('#arenaHeaderActions').boundingBox();assert.ok(bar.y+bar.height<=391);
        const joy=await page.locator('#touchJoystick').boundingBox();
        assert.ok(joy.x>=0&&joy.y>=0&&joy.x+joy.width<=844&&joy.y+joy.height<bar.y);
        const touch=await context.newCDPSession(page);
        await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joy.x+joy.width*.88,y:joy.y+joy.height*.5,id:1}]});
        assert.equal(await page.evaluate(()=>keys.d),true);
        await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>keys.d),false);
        await touch.detach();
        if(output)await page.screenshot({path:join(output,'mobile-landscape.png')});
        await page.locator('#arenaMobileMoreBtn').tap();await page.locator('#arenaPortableQuick').tap();
        assert.equal(await page.locator('#arenaPortableSetup').isVisible(),true);
        await page.locator('#arenaPortableClose').tap();assert.equal(await page.evaluate(()=>isGamePaused),false);
    });
    await check('profile settings survive reopening the downloaded file',async()=>{
        await page.evaluate(()=>{ArenaPortable.setResolution(540);setArenaRuntimeOption('renderFps',60);});await page.reload({waitUntil:'load'});
        assert.equal(await page.locator('#arenaPortableResolution').inputValue(),'540');assert.equal(await page.locator('#arenaPortableFps').inputValue(),'60');
    });
    await check('returning from another app resets the wall clock without changing a manual pause',async()=>{
        const clock=await page.evaluate(()=>{
            isGamePaused=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
            const hidden=arenaPortableSuspended;gameLoop(900000);
            Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));
            return {hidden,suspended:arenaPortableSuspended,previousFrameTime,simulationAccumulator,paused:isGamePaused};
        });
        assert.deepEqual(clock,{hidden:true,suspended:false,previousFrameTime:null,simulationAccumulator:0,paused:true});
    });
    await check('no network request is needed for scripts, fonts, styles or gameplay',async()=>assert.deepEqual(network,[]));
    await context.close();
    const denied=await browser.newContext({viewport:{width:360,height:740},hasTouch:true,isMobile:true,offline:true});
    const fallback=await denied.newPage();fallback.on('pageerror',e=>errors.push(e.stack));
    await fallback.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage denied','SecurityError');}});});
    await fallback.goto(pathToFileURL(build.path).href,{waitUntil:'load'});
    await check('still runs with blocked file storage and on a narrow phone',async()=>{
        await fallback.locator('#arenaPortableStart').tap();await fallback.waitForTimeout(150);
        const state=await fallback.evaluate(()=>ArenaLive.getState());assert.equal(state.phase,'COMBAT');assert.equal(state.fighterBodies,32);assert.ok(state.simulationTick>0);
        assert.equal(await fallback.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    });
    await denied.close();assert.deepEqual(errors,[]);
    if(output)await writeFile(join(output,'mobile-validation.json'),JSON.stringify({build,checks,samples,network,errors,environment:'Chromium software rendering; touch and phone viewport emulation, not a physical phone or GPU'},null,2));
    console.log(JSON.stringify({checks:checks.length,errors:errors.length,networkRequests:network.length,samples},null,2));
}finally{await browser.close();await rm(temporary,{recursive:true,force:true});}
