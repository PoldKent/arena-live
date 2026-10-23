// Browser regressions for the unified v0.9 release. Never connects to a real TikTok LIVE.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=process.env.ARENA_TEST_PORT || '4175';
const server=spawn(process.execPath,['bridge/server.mjs'],{cwd:root,env:{...process.env,PORT:port}});
let browser;
try {
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Local test server did not start')),10000);
  server.stdout.on('data',d=>{if(String(d).includes('Arena Live:')){clearTimeout(timer);resolve();}});
  server.on('exit',code=>{clearTimeout(timer);reject(new Error('Test server exited '+code));});
  server.on('error',error=>{clearTimeout(timer);reject(error);});
 });
 const options={headless:true,args:['--disable-gpu']};
 if(process.env.ARENA_BROWSER_EXECUTABLE)options.executablePath=process.env.ARENA_BROWSER_EXECUTABLE;
 if(process.env.ARENA_BROWSER_LIBRARY_PATH)options.env={...process.env,LD_LIBRARY_PATH:process.env.ARENA_BROWSER_LIBRARY_PATH};
 browser=await chromium.launch(options);
 // Optional locally compiled Tailwind is useful when a test environment cannot reach the CDN.
 const css=process.env.ARENA_TEST_CSS ? await readFile(process.env.ARENA_TEST_CSS,'utf8') : null;
