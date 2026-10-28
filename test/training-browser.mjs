// Operator training is explicit; no connection to a real TikTok LIVE.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {openTestApp} from './browser-test-env.mjs';
const app=await openTestApp(4182),checks=[],errors=[];
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS',name);};
try{
 const page=await app.browser.newPage({viewport:{width:1720,height:1000}});page.on('pageerror',e=>errors.push(e.stack));
 await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)/,route=>route.abort());
 await page.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>cb.name==='gameLoop'?0:raf(cb);window.setInterval=()=>0;});
 await page.goto(app.url,{waitUntil:'load'});
 await page.evaluate(()=>{
  window.trainingFixture=(count=32)=>{
   isGamePaused=false;resetArenaCombatRules();arenaRuntime={...ARENA_RUNTIME_DEFAULTS};setArenaCombatRule('knockback',0);
   gameState='LOBBY';document.getElementById('targetFighterSelect').value='random';applyPlayerCountPreset(count);startCombatFromLobby();
   soundEnabled=false;autoAttackEnabled=false;countdownsEnabled=false;chatRetention=400;
   fighters.forEach((f,i)=>{f.hp=f.maxHp=100000;f.x=400+(i%8)*12;f.y=300+Math.floor(i/8);f.z=0;f.vx=f.vy=f.vz=0;f.fallDrop=0;f.attackCooldown=f.aiSpecialCooldown=100000;});
   updateTargetSelectDropdown();refreshArenaRuntimeControls();document.getElementById('arenaPanelPowers').open=true;
  };
  window.finishTrainingPower=()=>{for(let step=0;step<75;step++)updatePhysicsAndAI();refreshArenaTargetPanel();};
  trainingFixture();
 });
 await check('powers contain the target selector, live identity, class selection and player command input',async()=>{
  for(const id of ['targetFighterSelect','arenaPowerTargetName','arenaPowerTargetClass','arenaPowerTargetState','arenaTestClassSelect','arenaTargetCommandInput'])assert.equal(await page.locator('#arenaPanelPowers #'+id).count(),1);
  assert.equal(await page.locator('.arena-skill-buttons button').count(),5);
  const id=await page.evaluate(()=>String(fighters[3].id));await page.locator('#targetFighterSelect').selectOption(id);
  assert.equal(await page.locator('#targetFighterSelect').count(),1);assert.equal(await page.locator('#arenaPanelTarget').count(),0);assert.equal(await page.locator('[data-workspace-reveal=\"arenaPanelTarget\"]').count(),0);assert.equal(await page.locator('#arenaPowerTargetName').textContent(),await page.evaluate(()=>getFighterDisplayName(peekArenaTestTarget())));
  await page.evaluate(()=>{document.getElementById('targetFighterSelect').value=String(fighters[1].id);document.getElementById('targetFighterSelect').dispatchEvent(new Event('change'));});
  assert.equal(await page.locator('#arenaTestClassSelect').inputValue(),await page.evaluate(()=>peekArenaTestTarget().archetypeKey));assert.equal(await page.locator('#arenaTestClassChoice').isVisible(),true);
  await page.locator('#targetFighterSelect').selectOption('random');assert.equal(await page.locator('#arenaTestClassChoice').isHidden(),true);
 });
 await check('older Target layouts merge into the unified panel while preserving the Powers position and settings',async()=>{
  const r=await page.evaluate(()=>{
   const original=exportArenaConfiguration(),old=JSON.parse(JSON.stringify(original));old.version='0.17.0';
   const legacy={...old.layouts.preparation.panels.arenaPanelPowers,dock:'left',open:true,width:310};
   old.layouts.preparation.panels.arenaPanelTarget=legacy;old.layouts.preparation.panels.arenaPanelPowers.open=false;old.layouts.preparation.panels.arenaPanelPowers.dock='right';
   old.layouts.stream.panels.arenaPanelTarget={...legacy,dock:'left'};old.layouts.stream.panels.arenaPanelPowers.open=false;
   const fallback=JSON.parse(JSON.stringify(old.layouts.preparation));delete fallback.panels.arenaPanelPowers;
   const fallbackLayout=readArenaWorkspace('preparation',fallback);
   const accepted=importArenaConfiguration(old),updated=exportArenaConfiguration();
   const result={accepted,position:updated.layouts.preparation.panels.arenaPanelPowers.dock,preparationOpen:updated.layouts.preparation.panels.arenaPanelPowers.open,streamOpen:updated.layouts.stream.panels.arenaPanelPowers.open,removed:['preparation','stream'].every(mode=>!Object.hasOwn(updated.layouts[mode].panels,'arenaPanelTarget')),fallback:fallbackLayout.panels.arenaPanelPowers.dock,runtime:JSON.stringify(original.runtime)===JSON.stringify(updated.runtime),obs:JSON.stringify(original.obs)===JSON.stringify(updated.obs)};
   importArenaConfiguration(original);return result;
  });assert.deepEqual(r,{accepted:true,position:'right',preparationOpen:true,streamOpen:true,removed:true,fallback:'left',runtime:true,obs:true});
 });
 await check('random tests always choose the matching class for every power across a 128-player roster',async()=>{
  const result=await page.evaluate(()=>{
   const seen=[];
   for(let repeat=0;repeat<3;repeat++)for(const cmd of ['!kame','!trueno','!rasen','!coloso','!enred']){
    // Isolate dispatch from lingering effects of an earlier test (for example a
    // Rasen can legitimately interrupt a subsequent fighter's charge).
    trainingFixture(128);setArenaRuntimeOption('testAdaptClass',false);document.getElementById('chatFeed').replaceChildren();
    const before=document.querySelectorAll('#chatFeed>[data-chat-event="special"]').length,ok=triggerQuickSkill(cmd);finishTrainingPower();
    const records=[...document.querySelectorAll('#chatFeed>[data-chat-event="special"]')],last=records.at(-1),actor=fighters.find(f=>String(f.id)===last?.dataset.fighterId);
    seen.push({ok,count:records.length-before,command:last?.dataset.command,compatible:actor?.archetypeKey===SKILL_REQUIRED_CLASS[cmd],shown:document.getElementById('arenaLastTestAction').textContent.includes(getFighterDisplayName(actor))});
   }return seen;
  });assert.equal(result.length,15);for(const r of result){assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.count,1,JSON.stringify(r));assert.equal(r.compatible,true,JSON.stringify(r));assert.equal(r.shown,true,JSON.stringify(r));}
 });
 await check('a fixed player can test Kame then Thunder with visible class adaptation and canonical windup',async()=>{
  const result=await page.evaluate(()=>{
   trainingFixture();const actor=fighters[1],id=String(actor.id);document.getElementById('targetFighterSelect').value=id;updateTargetSelectDropdown();const rows=[];
   for(const cmd of ['!kame','!trueno']){
    actor.energy=0;actor.aiSpecialCooldown=9999;const accepted=triggerQuickSkill(cmd),casting=actor.castingSkill?.cmd,energy=actor.energy;finishTrainingPower();
    const record=[...document.querySelectorAll('#chatFeed>[data-chat-event="special"]')].at(-1);
    rows.push({accepted,casting,energy,classKey:actor.archetypeKey,id:record?.dataset.fighterId,command:record?.dataset.command,selected:document.getElementById('targetFighterSelect').value});
   }return {id,rows};
  });for(const [i,row]of result.rows.entries()){assert.equal(row.accepted,true);assert.equal(row.casting,i?'!trueno':'!kame');assert.equal(row.classKey,i?'trueno':'kame');assert.equal(row.energy,55);assert.equal(row.id,result.id);assert.equal(row.selected,result.id);assert.equal(row.command,row.casting);}
 });
 await check('disabling adaptation preserves an incompatible fixed class and explains the blocked power',async()=>{
  await page.locator('#arenaTestAdaptClass').uncheck();
  assert.equal(await page.locator('.arena-skill-buttons button[onclick="triggerQuickSkill(\'!kame\')"]').isDisabled(),true);
  const r=await page.evaluate(()=>{const f=peekArenaTestTarget(),before=[f.archetypeKey,f.energy,f.aiSpecialCooldown];return {accepted:triggerQuickSkill('!kame'),before,after:[f.archetypeKey,f.energy,f.aiSpecialCooldown]};});assert.equal(r.accepted,false);assert.deepEqual(r.before,r.after);
 });
 await check('missing classes can be adapted in random mode while falling players are never selected',async()=>{
  const r=await page.evaluate(()=>{
   trainingFixture(9);fighters.forEach(f=>applyFighterArchetype(f,'ninja'));fighters[0].fallDrop=30;setArenaRuntimeOption('testAdaptClass',false);updateTargetSelectDropdown();const blocked=triggerQuickSkill('!kame');setArenaRuntimeOption('testAdaptClass',true);
   const accepted=triggerQuickSkill('!kame'),actor=fighters.find(f=>f.castingSkill?.cmd==='!kame');return {blocked,accepted,classKey:actor?.archetypeKey,fall:actor?.fallDrop,count:fighters.length};
  });assert.deepEqual(r,{blocked:false,accepted:true,classKey:'kame',fall:0,count:9});
 });
 await check('a power pressed in the lobby starts combat and executes instead of silently failing',async()=>{
  const r=await page.evaluate(()=>{trainingFixture(4);openLobby(false);const accepted=triggerQuickSkill('!coloso');return {accepted,state:gameState,casting:fighters.some(f=>f.castingSkill?.cmd==='!coloso')};});assert.deepEqual(r,{accepted:true,state:'COMBAT',casting:true});
 });
 await check('a fixed eliminated player stays selected and never redirects the action to a random survivor',async()=>{
  const r=await page.evaluate(()=>{trainingFixture();const actor=fighters[0],id=String(actor.id);document.getElementById('targetFighterSelect').value=id;actor.eliminated=true;updateTargetSelectDropdown();return {accepted:triggerQuickSkill('!kame'),id,selected:document.getElementById('targetFighterSelect').value,casts:fighters.filter(f=>f.castingSkill).length,state:document.getElementById('arenaPowerTargetState').textContent};});assert.equal(r.accepted,false);assert.equal(r.selected,r.id);assert.equal(r.casts,0);assert.match(r.state,/K.O./);
  const rejoin=await page.evaluate(()=>{document.getElementById('arenaTargetCommandInput').value='!jugar';const accepted=sendArenaTargetTestCommand();return {accepted,alive:!peekArenaTestTarget().eliminated,id:document.getElementById('targetFighterSelect').value,count:fighters.length};});assert.deepEqual(rejoin,{accepted:true,alive:true,id:r.id,count:32});
 });
 await check('training obeys pause, power restrictions, class restrictions and final-result lock',async()=>{
  const r=await page.evaluate(()=>{trainingFixture();const out=[];isGamePaused=true;out.push(triggerQuickSkill('!kame'));isGamePaused=false;setArenaCombatRule('powerMode','noSpecials');out.push(triggerQuickSkill('!kame'));setArenaCombatRule('powerMode','full');setArenaCombatRule('classRule','ninja');out.push(triggerQuickSkill('!kame'));out.push(triggerQuickSkill('!rasen'));koSequenceActive=true;out.push(triggerQuickSkill('!rasen'));return out;});assert.deepEqual(r,[false,false,false,true,false]);
 });
 await check('player commands and class selection affect the chosen player without creating a new sender',async()=>{
  await page.evaluate(()=>{trainingFixture(9);document.getElementById('targetFighterSelect').value=String(fighters[2].id);refreshArenaTargetPanel();});
  const id=await page.locator('#targetFighterSelect').inputValue();await page.locator('#arenaTestClassSelect').selectOption('ninja');
  await page.locator('#arenaTargetCommandInput').fill('!rayo');await page.locator('#arenaTargetCommandForm button').click();
  assert.equal(await page.evaluate(id=>fighters.find(f=>String(f.id)===id).archetypeKey,id),'trueno');
  await page.locator('#arenaTargetCommandInput').fill('!trueno');await page.locator('#arenaTargetCommandForm button').click();
  const r=await page.evaluate(()=>{finishTrainingPower();const row=[...document.querySelectorAll('#chatFeed>[data-chat-event="special"]')].at(-1);return {id:row.dataset.fighterId,command:row.dataset.command,count:fighters.length};});assert.deepEqual(r,{id,command:'!trueno',count:9});
 });
 await check('viewing targets and power availability never consumes combat randomness',async()=>{
  const r=await page.evaluate(()=>{document.getElementById('targetFighterSelect').value='random';const before=arenaCombatRandom.state();for(let i=0;i<40;i++){refreshArenaTargetPanel();updateQuickSkillTargetStatus();}return [before,arenaCombatRandom.state()];});assert.equal(r[0],r[1]);
 });
 await check('Prota can change class and rejoin through targeted commands without a duplicate hidden-name viewer',async()=>{
  const r=await page.evaluate(()=>{
   trainingFixture(9);joinAsStreamer();const actor=fighters.find(f=>f.isStreamer),id=String(actor.id);document.getElementById('targetFighterSelect').value=id;refreshArenaTargetPanel();document.getElementById('chatFeed').replaceChildren();
   const changed=setArenaTestTargetClass('titan');document.getElementById('arenaTargetCommandInput').value='!rayo';const command=sendArenaTargetTestCommand(),classKey=actor.archetypeKey;
   actor.eliminated=true;isGamePaused=true;updateTargetSelectDropdown();document.getElementById('arenaTargetCommandInput').value='!jugar';const queued=sendArenaTargetTestCommand(),stillDead=actor.eliminated;isGamePaused=false;drainArenaAudienceQueue();
   return {changed,command,classKey,queued,stillDead,alive:!actor.eliminated,id,selected:document.getElementById('targetFighterSelect').value,count:fighters.length,leaked:document.getElementById('chatFeed').textContent.includes(HOST_INTERNAL_NAME),duplicates:fighters.filter(f=>f.name.includes(HOST_INTERNAL_NAME)).length};
  });assert.equal(r.changed,true);assert.equal(r.command,true);assert.equal(r.classKey,'trueno');assert.equal(r.queued,true);assert.equal(r.stillDead,true);assert.equal(r.alive,true);assert.equal(r.selected,r.id);assert.equal(r.count,10);assert.equal(r.leaked,false);assert.equal(r.duplicates,1);
 });
 await check('each class has independent persisted preferences, configuration backup and restore without OBS changes',async()=>{
  const r=await page.evaluate(()=>{trainingFixture();const obs=JSON.stringify(arenaObsCalibration);setArenaRuntimeOption('warriorTargeting','prey');setArenaRuntimeOption('shinobiTargeting','always');setArenaRuntimeOption('titanTargeting','same');setArenaRuntimeOption('lightningTargeting','other');setArenaRuntimeOption('spiritTargeting','prey');const saved=exportArenaConfiguration(),runtime={...arenaRuntime};resetArenaClassPreferences();const reset={...arenaRuntime};importArenaConfiguration(saved);return {runtime,reset,restored:{...arenaRuntime},stored:JSON.parse(localStorage.getItem(ARENA_RUNTIME_KEY)),obs:JSON.stringify(arenaObsCalibration)===obs};});assert.deepEqual(r.restored,r.runtime);assert.deepEqual(r.stored,r.runtime);assert.equal(r.reset.shinobiTargeting,'local');assert.equal(r.reset.spiritTargeting,'nearest');assert.equal(r.obs,true);
 });
 await check('custom class priorities are identified beside historical measured win rates',async()=>{
  const r=await page.evaluate(()=>{refreshArenaBalancePanel(true);const custom=!!document.querySelector('[data-evidence-custom-preferences]');resetArenaClassPreferences();refreshArenaBalancePanel(true);return {custom,reset:!!document.querySelector('[data-evidence-custom-preferences]')};});assert.deepEqual(r,{custom:true,reset:false});
 });
 await check('eight languages name all five class preferences and all training controls',async()=>{
  const rows=await page.evaluate(()=>Object.keys(LANGUAGE_LABELS).map(language=>{setLanguage(language);refreshArenaRuntimeControls();refreshArenaTargetPanel();return {language,count:document.querySelectorAll('[data-class-preference]').length,names:[...document.querySelectorAll('[data-class-preference-label]')].map(n=>n.textContent),options:[...document.querySelectorAll('[data-class-preference] option')].every(n=>n.textContent.trim()),training:[...document.querySelectorAll('[data-training-copy]')].every(n=>n.textContent.trim()&&!/undefined/.test(n.textContent))};}));for(const r of rows){assert.equal(r.count,5);assert.ok(r.names.every(Boolean));assert.equal(r.options,true);assert.equal(r.training,true);}await page.evaluate(()=>setLanguage('es'));
 });
 await check('Stream keeps the combined tool after casting and the selected actor remains explicit',async()=>{
  await page.locator('#btnFullscreenDual').click();
  // Native fullscreen resolves before fullscreenchange finishes moving panels.
  // Wait for the operator workspace, not just the browser fullscreen element.
  await page.waitForFunction(()=>document.fullscreenElement?.id==='broadcastStageSection'&&arenaWorkspace.mode==='stream'&&arenaDualWasFullscreen&&!arenaWorkspace.restoring);
  await page.evaluate(()=>{trainingFixture(32);revealArenaWorkspacePanel('arenaPanelPowers');});
  await page.locator('#targetFighterSelect').selectOption(await page.evaluate(()=>String(fighters[0].id)));
  await page.locator('.arena-skill-buttons button[onclick="triggerQuickSkill(\'!kame\')"]').click();
  assert.equal(await page.locator('#arenaStreamPanelHost>#arenaPanelPowers').count(),1);assert.equal(await page.locator('#arenaPanelPowers').isVisible(),true);assert.equal(await page.evaluate(()=>peekArenaTestTarget().castingSkill?.cmd),'!kame');
  if(process.env.ARENA_TRAINING_REPORT_DIR){await mkdir(process.env.ARENA_TRAINING_REPORT_DIR,{recursive:true});await page.evaluate(()=>renderBothScreensSimultaneously());await page.screenshot({path:join(process.env.ARENA_TRAINING_REPORT_DIR,'training-stream.png')});}
 });
 await check('the unified test tool stays usable at phone width and opens directly in the mobile host',async()=>{
  await page.evaluate(async()=>{await document.exitFullscreen();});await page.waitForFunction(()=>!document.fullscreenElement&&arenaWorkspace.mode==='preparation'&&!arenaDualWasFullscreen&&!arenaWorkspace.restoring);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>arenaWorkspace.mobile&&!arenaWorkspace.restoring);
  await page.evaluate(()=>{trainingFixture(9);revealArenaWorkspacePanel('arenaPanelPowers');});
  assert.equal(await page.locator('#arenaPanelPowers').isVisible(),true);
  await page.locator('#targetFighterSelect').selectOption(await page.evaluate(()=>String(fighters[1].id)));
  await page.locator('.arena-skill-buttons button[onclick="triggerQuickSkill(\'!trueno\')"]').click();
  const r=await page.evaluate(()=>{const body=document.querySelector('#arenaPanelPowers .arena-panel-body');return {selected:peekArenaTestTarget().castingSkill?.cmd,fits:body.scrollWidth<=body.clientWidth+1,pageFits:document.documentElement.scrollWidth<=innerWidth};});assert.deepEqual(r,{selected:'!trueno',fits:true,pageFits:true});
  if(process.env.ARENA_TRAINING_REPORT_DIR)await page.screenshot({path:join(process.env.ARENA_TRAINING_REPORT_DIR,'training-mobile.png')});
 });
 await check('all five preference controls fit a phone and keep settings open while applying changes',async()=>{
  await page.evaluate(()=>{toggleSettingsModal(true);const panel=document.getElementById('arenaBalancePanel');
    selectArenaSettingsTab(panel.dataset.settingsCategory,false);panel.open=true;});
  await page.locator('#arenaClassPreferences').scrollIntoViewIfNeeded();await page.locator('#arenaRuntime_spiritTargeting').selectOption('prey');
  const r=await page.evaluate(()=>{const field=document.getElementById('arenaClassPreferences');return {count:field.querySelectorAll('select').length,fits:field.scrollWidth<=field.clientWidth+1,open:isSettingsOpen,preference:arenaRuntime.spiritTargeting};});assert.deepEqual(r,{count:5,fits:true,open:true,preference:'prey'});
  if(process.env.ARENA_TRAINING_REPORT_DIR)await page.screenshot({path:join(process.env.ARENA_TRAINING_REPORT_DIR,'class-preferences-mobile.png')});
 });
 assert.deepEqual(errors,[]);
 if(process.env.ARENA_TRAINING_REPORT_DIR)await writeFile(join(process.env.ARENA_TRAINING_REPORT_DIR,'training-validation.json'),JSON.stringify({checks,errors,scope:'Chromium software rendering; operator training and simulated data, no real LIVE'},null,2));
 console.log(JSON.stringify({passed:checks.length,errors:errors.length}));
}finally{await app.close();}
