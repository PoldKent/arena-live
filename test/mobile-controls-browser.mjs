// Real offline DOM/pointer regressions for the approved per-mode editor.
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {buildMobile} from '../tools/build-mobile.mjs';
const dir=await mkdtemp(join(tmpdir(),'arena-mobile-controls-'));
const options={headless:true,args:['--disable-gpu']};
if(process.env.ARENA_BROWSER_EXECUTABLE)options.executablePath=process.env.ARENA_BROWSER_EXECUTABLE;
if(process.env.ARENA_BROWSER_LIBRARY_PATH)options.env={...process.env,LD_LIBRARY_PATH:process.env.ARENA_BROWSER_LIBRARY_PATH};
const browser=await chromium.launch(options),checks=[],errors=[];
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS',name);};
try{
 const build=await buildMobile(join(dir,'mobile.html'));
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,offline:true});
 const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});
 await page.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>cb.name==='gameLoop'?0:raf(cb);});
 await page.goto(pathToFileURL(build.path).href,{waitUntil:'load'});
 await page.waitForFunction(()=>window.ArenaMobileTouch&&window.ArenaLive&&typeof document.getElementById('arenaPortableForm')?.onsubmit==='function');
 await page.locator('#arenaPortableStart').tap();
 await page.waitForFunction(()=>window.ArenaMobileTouch&&gameState==='COMBAT'&&!arenaPortableSetupOpen);
 await check('repeated close callbacks traverse history once and keep the loaded game',async()=>{
  await page.waitForFunction(()=>!arenaMobileHistoryBackPending);
  const r=await page.evaluate(()=>{
   const origin=performance.timeOrigin;ArenaPortable.open();arenaMobileSyncOverlayNavigation();
   const back=history.back;let calls=0;history.back=function(){calls++;return back.call(this);};
   try{ArenaPortable.close();for(let i=0;i<20;i++)arenaMobileSyncOverlayNavigation();}
   finally{history.back=back;}
   return {origin,calls};
  });
  assert.equal(r.calls,1);await page.waitForFunction(()=>!arenaMobileHistoryBackPending);
  assert.equal(await page.evaluate(()=>performance.timeOrigin),r.origin);assert.equal(await page.evaluate(()=>ArenaLive.getState().phase),'COMBAT');
 });
 await check('canonical power state uses the actual class, energy, cooldown and audience policy',async()=>{
  const r=await page.evaluate(()=>{
   const actor=arenaMobileActor(),button=document.getElementById('arenaMobilePower');actor.energy=100;actor.aiSpecialCooldown=0;
   const icons=['kame','ninja','titan','trueno','esmeralda'].map(key=>{applyFighterArchetype(actor,key);updateTouchControlsVisibility();return button.dataset.skillIcon;});
   actor.energy=24;actor.aiSpecialCooldown=0;arenaMobileRefreshSkillIcon();const energy={disabled:button.disabled,state:button.dataset.skillState};
   actor.energy=100;actor.aiSpecialCooldown=300;arenaMobileRefreshSkillIcon();const cooldown={disabled:button.disabled,state:button.dataset.skillState,remaining:button.dataset.skillRemaining};
   setArenaRuntimeOption('specialPolicy','audience');actor.energy=0;arenaMobileRefreshSkillIcon();const audience=!button.disabled;
   setArenaCombatRule('powerMode','noSpecials');arenaMobileRefreshSkillIcon();const blocked=button.disabled;
   setArenaCombatRule('powerMode','full');setArenaRuntimeOption('specialPolicy','fair');actor.energy=100;actor.aiSpecialCooldown=0;updateTouchControlsVisibility();
   return {icons,energy,cooldown,audience,blocked};
  });
  assert.deepEqual(r.icons,['🔥','🌀','🛡️','⚡','🌿']);assert.deepEqual(r.energy,{disabled:true,state:'energy'});
  assert.deepEqual(r.cooldown,{disabled:true,state:'cooldown',remaining:'5s'});assert.equal(r.audience,true);assert.equal(r.blocked,true);
 });
 await check('player editing moves controls without sending movement, jumps or specials',async()=>{
  const r=await page.evaluate(()=>{
   ArenaMobileTouch.editButtons(true);const actor=arenaMobileActor(),before=JSON.stringify({x:actor.x,y:actor.y,jumps:actor.jumpsUsed,energy:actor.energy});
   for(const [i,id]of ['touchJoystick','arenaMobilePower','arenaMobileJump','arenaMobileAttack'].entries()){
    const node=document.getElementById(id),rect=node.getBoundingClientRect();
    for(const [type,dx]of [['pointerdown',0],['pointermove',-12],['pointerup',-12]])node.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:800+i,clientX:rect.x+rect.width/2+dx,clientY:rect.y+rect.height/2,button:0}));
   }
   const after=JSON.stringify({x:actor.x,y:actor.y,jumps:actor.jumpsUsed,energy:actor.energy});
   const inactive=!Object.values(keys).some(Boolean)&&!actor.castingSkill;ArenaMobileTouch.editButtons(false);ArenaMobileTouch.setButtonSize(84);
   return {unchanged:before===after,inactive,saved:JSON.parse(localStorage.getItem(ARENA_MOBILE_MODE_LAYOUT_KEY)).player.size};
  });assert.deepEqual(r,{unchanged:true,inactive:true,saved:84});
 });
 let savedPlayer;
 await check('Streamer editor remains accessible after touch-only Player mode and preserves Player layout',async()=>{
  savedPlayer=await page.evaluate(()=>ArenaMobileTouch.getLayouts().player);
  await page.evaluate(()=>{ArenaMobileTouch.setTouchMode('touch');ArenaPortable.setMode('director');toggleSettingsModal(true);selectArenaSettingsTab('controls',false);document.getElementById('arenaMobileArrangeSettings').closest('.arena-settings-section').open=true;});
  assert.equal(await page.locator('#arenaMobileArrange').isVisible(),true);
  await page.locator('#arenaMobileArrange').tap();
  for(const id of ['touchJoystick','arenaMobilePower','arenaMobileJump','arenaMobileAttack'])assert.equal(await page.locator('#'+id).isVisible(),true,id);
  await page.evaluate(()=>{ArenaMobileTouch.setButtonSize(60);ArenaMobileTouch.editButtons(false);});
  assert.equal(await page.locator('#arenaMobileAttack').isVisible(),false);
  const layouts=await page.evaluate(()=>ArenaMobileTouch.getLayouts());assert.deepEqual(layouts.player,savedPlayer);assert.equal(layouts.director.size,60);
 });
 await check('copy requires confirmation, cancellation preserves data and acceptance copies without aliasing',async()=>{
  page.once('dialog',d=>d.dismiss());assert.equal(await page.evaluate(()=>ArenaMobileTouch.copyLayout()),false);
  assert.deepEqual(await page.evaluate(()=>ArenaMobileTouch.getLayouts().player),savedPlayer);
  page.once('dialog',d=>d.accept());assert.equal(await page.evaluate(()=>ArenaMobileTouch.copyLayout()),true);
  const layouts=await page.evaluate(()=>{const copied=ArenaMobileTouch.getLayouts();ArenaMobileTouch.setButtonSize(66);return {copied,after:ArenaMobileTouch.getLayouts()};});
  assert.deepEqual(layouts.copied.player,layouts.copied.director);assert.equal(layouts.after.player.size,60);assert.equal(layouts.after.director.size,66);
 });
 await check('both layouts survive reload and remain editable after rotation',async()=>{
  await page.waitForFunction(()=>!arenaMobileHistoryBackPending);
  await page.evaluate(()=>ArenaPortable.setResolution(540));
  await page.reload({waitUntil:'load'});const layouts=await page.evaluate(()=>ArenaMobileTouch.getLayouts());
  const profile=await page.evaluate(()=>({profile:ArenaPortable.getProfile(),stored:JSON.parse(localStorage.getItem(ARENA_PORTABLE_KEY)),input:document.getElementById('arenaPortableResolution').value}));
  assert.equal(profile.profile.resolution,540,JSON.stringify(profile));
  assert.equal(profile.input,'540',JSON.stringify(profile));
  assert.equal(layouts.player.size,60);assert.equal(layouts.director.size,66);
  await page.locator('#arenaPortableStart').tap();await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>ArenaMobileTouch.editButtons(true));assert.equal(await page.locator('#touchJoystick').isVisible(),true);
  await page.waitForFunction(()=>{const r=document.getElementById('arenaMobilePower').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});
  const r=await page.locator('#arenaMobilePower').boundingBox();assert.ok(r.x>=0&&r.x+r.width<=844&&r.y>=0&&r.y+r.height<=390,JSON.stringify(r));
  await context.close();
 });
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks.length,errors:errors.length}));
}finally{await browser.close();await rm(dir,{recursive:true,force:true});}