const checks=[];
const errors=[];
const page=await browser.newPage({viewport:{width:1720,height:720},screen:{width:1720,height:720},deviceScaleFactor:1});
page.setDefaultTimeout(15000);
await page.addInitScript(()=>{
 const NativeSocket=window.WebSocket;
 window.WebSocket=class extends NativeSocket {constructor(...args){super(...args);window.arenaTestSocket=this;}};
});
page.on('pageerror',e=>{errors.push(e.stack);console.error('PAGE ERROR',e.stack);});
if(css)await page.route(/https:\/\/cdn\.tailwindcss\.com/,route=>route.fulfill({contentType:'text/javascript',body:'const qaStyle=document.createElement("style");qaStyle.textContent='+JSON.stringify(css)+';document.head.appendChild(qaStyle);'}));
if(css)await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)/,route=>route.abort());
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
const state=()=>page.evaluate(()=>ArenaLive.getState());
const rects=()=>page.evaluate(()=>Object.fromEntries(['viewport16x9','viewport9x16'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return[id,[r.x,r.y,r.width,r.height]];})));
await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'load'});
await page.waitForFunction(()=>window.ArenaLive && arenaLiveInitialized);
await page.evaluate(()=>{countdownsEnabled=false;});
const shot=async name=>{if(process.env.ARENA_TEST_SCREENSHOTS){await mkdir(process.env.ARENA_TEST_SCREENSHOTS,{recursive:true});await page.screenshot({path:join(process.env.ARENA_TEST_SCREENSHOTS,name+'.png'),timeout:15000});}};
async function unfold(id){const panel=page.locator('#'+id);if(!await panel.evaluate(n=>n.open))await panel.locator('> summary').click({noWaitAfter:true});}
async function settingsSection(index){const section=page.locator('.arena-settings-section').nth(index);if(!await section.evaluate(n=>n.open))await section.locator('> summary').click({noWaitAfter:true});}
async function streamClick(id){await page.mouse.move(600,20);await page.locator('#'+id).click({noWaitAfter:true});}
await check('v0.9 starts with large game, left chat and only the social test group expanded',async()=>{
 assert.equal(await page.evaluate(()=>ArenaLive.version),'0.9.0');
 const panels=await page.locator('.arena-work-panel').evaluateAll(ns=>ns.map(n=>({id:n.id,open:n.open,parent:n.parentElement.id})));
 assert.equal(panels.find(n=>n.id==='arenaPanelChat').parent,'arenaDockLeft');
 assert.deepEqual(panels.filter(n=>n.open&&n.id!=='arenaPanelChat').map(n=>n.id),['arenaPanelSocial']);
 const order=await page.locator('#arenaHeaderActions>button').evaluateAll(ns=>ns.slice(0,4).map(n=>n.id));assert.deepEqual(order,['arenaViewMenuBtn','arenaFullscreenMenuBtn','arenaDualTestsToggle','arenaDualSettingsBtn']);
 for(const id of ['arenaDualPauseBtn','arenaDualLobbyBtn','arenaDualRematchBtn','btnStreamerJoin','btnQuickSound','arenaDualTikTokConnectBtn'])assert.equal(await page.locator('#arenaHeaderActions #'+id).count(),1);
 assert.equal(await page.locator('#arenaMobileMoreBtn').isVisible(),false);
 const joins=await page.evaluate(()=>fighters.map(f=>({id:f.id,count:[...document.querySelectorAll('#chatFeed>[data-chat-event="join"]')].filter(n=>n.dataset.fighterId===String(f.id)&&n.dataset.command==='!jugar').length})));
 assert.ok(joins.length>0&&joins.every(f=>f.count===1),'initial automatic participants have one visible !jugar each');
 await shot('preparation');
});
await check('Player test actions stay open in preparation and still create participants',async()=>{
 await unfold('arenaPanelPlayers');const before=(await state()).activeFighters;
 await page.locator('#arenaPanelPlayers button[onclick="triggerQuickJoin()"]').click();
 assert.equal((await state()).activeFighters,before+1);assert.equal(await page.locator('#arenaPanelPlayers').evaluate(n=>n.open),true);
});
await check('Scenario selector waits for Load; the 128-player roster and smaller scenarios work',async()=>{
 await unfold('arenaPanelScenarios');const before=(await state()).fighterBodies;
 await page.locator('#arenaScenarioSelect').selectOption('128');assert.equal((await state()).fighterBodies,before);
 await page.locator('#arenaLoadScenario').click();assert.equal((await state()).fighterBodies,128);assert.equal(new Set(await page.evaluate(()=>ArenaLive.getFighters().map(f=>f.name))).size,128);
 await page.locator('#arenaScenarioSelect').selectOption('4');await page.locator('#arenaLoadScenario').click();assert.equal((await state()).activeFighters,4);
});
await check('Target has a dedicated name, class and live health/energy state',async()=>{
 await unfold('arenaPanelTarget');const fighter=(await page.evaluate(()=>ArenaLive.getFighters()))[0];
 await page.locator('#targetFighterSelect').selectOption(String(fighter.id));
 assert.equal(await page.locator('#arenaTargetName').innerText(),fighter.name);assert.ok((await page.locator('#arenaTargetClass').innerText()).length>1);assert.match(await page.locator('#arenaTargetState').innerText(),/HP/);
 const before=await page.locator('#chatFeed>div').count();await page.locator('#arenaPanelSocial button[onclick="triggerSocialEvent(\'follow\')"]').click();assert.ok(await page.locator('#chatFeed>div').count()>=before);
 assert.equal(await page.locator('#arenaPanelSocial').evaluate(n=>n.open),true);
});
await check('Class selection and direct Prota entry reuse the original player flow',async()=>{
 await page.locator('#btnProtaClassMenu').click();await page.locator('#protagonistClassSelect').selectOption('ninja');assert.equal(await page.locator('#arenaOperatorPopover').isHidden(),true);
 await page.locator('#btnStreamerJoin').click();assert.equal(await page.evaluate(()=>ArenaLive.getFighters().find(f=>f.isStreamer)?.classKey),'ninja');
});
await check('TikTok button delegates connect/disconnect to the bridge, with no real LIVE connection',async()=>{
 const requests=[];
 await page.route('**/api/connect',r=>{requests.push('connect');return r.fulfill({json:{status:'connecting'}});});await page.route('**/api/disconnect',r=>{requests.push('disconnect');return r.fulfill({json:{status:'disconnected'}});});
 const pending=page.waitForResponse('**/api/connect');await page.locator('#arenaDualTikTokConnectBtn').click();await pending;
 await page.evaluate(()=>window.arenaTestSocket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'status',phase:'connected',account:'@polkent.live',isController:true})})));
 const pendingDisconnect=page.waitForResponse('**/api/disconnect');await page.locator('#arenaDualTikTokConnectBtn').click();await pendingDisconnect;assert.deepEqual(requests,['connect','disconnect']);
});
await check('Tabbed chats distinguish commands and always follow new messages',async()=>{
 await page.locator('#arenaChatTabLocal').click();await page.locator('#chatMessageInput').fill('hola desde pruebas v0.5');await page.locator('#chatForm button[type=submit]').click();assert.equal(await page.locator('#arenaChatLocalPanel').isVisible(),true);
 await page.evaluate(()=>{for(let i=0;i<510;i++)window.arenaTestSocket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'chat',platformKey:'tiktok',username:'qa_chat',message:i%25===0?'!jugar':'mensaje '+i})}));});
 await page.locator('#arenaChatTabTikTok').click();assert.ok(await page.locator('.arena-tiktok-chat-line.is-command').count()>0);
 await page.locator('#arenaTikTokChatFeed').evaluate(n=>n.scrollTop=0);
 await page.evaluate(()=>window.arenaTestSocket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'chat',platformKey:'tiktok',username:'qa_chat',message:'mensaje más reciente'})})));
 assert.equal(await page.locator('#arenaTikTokChatFeed').evaluate(n=>n.scrollHeight-n.scrollTop-n.clientHeight<3),true);
 await page.locator('#arenaTikTokChatOlder').click();assert.equal(await page.locator('#arenaTikTokChatLatest').isDisabled(),false);
 await page.evaluate(()=>window.arenaTestSocket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'chat',platformKey:'tiktok',username:'qa_chat',message:'volver al directo'})})));
 assert.equal(await page.locator('#arenaTikTokChatLatest').isDisabled(),true);
 await page.locator('#arenaChatTabLocal').click();assert.ok(await page.locator('#chatFeed>[data-chat-kind="command"]').count()>0);
 await page.locator('#chatFeed').evaluate(n=>n.scrollTop=0);await page.locator('#chatMessageInput').fill('último mensaje');await page.locator('#chatForm button[type=submit]').click();assert.equal(await page.locator('#chatFeed').evaluate(n=>n.scrollHeight-n.scrollTop-n.clientHeight<3),true);
});
await check('Preparation settings apply multiple changes without closing and resume on explicit close',async()=>{
 await page.locator('#arenaDualSettingsBtn').click();assert.equal((await state()).paused,true);
 await page.locator('#ruleBtn-3_lives').click();await page.locator('#playerLivesSelect').selectOption('3');assert.equal((await state()).settingsOpen,true);assert.equal((await state()).paused,true);
 await settingsSection(2);await page.locator('#hudOpacityRange').evaluate(n=>{n.value='60';n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));});
 assert.equal(await page.locator('#hudOpacityValue').innerText(),'60 %');assert.equal((await state()).settingsOpen,true);assert.match(await page.locator('#hudOpacityRange').getAttribute('title'),/textos y barras/);
 await shot('settings');await page.keyboard.press('Escape');assert.equal((await state()).paused,false);
});
await check('Closing settings resumes even after an earlier manual pause',async()=>{
 await page.locator('#arenaDualPauseBtn').click();assert.equal((await state()).paused,true);await page.locator('#arenaDualSettingsBtn').click();await page.keyboard.press('Escape');assert.equal((await state()).paused,false);
 const before=await page.evaluate(()=>soundEnabled);await page.locator('#btnQuickSound').click();assert.equal(await page.evaluate(()=>soundEnabled),!before);
});
await check('Panels dock below the game, float, resize, and dock again without losing controls',async()=>{
 await page.locator('#arenaPanelPlayers .arena-panel-dock').selectOption('bottom');assert.equal(await page.locator('#arenaDockBottom>#arenaPanelPlayers').count(),1);
 await page.locator('#arenaPanelPowers .arena-panel-dock').selectOption('float');await unfold('arenaPanelPowers');
 for(const label of await page.locator('.arena-skill-buttons [data-command-label]').all())assert.equal(await label.isVisible(),true);
 const panel=page.locator('#arenaPanelPowers');const before=await panel.boundingBox();
 await page.mouse.move(before.x+before.width-3,before.y+before.height-3);await page.mouse.down();await page.mouse.move(before.x+before.width+55,before.y+before.height+30,{steps:8});await page.mouse.up();
 assert.ok((await panel.boundingBox()).width>before.width+10);
 await panel.locator('.arena-panel-dock').selectOption('right');assert.equal(await page.locator('#arenaDockRight>#arenaPanelPowers').count(),1);assert.equal(await page.locator('.arena-skill-buttons button').count(),5);
});
await check('Dragging a panel handle reorders/docks it and column width is manually adjustable',async()=>{
 const handle=await page.locator('#arenaPanelPlayers .arena-panel-drag').boundingBox(),drop=await page.locator('#arenaPanelSocial>summary').boundingBox();
 await page.mouse.move(handle.x+6,handle.y+8);await page.mouse.down();await page.mouse.move(drop.x+30,drop.y+14,{steps:12});await page.mouse.up();assert.equal(await page.locator('#arenaDockRight>#arenaPanelPlayers').count(),1);
 const resizer=await page.locator('#arenaLeftResizer').boundingBox();await page.mouse.move(resizer.x+4,resizer.y+80);await page.mouse.down();await page.mouse.move(resizer.x+44,resizer.y+80,{steps:8});await page.mouse.up();
 assert.equal(await page.evaluate(()=>arenaWorkspace.layouts.preparation.leftWidth),300);await page.waitForTimeout(250);
});
await check('Preparation restores dock positions, expanded panels, widths and chat tab on reload',async()=>{
 await page.reload({waitUntil:'load'});await page.waitForFunction(()=>arenaLiveInitialized);await page.evaluate(()=>countdownsEnabled=false);
 assert.equal(await page.locator('#arenaDockRight>#arenaPanelPlayers').count(),1);assert.equal(await page.locator('#arenaPanelPlayers').evaluate(n=>n.open),true);assert.equal(await page.locator('#arenaChatTabLocal').getAttribute('aria-selected'),'true');assert.equal(await page.evaluate(()=>arenaWorkspace.layouts.preparation.leftWidth),300);
});
await check('OBS calibration keeps the established key and applies exact saved values',async()=>{
 await page.locator('#arenaDualSettingsBtn').click();await settingsSection(2);
 await page.locator('#arenaObsVerticalOffset').evaluate(n=>{n.value='8';n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));});
 assert.equal((await state()).settingsOpen,true);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('arenaLiveObsCalibrationV01')).offset),8);
 await page.locator('#btnViewDual').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='broadcastStageSection');assert.equal((await state()).paused,false);
});
await check('Stream uses its own reserved left column and contains both correctly proportioned canvases',async()=>{
 await page.waitForTimeout(150);assert.equal(await page.locator('#arenaStreamToolbarMount #arenaHeaderActions').count(),1);assert.equal(await page.locator('#arenaStreamPanelHost').isHidden(),true);
 const r=await rects();assert.ok(r.viewport16x9[0]>=260);assert.ok(r.viewport9x16[0]>r.viewport16x9[0]+r.viewport16x9[2]);assert.ok(r.viewport9x16[0]+r.viewport9x16[2]<=1720);
 assert.ok(Math.abs(r.viewport16x9[2]/r.viewport16x9[3]-16/9)<.01);assert.ok(Math.abs(r.viewport9x16[2]/r.viewport9x16[3]-9/16)<.01);
});
await check('Stream keeps the selected panel through actions and outside clicks, replaces it with another menu, and closes with ×',async()=>{
 const before=await rects();await streamClick('arenaDualTestsToggle');assert.deepEqual(await rects(),before);
 const left=await page.locator('#arenaStreamLeftColumn').boundingBox();assert.ok(left.x+left.width<=before.viewport16x9[0]);
 await page.locator('#arenaPanelSocial button[onclick="triggerSocialEvent(\'follow\')"]').click();assert.equal(await page.locator('#arenaStreamPanelHost').isVisible(),true);
 await page.mouse.click(before.viewport16x9[0]+100,before.viewport16x9[1]+100);assert.equal(await page.locator('#arenaStreamPanelHost').isVisible(),true);
 await streamClick('arenaDualTestsToggle');assert.equal(await page.locator('#arenaStreamPanelHost').isVisible(),true);assert.deepEqual(await rects(),before);
 await streamClick('arenaDualChatToggleBtn');assert.equal(await page.locator('#arenaPanelSocial').isHidden(),true);await page.locator('#arenaChatTabLocal').click();await page.locator('#chatMessageInput').fill('mensaje en stream');await page.locator('#chatForm button[type=submit]').click();assert.equal(await page.locator('#arenaPanelChat').isVisible(),true);
 await page.locator('#arenaStreamClose').click();assert.equal(await page.locator('#arenaStreamPanelHost').isHidden(),true);assert.deepEqual(await rects(),before);
});
await check('Stream settings remain open while changing values, expose ×, and resume when deliberately closed',async()=>{
 const before=await rects();await streamClick('arenaDualSettingsBtn');assert.equal((await state()).paused,true);await settingsSection(2);assert.deepEqual(await rects(),before);
 const modal=await page.locator('#settingsPauseModal').boundingBox();assert.ok(modal.x+modal.width<=before.viewport16x9[0]);assert.equal(await page.locator('#arenaStreamClose').isVisible(),true);
 await page.locator('#hudOpacityRange').evaluate(n=>{n.value='70';n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal((await state()).settingsOpen,true);assert.equal((await state()).paused,true);
 await streamClick('arenaDualSettingsBtn');assert.equal((await state()).settingsOpen,true);await page.locator('#arenaStreamClose').click();assert.equal((await state()).settingsOpen,false);assert.equal((await state()).paused,false);
 await streamClick('arenaDualSettingsBtn');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.fullscreenElement?.id),'broadcastStageSection');
});
await check('Stream remembers an independent column width and hides the toolbar without layout movement',async()=>{
 const resizer=await page.locator('#arenaStreamResizer').boundingBox();await page.mouse.move(resizer.x+4,resizer.y+100);await page.mouse.down();await page.mouse.move(resizer.x+64,resizer.y+100,{steps:10});await page.mouse.up();await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>arenaWorkspace.layouts.stream.leftWidth),320);assert.equal(await page.evaluate(()=>arenaWorkspace.layouts.preparation.leftWidth),300);
 const before=await rects();await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(900,400);await page.waitForTimeout(180);assert.equal(await page.locator('#arenaStreamToolbarMount').evaluate(n=>getComputedStyle(n).opacity),'0');assert.deepEqual(await rects(),before);
 await page.mouse.move(600,20);await page.waitForTimeout(150);await page.waitForFunction(()=>Number(getComputedStyle(document.getElementById('arenaStreamToolbarMount')).opacity)>.99);assert.ok(await page.locator('#arenaStreamToolbarMount').evaluate(n=>Number(getComputedStyle(n).opacity)>.99));await shot('stream');
});
await check('3440×1440 keeps portrait at the right and both capture rectangles stable',async()=>{
 await streamClick('btnFullscreenDual');await page.waitForFunction(()=>!document.fullscreenElement);await page.setViewportSize({width:3440,height:1440});await page.locator('#btnFullscreenDual').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='broadcastStageSection');await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>arenaWorkspace.layouts.stream.leftWidth),320);const before=await rects();assert.ok(before.viewport9x16[0]+before.viewport9x16[2]<=3440);
 await streamClick('arenaDualTestsToggle');assert.deepEqual(await rects(),before);await shot('stream-tools-ultrawide');await page.keyboard.press('Escape');await streamClick('arenaDualChatToggleBtn');assert.deepEqual(await rects(),before);await page.keyboard.press('Escape');
 const participants=await page.evaluate(()=>ArenaLive.getFighters().map(f=>f.id));await streamClick('btnFullscreenDual');await page.waitForFunction(()=>!document.fullscreenElement);assert.deepEqual(await page.evaluate(()=>ArenaLive.getFighters().map(f=>f.id)),participants);assert.equal(await page.evaluate(()=>arenaObsCalibration.offset),8);assert.equal(await page.evaluate(()=>arenaWorkspace.layouts.preparation.leftWidth),300);
});
await check('Individual fullscreen retains visible settings and Escape resumes without exiting capture',async()=>{
 await page.locator('#arenaFullscreenMenuBtn').click();await page.locator('#btnFullscreen16').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='card-16x9');await page.keyboard.press('p');assert.equal(await page.locator('#settingsPauseModal').isVisible(),true);await page.keyboard.press('Escape');assert.equal((await state()).paused,false);assert.equal(await page.evaluate(()=>document.fullscreenElement?.id),'card-16x9');await page.locator('#btnExitFullscreen16').click();await page.waitForFunction(()=>!document.fullscreenElement);
});
await check('Eight languages remain selectable and new workspace labels follow the chosen language',async()=>{
 await page.locator('#arenaDualSettingsBtn').click();await settingsSection(3);assert.equal(await page.locator('#languageSelect option').count(),8);await page.locator('#languageSelect').selectOption('en');assert.equal((await state()).settingsOpen,true);assert.match(await page.locator('#arenaDualSettingsBtn').innerText(),/Settings/);assert.match(await page.locator('#arenaPanelScenarios .arena-panel-title').innerText(),/Test scenario/);assert.match(await page.locator('.arena-settings-section').filter({has:page.locator('#arenaMaxPlayers')}).locator('summary').innerText(),/Rules and parameters/);
 await page.locator('#languageSelect').selectOption('es');await page.keyboard.press('Escape');
});
const openRuleSettings=async()=>{
 if(!(await state()).settingsOpen)await page.locator('#arenaDualSettingsBtn').click();
 const section=page.locator('.arena-settings-section').filter({has:page.locator('#arenaMaxPlayers')});
 if(!await section.evaluate(n=>n.open))await section.locator('> summary').click();
};
const ruleRange=async(key,value)=>page.locator(`[data-combat-rule="${key}"]`).evaluate((n,value)=>{n.value=String(value);n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));},value);
const capacityUI=async value=>{await page.locator('#arenaMaxPlayers').fill(String(value));await page.locator('#arenaMaxPlayers').press('Tab');};
await check('Configurable capacity blocks chat, raw admission and Prota while preserving existing re-entry slots',async()=>{
 await openRuleSettings();await capacityUI(4);
 await page.evaluate(()=>{setRejoinRuleMode('free');applyPlayerCountPreset(4);});
 const before=await page.evaluate(()=>ArenaLive.getFighters().map(f=>f.id));
 const result=await page.evaluate(()=>{
  for(let i=0;i<6;i++)ArenaLive.sendChat({username:'capacity_'+i,message:'!jugar'});
  addOrBoostFighter('raw_capacity','twitch');joinAsStreamer();
  const f=fighters[0];f.eliminated=true;const joins=f.joinsUsed;
  addOrBoostFighter(f.name,f.platformKey,false);
  return {ids:fighters.map(f=>f.id),rejoined:!f.eliminated&&f.joinsUsed===joins+1,state:ArenaLive.getState()};
 });
 assert.deepEqual(result.ids,before);assert.equal(result.rejoined,true);assert.equal(result.state.maxFighters,4);assert.equal(result.state.hardMaxFighters,128);assert.equal(await page.locator('#btnStreamerJoin').isDisabled(),true);
 assert.equal((await state()).settingsOpen,true);
});
await check('Scenario loading and delayed batch joins obey the selected capacity',async()=>{
 await page.keyboard.press('Escape');await unfold('arenaPanelScenarios');await page.locator('#arenaScenarioSelect').selectOption('128');await page.locator('#arenaLoadScenario').click();assert.equal((await state()).fighterBodies,4);
 await page.evaluate(()=>triggerBatchJoin(4));await page.waitForTimeout(750);assert.equal((await state()).fighterBodies,4);assert.match(await page.locator('#arenaScenarioLimitHint').innerText(),/4/);
});
await check('Single-class rounds cover current fighters, new chat participants and Prota without overwriting class preferences',async()=>{
 await openRuleSettings();await capacityUI(8);const preferred=await page.evaluate(()=>fighters.map(f=>({id:f.id,key:f.archetypeKey})));
 await page.evaluate(()=>{startCombatFromLobby();const f=fighters[0];f.energy=100;queueFighterSkillWindup(f,CLASS_COMMANDS[f.archetypeKey].powers[0]);});
 await page.locator('#arenaClassRule').selectOption('ninja');assert.equal(await page.evaluate(()=>fighters.every(f=>f.archetypeKey==='ninja')),true);assert.equal(await page.evaluate(()=>fighters.some(f=>!!f.castingSkill)),false);assert.equal(await page.evaluate(()=>queueFighterSkillWindup(fighters[0],'!coloso')),false);assert.equal(await page.evaluate(()=>executeFighterSkill(fighters[0],'!coloso')),false);
 await page.evaluate(()=>{const f=fighters[0];ArenaLive.sendChat({username:f.name,platformKey:f.platformKey,message:'!titan'});ArenaLive.sendChat({username:'rule_preference',platformKey:'tiktok',message:'!titan'});joinAsStreamer();});
 const limited=await page.evaluate(()=>ArenaLive.getFighters());assert.ok(limited.some(f=>f.isStreamer));assert.equal(limited.every(f=>f.classKey==='ninja'),true);assert.equal(await page.locator('#protagonistClassSelect').isDisabled(),true);
 await page.locator('#arenaClassRule').selectOption('any');const restored=await page.evaluate(()=>ArenaLive.getFighters());
 for(const f of preferred)assert.equal(restored.find(n=>n.id===f.id).classKey,f.key);
 assert.equal(restored.find(f=>f.name==='@rule_preference').classKey,'titan');
 assert.equal(await page.evaluate(()=>viewerProfiles.get(viewerIdentityKey('rule_preference','tiktok')).archetypeKey),'titan');
});
await check('Disabling class powers cancels windups and blocks chat, quick tests, AI, Prota and direct execution',async()=>{
 await page.evaluate(()=>{startCombatFromLobby();const f=fighters[0];f.energy=100;queueFighterSkillWindup(f,CLASS_COMMANDS[f.archetypeKey].powers[0]);});assert.equal(await page.evaluate(()=>!!fighters[0].castingSkill),true);
 await page.locator('#arenaPowerMode').selectOption('noSpecials');
 const result=await page.evaluate(()=>{
  const f=fighters[0],target=fighters[1],command=CLASS_COMMANDS[f.archetypeKey].powers[0],energy=f.energy;
  f.aiSpecialCooldown=0;autoAttackEnabled=true;target.x=f.x+40;target.y=f.y;
  const queued=queueFighterSkillWindup(f,command),ai=tryAutonomousFighterSpecial(f,target),direct=executeFighterSkill(f,command),quick=triggerQuickSkill(command);
  const chat=ArenaLive.sendChat({username:f.name,platformKey:f.platformKey,message:command});
  isGamePaused=false;isSettingsOpen=false;const prota=triggerProtagonistSpecialAttack();isGamePaused=true;isSettingsOpen=true;
  return {queued,ai,direct,quick,chat,prota,energyBefore:energy,energyAfter:f.energy,casting:fighters.some(f=>!!f.castingSkill),social:ArenaLive.support({eventType:'follow',targetId:target.id})};
 });
 for(const key of ['queued','ai','direct','quick','chat','prota','casting'])assert.equal(result[key],false,key);
 assert.equal(result.energyAfter,result.energyBefore);assert.equal(result.social,true);assert.equal(await page.locator('.arena-skill-buttons button:enabled').count(),0);
});
await check('Melee-only removes existing bonuses and blocks every social event and repeated-join boosts',async()=>{
 await page.evaluate(()=>{const f=fighters[0];ArenaLive.support({eventType:'gift',targetId:f.id});});
 await page.locator('#arenaPowerMode').selectOption('melee');
 const result=await page.evaluate(()=>{
  const f=fighters[0];f.hp=80;f.energy=30;
  const before={hp:f.hp,energy:f.energy};
  const events=ARENA_SOCIAL_EVENT_TYPES.map(eventType=>ArenaLive.support({eventType,targetId:f.id}));
  addOrBoostFighter(f.name,f.platformKey,false);
  return {before,after:{hp:f.hp,energy:f.energy},events,bonuses:['shieldHP','shieldTimer','berserkTimer','likeBoostTimer','energyRegenerationTimer','specialAmplifyTimer'].map(key=>f[key])};
 });
 assert.deepEqual(result.after,result.before);assert.equal(result.events.every(value=>value===false),true);assert.equal(result.bonuses.every(value=>value===0),true);assert.equal(await page.locator('#arenaPanelSocial button:enabled').count(),0);
});
await check('Health, damage, shield absorption, zero knockback, movement and passive energy use configured parameters',async()=>{
 const ratio=await page.evaluate(()=>fighters[0].hp/fighters[0].maxHp);await ruleRange('maxHp',300);
 assert.equal(await page.evaluate(()=>fighters.every(f=>f.maxHp===300)),true);assert.equal(await page.evaluate(()=>fighters[0].hp),Math.max(1,Math.round(ratio*300)));
 await ruleRange('damage',2);await ruleRange('knockback',0);await ruleRange('movement',2);await ruleRange('energyRegen',0);
 const hit=await page.evaluate(()=>{
  const a=fighters[0],b=fighters[1];a.likeBoostTimer=0;b.hp=300;b.shieldHP=10;b.shieldTimer=100;b.immunityTimer=0;b.damageTaken=0;b.knockbackTimer=0;b.vx=0;b.vy=0;b.vz=0;b.edgeRecoveryPending=false;
  applyDamage(b,20,a,false,6.5,'normal');return {hp:b.hp,shield:b.shieldHP,vx:b.vx,vy:b.vy,knockback:b.knockbackTimer,movement:getFighterMoveSpeedMultiplier(a)};
 });
 assert.deepEqual(hit,{hp:270,shield:0,vx:0,vy:0,knockback:0,movement:2});
 const tickEnergy=()=>page.evaluate(()=>{
  autoAttackEnabled=false;gamePace=1;slowMoFactor=1;fighters.forEach((f,i)=>{f.x=300+i*40;f.y=400;f.z=0;f.vx=0;f.vy=0;f.knockbackTimer=0;f.hp=f.maxHp;f.castingSkill=null;f.energyRegenerationTimer=0;});
  const f=fighters[0];f.energy=20;isGamePaused=false;updatePhysicsAndAI();isGamePaused=true;return f.energy;
 });
 assert.equal(await tickEnergy(),20);await ruleRange('energyRegen',2);assert.ok(Math.abs(await tickEnergy()-20.13)<1e-8);
 await ruleRange('knockback',1);const launched=await page.evaluate(()=>{const a=fighters[0],b=fighters[1];b.shieldTimer=0;b.shieldHP=0;applyDamage(b,20,a,false,6.5,'normal');return b.knockbackTimer>0&&Math.abs(b.vx)>0;});assert.equal(launched,true);
 await shot('combat-rules');
});
await check('Lowering capacity during combat preserves players, blocks newcomers and trims only when preparing the lobby',async()=>{
 const before=await page.evaluate(()=>ArenaLive.getFighters().map(f=>f.id));assert.ok(before.length>2);await capacityUI(2);
 assert.deepEqual(await page.evaluate(()=>ArenaLive.getFighters().map(f=>f.id)),before);await page.evaluate(()=>ArenaLive.sendChat({username:'over_capacity_battle',message:'!jugar'}));assert.equal((await state()).fighterBodies,before.length);assert.match(await page.locator('#arenaPlayerCapacityStatus').innerText(),/supera el cupo/);
 const profiles=await page.evaluate(()=>viewerProfiles.size);await page.evaluate(()=>openLobby(false));assert.equal((await state()).fighterBodies,2);assert.equal(await page.evaluate(()=>viewerProfiles.size),profiles);assert.equal(await page.evaluate(()=>fighters.some(f=>f.isStreamer)),true);
});
await check('Rules persist across reload and reset independently from OBS, layouts and saved identities',async()=>{
 await capacityUI(6);await page.locator('#arenaClassRule').selectOption('kame');await page.reload({waitUntil:'load'});await page.waitForFunction(()=>arenaLiveInitialized);await page.evaluate(()=>countdownsEnabled=false);
 const saved=(await state()).combatRules;assert.equal(saved.maxPlayers,6);assert.equal(saved.classRule,'kame');assert.equal(saved.powerMode,'melee');assert.equal(saved.maxHp,300);assert.equal(await page.evaluate(()=>fighters.every(f=>f.archetypeKey==='kame')),true);assert.ok((await state()).fighterBodies<=6);
 await openRuleSettings();const profileCount=await page.evaluate(()=>viewerProfiles.size),calibration=await page.evaluate(()=>JSON.stringify(arenaObsCalibration)),layout=await page.evaluate(()=>localStorage.getItem(ARENA_WORKSPACE_KEYS.stream));
 await page.locator('#arenaResetCombatRules').click();assert.deepEqual((await state()).combatRules,{maxPlayers:128,classRule:'any',powerMode:'full',maxHp:180,damage:1,knockback:1,movement:1,energyRegen:1});assert.equal(await page.evaluate(()=>viewerProfiles.size),profileCount);assert.equal(await page.evaluate(()=>JSON.stringify(arenaObsCalibration)),calibration);assert.equal(await page.evaluate(()=>localStorage.getItem(ARENA_WORKSPACE_KEYS.stream)),layout);await page.keyboard.press('Escape');
});

