// Browser regressions for the v0.4 independent operator workspaces. Never connects to a real TikTok LIVE.
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
await check('v0.4 starts with large game, left chat and only the social test group expanded',async()=>{
 assert.equal(await page.evaluate(()=>ArenaLive.version),'0.4.0');
 const panels=await page.locator('.arena-work-panel').evaluateAll(ns=>ns.map(n=>({id:n.id,open:n.open,parent:n.parentElement.id})));
 assert.equal(panels.find(n=>n.id==='arenaPanelChat').parent,'arenaDockLeft');
 assert.deepEqual(panels.filter(n=>n.open&&n.id!=='arenaPanelChat').map(n=>n.id),['arenaPanelSocial']);
 const order=await page.locator('#arenaHeaderActions>button').evaluateAll(ns=>ns.slice(0,4).map(n=>n.id));assert.deepEqual(order,['arenaViewMenuBtn','arenaFullscreenMenuBtn','arenaDualTestsToggle','arenaDualSettingsBtn']);
 for(const id of ['arenaDualPauseBtn','arenaDualLobbyBtn','arenaDualRematchBtn','btnStreamerJoin','btnQuickSound','arenaDualTikTokConnectBtn'])assert.equal(await page.locator('#arenaHeaderActions #'+id).count(),1);
 assert.equal(await page.locator('#arenaMobileMoreBtn').isVisible(),false);
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
 await page.locator('#arenaChatTabLocal').click();await page.locator('#chatMessageInput').fill('hola desde pruebas v0.4');await page.locator('#chatForm button[type=submit]').click();assert.equal(await page.locator('#arenaChatLocalPanel').isVisible(),true);
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
assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks.length,errors:errors.length}));
} finally {await browser?.close();server.kill('SIGKILL');}
