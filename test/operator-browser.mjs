// Browser regressions for the v0.3 independent operator workspaces. Never connects to a real TikTok LIVE.
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
await check('v0.3 starts with large game, left chat and only the social test group expanded',async()=>{
 assert.equal(await page.evaluate(()=>ArenaLive.version),'0.3.0');
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
 await page.locator('#arenaChatTabLocal').click();await page.locator('#chatMessageInput').fill('hola desde pruebas v0.3');await page.locator('#chatForm button[type=submit]').click();assert.equal(await page.locator('#arenaChatLocalPanel').isVisible(),true);
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
await check('Stream tools/chat open to the left without moving captures; actions close the panel',async()=>{
 const before=await rects();await streamClick('arenaDualTestsToggle');assert.deepEqual(await rects(),before);
 const left=await page.locator('#arenaStreamLeftColumn').boundingBox();assert.ok(left.x+left.width<=before.viewport16x9[0]);
 await page.locator('#arenaPanelSocial button[onclick="triggerSocialEvent(\'follow\')"]').click();assert.equal(await page.locator('#arenaStreamPanelHost').isHidden(),true);assert.deepEqual(await rects(),before);
 await streamClick('arenaDualChatToggleBtn');await page.locator('#arenaChatTabLocal').click();await page.locator('#chatMessageInput').fill('mensaje en stream');await page.locator('#chatForm button[type=submit]').click();assert.equal(await page.locator('#arenaStreamPanelHost').isHidden(),true);assert.deepEqual(await rects(),before);
});
await check('Stream settings occupy the left column, pause, and close after a committed action',async()=>{
 const before=await rects();await streamClick('arenaDualSettingsBtn');assert.equal((await state()).paused,true);await settingsSection(2);assert.deepEqual(await rects(),before);
 const modal=await page.locator('#settingsPauseModal').boundingBox();assert.ok(modal.x+modal.width<=before.viewport16x9[0]);
 await page.locator('#hudOpacityRange').evaluate(n=>{n.value='70';n.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await state()).settingsOpen,true);await page.locator('#hudOpacityRange').dispatchEvent('change');assert.equal((await state()).settingsOpen,false);assert.equal((await state()).paused,false);
 await streamClick('arenaDualSettingsBtn');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.fullscreenElement?.id),'broadcastStageSection');
});
await check('Stream remembers an independent column width and hides the toolbar without layout movement',async()=>{
 const resizer=await page.locator('#arenaStreamResizer').boundingBox();await page.mouse.move(resizer.x+4,resizer.y+100);await page.mouse.down();await page.mouse.move(resizer.x+64,resizer.y+100,{steps:10});await page.mouse.up();await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>arenaWorkspace.layouts.stream.leftWidth),320);assert.equal(await page.evaluate(()=>arenaWorkspace.layouts.preparation.leftWidth),300);
 const before=await rects();await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(900,400);await page.waitForTimeout(180);assert.equal(await page.locator('#arenaStreamToolbarMount').evaluate(n=>getComputedStyle(n).opacity),'0');assert.deepEqual(await rects(),before);
 await page.mouse.move(600,20);await page.waitForTimeout(150);assert.equal(await page.locator('#arenaStreamToolbarMount').evaluate(n=>getComputedStyle(n).opacity),'1');await shot('stream');
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
 await page.locator('#arenaDualSettingsBtn').click();await settingsSection(3);assert.equal(await page.locator('#languageSelect option').count(),8);await page.locator('#languageSelect').selectOption('en');assert.equal((await state()).settingsOpen,true);assert.match(await page.locator('#arenaDualSettingsBtn').innerText(),/Settings/);assert.match(await page.locator('#arenaPanelScenarios .arena-panel-title').innerText(),/Test scenario/);
 await page.locator('#languageSelect').selectOption('es');await page.keyboard.press('Escape');
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
assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks.length,errors:errors.length}));
} finally {await browser?.close();server.kill('SIGKILL');}