await check('Saved rule validation bounds capacity/parameters, rejects unknown classes/modes, and recovers from malformed data',async()=>{
 await page.evaluate(()=>localStorage.setItem(ARENA_COMBAT_RULES_KEY,JSON.stringify({maxPlayers:999,maxHp:-20,damage:900,knockback:-1,movement:0,energyRegen:100,classRule:'unknown',powerMode:'unknown'})));
 await page.reload({waitUntil:'load'});await page.waitForFunction(()=>arenaLiveInitialized);assert.deepEqual((await state()).combatRules,{maxPlayers:128,classRule:'any',powerMode:'full',maxHp:50,damage:3,knockback:0,movement:.5,energyRegen:3});
 await page.evaluate(()=>localStorage.setItem(ARENA_COMBAT_RULES_KEY,'{broken'));await page.reload({waitUntil:'load'});await page.waitForFunction(()=>arenaLiveInitialized);assert.equal((await state()).maxFighters,128);assert.equal((await state()).combatRules.maxHp,180);await page.evaluate(()=>{resetArenaCombatRules();countdownsEnabled=false;});
});
await check('Resetting the current layout preserves OBS calibration and the other workspace',async()=>{
 await page.locator('#arenaDualSettingsBtn').click();await settingsSection(5);await page.locator('#arenaWorkspaceReset').click();
 assert.equal((await state()).settingsOpen,true);assert.equal((await state()).paused,true);assert.equal(await page.evaluate(()=>arenaWorkspace.layouts.preparation.leftWidth),260);assert.equal(await page.evaluate(()=>arenaWorkspace.layouts.stream.leftWidth),320);assert.equal(await page.evaluate(()=>arenaObsCalibration.offset),8);
 assert.deepEqual(await page.locator('.arena-work-panel[open]').evaluateAll(ns=>ns.map(n=>n.id).sort()),['arenaPanelChat','arenaPanelSocial']);await page.keyboard.press('Escape');
});
await check('Camera shake defaults to 25%, can be disabled in Settings, persists independently and leaves captures unchanged',async()=>{
 assert.equal((await state()).cameraShake,25);
 await page.locator('#arenaDualSettingsBtn').click();await settingsSection(2);
 const calibration=await page.evaluate(()=>JSON.stringify(arenaObsCalibration)),before=await rects();
 assert.equal(await page.locator('#arenaShakeLabel').innerText(),'Vibración de cámara');
 assert.match(await page.locator('#arenaShakeRange').getAttribute('title'),/golpes ni el empuje/);
 await page.locator('#arenaShakeRange').evaluate(n=>{n.value='0';n.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.locator('#arenaShakeValue').innerText(),'0 %');assert.equal((await state()).paused,true);assert.equal((await state()).settingsOpen,true);
 assert.deepEqual(await rects(),before);assert.equal(await page.evaluate(()=>JSON.stringify(arenaObsCalibration)),calibration);
 await page.keyboard.press('Escape');await page.reload({waitUntil:'load'});await page.waitForFunction(()=>arenaLiveInitialized);
 assert.equal((await state()).cameraShake,0);assert.equal(await page.evaluate(()=>JSON.stringify(arenaObsCalibration)),calibration);
 await page.evaluate(()=>{setArenaScreenShake(25);countdownsEnabled=false;});
});
await check('Mobile prioritizes 9:16, exposes only the bottom action bar and preserves all tools in Menu',async()=>{
 await page.setViewportSize({width:390,height:844});const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await page.reload({waitUntil:'load'});await page.waitForFunction(()=>arenaLiveInitialized);await page.evaluate(()=>countdownsEnabled=false);
 assert.equal(await page.evaluate(()=>monitorFocus),'9:16');assert.equal(await page.locator('#arenaDockRight').isHidden(),true);assert.equal(await page.locator('#arenaHeaderActions').evaluate(n=>n.getBoundingClientRect().bottom),844);assert.equal(await page.locator('#arenaMobileMoreBtn').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#arenaMobileMoreBtn').click();assert.equal(await page.locator('[data-forward-control="arenaDualTikTokConnectBtn"]').isDisabled(),await page.locator('#arenaDualTikTokConnectBtn').isDisabled());await page.locator('[data-forward-control="arenaDualTestsToggle"]').click();await unfold('arenaPanelPlayers');const before=(await state()).activeFighters;await page.locator('#arenaPanelPlayers button[onclick="triggerQuickJoin()"]').click();assert.equal((await state()).activeFighters,before+1);assert.equal(await page.locator('#arenaOperatorPopover').isHidden(),true);
 await page.locator('#arenaMobileMoreBtn').click();await page.locator('[data-forward-control="arenaDualSettingsBtn"]').click();assert.equal((await state()).paused,true);await page.keyboard.press('Escape');assert.equal((await state()).paused,false);await shot('mobile');
});
await check('Mobile action buttons and joystick use the original manual combat controls',async()=>{
 await page.locator('#btnStreamerJoin').click();await page.locator('#viewport9x16 button[onclick="startCombatFromLobby()"]').click();await page.waitForFunction(()=>gameState==='COMBAT');
 assert.equal(await page.locator('#arenaMobileJump').isEnabled(),true);assert.equal(await page.locator('#touchJoystick').isVisible(),true);await page.locator('#arenaMobileJump').click();await page.locator('#arenaMobileAttack').click();await page.locator('#arenaMobilePower').click();assert.equal((await state()).settingsOpen,false);await shot('mobile-combat');
});
await check('Mobile special action follows the no-powers rule while movement and normal attacks remain usable',async()=>{
 await page.locator('#arenaMobileMoreBtn').click();await page.locator('[data-forward-control="arenaDualSettingsBtn"]').click();
 const rules=page.locator('.arena-settings-section').filter({has:page.locator('#arenaPowerMode')});if(!await rules.evaluate(n=>n.open))await rules.locator('summary').click();
 await page.locator('#arenaPowerMode').selectOption('noSpecials');await page.keyboard.press('Escape');assert.equal(await page.locator('#arenaMobilePower').isDisabled(),true);assert.equal(await page.locator('#arenaMobileAttack').isEnabled(),true);assert.equal(await page.locator('#arenaMobileJump').isEnabled(),true);
});
 await check('Unified release uses native clock, randomness, animation and the TikTok bridge',async()=>{
  const status=await (await page.request.get(`http://127.0.0.1:${port}/api/status`)).json();assert.equal(status.version,'0.9.0');
  const native=await page.evaluate(()=>({clock:Date.now.toString().includes('[native code]'),random:Math.random.toString().includes('[native code]'),raf:requestAnimationFrame.toString().includes('[native code]'),harness:typeof window.ArenaBalanceHarness}));
  assert.deepEqual(native,{clock:true,random:true,raf:true,harness:'undefined'});
  assert.match(await page.locator('#arenaSettingsVersion').textContent(),/v0\.9/);
  assert.equal(await page.evaluate(()=>Object.isFrozen(ArenaLive.getBalanceRules())&&Object.isFrozen(ArenaLive.getBalanceRules().iso.ninja)),true);
 });
 await check('Playable powers apply the measured damage, windup and target caps in all three modes',async()=>{
  const tuning=JSON.parse(await readFile(new URL('../docs/balance-candidate-v0.5.json',import.meta.url),'utf8'));
  const probes=await page.evaluate(()=>{
   arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};isGamePaused=true;gameState='COMBAT';soundEnabled=false;
   const rows=[];
   for(const mode of ['1v1','smash','iso'])for(const key of ['kame','ninja','titan','trueno','esmeralda']){
    activeMode=mode;const actor=new Fighter('@preview_actor','tiktok',false,key);actor.x=240;actor.y=250;actor.facing=1;actor.energy=100;
    const targets=Array.from({length:6},(_,i)=>{const f=new Fighter('@preview_'+i,'tiktok',false,'ninja');f.x=270+i*8;f.y=250;return f;});fighters=[actor,...targets];
    const command=CLASS_COMMANDS[key].powers[0];queueFighterSkillWindup(actor,command);const windup=actor.castingSkill.timer;
    actor.castingSkill=null;actor.activeSpecialFactor=1;executeFighterSkill(actor,command);
    const event=document.querySelector('#chatFeed>[data-chat-event="special"]:last-child');
    rows.push({mode,key,windup,damage:targets.map(f=>180-f.hp).filter(d=>d>0),logged:!!event&&event.dataset.command===command&&event.dataset.fighterId===actor.id});
   }return rows;
  });
  for(const p of probes){
   const rule=tuning[p.mode][p.key];assert.equal(p.windup,rule.windup||34);
   const hits=p.key==='ninja'||p.key==='esmeralda'?1:p.key==='trueno'?(rule.targets||3):(rule.targets||6);
   assert.equal(p.damage.length,hits,p.mode+'/'+p.key+' target cap');assert.ok(p.damage.every(d=>d===rule.damage),p.mode+'/'+p.key+' damage');
   assert.equal(p.logged,true,p.mode+'/'+p.key+' actual special has its command and caster');
  }
 });
 await check('All five playable classes select the closest rival instead of health/class priorities',async()=>{
  const matches=await page.evaluate(()=>['kame','ninja','titan','trueno','esmeralda'].map(key=>{
   const actor=new Fighter('@actor','tiktok',false,key),near=new Fighter('@near','tiktok',false,'ninja'),weak=new Fighter('@weak','tiktok',false,key);
   actor.x=240;actor.y=250;near.x=280;near.y=250;weak.x=305;weak.y=250;weak.hp=1;fighters=[actor,near,weak];return findPreferredCombatTarget(actor)?.id===near.id;
  }));assert.ok(matches.every(Boolean));
 });
await check('All 128 silent scenario joins emit !jugar once, with bounded local history and no TikTok impersonation',async()=>{
 const result=await page.evaluate(()=>{
  arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};gameState='LOBBY';koSequenceActive=false;isGamePaused=true;soundEnabled=false;autoChatEnabled=false;
  const feed=document.getElementById('chatFeed');feed.replaceChildren();setChatRetention(40);
  const received=document.getElementById('arenaTikTokChatFeed').childElementCount;
  const observer=new MutationObserver(()=>{});observer.observe(feed,{childList:true});
  applyPlayerCountPreset(128);
  const events=observer.takeRecords().flatMap(r=>[...r.addedNodes]).filter(n=>n.dataset?.chatEvent==='join');observer.disconnect();
  return {count:events.length,unique:new Set(events.map(n=>n.dataset.fighterId)).size,
   valid:events.every(n=>n.dataset.command==='!jugar'&&n.firstElementChild.textContent.includes('🎮')&&n.textContent.includes('!jugar')&&n.textContent.includes('Se unió')),
   retained:feed.childElementCount,limit:chatRetention,receivedUnchanged:received===document.getElementById('arenaTikTokChatFeed').childElementCount};
 });
 assert.deepEqual(result,{count:128,unique:128,valid:true,retained:40,limit:40,receivedUnchanged:true});
});
await check('Quick join, first messages, class commands, Prota and valid re-entry share real join records; boosts and refusals do not',async()=>{
 const result=await page.evaluate(()=>{
  gameState='LOBBY';applyPlayerCountPreset(0);setRejoinRuleMode('free');document.getElementById('chatFeed').replaceChildren();
  const quick=triggerQuickJoin();
  processChatCommand('@chat_join','tiktok','!jugar',null,true);
  processChatCommand('@first_message','youtube','hola',null,true);
  processChatCommand('@class_join','kick','!shinobi',null,true);
  joinAsStreamer();
  const entries=[...document.querySelectorAll('#chatFeed>[data-chat-event="join"]')];
  const joined=fighters.length,all=fighters.every(f=>entries.filter(n=>n.dataset.fighterId===f.id&&n.dataset.command==='!jugar').length===1);
  quick.hp=100;quick.energy=20;const likes=quick.likesReceived;
  addOrBoostFighter(quick.name,quick.platformKey,false,null,true);
  const boosted={hp:quick.hp,energy:quick.energy,likes:quick.likesReceived-likes};
  quick.eliminated=true;addOrBoostFighter(quick.name,quick.platformKey,false,null,true);
  const reentries=document.querySelectorAll('#chatFeed>[data-chat-event="rejoin"]').length;
  arenaCombatRules.maxPlayers=fighters.length;
  const blocked=addOrBoostFighter('@over_limit','tiktok',false,null,true)===null;
  setRejoinRuleMode('3_lives');quick.eliminated=true;quick.joinsUsed=MAX_OPPORTUNITIES;
  const exhausted=addOrBoostFighter(quick.name,quick.platformKey,false,null,true)===null;
  setRejoinRuleMode('free');arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};
  return {joined,all,boosted,reentries,blocked,exhausted,joinCount:document.querySelectorAll('#chatFeed>[data-chat-event="join"]').length,rejoinCount:document.querySelectorAll('#chatFeed>[data-chat-event="rejoin"]').length};
 });
 assert.deepEqual(result,{joined:5,all:true,boosted:{hp:135,energy:55,likes:1},reentries:1,blocked:true,exhausted:true,joinCount:5,rejoinCount:1});
});
await check('Autonomous AI logs one special on release; charging, interruptions, wrong classes and disabled powers never claim execution',async()=>{
 const result=await page.evaluate(()=>{
  gameState='LOBBY';applyPlayerCountPreset(2);startCombatFromLobby();isGamePaused=true;gamePace=1;slowMoFactor=1;autoAttackEnabled=true;
  const [actor,target]=fighters;applyFighterArchetype(actor,'kame');
  fighters.forEach((f,i)=>{f.x=400+i*80;f.y=WORLD_H*.79-f.radius;f.z=0;f.vx=0;f.vy=0;f.knockbackTimer=0;f.attackCooldown=100000;f.aiSpecialCooldown=100000;f.energy=100;});
  actor.aiSpecialCooldown=0;document.getElementById('chatFeed').replaceChildren();
  const count=()=>document.querySelectorAll('#chatFeed>[data-chat-event="special"]').length;
  const queued=tryAutonomousFighterSpecial(actor,target),charging=count();
  isGamePaused=false;
  for(let i=0;i<100&&actor.castingSkill;i++)updatePhysicsAndAI();
  const released=count(),event=document.querySelector('#chatFeed>[data-chat-event="special"]'),damage=target.maxHp-target.hp;
  autoAttackEnabled=false;actor.knockbackTimer=0;actor.castingSkill=null;
  queueFighterSkillWindup(actor,'!kame');applyDamage(actor,1,target,false,0,'normal');
  for(let i=0;i<50;i++)updatePhysicsAndAI();
  const interrupted=count();
  queueFighterSkillWindup(actor,'!rasen');executeFighterSkill(actor,'!rasen');
  queueFighterSkillWindup(actor,'!kame');setArenaCombatRule('powerMode','noSpecials');executeFighterSkill(actor,'!kame');
  const final=count(),cancelled=actor.castingSkill===null;
  setArenaCombatRule('powerMode','full');isGamePaused=true;
  return {queued,charging,released,damage,command:event?.dataset.command,caster:event?.dataset.fighterId===actor.id,interrupted,final,cancelled};
 });
 assert.deepEqual(result,{queued:true,charging:0,released:1,damage:43,command:'!kame',caster:true,interrupted:1,final:1,cancelled:true});
});
await check('A manual command targeting another fighter records the real caster, canonical alias and a single damage application',async()=>{
 const result=await page.evaluate(()=>{
  gameState='LOBBY';applyPlayerCountPreset(4);startCombatFromLobby();isGamePaused=true;autoAttackEnabled=false;
  const actor=fighters[0];applyFighterArchetype(actor,'titan');
  fighters.forEach((f,i)=>{f.x=400+i*25;f.y=300;f.z=0;f.vx=0;f.vy=0;f.knockbackTimer=0;f.attackCooldown=100000;f.aiSpecialCooldown=100000;});
  updateTargetSelectDropdown();document.getElementById('targetFighterSelect').value=actor.id;
  document.getElementById('chatMessageInput').value='!golpecolosal';document.getElementById('chatFeed').replaceChildren();
  handleManualChatSubmit();
  const charging=!!actor.castingSkill,pending=document.querySelectorAll('#chatFeed>[data-chat-event="special"]').length;
  isGamePaused=false;
  const target=fighters[1];for(let i=0;i<100&&actor.castingSkill;i++)updatePhysicsAndAI();
  isGamePaused=true;
  const records=[...document.querySelectorAll('#chatFeed>[data-chat-event="special"]')];
  const row=records[0];
  return {charging,pending,count:records.length,command:row?.dataset.command,caster:row?.dataset.fighterId===actor.id,name:row?.textContent.includes(getFighterDisplayName(actor)),damage:target.maxHp-target.hp,request:[...document.querySelectorAll('#chatFeed>[data-chat-kind="command"]:not([data-chat-event])')].some(n=>n.textContent.includes('!coloso'))};
 });
 assert.deepEqual(result,{charging:true,pending:0,count:1,command:'!coloso',caster:true,name:true,damage:38,request:true});
});
await check('Direct localized aliases execute and show accepted commands; fighter names remain escaped',async()=>{
 const result=await page.evaluate(()=>{
  currentLanguage='en';gameState='COMBAT';activeMode='smash';
  const actor=new Fighter('@<img src=x onerror=alert(1)>','tiktok',false,'titan');actor.x=400;actor.y=300;actor.energy=100;
  const target=new Fighter('@alias_target','tiktok',false,'ninja');target.x=420;target.y=300;fighters=[actor,target];
  document.getElementById('chatFeed').replaceChildren();queueFighterSkillWindup(actor,'!colossus');
  const command=actor.castingSkill?.cmd;actor.castingSkill=null;executeFighterSkill(actor,'!colossus');
  const row=document.querySelector('#chatFeed>[data-chat-event="special"]');
  const result={command,logged:row?.dataset.command,localized:row?.textContent.includes('!colossus')&&row.textContent.includes('Special executed'),safe:!row?.querySelector('img'),damage:target.maxHp-target.hp};currentLanguage='es';return result;
 });
 assert.deepEqual(result,{command:'!coloso',logged:'!coloso',localized:true,safe:true,damage:38});
});
const prepareIso=()=>page.evaluate(()=>{
 arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};gameState='LOBBY';koSequenceActive=false;isGamePaused=true;
 gamePace=1;slowMoFactor=1;autoAttackEnabled=false;autoChatEnabled=false;soundEnabled=false;countdownsEnabled=false;streamerManualControl=true;
 Object.keys(keys).forEach(k=>keys[k]=false);applyPlayerCountPreset(10);startCombatFromLobby();
 fighters.forEach(f=>{f.attackCooldown=100000;f.aiSpecialCooldown=100000;});
});
await check('The larger drawn ellipse, feet boundary, all 128 spawn points and both camera shake offsets agree',async()=>{
 await prepareIso();
 const result=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const ctx=canvas.getContext('2d'),ellipses=[],ellipse=ctx.ellipse.bind(ctx);
  ctx.ellipse=(...args)=>{ellipses.push(args.slice(0,4));return ellipse(...args);};paintArenaStageGeometry(ctx);
  gameState='LOBBY';applyPlayerCountPreset(128);const spawns=fighters.every(f=>getIsometricArenaPosition(f).radius<=.821);
  const render=renderWorldToViewport,offsets=[];renderWorldToViewport=(...args)=>offsets.push(args[7]);
  const focus=monitorFocus;monitorFocus='dual';isGamePaused=false;screenShake=14;
  try{renderBothScreensSimultaneously();}finally{renderWorldToViewport=render;monitorFocus=focus;isGamePaused=true;}
  return {floor:ellipses[1],expected:[ISOMETRIC_ARENA.centerX,ISOMETRIC_ARENA.centerY,ISOMETRIC_ARENA.radiusX,ISOMETRIC_ARENA.radiusY],spawns,sameOffset:offsets.length===2&&offsets[0]===offsets[1],larger:ISOMETRIC_ARENA.radiusX>960*.44&&ISOMETRIC_ARENA.radiusY>540*.30};
 });
 assert.deepEqual(result.floor,result.expected);assert.equal(result.spawns,true);assert.equal(result.sameOffset,true);assert.equal(result.larger,true);
});
await check('All classes and Prota fall outside the exact ellipse, die once, credit the launcher and consume the normal life flow',async()=>{
 await prepareIso();
 const rows=await page.evaluate(()=>{
  const rows=[];
  for(const key of ['kame','ninja','titan','trueno','esmeralda'])for(const prota of [false,true])for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   gameState='LOBBY';applyPlayerCountPreset(10);startCombatFromLobby();autoAttackEnabled=false;streamerManualControl=false;gamePace=[.75,1,1.25][rows.length%3];slowMoFactor=1;isGamePaused=false;
   const victim=fighters[0],launcher=fighters[1];applyFighterArchetype(victim,key);victim.isStreamer=prota;
   victim.x=ISOMETRIC_ARENA.centerX+Math.cos(angle)*ISOMETRIC_ARENA.radiusX*1.001;
   victim.y=ISOMETRIC_ARENA.centerY+Math.sin(angle)*ISOMETRIC_ARENA.radiusY*1.001-victim.radius*.85;
   victim.lastAttacker=launcher;let ticks=0;
   while(!victim.eliminated&&ticks++<200)updatePhysicsAndAI();
   rows.push({key,prota,dead:victim.eliminated&&victim.hp===0,once:eliminationOrder.filter(f=>f.id===victim.id).length===1,credit:launcher.kills===1,finite:ticks<200});
  }isGamePaused=true;gamePace=1;return rows;
 });
 assert.equal(rows.length,40);for(const row of rows)for(const field of ['dead','once','credit','finite'])assert.equal(row[field],true,row.key+'/'+row.prota+'/'+field);
});
await check('Prota can jump back from a real fall and AI gets one automatic rescue at every side instead of invisible ground',async()=>{
 const results=[];
 for(const prota of [true,false])for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  await prepareIso();
  results.push(await page.evaluate(({prota,angle})=>{
   const f=fighters[0];f.isStreamer=prota;f.x=ISOMETRIC_ARENA.centerX+Math.cos(angle)*ISOMETRIC_ARENA.radiusX*1.02;f.y=ISOMETRIC_ARENA.centerY+Math.sin(angle)*ISOMETRIC_ARENA.radiusY*1.02-f.radius*.85;
   isGamePaused=false;autoAttackEnabled=false;
   for(let i=0;i<8;i++)updatePhysicsAndAI();
   const sinking=f.fallDrop>0&&f.z<0&&!f.onGround;
   if(prota)triggerManualJump();else{autoAttackEnabled=true;updatePhysicsAndAI();}
   const attempted=f.recoveryJumpUsed&&f.jumpsLeft===0&&f.vz>0;
   let landed=false;for(let i=0;i<100&&!f.eliminated;i++){updatePhysicsAndAI();if(f.onGround&&f.fallDrop===0){landed=true;break;}}
   isGamePaused=true;return {sinking,attempted,landed,alive:!f.eliminated,charges:f.jumpsLeft,falling:f.fallDrop,clock:f.ringOutTimer};
  },{prota,angle}));
 }
 for(const row of results)assert.deepEqual(row,{sinking:true,attempted:true,landed:true,alive:true,charges:2,falling:0,clock:0});
});
await check('Holding Space cannot produce repeated jumps in isometric mode, and W moves without jumping',async()=>{
 await prepareIso();await page.evaluate(()=>{
  const f=fighters[0];f.isStreamer=true;f.x=ISOMETRIC_ARENA.centerX;f.y=ISOMETRIC_ARENA.centerY-f.radius*.85;isGamePaused=false;document.activeElement?.blur();
 });
 await page.keyboard.down('w');
 const move=await page.evaluate(()=>{for(let i=0;i<10;i++)updatePhysicsAndAI();return {z:fighters[0].z,jumps:fighters[0].jumpsLeft};});
 await page.keyboard.up('w');assert.deepEqual(move,{z:0,jumps:2});
 await page.keyboard.down('Space');
 const jump=await page.evaluate(()=>{for(let i=0;i<5;i++)updatePhysicsAndAI();return fighters[0].z;});assert.ok(jump>0);
 const held=await page.evaluate(()=>{for(let i=0;i<75;i++)updatePhysicsAndAI();return {z:fighters[0].z,jumps:fighters[0].jumpsLeft,held:keys.space};});
 await page.keyboard.up('Space');await page.evaluate(()=>isGamePaused=true);assert.deepEqual(held,{z:0,jumps:2,held:true});
});
await check('An off-rim charge obeys gravity, cancels in the abyss and cannot freeze the fighter outside',async()=>{
 await prepareIso();
 const result=await page.evaluate(()=>{
  const f=fighters[0];applyFighterArchetype(f,'kame');f.x=ISOMETRIC_ARENA.centerX+ISOMETRIC_ARENA.radiusX*1.02;f.y=ISOMETRIC_ARENA.centerY-f.radius*.85;
  f.castingSkill={cmd:'!kame',timer:1000,maxTimer:1000,powerFactor:1};document.getElementById('chatFeed').replaceChildren();
  isGamePaused=false;for(let i=0;i<100&&!f.eliminated;i++)updatePhysicsAndAI();isGamePaused=true;
  return {dead:f.eliminated,casting:f.castingSkill,executions:document.querySelectorAll('#chatFeed>[data-chat-event="special"]').length};
 });assert.deepEqual(result,{dead:true,casting:null,executions:0});
});
await check('The floor hides fighters underneath it while visible falling bodies remain outside the rim',async()=>{
 await prepareIso();
 const result=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const ctx=canvas.getContext('2d');
  const f=fighters[0];f.x=ISOMETRIC_ARENA.centerX;f.y=ISOMETRIC_ARENA.centerY-f.radius*.85;f.z=-15;f.fallDrop=15;
  const visible=()=>ctx.getImageData(0,0,960,540).data.some((value,index)=>index%4===3&&value>0);
  drawFighterOnCtx(ctx,f);const hidden=!visible();ctx.clearRect(0,0,960,540);
  f.x=ISOMETRIC_ARENA.centerX+ISOMETRIC_ARENA.radiusX+15;drawFighterOnCtx(ctx,f);
  return {hidden,visibleFall:visible()};
 });assert.deepEqual(result,{hidden:true,visibleFall:true});
});
await check('A ring-out at nine survivors switches to Smash and a new arrival returns everyone safely to the shared isometric floor',async()=>{
 await prepareIso();
 const result=await page.evaluate(()=>{
  gameState='LOBBY';applyPlayerCountPreset(9);startCombatFromLobby();autoAttackEnabled=false;isGamePaused=false;
  const f=fighters[0];f.x=ISOMETRIC_ARENA.centerX+ISOMETRIC_ARENA.radiusX*1.02;f.y=ISOMETRIC_ARENA.centerY-f.radius*.85;
  for(let i=0;i<100&&!f.eliminated;i++)updatePhysicsAndAI();
  const smash=activeMode==='smash'&&fighters.filter(f=>!f.eliminated).length===8;
  const clean=fighters.filter(f=>!f.eliminated).every(f=>f.fallDrop===0&&f.ringOutTimer===0&&!f.recoveryJumpUsed&&!f.extraRecoveryUsed&&!f.edgeRecoveryPending);
  addOrBoostFighter('@iso_transition_arrival','tiktok',false,'ninja',true);
  const returned=activeMode==='iso'&&fighters.filter(f=>!f.eliminated).every(f=>!getIsometricArenaPosition(f).outside);
  isGamePaused=true;return {smash,clean,returned};
 });assert.deepEqual(result,{smash:true,clean:true,returned:true});
});
await check('Full HD raster fills every capture pixel while logical physics, OBS calibration and canvas proportions stay unchanged',async()=>{
 const result=await page.evaluate(()=>{
  isGamePaused=true;gameState='COMBAT';skyFlashTimer=0;activeEffects=[];particles=[];floatingTexts=[];setMonitorFocus('dual');renderBothScreensSimultaneously();
  return {sizes:[canvas16,canvas9].map(c=>[c.width,c.height]),opaque:[ctx16,ctx9].every(ctx=>ctx.getImageData(ctx.canvas.width-1,ctx.canvas.height-1,1,1).data[3]===255),world:[WORLD_W,WORLD_H],calibration:JSON.parse(localStorage.getItem(ARENA_OBS_CALIBRATION_KEY)).offset};
 });
 assert.deepEqual(result,{sizes:[[1920,1080],[1080,1920]],opaque:true,world:[960,540],calibration:8});
});
await check('Lightning pixels reach the top of both native captures and strike the exact target without advancing combat randomness',async()=>{
 const result=await page.evaluate(()=>{
  gameState='COMBAT';activeMode='iso';isGamePaused=true;particles=[];floatingTexts=[];skyFlashTimer=0;
  activeEffects=[{type:'lightning',x:480,y:300,timer:28,maxTimer:28}];
  const random=Math.random;let randomCalls=0;Math.random=()=>{randomCalls++;return .5;};
  const check=ctx=>{
   const width=ctx===ctx16?960:540,height=ctx===ctx16?540:960;
   renderWorldToViewport(ctx,width,height,480,302.4,.64,[],{x:0,y:0});
   const pixels=ctx.getImageData(0,0,ctx.canvas.width,4).data;
   const top=Array.from({length:pixels.length/4},(_,i)=>i*4).some(i=>pixels[i]>160&&pixels[i+1]>120&&pixels[i+2]<100);
   const y=Math.round((height*.56+(300-302.4)*.64)*2),x=ctx.canvas.width/2;
   const hit=ctx.getImageData(x-2,y-2,4,4).data;
   return {top,hit:Array.from({length:hit.length/4},(_,i)=>i*4).some(i=>hit[i]>160&&hit[i+1]>120&&hit[i+2]<100)};
  };
  try{return {views:[check(ctx16),check(ctx9)],randomCalls};}finally{Math.random=random;}
 });
 assert.deepEqual(result,{views:[{top:true,hit:true},{top:true,hit:true}],randomCalls:0});
});
await check('Kame beams touch either edge, flashes fill all rows, and victory confetti reaches the portrait bottom independently of its camera',async()=>{
 const result=await page.evaluate(()=>{
  const edges=[];gameState='COMBAT';activeMode='iso';
  for(const dir of [-1,1]){
   activeEffects=[{type:'kamehameha',x:480,y:300,dir,timer:36,maxTimer:36}];
   renderWorldToViewport(ctx9,540,960,480,302.4,.64,[],{x:0,y:0});
   const y=Math.round((960*.56+(300-302.4)*.64)*2),x=dir===1?1078:0;
   edges.push(ctx9.getImageData(x,y,1,1).data[0]>220);
  }
  activeEffects=[];skyFlashTimer=10;skyFlashColor='#ffffff';renderWorldToViewport(ctx9,540,960,480,302.4,.64,[],{x:0,y:0});
  const flash=[ctx9.getImageData(0,0,1,1).data[0]>40,ctx9.getImageData(0,1919,1,1).data[0]>40];
  skyFlashTimer=0;gameState='VICTORY';confetti=[{x:WORLD_W*.25,y:WORLD_H*.05,size:10,angle:0,color:'#ff00ff'},{x:WORLD_W*.75,y:WORLD_H*.95,size:10,angle:0,color:'#ff00ff'}];
  renderWorldToViewport(ctx9,540,960,700,100,1.3,[],{x:0,y:0});
  const rain=[[270,96],[810,1824]].map(([x,y])=>{const p=ctx9.getImageData(x,y,1,1).data;return p[0]===255&&p[1]===0&&p[2]===255;});
  return {edges,flash,rain};
 });assert.deepEqual(result,{edges:[true,true],flash:[true,true],rain:[true,true]});
});
await check('Static Full HD layers are bounded, refresh with scene changes and never retain a power or flash',async()=>{
 const result=await page.evaluate(()=>{
  activeEffects=[];confetti=[];skyFlashTimer=0;particles=[];floatingTexts=[];activeMode='iso';gameState='COMBAT';
  const draw=()=>renderWorldToViewport(ctx16,960,540,480,302.4,1,[],{x:0,y:0});
  draw();const first=arenaBackgroundCache.get(ctx16),floor=arenaIsometricFloorCache;
  draw();const reused=first===arenaBackgroundCache.get(ctx16)&&floor===arenaIsometricFloorCache;
  const clean=Array.from(ctx16.getImageData(10,10,1,1).data);skyFlashTimer=10;skyFlashColor='#ffffff';draw();skyFlashTimer=0;draw();
  const fresh=clean.every((v,i)=>v===ctx16.getImageData(10,10,1,1).data[i]);
  gameState='VICTORY';draw();const victory=arenaBackgroundCache.get(ctx16)!==first;
  const victoryLayer=arenaBackgroundCache.get(ctx16);gameState='LOBBY';draw();const lobby=arenaBackgroundCache.get(ctx16)!==victoryLayer;
  return {reused,fresh,victory,lobby,floorSize:[floor.width,floor.height],nativeBackground:[arenaBackgroundCache.get(ctx16).layer.width,arenaBackgroundCache.get(ctx16).layer.height]};
 });assert.deepEqual(result,{reused:true,fresh:true,victory:true,lobby:true,floorSize:[2176,1336],nativeBackground:[1920,1080]});
});
assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks.length,errors:errors.length,version:'0.9.0'}));
} finally {await browser?.close();server.kill('SIGKILL');}
