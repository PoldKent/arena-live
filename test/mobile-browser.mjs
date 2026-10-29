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
        // Help moved to the Menu in the Streamer mobile layout.
        await page.locator('#arenaMobileMoreBtn').tap();
        await page.locator('#arenaPortableGuideMenu').tap();
        assert.equal(await page.locator('#arenaAudienceGuide9').isVisible(),true);
        await page.locator('#arenaMobileMoreBtn').tap();
        await page.locator('#arenaPortableGuideMenu').tap();
        assert.equal(await page.locator('#arenaAudienceGuide9').isVisible(),false);
        assert.match(layout.commands,/DALE TAP TAP PARA UNIRTE/i);
        for(const command of ['!guerrero','!kame','!shinobi','!rasen','!titan','!coloso','!rayo','!trueno','!espiritu','!enred'])assert.ok(layout.commands.includes(command),command);
    });
    await check('floating action dock and app menu fit without horizontal clipping',async()=>{
        const result=await page.evaluate(()=>{
            const ids=['arenaMobileJump','arenaMobileAttack','arenaMobilePower','arenaMobileMoreBtn','arenaMobilePause','arenaPortableFullscreen'];
            const rects=ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [r.left,r.right,r.width,r.height];});
            const video=document.getElementById('viewport9x16').getBoundingClientRect();
            const shelf=document.getElementById('arenaMobileControlShelf').getBoundingClientRect();
            const toolbar=document.getElementById('arenaMobileFloating').getBoundingClientRect();
            const top=[...document.querySelectorAll('#arenaMobileFloating>button')].filter(n=>getComputedStyle(n).display!=='none').map(n=>n.id);
            const bottom=[...document.querySelectorAll('#arenaHeaderActions>button')].filter(n=>getComputedStyle(n).display!=='none').map(n=>n.id);
            return {rects,screen:innerWidth,top,bottom,menuInTop:document.getElementById('arenaMobileMoreBtn').parentElement.id==='arenaMobileFloating',topOutside:document.getElementById('arenaMobileFloating').parentElement.id==='arenaTopBarInner',video:{top:video.top,bottom:video.bottom,width:video.width,height:video.height},shelf:{top:shelf.top,bottom:shelf.bottom},toolbar:{bottom:toolbar.bottom}};
        });
        assert.deepEqual(result.top,['arenaMobilePause','arenaMobileModeShortcut','arenaMobileMoreBtn','arenaPortableFullscreen']);
        assert.deepEqual(result.bottom,['arenaMobileJump','arenaMobileAttack','arenaMobilePower']);
        assert.equal(result.menuInTop,true);assert.equal(result.topOutside,true);
        assert.ok(result.toolbar.bottom<result.video.top,JSON.stringify(result));
        assert.ok(result.shelf.top>=result.video.bottom-1,JSON.stringify(result));
        assert.ok(Math.abs(result.video.width/result.video.height-9/16)<.02,JSON.stringify(result));
        // RC2: compact circular toolbar uses 38px and action buttons remain >=44px.
        assert.ok(result.rects.every(([left,right,width,height],i)=>left>=0&&right<=result.screen&&width>=(i<3?44:38)&&height>=(i<3?44:38)),JSON.stringify(result));
        const toolbar=await page.locator('#arenaMobileFloating').evaluate(node=>{
            const rect=node.getBoundingClientRect();
            const video=document.getElementById('viewport9x16').getBoundingClientRect();
            const btn=getComputedStyle(node.querySelector('#arenaPortableFullscreen'));
            return {x:rect.x,y:rect.y,right:rect.right,videoTop:video.top,
                fixed:getComputedStyle(node).position==='fixed',
                circle:btn.borderRadius==='50%',w:parseFloat(btn.width)};
        });
        assert.ok(!toolbar.fixed&&toolbar.circle&&toolbar.w===38,JSON.stringify(toolbar));
        assert.ok(toolbar.y>=0&&toolbar.right<=result.screen&&toolbar.y+toolbar.w<=toolbar.videoTop,JSON.stringify(toolbar));
        await page.locator('#arenaMobileMoreBtn').tap();
        assert.equal(await page.locator('#arenaPortableModePlayer').isVisible(),true);
        assert.equal(await page.locator('#arenaPortableModeDirector').isVisible(),true);
        assert.match(await page.locator('#arenaPortableModeDirector').innerText(),/Modo Streamer/);
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
        await page.locator('[data-settings-tab="combat"]').tap();
        const fit=await page.evaluate(()=>{
            const content=document.getElementById('settingsPanelsScroll');
            const pane=document.getElementById('settingsPauseModal').firstElementChild.getBoundingClientRect();
            const children=[...content.querySelectorAll('select,input[type="range"]')].filter(n=>n.getBoundingClientRect().width>0);
            return {scrollFits:content.scrollWidth<=content.clientWidth+2,
                sheetFits:pane.left>=-1&&pane.right<=innerWidth+1,
                fieldsFit:children.every(n=>{
                    const r=n.getBoundingClientRect();
                    return r.left>=pane.left-1&&r.right<=pane.right+1;
                })};
        });
        assert.deepEqual(fit,{scrollFits:true,sheetFits:true,fieldsFit:true});

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
    await check('Táctil total hides the analog and action buttons while preserving swipe combat',async()=>{
        await page.evaluate(()=>ArenaMobileTouch.setTouchMode('touch'));
        assert.equal(await page.locator('#touchJoystick').count(),1);
        assert.equal(await page.locator('#touchJoystick').isVisible(),false);
        assert.equal(await page.locator('#arenaMobilePower').isVisible(),false);
        assert.equal(await page.locator('#arenaMobileGestureGuide').isVisible(),true);
        const result=await page.evaluate(()=>{
            ArenaPortable.start({count:4,join:true});
            const actor=fighters.find(f=>f.isStreamer),view=document.getElementById('viewport9x16'),rect=view.getBoundingClientRect();
            actor.attackCooldown=0;actor.x=camera9x16.x;actor.y=camera9x16.y;
            const x=rect.left+rect.width*.20,y=rect.top+rect.height*.45;
            const dispatch=(type,id,clientX,clientY)=>view.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:id,clientX,clientY}));
            dispatch('pointerdown',54,x,y);
            dispatch('pointermove',54,x+45,y);
            const moving=keys.d&&!keys.a;
            actor.attackCooldown=0;
            const ax=rect.left+rect.width*.75;
            dispatch('pointerdown',55,ax,y);
            dispatch('pointermove',55,ax+45,y);
            dispatch('pointerup',55,ax+45,y);
            const concurrent=keys.d&&!keys.a;
            dispatch('pointerup',54,x+45,y);
            return {moving,released:!keys.d&&!keys.a,attack:actor.attackAnimTimer>0,concurrent};
        });
        assert.equal(result.moving,true);assert.equal(result.released,true);assert.equal(result.attack,true);assert.equal(result.concurrent,true);
    });
    await check('Táctil total jumps immediately with a right tap and requests aerial jump on second tap',async()=>{
        const result=await page.evaluate(()=>{
            ArenaPortable.start({count:4,join:true});
            const actor=fighters.find(f=>f.isStreamer),view=document.getElementById('viewport9x16'),rect=view.getBoundingClientRect();
            const x=rect.left+rect.width*.75,y=rect.top+rect.height*.46;
            const tapArena=()=>{
                view.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:58,clientX:x,clientY:y}));
                view.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:58,clientX:x,clientY:y}));
            };
            const initial=actor.jumpsLeft;
            tapArena();
            const afterOne=actor.jumpsLeft;
            tapArena();
            const doubleRequested=actor.jumpsLeft<afterOne||arenaMobileTouchState.jumpRetry!==null;
            return {initial,afterOne,doubleRequested};
        });
        assert.ok(result.afterOne<result.initial);assert.equal(result.doubleRequested,true);
    });
    await check('RC2 Gameboy layout: analog left and action trio right immediately after video',async()=>{
        await page.evaluate(()=>{ArenaPortable.setMode('player');ArenaMobileTouch.setTouchMode('joystick');ArenaMobileTouch.resetButtons();});
        await page.waitForTimeout(150);
        const r=await page.evaluate(()=>{
            const get=id=>document.getElementById(id).getBoundingClientRect();
            const game=get('viewport9x16'),rail=get('arenaMobileControlShelf');
            const joy=get('touchJoystick'),power=get('arenaMobilePower'),jump=get('arenaMobileJump'),attack=get('arenaMobileAttack');
            const toolbar=get('arenaMobileFloating');
            const header=document.querySelector('body>header').getBoundingClientRect();
            return {game:{top:game.top,bottom:game.bottom,width:game.width,height:game.height},
                rail:{top:rail.top,bottom:rail.bottom},joy:{left:joy.left,right:joy.right,top:joy.top,bottom:joy.bottom},
                power:{left:power.left,right:power.right,top:power.top,bottom:power.bottom},
                jump:{left:jump.left,right:jump.right,top:jump.top,bottom:jump.bottom},
                attack:{left:attack.left,right:attack.right,top:attack.top,bottom:attack.bottom},
                toolbar:{top:toolbar.top,bottom:toolbar.bottom},header:{top:header.top,bottom:header.bottom},h:innerHeight,
                hint:getComputedStyle(document.getElementById('arenaMobileGestureGuide')).display};
        });
        assert.ok(r.toolbar.bottom<=r.game.top+2,JSON.stringify(r));
        assert.ok(r.toolbar.top>=r.header.top&&r.toolbar.bottom<=r.header.bottom+2,JSON.stringify(r));
        assert.ok(r.joy.right<r.power.left&&r.joy.right<r.jump.left&&r.joy.right<r.attack.left,JSON.stringify(r));
        assert.ok(r.power.left<r.jump.left&&r.jump.left<r.attack.left,JSON.stringify(r));
        assert.ok(r.jump.top<r.power.top&&r.jump.top<r.attack.top,JSON.stringify(r));
        const separation=(a,b)=>Math.hypot((a.left+a.right-b.left-b.right)/2,(a.top+a.bottom-b.top-b.bottom)/2);
        assert.ok(separation(r.power,r.jump)>=70,JSON.stringify(r));
        assert.ok(separation(r.attack,r.jump)>=70,JSON.stringify(r));
        assert.ok(separation(r.power,r.attack)>=70,JSON.stringify(r));
        assert.ok(r.rail.top>=r.game.bottom-2,JSON.stringify(r));
        assert.ok(r.rail.bottom<=r.h+2,JSON.stringify(r));
        assert.equal(r.hint,'none',JSON.stringify(r));
    });
    await check('joystick plus action button positions can be saved, modified and restored',async()=>{
        const result=await page.evaluate(()=>{
            ArenaMobileTouch.setTouchMode('joystick');
            const original=ArenaMobileTouch.getLayout();
            ArenaMobileTouch.setButtonSize(88);
            ArenaMobileTouch.editButtons(true);
            const editing=document.documentElement.classList.contains('arena-mobile-edit-controls');
            const node=document.getElementById('arenaMobileAttack'),rect=document.getElementById('arenaMobileControlShelf').getBoundingClientRect();
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
            const parent=document.getElementById('arenaMobileControlShelf').getBoundingClientRect();
            const buttons=['touchJoystick','arenaMobileJump','arenaMobileAttack','arenaMobilePower'];
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
    await check('Táctil total long press invokes the active special',async()=>{
        await page.evaluate(()=>{
            ArenaMobileTouch.setTouchMode('touch');ArenaPortable.start({count:4,join:true});
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
    await check('two roles switch in a running match, with Player HUD clean and Streamer tools visible',async()=>{
        await page.evaluate(()=>ArenaMobileTouch.setTouchMode('joystick'));
        assert.equal(await page.evaluate(()=>ArenaPortable.getProfile().mode),'player');
        await page.evaluate(()=>ArenaPortable.setMode('director'));
        assert.equal(await page.evaluate(()=>ArenaPortable.getProfile().mode),'director');
        assert.equal(await page.locator('#arenaPortableTestDrawer').isVisible(),false);
        assert.equal(await page.locator('#arenaStreamerSkillsDock').isVisible(),true);
        const bar=await page.locator('#arenaStreamerSkillsDock').boundingBox();
        const view=await page.locator('#viewport9x16').boundingBox();
        assert.ok(bar.y>=view.y+view.height-1&&bar.height<80);
        assert.equal(await page.locator('#arenaStreamerSkillsDock .arena-skill-buttons>button').count(),5);
        assert.equal(await page.locator('#arenaMobileJump').isVisible(),false);
        assert.equal(await page.locator('#arenaMobilePause').isVisible(),true);
        await page.evaluate(()=>ArenaPortable.setMode('player'));
        assert.equal(await page.locator('#arenaPortableTestDrawer').isVisible(),false);
        assert.equal(await page.locator('#arenaMobilePower').isVisible(),true);
        assert.equal(await page.evaluate(()=>streamerManualControl),true);
    });
    await check('compact Streamer tests sit below the 9:16 frame and retain the original commands',async()=>{
        await page.evaluate(()=>{ArenaPortable.setMode('director');ArenaMobileTouch.openTests(false);});
        assert.equal(await page.locator('#arenaMobileTestsShortcut').isVisible(),true);
        const before=await page.evaluate(()=>{
            const video=document.getElementById('viewport9x16').getBoundingClientRect();
            const skills=document.getElementById('arenaStreamerSkillsDock').getBoundingClientRect();
            return {x:video.x,y:video.y,width:video.width,height:video.height,
                skillX:skills.x,skillY:skills.y,skillWidth:skills.width,skillHeight:skills.height};
        });
        await page.locator('#arenaMobileTestsShortcut').tap();
        assert.equal(await page.locator('#arenaPortableTestDrawer').isVisible(),true);
        await page.waitForTimeout(100);
        assert.match(await page.locator('#arenaPortableTestHead').innerText(),/Modo Streamer/);
        assert.equal(await page.locator('#arenaPortableTestBody #arenaPanelPowers').count(),1);
        assert.equal(await page.locator('#arenaPortableTestBody #targetFighterSelect').count(),1);
        assert.equal(await page.locator('#arenaStreamerSkillsDock .arena-skill-buttons button').count(),5);
        const sheet=await page.locator('#arenaPortableTestDrawer').evaluate((n,before)=>{
            const box=n.getBoundingClientRect(),video=document.getElementById('viewport9x16').getBoundingClientRect();
            const skills=document.getElementById('arenaStreamerSkillsDock').getBoundingClientRect();
            const body=n.querySelector('#arenaPortableTestBody'),panel=body.querySelector('.arena-panel-body');
            return {border:parseFloat(getComputedStyle(n).borderTopWidth)>0,
                scroll:getComputedStyle(body).overflowY==='auto',
                inBody:n.parentElement===document.body,
                onScreen:box.width>150&&box.height>=120&&box.top>=0&&box.bottom<=innerHeight+2,
                aboveSkills:box.bottom<=skills.top+1,
                videoUnchanged:Math.abs(video.x-before.x)<1&&Math.abs(video.y-before.y)<1&&Math.abs(video.width-before.width)<1&&Math.abs(video.height-before.height)<1,
                skillsUnchanged:Math.abs(skills.x-before.skillX)<1&&Math.abs(skills.y-before.skillY)<1&&Math.abs(skills.width-before.skillWidth)<1&&Math.abs(skills.height-before.skillHeight)<1,
                skillsVisible:getComputedStyle(document.getElementById('arenaStreamerSkillsDock')).display!=='none',
                actualOptions:!!n.querySelector('#arenaPortableTestSelect')&&!!n.querySelector('#arenaPanelPowers'),
                normalPanel:getComputedStyle(panel).position==='static'};
        },before);
        assert.deepEqual(sheet,{border:true,scroll:true,inBody:true,onScreen:true,aboveSkills:true,videoUnchanged:true,skillsUnchanged:true,skillsVisible:true,actualOptions:true,normalPanel:true},JSON.stringify(sheet));
        if(output)await page.screenshot({path:join(output,'mobile-streamer-tests-open.png')});
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
    await check('restored v0.37 UI is the actual stylesheet and has single focus + fixed powers rail',async()=>{
        const result=await page.evaluate(()=>{
            const css=document.getElementById('arena-mobile-profile').textContent;
            return {baseline:css.includes('v0.37: Director controls stay within one compact scrollable panel'),
              restored:css.includes('RESTORE MOBILE v0.37 UI · RC1'),
              oldPatchStack:css.includes('v0.40.3 · Single mobile theater'),
              fixFullscreenCSS:document.getElementById('arena-fullscreen-capture').textContent.includes('html:not(.arena-mobile-offline) #card-9x16:fullscreen'),
              mode:document.documentElement.dataset.mobileMode};
        });
        assert.equal(result.baseline,true,JSON.stringify(result));
        assert.equal(result.restored,true,JSON.stringify(result));
        assert.equal(result.oldPatchStack,false,JSON.stringify(result));
        assert.equal(result.fixFullscreenCSS,true,JSON.stringify(result));
        await page.evaluate(()=>{ArenaPortable.setMode('director');setMonitorFocus('9:16');ArenaMobileTouch.openTests(false);});
        await page.waitForTimeout(120);
        const layout=await page.evaluate(()=>{
            const r=id=>document.getElementById(id).getBoundingClientRect();
            const video=r('viewport9x16'),rail=r('arenaStreamerSkillsDock');
            return {videoBottom:video.bottom,videoRatio:video.width/video.height,
              railTop:rail.top,railBottom:rail.bottom,
              railDisplay:getComputedStyle(document.getElementById('arenaStreamerSkillsDock')).display,
              powers:[...document.querySelectorAll('#arenaStreamerSkillsDock .arena-skill-buttons>button')].map(n=>{
                const b=n.getBoundingClientRect();return {width:b.width,height:b.height,top:b.top,bottom:b.bottom};
              }),
              viewportHeight:innerHeight};
        });
        assert.equal(layout.powers.length,5,JSON.stringify(layout));
        assert.ok(layout.powers.every(b=>b.width>20&&b.top>=0&&b.bottom<=layout.viewportHeight+1),JSON.stringify(layout));
        assert.ok(layout.videoBottom<=layout.railTop+2,JSON.stringify(layout));
        assert.ok(layout.railBottom<=layout.viewportHeight+1,JSON.stringify(layout));
        assert.ok(Math.abs(layout.videoRatio-9/16)<.02,JSON.stringify(layout));
        await page.locator('#arenaMobileTestsShortcut').tap();
        const after=await page.locator('#viewport9x16').boundingBox();
        assert.ok(Math.abs(after.y+after.height-layout.videoBottom)<2,JSON.stringify({layout,after}));
        await page.locator('#arenaPortableTestClose').tap();
    });
    await check('Android content URL fallback preserves five Streamer powers and upper toolbar without cropping',async()=>{
        await page.evaluate(()=>{ArenaPortable.setMode('director');ArenaMobileTouch.openTests(false);});
        await page.evaluate(()=>Object.defineProperty(document,'fullscreenEnabled',{value:false,configurable:true}));
        await page.locator('#arenaPortableFullscreen').tap();
        await page.waitForFunction(()=>document.documentElement.classList.contains('arena-mobile-theater'));
        await page.waitForTimeout(100);
        const bounds=await page.evaluate(()=>{
            const box=id=>document.getElementById(id).getBoundingClientRect();
            const video=box('viewport9x16'),rail=box('arenaStreamerSkillsDock'),toolbar=box('arenaMobileFloating');
            return {video:{top:video.top,bottom:video.bottom,width:video.width,height:video.height},
                rail:{top:rail.top,bottom:rail.bottom,height:rail.height},
                toolbar:{top:toolbar.top,bottom:toolbar.bottom},
                buttons:[...document.querySelectorAll('#arenaStreamerSkillsDock .arena-skill-buttons>button')].map(b=>b.getBoundingClientRect().width),
                toolbarVisible:getComputedStyle(document.getElementById('arenaMobileFloating')).display!=='none',
                railVisible:getComputedStyle(document.getElementById('arenaStreamerSkillsDock')).display!=='none',
                headerVisible:getComputedStyle(document.getElementById('arenaMobileFullscreenBar')).display!=='none',
                screen:innerHeight};
        });
        assert.ok(bounds.headerVisible&&bounds.toolbarVisible&&bounds.railVisible,JSON.stringify(bounds));
        assert.equal(bounds.buttons.length,5);
        assert.ok(bounds.buttons.every(w=>w>=25),JSON.stringify(bounds));
        assert.ok(bounds.rail.bottom<=bounds.screen+1,JSON.stringify(bounds));
        assert.ok(bounds.video.bottom<=bounds.rail.top+2,JSON.stringify(bounds));
        assert.ok(bounds.toolbar.bottom<=bounds.video.top+2,JSON.stringify(bounds));
        assert.ok(Math.abs(bounds.video.width/bounds.video.height-9/16)<.02,JSON.stringify(bounds));
        await page.locator('#arenaMobileTestsShortcut').tap();
        assert.equal(await page.locator('#arenaPortableTestDrawer').isVisible(),true);
        assert.equal(await page.locator('#arenaStreamerSkillsDock').isVisible(),true);
        await page.locator('#arenaPortableTestClose').tap();
        await page.locator('#arenaPortableFullscreen').tap();
        assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('arena-mobile-theater')),false);
        await page.evaluate(()=>delete document.fullscreenEnabled);
    });

    await check('RC5 menu closes by button, X, Escape and Android Back without leaving theater',async()=>{
        await page.evaluate(()=>{
            ArenaPortable.setMode('player');
            Object.defineProperty(document,'fullscreenEnabled',{value:false,configurable:true});
        });
        await page.locator('#arenaPortableFullscreen').tap();
        await page.waitForFunction(()=>document.documentElement.classList.contains('arena-mobile-theater'));
        await page.locator('#arenaMobileMoreBtn').tap();
        assert.equal(await page.locator('#arenaOperatorPopover').isVisible(),true);
        await page.locator('#arenaMobileMoreBtn').tap();
        assert.equal(await page.locator('#arenaOperatorPopover').isVisible(),false);
        await page.locator('#arenaMobileMoreBtn').tap();
        await page.locator('#arenaMobileMenuClose').tap();
        assert.equal(await page.locator('#arenaOperatorPopover').isVisible(),false);
        await page.locator('#arenaMobileMoreBtn').tap();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#arenaOperatorPopover').isVisible(),false);
        await page.locator('#arenaMobileMoreBtn').tap();
        await page.locator('.arena-mobile-match-menu summary').tap();
        assert.equal(await page.locator('.arena-mobile-match-menu').evaluate(n=>n.open),true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.arena-mobile-match-menu').evaluate(n=>n.open),false);
        assert.equal(await page.locator('#arenaOperatorPopover').isVisible(),true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#arenaOperatorPopover').isVisible(),false);
        assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('arena-mobile-theater')),true);
        await page.locator('#arenaMobileTestsShortcut').tap();
        assert.equal(await page.locator('#arenaPortableTestDrawer').isVisible(),true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#arenaPortableTestDrawer').isVisible(),false);
        assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('arena-mobile-theater')),true);
        await page.locator('#arenaPortableFullscreen').tap();
        assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('arena-mobile-theater')),false);
        await page.evaluate(()=>delete document.fullscreenEnabled);
    });
    await check('native fullscreen keeps Streamer tests, menu and controls visible and the 9:16 centered',async()=>{
        await page.evaluate(()=>{ArenaPortable.setMode('director');ArenaMobileTouch.openTests(false);});
        if(!await page.evaluate(()=>document.fullscreenEnabled)){
            console.log('SKIP native fullscreen: browser does not support fullscreen for file://');
            return;
        }
        await page.locator('#arenaPortableFullscreen').tap();
        await page.waitForFunction(()=>document.fullscreenElement?.id==='card-9x16');
        assert.equal(await page.locator('#arenaMobileFloating').isVisible(),true);
        assert.equal(await page.locator('#arenaMobileFullscreenBar').isVisible(),true);
        assert.equal(await page.locator('#arenaMobileFullscreenBar .arena-brand-block').count(),1);
        assert.equal(await page.locator('#arenaMobileFullscreenBar #arenaMobileFloating').count(),1);
        assert.equal(await page.locator('#arenaStreamerSkillsDock').isVisible(),true);
        assert.equal(await page.locator('#arenaStreamerSkillsDock .arena-skill-buttons>button').count(),5);
        assert.equal(await page.locator('#arenaStreamerSkillsDock .arena-skill-buttons>button').first().isVisible(),true);
        assert.equal(await page.locator('#arenaMobileControlShelf').isVisible(),true);
        const geometry=await page.evaluate(()=>{
            const v=document.getElementById('viewport9x16').getBoundingClientRect();
            const skills=document.getElementById('arenaStreamerSkillsDock').getBoundingClientRect();
            return {x:v.x,y:v.y,w:v.width,h:v.height,skillsTop:skills.top};
        });
        await page.locator('#arenaMobileTestsShortcut').tap();
        await page.waitForTimeout(100);
        const state=await page.evaluate(before=>{
            const v=document.getElementById('viewport9x16').getBoundingClientRect();
            const skills=document.getElementById('arenaStreamerSkillsDock').getBoundingClientRect();
            const card=document.fullscreenElement;
            const drawer=document.getElementById('arenaPortableTestDrawer');
            const rect=drawer.getBoundingClientRect(),video=document.getElementById('viewport9x16').getBoundingClientRect();
            return {inFullscreen:drawer.parentElement===card,
                options:!!drawer.querySelector('#arenaPanelPowers')&&!!drawer.querySelector('#arenaPortableTestSelect'),
                onScreen:rect.width>100&&rect.height>80&&rect.top>=0&&rect.bottom<=innerHeight+1,
                videoCentered:Math.abs(video.left-(innerWidth-video.width)/2)<6,
                powersVisible:getComputedStyle(document.getElementById('arenaStreamerSkillsDock')).display!=='none'&&skills.top<innerHeight,
                abovePowers:rect.bottom<=skills.top+1,
                videoUnchanged:Math.abs(v.x-before.x)<1&&Math.abs(v.y-before.y)<1&&Math.abs(v.width-before.w)<1&&Math.abs(v.height-before.h)<1,
                videoRatio:video.width/video.height};
        },geometry);
        assert.equal(state.inFullscreen,true);assert.equal(state.options,true);
        assert.equal(state.onScreen,true,JSON.stringify(state));
        assert.equal(state.videoCentered,true,JSON.stringify(state));
        assert.equal(state.abovePowers,true,JSON.stringify(state));
        assert.equal(state.powersVisible,true,JSON.stringify(state));
        assert.equal(state.videoUnchanged,true,JSON.stringify(state));
        assert.ok(Math.abs(state.videoRatio-9/16)<.02,JSON.stringify(state));
        if(output)await page.screenshot({path:join(output,'mobile-fullscreen-tests.png')});
        // Drag tests by the title: neither the viewport nor the five powers resize.
        const head=await page.locator('#arenaPortableTestHead').boundingBox();
        const initial=await page.locator('#arenaPortableTestDrawer').boundingBox();
        await page.mouse.move(head.x+20,head.y+head.height/2);
        await page.mouse.down();
        await page.mouse.move(head.x-25,head.y-36,{steps:6});
        await page.mouse.up();
        const dragged=await page.locator('#arenaPortableTestDrawer').boundingBox();
        assert.equal(await page.locator('#arenaPortableTestDrawer').evaluate(n=>n.classList.contains('is-positioned')),true);
        assert.ok(Math.abs(dragged.x-initial.x)>3||Math.abs(dragged.y-initial.y)>3,JSON.stringify({initial,dragged}));
        await page.locator('#arenaPortableTestTransparency').evaluate(n=>{
            n.value='45';n.dispatchEvent(new Event('input',{bubbles:true}));
        });
        assert.equal(Number(await page.locator('#arenaPortableTestDrawer').evaluate(n=>getComputedStyle(n).opacity)),1);
        const panelAlpha=await page.locator('#arenaPortableTestDrawer').evaluate(n=>
            Number(getComputedStyle(n).getPropertyValue('--arena-tests-background-alpha')));
        assert.ok(Math.abs(panelAlpha-.55)<.02);
        assert.equal(await page.locator('#arenaPortableTransparencyValue').textContent(),'45%');
        assert.equal(await page.locator('#arenaStreamerSkillsDock .arena-skill-buttons>button').count(),5);
        assert.equal(await page.locator('#arenaMobileFullscreenBar').isVisible(),true);
        const movedVideo=await page.locator('#viewport9x16').boundingBox();
        assert.ok(Math.abs(movedVideo.width-geometry.w)<1&&Math.abs(movedVideo.height-geometry.h)<1);
        await page.locator('#arenaPortableTestClose').tap();
        await page.locator('#arenaMobileMoreBtn').tap();
        assert.equal(await page.locator('#arenaOperatorPopover').isVisible(),true);
        await page.locator('#arenaMobileMoreBtn').tap();
        await page.locator('#arenaPortableFullscreen').tap();
        await page.waitForFunction(()=>!document.fullscreenElement);
        assert.equal(await page.locator('#arenaPortableTestDrawer').evaluate(n=>n.parentElement===document.body),true);
    });
    await check('16:9-only view hides 9:16 on the wide mobile HTML, and switching restores both',async()=>{
        await page.setViewportSize({width:1856,height:824});
        const cases=[
          ['16:9',true,false],
          ['9:16',false,true],
          ['dual',true,true],
          ['16:9',true,false]
        ];
        for(const [focus,show16,show9] of cases){
            await page.evaluate(mode=>setMonitorFocus(mode),focus);
            await page.waitForTimeout(80);
            const result=await page.evaluate(()=>{
                const grid=document.getElementById('dualMonitorsGrid');
                const horizontal=document.getElementById('card-16x9');
                const portrait=document.getElementById('card-9x16');
                const visible=node=>getComputedStyle(node).display!=='none'&&node.getBoundingClientRect().width>0;
                return {focus:grid.dataset.focus,horizontal:visible(horizontal),portrait:visible(portrait),
                    horizontalHidden:horizontal.hidden,portraitHidden:portrait.hidden};
            });
            assert.equal(result.focus,focus,JSON.stringify(result));
            assert.equal(result.horizontal,show16,JSON.stringify(result));
            assert.equal(result.portrait,show9,JSON.stringify(result));
            assert.equal(result.horizontalHidden,!show16,JSON.stringify(result));
            assert.equal(result.portraitHidden,!show9,JSON.stringify(result));
        }
        if(output)await page.screenshot({path:join(output,'mobile-wide-only-16x9.png')});
        await page.setViewportSize({width:390,height:844});
        await page.evaluate(()=>setMonitorFocus('9:16'));
        assert.equal(await page.locator('#card-16x9').isVisible(),false);
        assert.equal(await page.locator('#card-9x16').isVisible(),true);
    });
    await check('phone rotation keeps floating buttons and tests within the active capture',async()=>{
        await page.setViewportSize({width:844,height:390});
        await page.evaluate(()=>{setMonitorFocus('16:9');ArenaPortable.start({count:9,join:true});renderBothScreensSimultaneously();});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        assert.deepEqual(await page.evaluate(()=>[canvas16.width,canvas16.height,canvas9.width,canvas9.height]),[1280,720,1,1]);
        assert.equal(await page.locator('#touchJoystick').count(),1);
        assert.equal(await page.locator('#arenaMobileMoreBtn').isVisible(),true);
        const bar=await page.locator('#arenaMobileFloating').boundingBox();assert.ok(bar.y+bar.height<=391);
        await page.evaluate(()=>ArenaMobileTouch.openTests(true));
        assert.equal(await page.locator('#arenaPortableTestDrawer').evaluate(n=>n.parentElement===document.body),true);
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
