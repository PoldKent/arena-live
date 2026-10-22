// Browser regressions for the v0.2 operator menus. Never connects to a real TikTok LIVE.
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
await check('0.2 loads and toolbar has one copy of all six direct actions',async()=>{
 assert.equal(await page.evaluate(()=>ArenaLive.version),'0.2.0');
 for(const id of ['arenaDualPauseBtn','arenaDualLobbyBtn','arenaDualRematchBtn','btnStreamerJoin','btnQuickSound','arenaDualTikTokConnectBtn'])assert.equal(await page.locator('#arenaHeaderActions #'+id).count(),1);
 assert.equal(await page.locator('#settingsHostTab,#settingsHostPanel').count(),0);
});
await check('Opening settings pauses; Escape closes and resumes',async()=>{
 await page.locator('#arenaDualSettingsBtn').click({noWaitAfter:true});assert.equal((await state()).paused,true);assert.equal((await state()).settingsOpen,true);
 await page.keyboard.press('Escape');assert.equal((await state()).paused,false);assert.equal((await state()).settingsOpen,false);
});
await check('Changing a select applies the choice then closes and resumes',async()=>{
 await page.locator('#arenaDualSettingsBtn').click({noWaitAfter:true});await page.locator('#ruleBtn-3_lives').click({noWaitAfter:true});assert.equal((await state()).settingsOpen,false);
 await page.locator('#arenaDualSettingsBtn').click({noWaitAfter:true});await page.locator('#playerLivesSelect').selectOption('3');assert.equal(await page.locator('#playerLivesSelect').inputValue(),'3');assert.equal((await state()).paused,false);assert.equal((await state()).settingsOpen,false);
});
await check('Slider stays open while dragging, applies on input and closes on commit',async()=>{
 await page.locator('#arenaDualSettingsBtn').click({noWaitAfter:true});
 await page.locator('#hudOpacityRange').evaluate(n=>{n.value='60';n.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal((await state()).settingsOpen,true);assert.equal(await page.locator('#hudOpacityValue').innerText(),'60 %');
 await page.locator('#hudOpacityRange').dispatchEvent('change');assert.equal((await state()).settingsOpen,false);
});
await check('Audio direct access toggles sound and readable state',async()=>{
 const before=await page.evaluate(()=>soundEnabled);await page.locator('#btnQuickSound').click({noWaitAfter:true});assert.equal(await page.evaluate(()=>soundEnabled),!before);assert.match(await page.locator('#btnQuickSound').innerText(),/Silenciado|Audio/);
});
await check('Class choice closes menu; Prota joins with that class',async()=>{
 await page.locator('#btnProtaClassMenu').click({noWaitAfter:true});await page.locator('#protagonistClassSelect').selectOption('ninja');assert.equal(await page.locator('#arenaOperatorPopover').isHidden(),true);
 await page.locator('#btnStreamerJoin').click({noWaitAfter:true});assert.equal(await page.evaluate(()=>ArenaLive.getFighters().find(f=>f.isStreamer)?.classKey),'ninja');
});
await check('Tools apply an action and then close',async()=>{
 await page.locator('#arenaDualTestsToggle').click({noWaitAfter:true});
 const before=(await state()).activeFighters;
 await page.locator('#audienceSimulatorPanel button[onclick="triggerQuickJoin()"]').click({noWaitAfter:true});
 assert.equal(await page.locator('#arenaOperatorPopover').isHidden(),true);assert.ok((await state()).activeFighters>before);
});
await check('Manual message sends then closes the chat menu',async()=>{
 await page.locator('#arenaDualChatToggleBtn').click({noWaitAfter:true});await page.locator('#chatMessageInput').fill('hola desde prueba v0.2');await page.locator('#chatForm button[type=submit]').click({noWaitAfter:true});assert.equal(await page.locator('#arenaOperatorPopover').isHidden(),true);
});
await check('Direct TikTok button routes connect and disconnect using bridge status',async()=>{
 const requests=[];
 await page.route('**/api/connect',r=>{requests.push('connect');return r.fulfill({json:{status:'connecting'}});});
 await page.route('**/api/disconnect',r=>{requests.push('disconnect');return r.fulfill({json:{status:'disconnected'}});});
 const connectRequest=page.waitForResponse('**/api/connect');
 await page.locator('#arenaDualTikTokConnectBtn').click({noWaitAfter:true});await connectRequest;
 await page.evaluate(()=>window.arenaTestSocket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'status',phase:'connected',account:'@polkent.live',isController:true})})));
 const disconnectRequest=page.waitForResponse('**/api/disconnect');
 await page.locator('#arenaDualTikTokConnectBtn').click({noWaitAfter:true});await disconnectRequest;assert.deepEqual(requests,['connect','disconnect']);
 await page.evaluate(()=>window.arenaTestSocket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'status',phase:'disconnected',account:'@polkent.live',isController:true})})));
});
await check('OBS calibration is saved under the existing storage key',async()=>{
 await page.locator('#arenaDualSettingsBtn').click({noWaitAfter:true});await page.locator('#arenaObsVerticalOffset').evaluate(n=>{n.value='8';n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));});
 assert.equal((await state()).settingsOpen,false);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('arenaLiveObsCalibrationV01')).offset),8);
});
await check('Stream mode opens from the unified pause/settings menu',async()=>{
 await page.locator('#arenaDualSettingsBtn').click({noWaitAfter:true});await page.locator('#btnViewDual').click({noWaitAfter:true});await page.waitForFunction(()=>document.fullscreenElement?.id==='broadcastStageSection');assert.equal((await state()).settingsOpen,false);
 assert.equal(await page.locator('#arenaStreamToolbarMount #arenaHeaderActions').count(),1);
});
await check('Opening tools or chat does not change either capture rectangle',async()=>{
 await page.waitForTimeout(150);const before=await rects();
 await page.locator('#arenaDualTestsToggle').click({noWaitAfter:true});assert.deepEqual(await rects(),before);
 const placement=await page.evaluate(()=>{const p=document.getElementById('arenaOperatorPopover').getBoundingClientRect(),r=document.getElementById('arenaDualBottomCluster').getBoundingClientRect();return p.y>=r.y && p.bottom<=r.bottom+1;});assert.equal(placement,true);
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.fullscreenElement?.id),'broadcastStageSection');
 await page.locator('#arenaDualChatToggleBtn').click({noWaitAfter:true});assert.deepEqual(await rects(),before);await page.keyboard.press('Escape');
});
await check('Settings in fullscreen pause and resume while Escape keeps stream mode',async()=>{
 await page.locator('#arenaDualSettingsBtn').click({noWaitAfter:true});assert.equal((await state()).paused,true);await page.keyboard.press('Escape');assert.equal((await state()).paused,false);assert.equal(await page.evaluate(()=>document.fullscreenElement?.id),'broadcastStageSection');
});
await check('3440x1440 preserves capture rectangles while tools and chat open',async()=>{
 await page.locator('#btnFullscreenDual').click({noWaitAfter:true});await page.waitForFunction(()=>!document.fullscreenElement);
 await page.setViewportSize({width:3440,height:1440});
 await page.locator('#btnFullscreenDual').click({noWaitAfter:true});await page.waitForFunction(()=>document.fullscreenElement?.id==='broadcastStageSection');
 await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>innerWidth),3440);const before=await rects();
 await page.locator('#arenaDualTestsToggle').click({noWaitAfter:true});assert.deepEqual(await rects(),before);await page.keyboard.press('Escape');
 await page.locator('#arenaDualChatToggleBtn').click({noWaitAfter:true});assert.deepEqual(await rects(),before);await page.keyboard.press('Escape');
});
await check('Stream exit restores the same toolbar, participants and calibration',async()=>{
 const fighters=await page.evaluate(()=>ArenaLive.getFighters().map(f=>f.id));await page.locator('#btnFullscreenDual').click({noWaitAfter:true});await page.waitForFunction(()=>!document.fullscreenElement);
 assert.equal(await page.locator('#arenaTopBarInner #arenaHeaderActions').count(),1);assert.deepEqual(await page.evaluate(()=>ArenaLive.getFighters().map(f=>f.id)),fighters);assert.equal(await page.evaluate(()=>arenaObsCalibration.offset),8);
});
await check('Desktop has one horizontal toolbar and no document overflow',async()=>{
 const rows=await page.locator('#arenaHeaderActions button').evaluateAll(nodes=>new Set(nodes.map(n=>Math.round(n.getBoundingClientRect().top))).size);assert.equal(rows,1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
});
await check('Individual fullscreen supports visible pause/settings and Escape without losing fullscreen',async()=>{
 await page.locator('#arenaFullscreenMenuBtn').click({noWaitAfter:true});await page.locator('#btnFullscreen16').click({noWaitAfter:true});await page.waitForFunction(()=>document.fullscreenElement?.id==='card-16x9');
 await page.keyboard.press('p');assert.equal(await page.locator('#settingsPauseModal').isVisible(),true);assert.equal((await state()).paused,true);
 await page.keyboard.press('Escape');assert.equal((await state()).paused,false);assert.equal(await page.evaluate(()=>document.fullscreenElement?.id),'card-16x9');
 await page.locator('#btnExitFullscreen16').click({noWaitAfter:true});await page.waitForFunction(()=>!document.fullscreenElement);
});
await check('Language change closes settings and keeps toolbar labels localized',async()=>{
 await page.locator('#arenaDualSettingsBtn').click({noWaitAfter:true});await page.locator('#languageSelect').selectOption('en');assert.equal((await state()).settingsOpen,false);assert.match(await page.locator('#arenaDualSettingsBtn').innerText(),/Settings/);
 await page.locator('#arenaDualSettingsBtn').click({noWaitAfter:true});await page.locator('#languageSelect').selectOption('es');assert.match(await page.locator('#arenaDualSettingsBtn').innerText(),/Ajustes/);
});
await check('Mobile preparation uses 9:16 and a scrollable single toolbar',async()=>{
 await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.ArenaLive && arenaLiveInitialized);
 assert.equal(await page.evaluate(()=>monitorFocus),'9:16');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#arenaDualSettingsBtn').click({noWaitAfter:true});assert.equal((await state()).paused,true);await page.keyboard.press('Escape');assert.equal((await state()).paused,false);
});
await page.setViewportSize({width:1720,height:720});
if(process.env.ARENA_TEST_SCREENSHOTS) {
 const directory=process.env.ARENA_TEST_SCREENSHOTS;await mkdir(directory,{recursive:true});
 await page.screenshot({path:join(directory,'preparation.png'),timeout:15000});
 await page.locator('#arenaDualSettingsBtn').click({noWaitAfter:true});
 await page.screenshot({path:join(directory,'settings.png'),timeout:15000});
}
assert.deepEqual(errors,[]);
console.log(JSON.stringify({passed:checks.length,errors:errors.length}));
} finally {await browser?.close();server.kill('SIGKILL');}
