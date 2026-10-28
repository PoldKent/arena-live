// Lifecycle and participation contracts. No LIVE connection or machine-specific FPS assertions.
import assert from 'node:assert/strict';
import {openTestApp} from './browser-test-env.mjs';
const app=await openTestApp(),errors=[],checks=[];
let page;
try {
    page=await app.browser.newPage({viewport:{width:1720,height:900}});
    page.on('pageerror',e=>errors.push(e.stack));
    await page.route('https://**',r=>r.abort());
    await page.addInitScript(()=>{
        window.testIntervals=[];window.testFinals=[];
        window.setInterval=(fn,ms)=>{testIntervals.push({fn,ms});return testIntervals.length;};
        const timeout=window.setTimeout.bind(window),raf=window.requestAnimationFrame.bind(window);
        window.setTimeout=(fn,ms,...args)=>{if(String(fn).includes('triggerVictoryScreen')){testFinals.push(()=>fn(...args));return -testFinals.length;}return timeout(fn,ms,...args);};
        window.requestAnimationFrame=fn=>fn.name==='gameLoop'?0:raf(fn);
    });
    await page.goto(app.url,{waitUntil:'load'});
    await page.waitForFunction(()=>window.ArenaLive&&arenaLiveInitialized);
    await page.evaluate(()=>{
        window.fixture=(count=8)=>{
            toggleSettingsModal(false);isGamePaused=false;isSettingsOpen=false;
            gameState='LOBBY';koSequenceActive=false;soundEnabled=false;autoChatEnabled=false;countdownsEnabled=false;
            arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};arenaRuntime={...ARENA_RUNTIME_DEFAULTS};setArenaRandomSeed(4521);
            setRejoinRuleMode('3_lives');setPlayerLives(3);applyPlayerCountPreset(count);startCombatFromLobby();
            autoAttackEnabled=false;testFinals.length=0;chatRateLimits.clear();
        };
    });
    const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS',name);};
    await check('Rematch restores all 128 round participants from combat and victory without historical viewers',async()=>{
        const r=await page.evaluate(()=>{fixture(128);const before=fighters.map(f=>f.name).sort();rematchSamePlayers();const combat=fighters.map(f=>f.name).sort();triggerVictoryScreen(fighters[0]);rematchSamePlayers();return {before,combat,victory:fighters.map(f=>f.name).sort()};});
        assert.equal(r.before.length,128);assert.deepEqual(r.combat,r.before);assert.deepEqual(r.victory,r.before);
    });
    await check('Rematch keeps Prota, class preferences and late entrants',async()=>{
        const r=await page.evaluate(()=>{fixture(8);const f=addOrBoostFighter('@operator','tiktok',true,'ninja',true);addOrBoostFighter('@late','tiktok',false,'titan',true);const before=fighters.map(ArenaCore.rosterEntry);rematchSamePlayers();return {before,after:fighters.map(ArenaCore.rosterEntry),hosts:fighters.filter(f=>f.isStreamer).length};});
        assert.deepEqual(r.after,r.before);assert.equal(r.hosts,1);
    });
    await check('A second life clears old killer and bonuses; an unassisted fall cannot credit that old killer',async()=>{
        const r=await page.evaluate(()=>{fixture();const [a,v]=fighters;v.berserkTimer=v.critBoostTimer=300;applyDamage(v,10000,a);const first=a.kills;addOrBoostFighter(v.name,v.platformKey,false,v.archetypeKey,true);const state=[v.lastAttacker,v.berserkTimer,v.critBoostTimer,v.joinsUsed];handleFighterKO(v,null);return {first,after:a.kills,state};});
        assert.equal(r.first,1);assert.equal(r.after,1);assert.deepEqual(r.state,[null,0,0,2]);
    });
    await check('Only effective HP damage counts, and stale ring-out attribution expires',async()=>{
        const r=await page.evaluate(()=>{fixture();const [a,v]=fighters;v.hp=1;applyDamage(v,60,a);const credited=a.damageDealt;const another=fighters[2];applyDamage(another,1,a);const before=a.kills;arenaSimulationTick+=481;handleFighterKO(another,a);return {credited,before,after:a.kills};});
        assert.equal(r.credited,1);assert.equal(r.after,r.before);
    });
    await check('Timed result is immutable, shows an eliminated champion and never repeats them in the podium',async()=>{
        const r=await page.evaluate(()=>{fixture();const leader=fighters[0];handleFighterKO(leader,fighters[1]);leader.kills=20;setRejoinRuleMode('timed');matchTimeSeconds=1;tickArenaRoundSecond();const original=pendingArenaResult.winner.kills;leader.kills=999;testFinals[0]();renderBothScreensSimultaneously();return {phase:gameState,id:currentWinner.id,dead:currentWinner.eliminated,kills:currentWinner.kills,original,drawn:arenaDrawOrder.map(f=>({id:f.id,dead:f.eliminated})),podium:arenaRoundResult.podium.map(f=>f.id),runners:[...document.querySelectorAll('[data-podium-id]')].map(n=>n.dataset.podiumId)};});
        assert.equal(r.phase,'VICTORY');assert.equal(r.dead,true);assert.equal(r.kills,r.original);
        assert.deepEqual(r.drawn,[{id:r.id,dead:false}]);assert.equal(new Set(r.podium).size,r.podium.length);assert.ok(!r.runners.includes(r.id));
    });
    await check('Victory preserves battlefield positions and freezes a locked winner before presentation',async()=>{
        const r=await page.evaluate(()=>{fixture();const before=fighters.map(f=>[f.x,f.y]);triggerVictoryScreen(fighters[0]);updatePhysicsAndAI();const after=fighters.map(f=>[f.x,f.y]);fixture(4);const winner=fighters[0];for(const f of fighters.slice(1))handleFighterKO(f,winner);winner.y=WORLD_H+150;updatePhysicsAndAI();const dead=winner.eliminated;testFinals[0]();return {before,after,dead,announcedDead:currentWinner.eliminated};});
        assert.deepEqual(r.after,r.before);assert.equal(r.dead,false);assert.equal(r.announcedDead,false);
    });
    await check('No survivor produces a draw instead of resurrecting the last attacker as champion',async()=>{
        const r=await page.evaluate(()=>{fixture(2);fighters=[fighters[0]];handleFighterKO(fighters[0],null);testFinals[0]();return {winner:currentWinner,draw:arenaRoundResult.draw,name:document.getElementById('victoryWinnerName16').textContent};});
        assert.equal(r.winner,null);assert.equal(r.draw,true);assert.ok(r.name.includes('🤝'));
    });
    await check('Fair special validation enforces energy and cooldown for every action origin',async()=>{
        const rows=await page.evaluate(()=>{fixture();const f=fighters[0],cmd=CLASS_COMMANDS[f.archetypeKey].powers[0];return ['ai','chat','prota','operator'].map(origin=>{f.energy=0;f.aiSpecialCooldown=0;f.castingSkill=null;const empty=queueFighterSkillWindup(f,cmd,origin);f.energy=50;f.aiSpecialCooldown=100;const waiting=queueFighterSkillWindup(f,cmd,origin);f.aiSpecialCooldown=0;const ready=queueFighterSkillWindup(f,cmd,origin);return {empty,waiting,ready,energy:f.energy,cooldown:f.aiSpecialCooldown};});});
        for(const r of rows)assert.deepEqual(r,{empty:false,waiting:false,ready:true,energy:5,cooldown:480});
    });
    await check('Optional participatory policy retains weak zero-energy chat casts while AI keeps its limits',async()=>{
        const r=await page.evaluate(()=>{fixture();arenaRuntime.specialPolicy='audience';const f=fighters[0],cmd=CLASS_COMMANDS[f.archetypeKey].powers[0];f.energy=0;f.aiSpecialCooldown=480;const ai=queueFighterSkillWindup(f,cmd,'ai'),chat=queueFighterSkillWindup(f,cmd,'chat');return {ai,chat,power:f.castingSkill.powerFactor};});
        assert.deepEqual(r,{ai:false,chat:true,power:.25});
    });
    await check('Settings pause receives chat without applying damage, healing or energy until resume',async()=>{
        const r=await page.evaluate(()=>{fixture();const f=fighters[0];f.hp=50;f.energy=0;toggleSettingsModal(true);const accepted=ArenaLive.sendChat({username:f.name,platformKey:f.platformKey,message:'!jugar'});const paused=[isGamePaused,f.hp,f.energy,arenaAudienceQueue.length];toggleSettingsModal(false);updatePhysicsAndAI();return {accepted,paused,resumed:[isGamePaused,f.hp,Math.floor(f.energy),arenaAudienceQueue.length]};});
        assert.equal(r.accepted,true);assert.deepEqual(r.paused,[true,50,0,1]);assert.deepEqual(r.resumed,[false,85,35,0]);
    });
    await check('Paused audience queue is bounded, deduplicated, expires and supports show-only policy',async()=>{
        const r=await page.evaluate(()=>{fixture();isGamePaused=true;for(let i=0;i<100;i++)processChatCommand('@q'+i,'tiktok','!jugar',null,true);processChatCommand('@q99','tiktok','!titan',null,true);const count=arenaAudienceQueue.length;for(const e of arenaAudienceQueue)e.receivedAt-=8001;isGamePaused=false;drainArenaAudienceQueue();const expired=arenaAudienceQueue.length;arenaRuntime.pausePolicy='show';isGamePaused=true;const before=fighters.length;processChatCommand('@skipped','tiktok','!jugar',null,true);return {count,expired,before,after:fighters.length,queued:arenaAudienceQueue.length};});
        assert.equal(r.count,64);assert.equal(r.expired,0);assert.equal(r.after,r.before);assert.equal(r.queued,0);
    });
    await check('Visual effects and rendering cannot alter the next seeded combat critical or RNG state',async()=>{
        const r=await page.evaluate(()=>{fixture();const [a,v]=fighters;for(const f of fighters.slice(2))f.eliminated=true;applyFighterArchetype(v,a.archetypeKey);a.x=300;v.x=320;a.y=v.y=300;a.facing=1;const hit=(seed,visual)=>{setArenaRandomSeed(seed);a.attackCooldown=0;a.castingSkill=null;a.energy=50;a.berserkTimer=a.critBoostTimer=0;v.eliminated=false;v.hp=v.maxHp=100000;v.shieldTimer=v.immunityTimer=0;v.castingSkill=null;if(visual){for(let i=0;i<100;i++)spawnParticle(-1000,-1000,'#fff');renderBothScreensSimultaneously();}performMeleeAttack(a);return [100000-v.hp,arenaCombatRandom.state()];};for(let seed=0;seed<100;seed++){const a=hit(seed,false),b=hit(seed,true);if(JSON.stringify(a)!==JSON.stringify(b))return {seed,a,b};}return null;});
        assert.equal(r,null);
    });
    await check('Round timer advances with played simulation time and ignores wall-clock metrics callbacks',async()=>{
        const r=await page.evaluate(()=>{fixture();setRejoinRuleMode('timed');matchTimeSeconds=10;arenaRoundClockTicks=0;for(const timer of testIntervals.filter(t=>t.ms===1000))timer.fn();const before=matchTimeSeconds;for(let i=0;i<60;i++)updatePhysicsAndAI();isGamePaused=true;for(let i=0;i<60;i++)updatePhysicsAndAI();return {before,after:matchTimeSeconds};});
        assert.deepEqual(r,{before:10,after:9});
    });
    await check('Metrics show unavailable rather than fictitious LIVE taps when simulation is off',async()=>{
        const r=await page.evaluate(()=>{fixture();refreshArenaAudienceMetrics();const n=document.getElementById('topTapsPerSec');return {text:n.textContent,source:n.dataset.metricSource};});
        assert.deepEqual(r,{text:'—',source:'unavailable'});
    });
    await check('All rendered controls have unique IDs, including generated session settings',async()=>{
        const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id));assert.equal(ids.length,new Set(ids).size);assert.ok(ids.includes('arenaRuntime_quality'));
    });
    await check('All visual quality levels preserve the same 128-fighter combat and random state',async()=>{
        const rows=await page.evaluate(()=>{
            const run=quality=>{arenaFighterSerial=0;arenaSimulationTick=0;fixture(128);arenaRuntime.quality=quality;autoAttackEnabled=true;setMonitorFocus('dual');
                for(let i=0;i<180;i++){updatePhysicsAndAI();if(i%20===0)renderBothScreensSimultaneously();}
                return{mode:activeMode,seed:arenaCombatRandom.state(),fighters:fighters.map(f=>({id:f.id,x:f.x,y:f.y,z:f.z,hp:f.hp,energy:f.energy,vx:f.vx,vy:f.vy,vz:f.vz,eliminated:f.eliminated,kills:f.kills,damage:f.damageDealt,casting:f.castingSkill}))};};
            return ['high','balanced','performance'].map(run);
        });assert.deepEqual(rows[0],rows[1]);assert.deepEqual(rows[1],rows[2]);
    });
    await check('A 30 FPS drawing limit changes draw frequency without slowing the fixed combat simulation',async()=>{
        const rows=await page.evaluate(()=>{
            const original=renderBothScreensSimultaneously;try{return[30,60].map(fps=>{arenaFighterSerial=0;arenaSimulationTick=0;fixture(32);arenaRuntime.renderFps=fps;autoAttackEnabled=true;let draws=0;renderBothScreensSimultaneously=()=>{draws++;};previousFrameTime=null;arenaLastRenderTime=null;simulationAccumulator=0;
                for(let i=0;i<=120;i++)gameLoop(i*1000/60);
                return{draws,tick:arenaSimulationTick,seed:arenaCombatRandom.state(),fighters:fighters.map(f=>[f.id,f.hp,f.x,f.y,f.energy,f.eliminated])};});}finally{renderBothScreensSimultaneously=original;}
        });assert.ok(rows[0].draws<rows[1].draws*.6);assert.ok(rows[1].draws>=119);assert.equal(rows[0].tick,rows[1].tick);assert.equal(rows[0].seed,rows[1].seed);assert.deepEqual(rows[0].fighters,rows[1].fighters);
    });
    await check('Survivors regain readable final-duel labels after a 128-player round',async()=>{
        const rows=await page.evaluate(()=>{fixture(128);for(const f of fighters.slice(2))f.eliminated=true;evaluateArenaMode(true);setMonitorFocus('dual');const original=drawFighterLabel,rows=[];drawFighterLabel=(ctx,f,x,y,nameFont,classFont,count)=>{rows.push({portrait:ctx===ctx9,nameFont,count});return original(ctx,f,x,y,nameFont,classFont,count);};try{renderBothScreensSimultaneously();return rows;}finally{drawFighterLabel=original;}});
        assert.equal(rows.length,4);assert.ok(rows.every(r=>r.count===2));assert.ok(rows.filter(r=>r.portrait).every(r=>r.nameFont===12));assert.ok(rows.filter(r=>!r.portrait).every(r=>r.nameFont===9));
    });
    await check('Session settings remain open, persist choices and preserve calibrated OBS geometry',async()=>{
        await page.evaluate(()=>{fixture();setArenaObsCalibration('offset',13);setArenaObsCalibration('footer',92);toggleSettingsModal(true);document.getElementById('arenaRuntimeCard').open=true;});
        await page.locator('#arenaRuntime_quality').selectOption('performance');await page.locator('#arenaRuntime_renderFps').selectOption('30');await page.evaluate(()=>document.getElementById('arenaBalancePanel').open=true);await page.locator('#arenaRuntime_warriorTargeting').selectOption('always');
        const r=await page.evaluate(()=>({open:isSettingsOpen,paused:isGamePaused,runtime:JSON.parse(localStorage.getItem(ARENA_RUNTIME_KEY)),obs:{...arenaObsCalibration}}));assert.equal(r.open,true);assert.equal(r.paused,true);assert.equal(r.runtime.quality,'performance');assert.equal(r.runtime.renderFps,30);assert.equal(r.runtime.warriorTargeting,'always');assert.equal(r.obs.offset,13);assert.equal(r.obs.footer,92);assert.ok(['16','19.5','20','21'].includes(r.obs.format));
    });
    await check('Configuration round-trip restores rules, both layouts, audio and OBS without replacing viewer profiles',async()=>{
        const r=await page.evaluate(()=>{fixture();setArenaObsCalibration('offset',13);setArenaRuntimeOption('masterVolume',35);setArenaCombatRule('damage',1.5);setRejoinRuleMode('timed');setMatchDuration(180);arenaWorkspace.layouts.stream.leftWidth=340;
            const config=ArenaLive.exportConfiguration(),profiles=JSON.stringify([...viewerProfiles]);setArenaObsCalibration('offset',2);setArenaRuntimeOption('masterVolume',0);setArenaCombatRule('damage',.5);arenaWorkspace.layouts.stream.leftWidth=220;
            const accepted=ArenaLive.importConfiguration(config);const actual=ArenaLive.exportConfiguration();return{accepted,profilesUnchanged:profiles===JSON.stringify([...viewerProfiles]),format:actual.format,rule:actual.rules.damage,volume:actual.runtime.masterVolume,obs:actual.obs,layouts:actual.layouts,round:actual.round,expected:config};});
        assert.equal(r.accepted,true);assert.equal(r.profilesUnchanged,true);assert.equal(r.format,'arena-live-configuration');assert.equal(r.rule,1.5);assert.equal(r.volume,35);assert.deepEqual(r.obs,r.expected.obs);assert.deepEqual(r.layouts,r.expected.layouts);assert.deepEqual(r.round,r.expected.round);
    });
    await check('Invalid or unsupported configuration is rejected without changing current settings',async()=>{
        const r=await page.evaluate(()=>{const before=JSON.stringify(exportArenaConfiguration());const answers=[null,[],{format:'wrong',schema:1,rules:{},runtime:{}},{format:'arena-live-configuration',schema:2,rules:{},runtime:{}},{format:'arena-live-configuration',schema:1,rules:{},runtime:{},obs:[]}].map(v=>importArenaConfiguration(v));return {answers,unchanged:before===JSON.stringify(exportArenaConfiguration())};});assert.ok(r.answers.every(v=>v===false));assert.equal(r.unchanged,true);
    });
    await check('Eight languages name every new control and measured results; inspection never changes combat rules',async()=>{
        const rows=await page.evaluate(()=>{fixture();const before=JSON.stringify(arenaCombatRules);return Object.keys(LANGUAGE_LABELS).map(language=>{setLanguage(language);refreshArenaBalancePanel(true);const labels=[...document.querySelectorAll('[data-runtime-copy],[data-class-preference-label],[data-training-copy]')].map(n=>n.textContent.trim());const preferences=[...document.querySelectorAll('[data-class-preference]')].map(n=>({label:document.querySelector('[data-class-preference-label=\"'+n.dataset.classPreference+'\"]').textContent,options:[...n.options].every(o=>o.textContent.trim())}));const evidence=document.getElementById('arenaBalanceEvidence');const selector=evidence.querySelector('select');selector.value='5';selector.dispatchEvent(new Event('change'));return{language,labels:labels.length,valid:labels.every(Boolean),preferences,rows:evidence.querySelectorAll('tbody tr').length,hasConfidence:evidence.textContent.includes('95'),unchanged:before===JSON.stringify(arenaCombatRules)};});});
        for(const r of rows){assert.ok(r.labels>=24);assert.equal(r.valid,true);assert.equal(r.preferences.length,5);assert.ok(r.preferences.every(p=>p.label&&p.options));assert.equal(r.rows,5);assert.equal(r.hasConfidence,true);assert.equal(r.unchanged,true);}await page.evaluate(()=>setLanguage('es'));
    });
    await check('Exported diagnostics identify CPU timing and native resolutions without claiming a physical GPU',async()=>{
        const d=await page.evaluate(()=>ArenaLive.getDiagnostics());assert.deepEqual(d.captures,[[1920,1080],[1080,1920]]);assert.match(d.timing,/CPU/);assert.match(d.gpu,/cannot be verified/);assert.ok(d.samples<=240);assert.ok(d.frame.p99Ms>=d.frame.p50Ms);
    });
    await check('Reload retains runtime options while saved historical viewers do not auto-enroll in a new round',async()=>{
        await page.evaluate(()=>{setArenaRuntimeOption('quality','performance');setArenaRuntimeOption('renderFps',30);setArenaRuntimeOption('masterVolume',35);setArenaHudOpacity(70);const profiles=Array.from({length:128},(_,i)=>({name:'@historic_'+i,platformKey:'tiktok',archetypeKey:'ninja'}));localStorage.setItem(VIEWER_PROFILES_STORAGE_KEY,JSON.stringify(profiles));});
        await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.ArenaLive&&arenaLiveInitialized);
        const r=await page.evaluate(()=>({saved:[...viewerProfiles.values()].filter(p=>p.name.startsWith('@historic_')).length,enrolled:fighters.filter(f=>f.name.startsWith('@historic_')).length,runtime:arenaRuntime,opacity:document.getElementById('hudOpacityValue').textContent}));assert.equal(r.saved,128);assert.equal(r.enrolled,0);assert.equal(r.runtime.quality,'performance');assert.equal(r.runtime.renderFps,30);assert.equal(r.runtime.masterVolume,35);assert.equal(r.opacity,'70 %');
    });

    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks.length,errors:errors.length}));
} finally {await app.close();}
