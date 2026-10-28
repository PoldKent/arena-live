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
        assert.equal(await page.locator('#arenaPortableTitle').innerText(),'Nueva partida');
        assert.equal(await page.locator('#arenaPortableNotice').isVisible(),true);
        assert.match(await page.locator('#arenaPortableNotice').innerText(),/streaming.*chat.*comandos/s);
        assert.equal(await page.locator('#arenaPortableDontShow').isChecked(),false);
        assert.equal(await page.locator('input[name="arenaPortableMode"]').count(),2);
        assert.equal(await page.locator('input[name="arenaPortableMode"][value="player"]').isChecked(),true);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        if(output)await page.screenshot({path:join(output,'mobile-start.png')});
    });
    await page.locator('#arenaPortableDontShow').check();
    await page.locator('#arenaPortableClass').selectOption('ninja');await page.locator('#arenaPortableStart').tap();
    await check('quick start includes Prota in the selected count and preserves class selection',async()=>{
        const state=await page.evaluate(()=>({state:ArenaLive.getState(),profile:ArenaPortable.getProfile(),fighters:ArenaLive.getFighters()}));
        assert.equal(state.state.activeFighters,32);assert.equal(state.state.mode,'iso');assert.equal(state.state.paused,false);
        assert.equal(state.state.runtime.quality,'performance');assert.equal(state.state.runtime.renderFps,30);
        assert.equal(state.fighters.filter(f=>f.isStreamer).length,1);assert.equal(state.fighters.find(f=>f.isStreamer).classKey,'ninja');
        const size=await page.locator('#arenaMobilePower').boundingBox();assert.ok(size.height>=44&&size.width>=44);
        assert.equal(await page.locator('#arenaMobilePower').isEnabled(),true);
        assert.equal(await page.evaluate(()=>ArenaPortable.getProfile().mode),'player');
        assert.equal(await page.locator('#arenaPortableTestDrawer').isVisible(),false);
        assert.equal(await page.locator('#arenaMobileTestFab').isVisible(),false);
        assert.equal(await page.locator('#arenaMobilePause').isVisible(),true);
    });
    await check('Mobile preview hides viewer instructions by default and can reveal them on demand',async()=>{
        const layout=await page.evaluate(()=>{
            const frame=document.getElementById('card-9x16'),video=document.getElementById('viewport9x16'),guide=document.getElementById('arenaAudienceGuide9');
            const inner=video.getBoundingClientRect();
            return {phoneFit:frame.classList.contains('arena-phone-fit'),videoRatio:inner.width/inner.height,
                guideVisible:getComputedStyle(guide).display!=='none',
                guideTop:guide.getBoundingClientRect().top,viewportTop:inner.top,
                commands:guide.textContent};
        });
        assert.equal(layout.phoneFit,false);
        assert.ok(Math.abs(layout.videoRatio-9/16)<.02,JSON.stringify(layout));
        assert.equal(layout.guideVisible,false);
        await page.locator('#arenaPortableToggleGuide').tap();
        assert.equal(await page.locator('#arenaAudienceGuide9').isVisible(),true);
        await page.locator('#arenaPortableToggleGuide').tap();
        assert.equal(await page.locator('#arenaAudienceGuide9').isVisible(),false);
        assert.match(layout.commands,/DALE TAP TAP PARA UNIRTE/i);
        for(const command of ['!guerrero','!kame','!shinobi','!rasen','!titan','!coloso','!rayo','!trueno','!espiritu','!enred'])assert.ok(layout.commands.includes(command),command);
    });
    await check('floating action dock and app menu fit without horizontal clipping',async()=>{
        const result=await page.evaluate(()=>{
            const ids=['arenaMobileJump','arenaMobileAttack','arenaMobilePower','arenaMobileMoreBtn'];
            const rects=ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [r.left,r.right,r.width,r.height];});
            return {rects,screen:innerWidth,visible:[...document.querySelectorAll('#arenaHeaderActions>button')].filter(n=>getComputedStyle(n).display!=='none').map(n=>n.id)};
        });
        assert.deepEqual(result.visible,['arenaMobileJump','arenaMobileAttack','arenaMobilePower','arenaMobileMoreBtn']);
        assert.ok(result.rects.every(([left,right,width,height])=>left>=0&&right<=result.screen&&width>=44&&height>=44),JSON.stringify(result));
        await page.locator('#arenaMobileMoreBtn').tap();
        assert.equal(await page.locator('#arenaPortableModePlayer').isVisible(),true);
        assert.equal(await page.locator('#arenaPortableModeDirector').isVisible(),true);
        assert.equal(await page.locator('.arena-mobile-match-menu #arenaPortableQuick').count(),1);
        assert.equal(await page.locator('#arenaOperatorPopover [data-forward-control="arenaDualChatToggleBtn"]').count(),0);
        assert.equal(await page.locator('#arenaOperatorPopover [data-forward-control="arenaViewMenuBtn"]').count(),0);
        assert.equal(await page.locator('#arenaPortableGuideMenu').isVisible(),true);
        assert.equal(await page.locator('#protagonistClassSelect').count(),1);
        await page.locator('#arenaMobileMoreBtn').tap();
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
        assert.equal(await page.evaluate(()=>ArenaLive.getState().paused),false);
        assert.equal(await page.locator('#settingsPauseModal').isVisible(),true);
        assert.equal(await page.locator('#arenaMaxPlayers').count(),1);
        assert.ok(await page.locator('#arenaBalanceRadar').count());
        const placement=await page.evaluate(()=>{
            const category=id=>document.getElementById(id)?.closest('.arena-settings-section')?.dataset.settingsCategory;
            return {
                names:category('showFighterNamesToggle'),
                damageNumbers:category('showCombatNumbersToggle'),
                powerText:category('showPowerTextToggle'),
                transparency:category('hudOpacityRange'),
                mobileControls:category('arenaMobileControlSettings'),
                volume:category('arenaRuntime_masterVolume'),
                capacity:category('arenaMaxPlayers'),
                damageRule:category('arenaRuleDamage'),
                audience:category('autoAudienceRateSettings')
            };
        });
        assert.deepEqual(placement,{
            names:'broadcast',damageNumbers:'broadcast',powerText:'broadcast',
            transparency:'broadcast',mobileControls:'controls',volume:'audio',
            capacity:'match',damageRule:'combat',audience:'audience'
        });
        await page.evaluate(()=>{setArenaCombatRule('maxPlayers',64);toggleSettingsModal(false);});
        assert.equal(await page.evaluate(()=>ArenaLive.getState().paused),false);
        await page.evaluate(()=>ArenaPortable.start({count:128,join:false}));assert.equal(await page.evaluate(()=>fighters.length),64);
        await page.evaluate(()=>setArenaCombatRule('maxPlayers',128));
    });
    await check('direct touch replaces the analog, directions move Prota and a fast swipe performs melee',async()=>{
        assert.equal(await page.locator('#touchJoystick').count(),0);
        const result=await page.evaluate(()=>{
            ArenaPortable.start({count:4,join:true});
            const actor=fighters.find(f=>f.isStreamer),view=document.getElementById('viewport9x16'),rect=view.getBoundingClientRect();
            actor.attackCooldown=0;actor.x=camera9x16.x;actor.y=camera9x16.y;
            const center=arenaMobileTouchTarget(view);
            const x=Math.min(rect.right-15,rect.left+center.x+75),y=Math.max(rect.top+15,Math.min(rect.bottom-15,rect.top+center.y));
            const dispatch=(type,clientX,clientY)=>view.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:54,clientX,clientY}));
            dispatch('pointerdown',x,y);
            const moving=keys.d&&!keys.a;
            dispatch('pointermove',Math.min(rect.right-10,x+45),y);
            dispatch('pointerup',Math.min(rect.right-10,x+45),y);
            return {moving,released:!keys.d&&!keys.a,attack:actor.attackAnimTimer>0};
        });
        assert.equal(result.moving,true);assert.equal(result.released,true);assert.equal(result.attack,true);
    });
    await check('arena taps move only; dedicated jump button gives one jump and double tap gives second jump',async()=>{
        const result=await page.evaluate(()=>{
            ArenaPortable.start({count:4,join:true});
            const actor=fighters.find(f=>f.isStreamer),view=document.getElementById('viewport9x16'),rect=view.getBoundingClientRect();
            const x=rect.left+rect.width*.47,y=rect.top+rect.height*.46;
            const tapArena=()=>{
                view.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:58,clientX:x,clientY:y}));
                view.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:58,clientX:x,clientY:y}));
            };
            const initial=actor.jumpsLeft;
            tapArena();tapArena();
            const noAccidentalJump=actor.jumpsLeft===initial;
            document.getElementById('arenaMobileJump').click();
            const afterOne=actor.jumpsLeft;
            document.getElementById('arenaMobileJump').click();
            const doubleRequested=actor.jumpsLeft<afterOne||arenaMobileTouchState.jumpRetry!==null;
            return {initial,noAccidentalJump,afterOne,doubleRequested};
        });
        assert.equal(result.noAccidentalJump,true);assert.ok(result.afterOne<result.initial);assert.equal(result.doubleRequested,true);
    });
    await check('button placement and size can be saved, modified and restored from Ajustes',async()=>{
        const result=await page.evaluate(()=>{
            const original=ArenaMobileTouch.getLayout();
            ArenaMobileTouch.setButtonSize(88);
            ArenaMobileTouch.editButtons(true);
            const editing=document.documentElement.classList.contains('arena-mobile-edit-controls');
            const node=document.getElementById('arenaMobileAttack'),rect=document.getElementById('viewport9x16').getBoundingClientRect();
            node.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:90,clientX:rect.left+rect.width*.8,clientY:rect.top+rect.height*.73}));
            node.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'touch',pointerId:90,clientX:rect.left+rect.width*.64,clientY:rect.top+rect.height*.70}));
            node.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:90,clientX:rect.left+rect.width*.64,clientY:rect.top+rect.height*.70}));
            const next=ArenaMobileTouch.getLayout();
            ArenaMobileTouch.editButtons(false);
            ArenaMobileTouch.resetButtons();
            return {editing,changed:next.points.arenaMobileAttack[0]!==original.points.arenaMobileAttack[0],size:next.size,restored:ArenaMobileTouch.getLayout().size,settings:!!document.getElementById('arenaMobileControlSettings')};
        });
        assert.equal(result.editing,true);assert.equal(result.changed,true);assert.equal(result.size,88);assert.equal(result.restored,70);assert.equal(result.settings,true);
    });
    await check('large draggable buttons stay entirely inside the narrow portrait capture',async()=>{
        const bounds=await page.evaluate(()=>{
            ArenaMobileTouch.setButtonSize(94);
            const parent=document.getElementById('viewport9x16').getBoundingClientRect();
            const buttons=['arenaMobileJump','arenaMobileAttack','arenaMobilePower','arenaMobileMoreBtn'];
            const values=buttons.map(id=>{
                const r=document.getElementById(id).getBoundingClientRect();
                return {id,left:r.left,right:r.right,top:r.top,bottom:r.bottom,
                    inside:r.left>=parent.left-1&&r.right<=parent.right+1&&r.top>=parent.top-1&&r.bottom<=parent.bottom+1};
            });
            ArenaMobileTouch.resetButtons();
            return values;
        });
        assert.ok(bounds.every(item=>item.inside),JSON.stringify(bounds));
    });
    await check('long press invokes the active class special without a separate analog control',async()=>{
        await page.evaluate(()=>{
            ArenaPortable.start({count:4,join:true});
            const actor=fighters.find(f=>f.isStreamer);actor.energy=100;actor.aiSpecialCooldown=0;
            const view=document.getElementById('viewport9x16'),rect=view.getBoundingClientRect();
            view.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:99,clientX:rect.left+rect.width*.65,clientY:rect.top+rect.height*.55}));
        });
        await page.waitForTimeout(530);
        const queued=await page.evaluate(()=>{
            const actor=fighters.find(f=>f.isStreamer),view=document.getElementById('viewport9x16'),rect=view.getBoundingClientRect(),active=!!actor.castingSkill;
            view.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:99,clientX:rect.left+rect.width*.65,clientY:rect.top+rect.height*.55}));
            return active;
        });
        assert.equal(queued,true);
    });
    await check('two roles switch in a running match, with Player HUD clean and Director tools visible',async()=>{
        assert.equal(await page.evaluate(()=>ArenaPortable.getProfile().mode),'player');
        await page.evaluate(()=>ArenaPortable.setMode('director'));
        assert.equal(await page.evaluate(()=>ArenaPortable.getProfile().mode),'director');
        assert.equal(await page.locator('#arenaPortableTestDrawer').isVisible(),true);
        assert.equal(await page.locator('#arenaMobileJump').isVisible(),false);
        assert.equal(await page.locator('#arenaMobilePause').isVisible(),true);
        await page.evaluate(()=>ArenaPortable.setMode('player'));
        assert.equal(await page.locator('#arenaPortableTestDrawer').isVisible(),false);
        assert.equal(await page.locator('#arenaMobilePower').isVisible(),true);
        assert.equal(await page.evaluate(()=>streamerManualControl),true);
    });
    await check('live mobile tests float over combat and reuse real target, power and command controls',async()=>{
        await page.evaluate(()=>{ArenaPortable.setMode('director');ArenaMobileTouch.openTests(false);});
        await page.locator('#arenaMobileTestFab').tap();
        assert.equal(await page.locator('#arenaPortableTestDrawer').isVisible(),true);
        assert.equal(await page.locator('#arenaPortableTestBody #arenaPanelPowers').count(),1);
        assert.equal(await page.locator('#arenaPortableTestBody #targetFighterSelect').count(),1);
        assert.equal(await page.locator('#arenaPortableTestBody .arena-skill-buttons button').count()>0,true);
        const sheet=await page.locator('#arenaPortableTestDrawer').evaluate(n=>{
            const box=n.getBoundingClientRect(),body=n.querySelector('#arenaPortableTestBody');
            const panel=body.querySelector('.arena-panel-body');
            const viewport=n.parentElement.getBoundingClientRect();
            return {border:parseFloat(getComputedStyle(n).borderTopWidth)>0,
                scroll:getComputedStyle(body).overflowY==='auto',
                contained:box.width<=viewport.width&&box.height<=viewport.height,
                normalPanel:getComputedStyle(panel).position==='static',
                noScreenOverlay:box.width<viewport.width&&box.height<viewport.height};
        });
        assert.deepEqual(sheet,{border:true,scroll:true,contained:true,normalPanel:true,noScreenOverlay:true});
        assert.equal(await page.locator('#targetFighterSelect').count(),1);
        await page.locator('#arenaPortableTestSelect').selectOption('arenaPanelPlayers');
        assert.equal(await page.locator('#arenaPortableTestBody #arenaPanelPlayers').count(),1);
        await page.locator('#arenaPortableTestSelect').selectOption('arenaPanelPowers');
        await page.locator('#arenaPortableTestCollapse').tap();
        assert.ok(await page.locator('#arenaPortableTestDrawer').evaluate(n=>n.classList.contains('is-collapsed')));
        await page.locator('#arenaPortableTestCollapse').tap();
        await page.locator('#arenaPortableTestClose').tap();
        assert.equal(await page.locator('#arenaPortableTestDrawer').isVisible(),false);
        await page.evaluate(()=>ArenaPortable.setMode('player'));
    });
    await check('phone rotation keeps floating buttons and tests within the active capture',async()=>{
        await page.setViewportSize({width:844,height:390});
        await page.evaluate(()=>{setMonitorFocus('16:9');ArenaPortable.start({count:9,join:true});renderBothScreensSimultaneously();});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        assert.deepEqual(await page.evaluate(()=>[canvas16.width,canvas16.height,canvas9.width,canvas9.height]),[1280,720,1,1]);
        assert.equal(await page.locator('#touchJoystick').count(),0);
        assert.equal(await page.locator('#arenaMobileMoreBtn').isVisible(),true);
        const bar=await page.locator('#arenaHeaderActions').boundingBox();assert.ok(bar.y+bar.height<=391);
        await page.evaluate(()=>ArenaMobileTouch.openTests(true));
        assert.equal(await page.locator('#arenaPortableTestDrawer').evaluate(n=>n.parentElement.id),'viewport16x9');
        await page.evaluate(()=>ArenaMobileTouch.openTests(false));
        if(output)await page.screenshot({path:join(output,'mobile-landscape.png')});
        await page.locator('#arenaMobileMoreBtn').tap();await page.locator('.arena-mobile-match-menu summary').tap();await page.locator('#arenaPortableQuick').tap();
        assert.equal(await page.locator('#arenaPortableSetup').isVisible(),true);
        await page.locator('#arenaPortableClose').tap();assert.equal(await page.evaluate(()=>isGamePaused),false);
    });
    await check('profile settings survive reopening the downloaded file',async()=>{
        await page.evaluate(()=>{ArenaPortable.setResolution(540);setArenaRuntimeOption('renderFps',60);});await page.reload({waitUntil:'load'});
        assert.equal(await page.locator('#arenaPortableResolution').inputValue(),'540');assert.equal(await page.locator('#arenaPortableFps').inputValue(),'60');
        assert.equal(await page.locator('#arenaPortableNotice').isVisible(),false);
        assert.equal(await page.locator('input[name="arenaPortableMode"][value="player"]').isChecked(),true);
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
