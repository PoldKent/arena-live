// Browser regressions for the unified main release. Never connects to a real TikTok LIVE.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
const release=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const visibleVersion=release.split('.').slice(0,2).join('.');
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
 window.primeArenaSkill=(fighter,command,...args)=>{if(!arenaClassPowersAllowed())return queueFighterSkillWindup(fighter,command,...args);const paused=isGamePaused;isGamePaused=false;fighter.energy=100;fighter.aiSpecialCooldown=0;try{return queueFighterSkillWindup(fighter,command,...args);}finally{isGamePaused=paused;}};
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
await check('Both broadcast views include permanent five-class instructions and fresh lobby prompts',async()=>{
 const instructions=await page.evaluate(()=>['16','9'].map(suffix=>({
  lobby:!!document.getElementById('lobbyOverlay'+suffix),
  guide:document.getElementById('arenaAudienceGuide'+suffix)?.textContent||'',
  visible:getComputedStyle(document.getElementById('arenaAudienceGuide'+suffix)).display!=='none'
 })));
 for(const item of instructions){assert.equal(item.lobby,true);assert.equal(item.visible,true);assert.match(item.guide,/DALE TAP TAP PARA UNIRTE/i);assert.doesNotMatch(item.guide,/!jugar/);for(const command of ['!guerrero','!kame','!shinobi','!rasen','!titan','!coloso','!rayo','!trueno','!espiritu','!enred'])assert.ok(item.guide.includes(command),command);}
});

async function unfold(id){const panel=page.locator('#'+id);if(!await panel.evaluate(n=>n.open))await panel.locator('> summary').click({noWaitAfter:true});}
async function settingsSection(index){const section=page.locator('.arena-settings-section').nth(index);await page.evaluate(index=>{const s=document.querySelectorAll('.arena-settings-section')[index];selectArenaSettingsTab(s.dataset.settingsCategory,false);},index);if(!await section.evaluate(n=>n.open))await section.locator('> summary').click({noWaitAfter:true});}
async function streamClick(id){await page.mouse.move(600,20);await page.locator('#'+id).click({noWaitAfter:true});}
await check('UI styles are served locally without a browser Tailwind compiler',async()=>{
 const response=await page.request.get(`http://127.0.0.1:${port}/styles/arena-ui.css?v=0.14`);
 assert.equal(response.status(),200);assert.match(response.headers()['content-type'],/^text\/css/);
 assert.ok((await response.body()).length>10000);
 assert.equal(await page.locator('script[src*="tailwindcss"]').count(),0);
});
await check(`v${visibleVersion} starts with large game, left chat and only the social test group expanded`,async()=>{
 assert.equal(await page.evaluate(()=>ArenaLive.version),release);
 assert.equal(await page.title(),`Arena Live v${visibleVersion} · TikTok`);
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
await check('The unified player/powers panel has one selector with live name, class, health and energy',async()=>{
 await unfold('arenaPanelPowers');const fighter=(await page.evaluate(()=>ArenaLive.getFighters()))[0];
 await page.locator('#targetFighterSelect').selectOption(String(fighter.id));
 assert.equal(await page.locator('#arenaPowerTargetName').innerText(),fighter.name);assert.ok((await page.locator('#arenaPowerTargetClass').innerText()).length>1);assert.match(await page.locator('#arenaPowerTargetState').innerText(),/HP/);
 const before=await page.locator('#chatFeed>div').count();await page.locator('#arenaPanelSocial button[onclick="triggerSocialEvent(\'follow\')"]').click();assert.ok(await page.locator('#chatFeed>div').count()>=before);
 assert.equal(await page.locator('#arenaPanelSocial').evaluate(n=>n.open),true);
});
await check('Class selection and direct Prota entry reuse the original player flow',async()=>{
 await page.locator('#protagonistClassSelect').selectOption('ninja');assert.equal(await page.locator('#protagonistClassSelect').inputValue(),'ninja');assert.equal(await page.locator('#arenaOperatorPopover').isHidden(),true);
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
 await page.waitForFunction(()=>{const n=document.getElementById('arenaTikTokChatFeed');return n.scrollHeight-n.scrollTop-n.clientHeight<3;});
 assert.equal(await page.locator('#arenaTikTokChatFeed').evaluate(n=>n.scrollHeight-n.scrollTop-n.clientHeight<3),true);
 await page.locator('#arenaTikTokChatOlder').click();assert.equal(await page.locator('#arenaTikTokChatLatest').isDisabled(),false);
 await page.evaluate(()=>window.arenaTestSocket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'chat',platformKey:'tiktok',username:'qa_chat',message:'volver al directo'})})));
 assert.equal(await page.locator('#arenaTikTokChatLatest').isDisabled(),true);
 await page.locator('#arenaChatTabLocal').click();assert.ok(await page.locator('#chatFeed>[data-chat-kind="command"]').count()>0);
 await page.locator('#chatFeed').evaluate(n=>n.scrollTop=0);await page.locator('#chatMessageInput').fill('último mensaje');await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>{const n=document.getElementById('chatFeed');return n.scrollHeight-n.scrollTop-n.clientHeight<3;});
 assert.equal(await page.locator('#chatFeed').evaluate(n=>n.scrollHeight-n.scrollTop-n.clientHeight<3),true);
});
await check('Preparation settings apply multiple changes without closing and resume on explicit close',async()=>{
 await page.locator('#arenaDualSettingsBtn').click();assert.equal((await state()).paused,false);
 await page.locator('#ruleBtn-3_lives').click();await page.locator('#playerLivesSelect').selectOption('3');assert.equal((await state()).settingsOpen,true);assert.equal((await state()).paused,false);
 await settingsSection(2);await page.locator('#hudOpacityRange').evaluate(n=>{n.value='60';n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));});
 assert.equal(await page.locator('#hudOpacityValue').innerText(),'60 %');assert.equal((await state()).settingsOpen,true);assert.match(await page.locator('#hudOpacityRange').getAttribute('title'),/textos y barras/);
 await shot('settings');await page.keyboard.press('Escape');assert.equal((await state()).paused,false);
});
await check('Closing settings preserves an earlier manual pause',async()=>{
 await page.locator('#arenaDualPauseBtn').click();assert.equal((await state()).paused,true);await page.locator('#arenaDualSettingsBtn').click();await page.keyboard.press('Escape');assert.equal((await state()).paused,true);await page.locator('#arenaDualPauseBtn').click();assert.equal((await state()).paused,false);
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
 const handle=await page.locator('#arenaPanelPlayers .arena-panel-drag').boundingBox(),drop=await page.locator('#arenaDockRight>#arenaPanelPowers>summary').boundingBox();
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
 await page.locator('#btnViewDual').click();assert.equal(await page.evaluate(()=>monitorFocus),'dual');assert.equal((await state()).paused,false);await page.keyboard.press('Escape');assert.equal((await state()).settingsOpen,false);await page.locator('#btnFullscreenDual').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='broadcastStageSection');
});
await check('Stream uses its own reserved left column and contains both correctly proportioned canvases',async()=>{
 await page.waitForTimeout(150);assert.equal(await page.locator('#arenaStreamToolbarMount #arenaHeaderActions').count(),1);assert.equal(await page.locator('#arenaStreamPanelHost').isHidden(),true);
 const r=await rects();assert.ok(r.viewport16x9[0]>=260);assert.ok(r.viewport9x16[0]>r.viewport16x9[0]+r.viewport16x9[2]);assert.ok(r.viewport9x16[0]+r.viewport9x16[2]<=1720);
 assert.ok(Math.abs(r.viewport16x9[2]/r.viewport16x9[3]-16/9)<.01);assert.ok(Math.abs(r.viewport9x16[2]/r.viewport9x16[3]-9/16)<.01);
 const carrier=await page.evaluate(()=>{
  const outer=document.getElementById('card-9x16');
  const inner=document.getElementById('viewport9x16');
  const a=outer.getBoundingClientRect(),b=inner.getBoundingClientRect();
  return {enabled:outer.classList.contains('arena-stream-921'),
   ratio:a.width/a.height,innerRatio:b.width/b.height,
   centered:Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2)<2,
   left:b.left-a.left,right:a.right-b.right,top:b.top-a.top,bottom:a.bottom-b.bottom,
   instructions:document.getElementById('arenaAudienceGuide9').textContent};
 });
 assert.equal(carrier.enabled,true);assert.ok(Math.abs(carrier.ratio-9/21)<.015,JSON.stringify(carrier));
 assert.ok(Math.abs(carrier.innerRatio-9/16)<.015,JSON.stringify(carrier));
 assert.equal(carrier.centered,true);
 assert.ok(Math.abs(carrier.top-carrier.bottom)<4,JSON.stringify(carrier));
 assert.ok(carrier.top>10&&carrier.bottom>10);
 assert.ok(carrier.instructions.includes('TAP TAP')&&carrier.instructions.includes('!trueno'));
});
await check('Vertical selector fits 9:21 / 9:20 / 9:19.5 / 9:16 without stretch and pink slider centers precisely',async()=>{
 const select=page.locator('#arenaObsVerticalFormat');
 assert.equal(await select.locator('option').count(),4);
 await page.evaluate(()=>centerArenaObsVertical());
 for(const height of ['21','20','19.5','16']){
  await select.evaluate((element,value)=>{
   element.value=value;
   element.dispatchEvent(new Event('change',{bubbles:true}));
  },height);
  const snapshot=await page.evaluate(()=>{
   const a=document.getElementById('card-9x16').getBoundingClientRect();
   const b=document.getElementById('viewport9x16').getBoundingClientRect();
   const r=document.getElementById('arenaDualUltrawideVerticalStage').getBoundingClientRect();
   return {outer:a.width/a.height,inner:b.width/b.height,
    centeredY:Math.abs((a.top+a.bottom-b.top-b.bottom)/2),
    centeredX:Math.abs((a.left+a.right-r.left-r.right)/2),
    marginTop:b.top-a.top,marginBottom:a.bottom-b.bottom,
    saved:JSON.parse(localStorage.getItem('arenaLiveObsCalibrationV01')),
    labels:document.getElementById('arenaObsGeometrySummary').textContent};
  });
  assert.ok(Math.abs(snapshot.outer-9/Number(height))<.015,JSON.stringify(snapshot));
  assert.ok(Math.abs(snapshot.inner-9/16)<.015,JSON.stringify(snapshot));
  assert.ok(snapshot.centeredX<2 && snapshot.centeredY<2,JSON.stringify(snapshot));
  assert.ok(Math.abs(snapshot.marginTop-snapshot.marginBottom)<4,JSON.stringify(snapshot));
  assert.equal(snapshot.saved.format,height);
  assert.ok(snapshot.labels.includes('9:'+height));
 }
 const baseline=await page.locator('#card-9x16').evaluate(n=>n.getBoundingClientRect().x);
 await page.locator('#arenaObsVerticalOffset').evaluate(n=>{
  n.value='-19';n.dispatchEvent(new Event('input',{bubbles:true}));
 });
 const left=await page.locator('#card-9x16').evaluate(n=>n.getBoundingClientRect().x);
 assert.ok(Math.abs(left-baseline+19)<2,{baseline,left});
 await page.locator('#arenaObsVerticalOffsetExact').evaluate(n=>{
  n.value='27';n.dispatchEvent(new Event('change',{bubbles:true}));
 });
 const right=await page.locator('#card-9x16').evaluate(n=>n.getBoundingClientRect().x);
 assert.ok(Math.abs(right-baseline-27)<2,{baseline,right});
 await page.locator('#arenaObsCenterVertical').evaluate(n=>n.click());
 assert.equal(await page.locator('#arenaObsVerticalOffset').inputValue(),'0');
 assert.equal(await page.locator('#arenaObsVerticalOffsetExact').inputValue(),'0');
 await page.evaluate(()=>{setArenaObsCalibration('format','21');setArenaObsCalibration('offset',8);});
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
 const before=await rects();await streamClick('arenaDualSettingsBtn');assert.equal((await state()).paused,false);await settingsSection(2);assert.deepEqual(await rects(),before);
 const modal=await page.locator('#settingsPauseModal').boundingBox();assert.ok(modal.x+modal.width<=before.viewport16x9[0]);assert.equal(await page.locator('#arenaStreamClose').isVisible(),true);
 await page.locator('#hudOpacityRange').evaluate(n=>{n.value='70';n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal((await state()).settingsOpen,true);assert.equal((await state()).paused,false);
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
 await page.evaluate(()=>selectArenaSettingsTab('combat',false));
 const section=page.locator('.arena-settings-section').filter({has:page.locator('#arenaMaxPlayers')});
 if(!await section.evaluate(n=>n.open))await section.locator('> summary').click();
};
const ruleRange=async(key,value)=>page.locator(`[data-combat-rule="${key}"]`).evaluate((n,value)=>{n.value=String(value);n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));},value);
const capacityUI=async value=>{await page.locator('#arenaMaxPlayers').fill(String(value));await page.locator('#arenaMaxPlayers').press('Tab');};
await check('Capacity blocks real new viewers, reserves a bot slot for Prota and preserves legal re-entry',async()=>{
 await openRuleSettings();await capacityUI(4);
 await page.evaluate(()=>{setRejoinRuleMode('free');applyPlayerCountPreset(4);});
 const before=await page.evaluate(()=>ArenaLive.getFighters().map(f=>f.id));
 const result=await page.evaluate(()=>{
  for(let i=0;i<6;i++)ArenaLive.sendChat({username:'capacity_'+i,message:'!jugar'});
  addOrBoostFighter('raw_capacity','twitch');joinAsStreamer();
  const f=fighters[0];f.eliminated=true;const joins=f.joinsUsed;
  addOrBoostFighter(f.name,f.platformKey,false);
  return {ids:fighters.map(f=>f.id),prota:fighters.some(f=>f.isStreamer),rejoined:!f.eliminated&&f.joinsUsed===joins+1,state:ArenaLive.getState()};
 });
 assert.equal(result.ids.length,4);assert.equal(result.prota,true);assert.equal(result.rejoined,true);assert.equal(result.state.maxFighters,4);assert.equal(result.state.hardMaxFighters,128);assert.equal(await page.locator('#btnStreamerJoin').isDisabled(),true);
 assert.equal((await state()).settingsOpen,true);
});
await check('Scenario loading and delayed batch joins obey the selected capacity',async()=>{
 await page.keyboard.press('Escape');await unfold('arenaPanelScenarios');await page.locator('#arenaScenarioSelect').selectOption('128');await page.locator('#arenaLoadScenario').click();assert.equal((await state()).fighterBodies,4);
 await page.evaluate(()=>triggerBatchJoin(4));await page.waitForTimeout(750);assert.equal((await state()).fighterBodies,4);assert.match(await page.locator('#arenaScenarioLimitHint').innerText(),/4/);
});
await check('Single-class rounds cover current fighters, new chat participants and Prota without overwriting class preferences',async()=>{
 await openRuleSettings();await capacityUI(8);const preferred=await page.evaluate(()=>fighters.map(f=>({id:f.id,key:f.archetypeKey})));
 await page.evaluate(()=>{startCombatFromLobby();const f=fighters[0];f.energy=100;primeArenaSkill(f,CLASS_COMMANDS[f.archetypeKey].powers[0]);});
 await page.locator('#arenaClassRule').selectOption('ninja');assert.equal(await page.evaluate(()=>fighters.every(f=>f.archetypeKey==='ninja')),true);assert.equal(await page.evaluate(()=>fighters.some(f=>!!f.castingSkill)),false);assert.equal(await page.evaluate(()=>primeArenaSkill(fighters[0],'!coloso')),false);assert.equal(await page.evaluate(()=>executeFighterSkill(fighters[0],'!coloso')),false);
 await page.evaluate(()=>{const f=fighters[0];ArenaLive.sendChat({username:f.name,platformKey:f.platformKey,message:'!titan'});ArenaLive.sendChat({username:'rule_preference',platformKey:'tiktok',message:'!titan'});joinAsStreamer();toggleSettingsModal(false);for(let i=0;i<16;i++)updatePhysicsAndAI();toggleSettingsModal(true);});
 const limited=await page.evaluate(()=>ArenaLive.getFighters());assert.ok(limited.some(f=>f.isStreamer));assert.equal(limited.every(f=>f.classKey==='ninja'),true);assert.equal(await page.locator('#protagonistClassSelect').isDisabled(),true);
 await page.locator('#arenaClassRule').selectOption('any');const restored=await page.evaluate(()=>ArenaLive.getFighters());
 for(const f of preferred)assert.equal(restored.find(n=>n.id===f.id).classKey,f.key);
 assert.equal(restored.find(f=>f.name==='@rule_preference').classKey,'titan');
 assert.equal(await page.evaluate(()=>viewerProfiles.get(viewerIdentityKey('rule_preference','tiktok')).archetypeKey),'titan');
});
await check('Disabling class powers cancels windups and blocks chat, quick tests, AI, Prota and direct execution',async()=>{
 await page.evaluate(()=>{startCombatFromLobby();const f=fighters[0];f.energy=100;primeArenaSkill(f,CLASS_COMMANDS[f.archetypeKey].powers[0]);});assert.equal(await page.evaluate(()=>!!fighters[0].castingSkill),true);
 await page.locator('#arenaPowerMode').selectOption('noSpecials');
 const result=await page.evaluate(()=>{
  const f=fighters[0],target=fighters[1],command=CLASS_COMMANDS[f.archetypeKey].powers[0],energy=f.energy;
  f.aiSpecialCooldown=0;autoAttackEnabled=true;target.x=f.x+40;target.y=f.y;
  const queued=primeArenaSkill(f,command),ai=tryAutonomousFighterSpecial(f,target),direct=executeFighterSkill(f,command),quick=triggerQuickSkill(command);
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
  const a=fighters[0],b=fighters[1];b.archetypeKey=a.archetypeKey; // Neutral pairing isolates the configured round multiplier.
  a.likeBoostTimer=0;b.hp=300;b.shieldHP=10;b.shieldTimer=100;b.immunityTimer=0;b.damageTaken=0;b.knockbackTimer=0;b.vx=0;b.vy=0;b.vz=0;b.edgeRecoveryPending=false;
  applyDamage(b,20,a,false,'normal');return {hp:b.hp,shield:b.shieldHP,vx:b.vx,vy:b.vy,knockback:b.knockbackTimer,movement:getFighterMoveSpeedMultiplier(a)};
 });
 assert.deepEqual(hit,{hp:270,shield:0,vx:0,vy:0,knockback:0,movement:2});
 const tickEnergy=()=>page.evaluate(()=>{
  autoAttackEnabled=false;gamePace=1;slowMoFactor=1;fighters.forEach((f,i)=>{f.x=300+i*40;f.y=400;f.z=0;f.vx=0;f.vy=0;f.knockbackTimer=0;f.hp=f.maxHp;f.castingSkill=null;f.energyRegenerationTimer=0;});
  const f=fighters[0];f.energy=20;isGamePaused=false;updatePhysicsAndAI();isGamePaused=true;return f.energy;
 });
 assert.equal(await tickEnergy(),20);await ruleRange('energyRegen',2);assert.ok(Math.abs(await tickEnergy()-20.13)<1e-8);
 await ruleRange('knockback',1);const launched=await page.evaluate(()=>{const a=fighters[0],b=fighters[1];b.shieldTimer=0;b.shieldHP=0;applyDamage(b,20,a,false,'normal');return b.knockbackTimer>0&&Math.abs(b.vx)>0;});assert.equal(launched,true);
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
 assert.equal((await state()).settingsOpen,true);assert.equal((await state()).paused,false);assert.equal(await page.evaluate(()=>arenaWorkspace.layouts.preparation.leftWidth),260);assert.equal(await page.evaluate(()=>arenaWorkspace.layouts.stream.leftWidth),320);assert.equal(await page.evaluate(()=>arenaObsCalibration.offset),8);
 assert.deepEqual(await page.locator('.arena-work-panel[open]').evaluateAll(ns=>ns.map(n=>n.id).sort()),['arenaPanelChat','arenaPanelSocial']);await page.keyboard.press('Escape');
});
await check('Camera shake defaults to 25%, can be disabled in Settings, persists independently and leaves captures unchanged',async()=>{
 assert.equal((await state()).cameraShake,25);
 await page.locator('#arenaDualSettingsBtn').click();await settingsSection(2);
 const calibration=await page.evaluate(()=>JSON.stringify(arenaObsCalibration)),before=await rects();
 assert.equal(await page.locator('#arenaShakeLabel').innerText(),'Vibración de cámara');
 assert.match(await page.locator('#arenaShakeRange').getAttribute('title'),/golpes ni el empuje/);
 await page.locator('#arenaShakeRange').evaluate(n=>{n.value='0';n.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.locator('#arenaShakeValue').innerText(),'0 %');assert.equal((await state()).paused,false);assert.equal((await state()).settingsOpen,true);
 assert.deepEqual(await rects(),before);assert.equal(await page.evaluate(()=>JSON.stringify(arenaObsCalibration)),calibration);
 await page.keyboard.press('Escape');await page.reload({waitUntil:'load'});await page.waitForFunction(()=>arenaLiveInitialized);
 assert.equal((await state()).cameraShake,0);assert.equal(await page.evaluate(()=>JSON.stringify(arenaObsCalibration)),calibration);
 await page.evaluate(()=>{setArenaScreenShake(25);countdownsEnabled=false;});
});
await check('Mobile prioritizes 9:16, exposes only the bottom action bar and preserves all tools in Menu',async()=>{
 await page.setViewportSize({width:390,height:844});const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await page.reload({waitUntil:'load'});await page.waitForFunction(()=>arenaLiveInitialized);await page.evaluate(()=>countdownsEnabled=false);
 assert.equal(await page.evaluate(()=>monitorFocus),'9:16');assert.equal(await page.locator('#arenaDockRight').isHidden(),true);
 const preview=await page.evaluate(()=>{
  const frame=document.getElementById('card-9x16'),view=document.getElementById('viewport9x16');
  const a=frame.getBoundingClientRect(),b=view.getBoundingClientRect();
  return {phoneFit:frame.classList.contains('arena-phone-fit'),outerRatio:a.width/a.height,innerRatio:b.width/b.height,fit:b.top>=a.top-1&&b.bottom<=a.bottom+1};
 });
 assert.equal(preview.phoneFit,false);assert.ok(Math.abs(preview.innerRatio-9/16)<.02,JSON.stringify(preview));assert.equal(await page.locator('#arenaHeaderActions').evaluate(n=>n.getBoundingClientRect().bottom),844);assert.equal(await page.locator('#arenaMobileMoreBtn').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#arenaMobileMoreBtn').click();assert.equal(await page.locator('[data-forward-control="arenaDualTikTokConnectBtn"]').isDisabled(),await page.locator('#arenaDualTikTokConnectBtn').isDisabled());await page.locator('[data-forward-control="arenaDualTestsToggle"]').click();await unfold('arenaPanelPlayers');const before=(await state()).activeFighters;await page.locator('#arenaPanelPlayers button[onclick="triggerQuickJoin()"]').click();assert.equal((await state()).activeFighters,before+1);assert.equal(await page.locator('#arenaOperatorPopover').isHidden(),true);
 await page.locator('#arenaMobileMoreBtn').click();await page.locator('[data-forward-control="arenaDualSettingsBtn"]').click();assert.equal((await state()).paused,false);await page.keyboard.press('Escape');assert.equal((await state()).paused,false);await shot('mobile');
});
await check('Mobile action buttons and joystick use the original manual combat controls',async()=>{
 await page.locator('#btnStreamerJoin').click();await page.locator('#viewport9x16 button[onclick="startCombatFromLobby()"]').click();await page.waitForFunction(()=>gameState==='COMBAT');
 assert.equal(await page.locator('#lobbyOverlay9').isVisible(),false);
 assert.equal(await page.locator('#arenaAudienceGuide9').isVisible(),true);
 assert.match(await page.locator('#arenaAudienceGuide9').textContent(),/DALE TAP TAP PARA UNIRTE/i);
 assert.equal(await page.locator('#arenaMobileJump').isEnabled(),true);assert.equal(await page.locator('#touchJoystick').isVisible(),true);await page.locator('#arenaMobileJump').click();await page.locator('#arenaMobileAttack').click();await page.locator('#arenaMobilePower').click();assert.equal((await state()).settingsOpen,false);await shot('mobile-combat');
});
await check('Mobile special action follows the no-powers rule while movement and normal attacks remain usable',async()=>{
 await page.locator('#arenaMobileMoreBtn').click();await page.locator('[data-forward-control="arenaDualSettingsBtn"]').click();
 await page.evaluate(()=>selectArenaSettingsTab('combat',false));
 const rules=page.locator('.arena-settings-section').filter({has:page.locator('#arenaPowerMode')});if(!await rules.evaluate(n=>n.open))await rules.locator('summary').click();
 await page.locator('#arenaPowerMode').selectOption('noSpecials');await page.keyboard.press('Escape');assert.equal(await page.locator('#arenaMobilePower').isDisabled(),true);assert.equal(await page.locator('#arenaMobileAttack').isEnabled(),true);assert.equal(await page.locator('#arenaMobileJump').isEnabled(),true);
});
 await check('Unified release uses native clock, randomness, animation and the TikTok bridge',async()=>{
  const status=await (await page.request.get(`http://127.0.0.1:${port}/api/status`)).json();assert.equal(status.version,release);
  const native=await page.evaluate(()=>({clock:Date.now.toString().includes('[native code]'),random:Math.random.toString().includes('[native code]'),raf:requestAnimationFrame.toString().includes('[native code]'),harness:typeof window.ArenaBalanceHarness}));
  assert.deepEqual(native,{clock:true,random:true,raf:true,harness:'undefined'});
  assert.equal(await page.locator('#arenaVersionInfo').textContent(),`Arena Live v${visibleVersion} · TikTok`);
  assert.equal(await page.title(),`Arena Live v${visibleVersion} · TikTok`);
  assert.equal(await page.evaluate(()=>Object.isFrozen(ArenaLive.getBalanceRules())&&Object.isFrozen(ArenaLive.getBalanceRules().iso.ninja)),true);
 });
 await check('Playable powers apply the measured damage, windup and target caps in all three modes',async()=>{
  const tuning=JSON.parse(await readFile(new URL('../docs/balance-v0.15-profile.json',import.meta.url),'utf8'));
  const probes=await page.evaluate(()=>{
   arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};isGamePaused=true;gameState='COMBAT';soundEnabled=false;
   const rows=[];
   for(const mode of ['1v1','smash','iso'])for(const key of ['kame','ninja','titan','trueno','esmeralda']){
    activeMode=mode;const actor=new Fighter('@preview_actor','tiktok',false,key);actor.x=240;actor.y=250;actor.facing=1;actor.energy=100;
    const targets=Array.from({length:6},(_,i)=>{const f=new Fighter('@preview_'+i,'tiktok',false,key);f.x=270+i*8;f.y=250;return f;});fighters=[actor,...targets];
    const command=CLASS_COMMANDS[key].powers[0];primeArenaSkill(actor,command);const windup=actor.castingSkill.timer;
    actor.castingSkill=null;actor.activeSpecialFactor=1;executeFighterSkill(actor,command);
    const event=document.querySelector('#chatFeed>[data-chat-event="special"]:last-child');
    rows.push({mode,key,windup,damage:targets.map(f=>180-f.hp).filter(d=>d>0),logged:!!event&&event.dataset.command===command&&event.dataset.fighterId===actor.id});
   }return rows;
  });
  for(const p of probes){
   const rule=tuning[p.mode][p.key];assert.equal(p.windup,rule.windup||34);
   const hits=p.key==='ninja'?1:p.key==='esmeralda'?(rule.targets||1):p.key==='trueno'?(rule.targets||3):(rule.targets||6);
   assert.equal(p.damage.length,hits,p.mode+'/'+p.key+' target cap');assert.ok(p.damage.every(d=>d===rule.damage),p.mode+'/'+p.key+' damage');
   assert.equal(p.logged,true,p.mode+'/'+p.key+' actual special has its command and caster');
  }
 });
 await check('All five playable classes use proximity within their narrative priority instead of low health',async()=>{
  const matches=await page.evaluate(()=>['kame','ninja','titan','trueno','esmeralda'].map(key=>{
   const actor=new Fighter('@actor','tiktok',false,key),near=new Fighter('@near','tiktok',false,key==='ninja'?'titan':key),weak=new Fighter('@weak','tiktok',false,key);
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
  gameState='LOBBY';isGamePaused=false;applyPlayerCountPreset(0);setRejoinRuleMode('free');document.getElementById('chatFeed').replaceChildren();
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
  const [actor,target]=fighters;applyFighterArchetype(actor,'kame');applyFighterArchetype(target,'kame');
  fighters.forEach((f,i)=>{f.x=400+i*80;f.y=WORLD_H*.79-f.radius;f.z=0;f.vx=0;f.vy=0;f.knockbackTimer=0;f.attackCooldown=100000;f.aiSpecialCooldown=100000;f.energy=100;});
  actor.aiSpecialCooldown=0;document.getElementById('chatFeed').replaceChildren();
  const count=()=>document.querySelectorAll('#chatFeed>[data-chat-event="special"]').length;
  isGamePaused=false;const queued=tryAutonomousFighterSpecial(actor,target),charging=count();
  isGamePaused=false;
  for(let i=0;i<100&&actor.castingSkill;i++)updatePhysicsAndAI();
  const released=count(),event=document.querySelector('#chatFeed>[data-chat-event="special"]'),damage=target.maxHp-target.hp;
  autoAttackEnabled=false;actor.knockbackTimer=0;actor.castingSkill=null;
  primeArenaSkill(actor,'!kame');applyDamage(actor,1,target,false,'normal');
  for(let i=0;i<50;i++)updatePhysicsAndAI();
  const interrupted=count();
  primeArenaSkill(actor,'!rasen');executeFighterSkill(actor,'!rasen');
  primeArenaSkill(actor,'!kame');setArenaCombatRule('powerMode','noSpecials');executeFighterSkill(actor,'!kame');
  const final=count(),cancelled=actor.castingSkill===null;
  setArenaCombatRule('powerMode','full');isGamePaused=true;
  return {queued,charging,released,damage,command:event?.dataset.command,caster:event?.dataset.fighterId===actor.id,interrupted,final,cancelled};
 });
 assert.deepEqual(result,{queued:true,charging:0,released:1,damage:43,command:'!kame',caster:true,interrupted:1,final:1,cancelled:true});
});
await check('A manual command targeting another fighter records the real caster, canonical alias and a single damage application',async()=>{
 const result=await page.evaluate(()=>{
  gameState='LOBBY';applyPlayerCountPreset(4);startCombatFromLobby();isGamePaused=false;autoAttackEnabled=false;
  const actor=fighters[0];applyFighterArchetype(actor,'titan');applyFighterArchetype(fighters[1],'titan');
  fighters.forEach((f,i)=>{f.x=400+i*25;f.y=300;f.z=0;f.vx=0;f.vy=0;f.knockbackTimer=0;f.attackCooldown=100000;f.aiSpecialCooldown=100000;});
  updateTargetSelectDropdown();document.getElementById('targetFighterSelect').value=actor.id;
  document.getElementById('chatMessageInput').value='!golpecolosal';document.getElementById('chatFeed').replaceChildren();
  actor.energy=100;actor.aiSpecialCooldown=0;handleManualChatSubmit();
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
  document.getElementById('chatFeed').replaceChildren();primeArenaSkill(actor,'!colossus');
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
await check('Settings shows the release only in its footer and retains UI/power names through all eight languages',async()=>{
 await page.setViewportSize({width:1720,height:900});const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
 await page.evaluate(()=>{toggleSettingsModal(true);countdownsEnabled=false;});
 assert.equal(await page.locator('#arenaSettingsVersion').count(),0);assert.equal(await page.locator('#arenaVersionInfo').isVisible(),true);
 assert.equal(await page.locator('#arenaVersionInfo').textContent(),`Arena Live v${visibleVersion} · TikTok`);
 assert.equal(await page.locator('#settingsPauseModal').evaluate((n,version)=>n.textContent.split('v'+version).length-1,visibleVersion),1);
 for(const language of ['es','en','fr','de','zh','ja','pt','it']){
  await page.evaluate(language=>setLanguage(language),language);
  assert.equal(await page.locator('#arenaVersionInfo').textContent(),`Arena Live v${visibleVersion} · TikTok`);
  assert.equal(await page.title(),`Arena Live v${visibleVersion} · TikTok`);
  assert.equal(await page.locator('[data-ui-label]').evaluateAll(ns=>ns.every(n=>n.textContent.trim()&&!/undefined|null/.test(n.textContent))),true);
  assert.equal(await page.locator('[data-command-label]').evaluateAll(ns=>ns.every(n=>n.textContent.trim())),true);
 }
 await page.evaluate(()=>setLanguage('es'));
 assert.deepEqual(await page.locator('[data-command-label]').evaluateAll(ns=>Object.fromEntries(ns.map(n=>[n.dataset.commandLabel,n.textContent]))),{'!kame':'Kame','!rasen':'Rasen','!trueno':'Trueno','!enred':'Enredadera','!coloso':'Coloso'});
});
await check('Display settings reveal real attack names and damage numbers immediately, persist, and preserve OBS/layout preferences',async()=>{
 await page.evaluate(()=>selectArenaSettingsTab('audience',false));
 const section=page.locator('.arena-settings-section').filter({has:page.locator('#showPowerTextToggle')});if(!await section.evaluate(n=>n.open))await section.locator('summary').click();
 const calibration=await page.evaluate(()=>localStorage.getItem(ARENA_OBS_CALIBRATION_KEY));
 const pauseBefore=await page.evaluate(()=>isGamePaused);
 await page.locator('#showPowerTextToggle').check();await page.locator('#showCombatNumbersToggle').check();assert.equal((await state()).paused,pauseBefore);
 const labels=await page.evaluate(()=>{
  arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};gameState='COMBAT';activeMode='smash';isGamePaused=true;soundEnabled=false;
  return ['kame','ninja','titan','trueno','esmeralda'].map(key=>{
   const actor=new Fighter('@display_'+key,'tiktok',false,key),target=new Fighter('@display_target','tiktok',false,'ninja');
   actor.x=300;actor.y=300;actor.facing=1;target.x=330;target.y=300;target.hp=target.maxHp=100000;fighters=[actor,target];floatingTexts=[];
   executeFighterSkill(actor,CLASS_COMMANDS[key].powers[0]);
   return {power:floatingTexts.some(ft=>ft.kind==='power'&&ft.text.includes(arenaPowerName(CLASS_COMMANDS[key].powers[0]))),damage:floatingTexts.some(ft=>ft.kind==='number'&&/\d/.test(ft.text))};
  });
 });assert.ok(labels.every(row=>row.power&&row.damage));
 await page.locator('#showPowerTextToggle').uncheck();await page.locator('#showCombatNumbersToggle').uncheck();
 assert.equal(await page.evaluate(()=>floatingTexts.every(ft=>!/[\p{L}\p{N}]/u.test(ft.text))),true);
 await page.locator('#showPowerTextToggle').check();await page.locator('#showCombatNumbersToggle').check();
 assert.equal(await page.evaluate(()=>floatingTexts.some(ft=>ft.text.includes('Enredadera'))),true);
 await page.reload({waitUntil:'load'});await page.waitForFunction(()=>arenaLiveInitialized);await page.evaluate(()=>countdownsEnabled=false);
 assert.equal(await page.evaluate(()=>showPowerText&&showCombatNumbers),true);assert.equal(await page.evaluate(()=>localStorage.getItem(ARENA_OBS_CALIBRATION_KEY)),calibration);
});
const openBalance=async()=>{
 if(!(await state()).settingsOpen)await page.evaluate(()=>toggleSettingsModal(true));
 await page.evaluate(()=>selectArenaSettingsTab('classes',false));
 const section=page.locator('#arenaBalancePanel');if(!await section.evaluate(n=>n.open))await section.locator('> summary').click();
};
const assertBalanceRadar=async()=>{
 const data=await page.evaluate(()=>{
  const svg=document.getElementById('arenaBalanceRadar'),max=Number(svg.dataset.radarMax);
  const axes=[...svg.querySelectorAll('[data-radar-axis]')].map(n=>({key:n.dataset.radarAxis,cx:Number(n.getAttribute('x1')),cy:Number(n.getAttribute('y1')),x:Number(n.getAttribute('x2')),y:Number(n.getAttribute('y2'))}));
  const series=['basic','special'].map(metric=>{
   const polygon=svg.querySelector(`polygon[data-radar-series="${metric}"]`);
   return {metric,points:[...polygon.points].map(p=>({x:p.x,y:p.y})),values:[...document.querySelectorAll(`[data-balance-value="${metric}"]`)].map(n=>Number(n.textContent)),dash:getComputedStyle(polygon).strokeDasharray};
  });
  return {max,axes,series,polygons:svg.querySelectorAll('[data-radar-series]').length,bars:document.querySelectorAll('.arena-balance-track').length,role:svg.getAttribute('role'),summary:svg.querySelector('desc').textContent};
 });
 assert.equal(data.axes.length,5);assert.equal(data.polygons,2);assert.equal(data.bars,0);assert.equal(data.role,'img');assert.ok(data.summary.includes('HP'));
 for(const series of data.series){assert.equal(series.points.length,5);assert.equal(series.values.length,5);
  for(let i=0;i<5;i++){
   const p=series.points[i],a=data.axes[i],dx=a.x-a.cx,dy=a.y-a.cy,r=Math.hypot(dx,dy);
   assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
   assert.ok(Math.abs(Math.hypot(p.x-a.cx,p.y-a.cy)/r*data.max-series.values[i])<.01,series.metric+'/'+a.key+' radius must encode actual HP');
   assert.ok(Math.abs((p.x-a.cx)*dy-(p.y-a.cy)*dx)<.2,series.metric+'/'+a.key+' must stay on its class axis');
  }
 }
 assert.notEqual(data.series[0].dash,'none');assert.equal(data.series[1].dash,'none');
};
await check('Balance inspection compares actual damage in all modes on a common scale without changing the match',async()=>{
 await openBalance();
 const before=await state(),beforeRects=await rects();
 const expected={'1v1':[43,38,38,37,37],smash:[44,50,38,28,44],iso:[38,60,38,32,32]};
 for(const [mode,values] of Object.entries(expected)){
  await page.locator('#arenaBalanceMode').selectOption(mode);
  assert.deepEqual(await page.locator('[data-balance-value="special"]').evaluateAll(ns=>ns.map(n=>Number(n.textContent))),values);
  assert.deepEqual(await page.locator('[data-balance-value="basic"]').evaluateAll(ns=>ns.map(n=>Number(n.textContent))),[12,12,12,12,12]);
  assert.equal(await page.locator('#arenaBalanceScale').textContent(),'0–70 HP');await assertBalanceRadar();
 }
 await page.locator('[data-balance-class="esmeralda"]').click();
 assert.equal(await page.locator('.arena-balance-row[aria-pressed="true"]').count(),1);assert.match(await page.locator('#arenaBalanceDetail').innerText(),/Enredadera/);
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.balanceClass),'esmeralda');
 const after=await state();assert.equal(after.paused,before.paused);assert.ok(after.simulationTick>=before.simulationTick);assert.deepEqual({...after,simulationTick:before.simulationTick},before);assert.deepEqual(await rects(),beforeRects);assert.match(await page.locator('#arenaBalancePanel').innerText(),/pueden dañarse entre sí/i);
});
await check('Balance radar reflects round damage, blocked specials and class restrictions while the nominal profile stays available',async()=>{
 await page.locator('#arenaBalanceProfile').selectOption('round');
 await page.evaluate(()=>setArenaCombatRule('damage',1.25));
 assert.equal(await page.locator('[data-balance-class="kame"] [data-balance-value="basic"]').textContent(),'15');
 assert.equal(await page.locator('[data-balance-class="kame"] [data-balance-value="special"]').textContent(),'48');
 await page.evaluate(()=>setArenaCombatRule('powerMode','noSpecials'));
 assert.equal(await page.locator('[data-balance-value="special"]').evaluateAll(ns=>ns.every(n=>n.textContent==='0')),true);
 await page.evaluate(()=>setArenaCombatRule('classRule','kame'));
 assert.equal(await page.locator('[data-balance-class="ninja"] [data-balance-value="basic"]').textContent(),'0');
 await page.locator('#arenaBalanceProfile').selectOption('nominal');
 assert.equal(await page.locator('[data-balance-class="ninja"] [data-balance-value="special"]').textContent(),'60');
 await page.evaluate(()=>resetArenaCombatRules());
});
await check('The pentagonal radar keeps five class axes, two HP polygons and valid zero-damage shapes without consuming combat randomness',async()=>{
 for(const mode of ['1v1','smash','iso']){await page.locator('#arenaBalanceMode').selectOption(mode);await assertBalanceRadar();}
 await page.locator('#arenaBalanceProfile').selectOption('round');
 await page.evaluate(()=>{setArenaCombatRule('damage',3);setArenaCombatRule('powerMode','noSpecials');setArenaCombatRule('classRule','titan');});
 await assertBalanceRadar();assert.equal(await page.locator('[data-balance-value="special"]').evaluateAll(ns=>ns.every(n=>n.textContent==='0')),true);
 const stable=await page.evaluate(()=>{
  const random=Math.random,before=JSON.stringify({state:ArenaLive.getState(),fighters:ArenaLive.getFighters()});let reads=0;
  Math.random=()=>{reads++;return random();};try{refreshArenaBalancePanel(true);}finally{Math.random=random;}
  return {reads,unchanged:before===JSON.stringify({state:ArenaLive.getState(),fighters:ArenaLive.getFighters()})};
 });assert.deepEqual(stable,{reads:0,unchanged:true});
 await page.evaluate(()=>resetArenaCombatRules());await page.locator('#arenaBalanceProfile').selectOption('nominal');
});
await check('The balance menu stays readable in Stream, retains the selected menu and leaves both OBS crops stable',async()=>{
 await page.evaluate(()=>toggleSettingsModal(false));await page.setViewportSize({width:3440,height:1440});
 await page.locator('#btnFullscreenDual').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='broadcastStageSection');
 await streamClick('arenaDualSettingsBtn');await openBalance();const before=await rects();
 await page.locator('#arenaBalanceMode').selectOption('smash');await page.locator('[data-balance-class="titan"]').click();
 assert.equal((await state()).settingsOpen,true);assert.deepEqual(await rects(),before);
 assert.equal(await page.locator('#arenaBalancePanel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 assert.equal(await page.locator('#arenaVersionInfo').isVisible(),true);await shot('balance-stream');
 await page.locator('#arenaStreamClose').click();assert.equal((await state()).paused,false);assert.deepEqual(await rects(),before);
});
await check('Every rival and mode in the chart agrees with real basic and special damage for all five classes',async()=>{
 await page.evaluate(()=>{toggleSettingsModal(true);isGamePaused=true;arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};soundEnabled=false;});await openBalance();
 await page.locator('#arenaBalanceProfile').selectOption('nominal');
 const before=await rects();
 for(const mode of ['1v1','smash','iso'])for(const rival of ['kame','ninja','titan','trueno','esmeralda']){
  await page.locator('#arenaBalanceMode').selectOption(mode);await page.locator('#arenaBalanceTarget').selectOption(rival);
  const measured=await page.evaluate(({mode,rival})=>{
   activeMode=mode;gameState='COMBAT';isGamePaused=true;
   return CLASS_KEY_ORDER.map(key=>{
    const actor=new Fighter('@rival_'+key,'tiktok',false,key),target=new Fighter('@opponent','tiktok',false,rival);
    actor.x=300;actor.y=250;actor.facing=1;actor.critChance=0;actor.activeSpecialFactor=1;actor.attackCooldown=0;target.x=330;target.y=250;target.hp=target.maxHp=10000;
    fighters=[actor,target];performMeleeAttack(actor);const base=10000-target.hp;
    target.hp=10000;executeFighterSkill(actor,CLASS_COMMANDS[key].powers[0]);
    return {base,special:10000-target.hp};
   });
  },{mode,rival});
  assert.deepEqual(await page.locator('[data-balance-value="basic"]').evaluateAll(ns=>ns.map(n=>Number(n.textContent))),measured.map(r=>r.base));
  assert.deepEqual(await page.locator('[data-balance-value="special"]').evaluateAll(ns=>ns.map(n=>Number(n.textContent))),measured.map(r=>r.special));
  assert.equal(await page.locator('#arenaBalanceScale').textContent(),'0–70 HP');await assertBalanceRadar();
  assert.equal((await state()).settingsOpen,true);assert.deepEqual(await rects(),before);
 }
 await page.locator('#arenaBalanceTarget').selectOption('titan');await page.locator('[data-balance-class="kame"]').click();
 assert.match(await page.locator('[data-balance-class="kame"] [data-balance-matchup]').innerText(),/\+10 %/);
 assert.match(await page.locator('[data-balance-class="trueno"] [data-balance-matchup]').innerText(),/-10 %/);
 assert.match(await page.locator('#arenaBalanceDetail').innerText(),/Titán \(\+10 %\)/);
 assert.match(await page.locator('#arenaBalanceRivalries').innerText(),/Guerrero.*Titán.*Rayo.*Espíritu.*Shinobi.*Guerrero/);
 for(const lang of ['es','en','fr','de','zh','ja','pt','it']){
  await page.evaluate(lang=>setLanguage(lang),lang);
  assert.equal(await page.locator('#arenaBalanceTarget option').evaluateAll(ns=>ns.every(n=>n.textContent.trim()&&!/undefined|null/.test(n.textContent))),true);
  assert.equal(await page.locator('[data-balance-copy]').evaluateAll(ns=>ns.every(n=>n.textContent.trim())),true);
 }
 await page.evaluate(()=>setLanguage('es'));await shot('rivalries-stream');
});
await check('Shinobi prioritize outsiders but damage fellow Shinobi with melee and Rasen, then finish their final',async()=>{
 const result=await page.evaluate(()=>{
  gameState='COMBAT';activeMode='smash';isGamePaused=true;arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};
  const actor=new Fighter('@shinobi_a','tiktok',false,'ninja'),ally=new Fighter('@shinobi_b','tiktok',false,'ninja'),outsider=new Fighter('@outsider','tiktok',false,'titan');
  actor.x=300;actor.y=250;actor.facing=1;actor.critChance=0;actor.activeSpecialFactor=1;actor.attackCooldown=0;ally.x=320;ally.y=250;outsider.x=322;outsider.y=250;
  fighters=[actor,ally,outsider];const preferred=findPreferredCombatTarget(actor).id===outsider.id;
  executeFighterSkill(actor,'!rasen');const allySpared=ally.hp===180,outsiderHit=outsider.hp===130;
  outsider.eliminated=true;const finalTarget=findPreferredCombatTarget(actor).id===ally.id;
  performMeleeAttack(actor);const basic=180-ally.hp;
  executeFighterSkill(actor,'!rasen');const special=180-basic-ally.hp;
  ally.hp=1;executeFighterSkill(actor,'!rasen');
  return {preferred,allySpared,outsiderHit,finalTarget,basic,special,ended:ally.eliminated&&fighters.filter(f=>!f.eliminated).length===1};
 });assert.deepEqual(result,{preferred:true,allySpared:true,outsiderHit:true,finalTarget:true,basic:12,special:50,ended:true});
});
await check('Shinobi choose a nearby Shinobi over a far outsider, preferring other classes only within the 15 percent distance margin',async()=>{
 const rows=await page.evaluate(()=>{
  arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};isGamePaused=true;koSequenceActive=false;
  return ['1v1','smash','iso'].flatMap(mode=>[450,333].map(outsideX=>{
   gameState='COMBAT';activeMode=mode;
   const actor=new Fighter('@local_shinobi','tiktok',false,'ninja'),ally=new Fighter('@local_ally','tiktok',false,'ninja'),outsider=new Fighter('@local_titan','tiktok',false,'titan');
   actor.x=300;actor.y=250;actor.facing=1;actor.critChance=0;actor.activeSpecialFactor=1;actor.attackCooldown=0;
   ally.x=330;ally.y=250;ally.hp=ally.maxHp=10000;outsider.x=outsideX;outsider.y=250;outsider.hp=outsider.maxHp=10000;
   fighters=[actor,ally,outsider];const chosen=findPreferredCombatTarget(actor);
   performMeleeAttack(actor);const basic=[10000-ally.hp,10000-outsider.hp];
   ally.hp=outsider.hp=10000;executeFighterSkill(actor,'!rasen');
   return {mode,far:outsideX===450,chosen:chosen.id===ally.id?'shinobi':'titan',basic,special:[10000-ally.hp,10000-outsider.hp],native:ARENA_CLASS_BALANCE[mode].ninja.damage};
  }));
 });
 for(const r of rows){assert.equal(r.chosen,r.far?'shinobi':'titan');assert.deepEqual(r.basic,r.far?[12,0]:[0,12]);assert.deepEqual(r.special,r.far?[r.native,0]:[0,r.native]);}
 assert.deepEqual(await page.evaluate(()=>ArenaLive.getCombatTargetRules()),{shinobiSimilarDistancePercent:15,warriorSimilarDistancePercent:25});
 assert.equal(await page.evaluate(()=>Object.isFrozen(ArenaLive.getCombatTargetRules())),true);
 await page.evaluate(()=>{toggleSettingsModal(true);refreshArenaBalancePanel(true);});
 for(const lang of ['es','en','fr','de','zh','ja','pt','it']){
  await page.evaluate(lang=>setLanguage(lang),lang);
  const policy=await page.locator('[data-balance-copy="policy"]').innerText();assert.ok(policy.includes('15'));assert.doesNotMatch(policy,/\{distance\}|undefined/);
 }
 await page.evaluate(()=>setLanguage('es'));
});
await check('Autonomous Shinobi pursuit follows the local-distance rule in Duel, Smash and Arena',async()=>{
 const rows=await page.evaluate(()=>{
  arenaRoundRevision++;koSequenceActive=false;autoChatEnabled=false;autoAttackEnabled=true;
  arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};gamePace=slowMoFactor=1;
  return ['1v1','smash','iso'].flatMap(mode=>[300,345].map(outsideX=>{
   gameState='COMBAT';activeMode=mode;isGamePaused=false;
   const actor=new Fighter('@pursuit','tiktok',false,'ninja'),ally=new Fighter('@pursuit_ally','tiktok',false,'ninja'),outsider=new Fighter('@pursuit_titan','tiktok',false,'titan');
   fighters=[actor,ally,outsider];actor.x=400;ally.x=450;outsider.x=outsideX;
   for(const f of fighters){f.y=mode==='iso'?320:WORLD_H*.79-f.radius;f.z=f.vz=f.vx=f.vy=0;f.onGround=true;f.attackCooldown=f.aiSpecialCooldown=100000;}
   updatePhysicsAndAI();isGamePaused=true;
   return {mode,far:outsideX===300,direction:Math.sign(actor.vx),facing:actor.facing};
  }));
 });
 for(const r of rows){assert.equal(r.direction,r.far?1:-1,r.mode);assert.equal(r.facing,r.far?1:-1,r.mode);}
});
await check('Radar axes and power names stay readable across eight languages, mobile width and the narrow Stream column',async()=>{
 await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();toggleSettingsModal(false);isGamePaused=true;});
 // exitFullscreen can resolve before the fullscreenchange handler has restored
 // the preparation workspace. Wait before opening a modal in its former host.
 await page.waitForFunction(()=>!document.fullscreenElement&&arenaWorkspace.mode==='preparation'&&!arenaDualWasFullscreen);
 await page.setViewportSize({width:1366,height:900});await openBalance();
 await page.waitForFunction(()=>document.getElementById('arenaBalanceRadar')?.dataset.radarNamedAxes==='true');
 const fits=async()=>{
  try{await page.waitForFunction(()=>{const svg=document.getElementById('arenaBalanceRadar'),chart=document.getElementById('arenaBalanceChart');return svg&&Math.abs(svg.viewBox.baseVal.width-svg.getBoundingClientRect().width)<=1&&chart.scrollWidth<=chart.clientWidth+1;});}catch(error){console.error('RADAR_FIT',await page.evaluate(()=>{const svg=document.getElementById('arenaBalanceRadar'),chart=document.getElementById('arenaBalanceChart');return{language:currentLanguage,mode:arenaWorkspace.mode,settings:isSettingsOpen,open:document.getElementById('arenaBalancePanel').open,width:svg.viewBox.baseVal.width,client:svg.getBoundingClientRect().width,chart:chart.clientWidth,scroll:chart.scrollWidth,viewport:innerWidth,overflow:[...chart.querySelectorAll('*')].filter(n=>n.getBoundingClientRect().right>chart.getBoundingClientRect().right+1).map(n=>({tag:n.tagName,text:n.textContent.slice(0,100),width:n.getBoundingClientRect().width}))};}));throw error;}
  const result=await page.evaluate(()=>{
   const svg=document.getElementById('arenaBalanceRadar'),box=svg.viewBox.baseVal,chart=document.getElementById('arenaBalanceChart');
   return {width:box.width,client:svg.getBoundingClientRect().width,overflow:chart.scrollWidth>chart.clientWidth+1,
    labels:[...svg.querySelectorAll('text')].map(n=>{const b=n.getBBox();return {text:n.textContent,left:b.x,right:b.x+b.width,top:b.y,bottom:b.y+b.height};}),height:box.height,
    powers:[...chart.querySelectorAll('.arena-balance-name small')].map(n=>n.textContent)};
  });
  assert.equal(result.overflow,false);assert.ok(Math.abs(result.width-result.client)<=1);
  assert.ok(result.labels.every(n=>n.left>=0&&n.right<=result.width&&n.top>=0&&n.bottom<=result.height),JSON.stringify(result.labels));
  assert.ok(result.powers.every(name=>name.trim()&&!/undefined|null/.test(name)));await assertBalanceRadar();
 };
 for(const lang of ['es','en','fr','de','zh','ja','pt','it']){await page.evaluate(lang=>setLanguage(lang),lang);await fits();}
 await page.evaluate(()=>setLanguage('es'));await shot('radar-desktop');
 if(process.env.ARENA_TEST_SCREENSHOTS)await page.locator('#arenaBalanceRadar').screenshot({path:join(process.env.ARENA_TEST_SCREENSHOTS,'radar-shape-desktop.png')});
 await page.setViewportSize({width:320,height:800});await page.waitForFunction(()=>document.getElementById('arenaBalanceRadar')?.dataset.radarNamedAxes==='false');await fits();await shot('radar-mobile');
 if(process.env.ARENA_TEST_SCREENSHOTS)await page.locator('#arenaBalanceRadar').screenshot({path:join(process.env.ARENA_TEST_SCREENSHOTS,'radar-shape-mobile.png')});
 await page.evaluate(()=>toggleSettingsModal(false));await page.setViewportSize({width:1720,height:900});
 await page.locator('#btnFullscreenDual').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='broadcastStageSection');await streamClick('arenaDualSettingsBtn');await openBalance();
 await page.evaluate(()=>document.getElementById('broadcastStageSection').style.setProperty('--arena-stream-width','180px'));
 await page.waitForFunction(()=>Number(document.getElementById('arenaBalanceRadar').getAttribute('width'))<180);await fits();
 const before=await rects();await page.locator('[data-balance-class="esmeralda"]').click();assert.deepEqual(await rects(),before);assert.equal((await state()).settingsOpen,true);await shot('radar-stream-narrow');
 await page.evaluate(()=>document.getElementById('broadcastStageSection').style.removeProperty('--arena-stream-width'));
});
await check('Prota uses a direct five-class toolbar dropdown instead of a nested class menu',async()=>{
 const menu=page.locator('#btnProtaClassMenu'),select=page.locator('#arenaHeaderActions #protagonistClassSelect');
 assert.equal(await menu.count(),0);
 assert.equal(await select.locator('option').count(),5);
 await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();toggleSettingsModal(false);arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};openLobby(true);});
 await page.waitForFunction(()=>!document.fullscreenElement);
 await select.selectOption('ninja');
 await page.evaluate(()=>joinAsStreamer());
 const chosen=await page.evaluate(()=>fighters.find(f=>f.isStreamer)?.archetypeKey);
 assert.equal(chosen,'ninja');
 await select.selectOption('trueno');
 assert.equal(await page.evaluate(()=>fighters.find(f=>f.isStreamer)?.archetypeKey),'trueno');
 await page.evaluate(()=>{isGamePaused=false;startCombatFromLobby();});
 await select.selectOption('titan');
 assert.equal(await page.evaluate(()=>fighters.find(f=>f.isStreamer)?.archetypeKey),'titan');
 await select.selectOption('kame'); // real 480-frame combat class cooldown
 assert.equal(await select.inputValue(),'titan');
 assert.equal(await page.evaluate(()=>fighters.find(f=>f.isStreamer)?.archetypeKey),'titan');
 await page.evaluate(()=>{isGamePaused=true;});
});
await check('TikTok tap can admit in lobby and in combat without duplicating or bypassing the 128-player cap',async()=>{
 const admission=await page.evaluate(()=>{
  openLobby(true);arenaCombatRules.maxPlayers=128;
  const before=fighters.length;
  const first=ArenaLive.joinOnTap({username:'@live_fan',platformKey:'tiktok'});
  const again=ArenaLive.joinOnTap({username:'@live_fan',platformKey:'tiktok'});
  const found=fighters.filter(f=>f.name.toLowerCase()==='@live_fan'&&f.platformKey==='tiktok').length;
  const rosterAfter=fighters.length;
  const full=new Array(129).fill(null); // no effect on active roster
  applyPlayerCountPreset(128);
  const blocked=ArenaLive.joinOnTap({username:'@overflow_fan',platformKey:'tiktok'});
  gameState='COMBAT';
  const fullCombat=ArenaLive.joinOnTap({username:'@combat_fan',platformKey:'tiktok'});
  arenaCombatRules.maxPlayers=128;
  gameState='LOBBY';applyPlayerCountPreset(2);startCombatFromLobby();
  const late=ArenaLive.joinOnTap({username:'@combat_fan',platformKey:'tiktok'});
  return {first,again,found,rosterAfter,before,blocked,fullCombat,late,fullCount:128,actual:fighters.length};
 });
 assert.equal(admission.first,true);assert.equal(admission.again,false);
 assert.equal(admission.found,1);assert.equal(admission.rosterAfter,admission.before+1);
 assert.equal(admission.blocked,false);assert.equal(admission.fullCombat,false);assert.equal(admission.late,true);
 assert.equal(admission.fullCount,128);assert.equal(admission.actual,3);
});
await check('Lobby opacity changes both welcome cards and both audience guides',async()=>{
 const values=await page.evaluate(()=>{
  openLobby(true);setArenaHudOpacity(50);
  const output=['16x9','9x16'].map(v=>{
   const host=document.getElementById('viewport'+v);
   return [getComputedStyle(host.querySelector('.arena-onboarding-card')).opacity,
     getComputedStyle(host.querySelector('.arena-audience-guide')).opacity];
  });setArenaHudOpacity(85);return output;
 });
 assert.deepEqual(values,[['0.5','0.5'],['0.5','0.5']]);
});
await check('Final winner card tracks the HUD transparency slider in 16:9 and 9:16',async()=>{
 const result=await page.evaluate(()=>{
   gameState='LOBBY';applyPlayerCountPreset(2);startCombatFromLobby();
   const champion=fighters[0];triggerVictoryScreen(champion);
   const readings=[35,70,100].map(opacity=>{
     setArenaHudOpacity(opacity);
     return ['16','9'].map(sfx=>{
       const overlay=document.getElementById('victoryOverlay'+sfx);
       const card=overlay.querySelector('.arena-victory-card');
       const buttons=card.querySelectorAll('.arena-victory-buttons button');
       return {opacity:getComputedStyle(card).opacity,
          visible:!overlay.classList.contains('hidden'),
          buttons:buttons.length,
          clickable:[...buttons].every(btn=>getComputedStyle(btn).pointerEvents!=='none'),
          winner:!!document.getElementById('victoryWinnerName'+sfx).textContent.trim()};
     });
   });
   setArenaHudOpacity(85);
   return {readings,restored:getComputedStyle(document.querySelector('#viewport9x16 .arena-victory-card')).opacity};
 });
 for(let i=0;i<3;i++){
   for(const row of result.readings[i]){
     assert.equal(row.opacity,['0.35','0.7','1'][i]);
     assert.equal(row.visible,true);assert.equal(row.buttons,2);
     assert.equal(row.clickable,true);assert.equal(row.winner,true);
   }
 }
 assert.equal(result.restored,'0.85');
});
await check('A rapid !jugar rejoin in final duel remains available with remaining lives',async()=>{
 const r=await page.evaluate(()=>{
  gameState='LOBBY';setRejoinRuleMode('free');applyPlayerCountPreset(2);startCombatFromLobby();
  isGamePaused=false; // real LIVE input is queued while paused, by design.
  const actor=fighters[0];chatRateLimits.clear();
  const first=processChatCommand(actor.name,actor.platformKey,'!jugar');
  actor.eliminated=true;actor.hp=0;
  const second=processChatCommand(actor.name,actor.platformKey,'!jugar');
  const recovered=!actor.eliminated&&actor.hp===actor.maxHp;
  setRejoinRuleMode('3_lives');MAX_OPPORTUNITIES=1;
  actor.eliminated=true;actor.permanentlyOut=true;
  const refused=addOrBoostFighter(actor.name,actor.platformKey,false,null,true)===null;
  return {first,second,recovered,refused,players:fighters.length};
 });
 assert.deepEqual(r,{first:true,second:true,recovered:true,refused:true,players:2});
});
await check('Normal TikTok messages show one character speech bubble on both canvases',async()=>{
 const r=await page.evaluate(()=>{
  gameState='LOBBY';applyPlayerCountPreset(2);startCombatFromLobby();
  document.querySelectorAll('.fighter-speech-bubble').forEach(n=>n.remove());
  document.getElementById('showSpeechBubbleToggle').checked=true;
  const owner=fighters[0],accepted=processChatCommand(owner.name,owner.platformKey,'hola TikTok',null,true);
  const bubbles=['viewport16x9','viewport9x16'].map(id=>[...document.getElementById(id).querySelectorAll('.fighter-speech-bubble')].filter(n=>n.textContent==='hola TikTok'&&n.dataset.bubbleOwner===String(owner.id)).length);
  document.querySelectorAll('.fighter-speech-bubble').forEach(n=>n.remove());
  document.getElementById('showSpeechBubbleToggle').checked=false;
  processChatCommand(owner.name,owner.platformKey,'sin burbuja',null,true);
  const disabled=document.querySelectorAll('.fighter-speech-bubble').length;
  document.getElementById('showSpeechBubbleToggle').checked=true;
  return {accepted,bubbles,disabled};
 });
 assert.deepEqual(r,{accepted:true,bubbles:[1,1],disabled:0});
});
await check('Sharing heals and gives 10s protection to the sharing viewer only',async()=>{
 const r=await page.evaluate(()=>{
  gameState='LOBBY';applyPlayerCountPreset(2);startCombatFromLobby();
  setArenaCombatRule('powerMode','full');socialBoostMultiplier=1;
  const unaffected=fighters[0];unaffected.hp=44;
  const id=ArenaLive.joinOnShare({username:'@share_viewer',platformKey:'tiktok'});
  const owner=fighters.find(f=>f.id===id);if(owner)owner.hp=50;
  const applied=id!=null?ArenaLive.support({eventType:'share',targetId:id}):false;
  return {applied,heal:owner?owner.hp-50:-1,expected:owner?Math.round(owner.maxHp*.3):0,
    timer:owner?.immunityTimer,unaffected:unaffected.hp};
 });
 assert.equal(r.applied,true);assert.equal(r.heal,r.expected);assert.equal(r.timer,600);assert.equal(r.unaffected,44);
});
await check('At full capacity Prota reclaims a bot but cannot alter a locked victory',async()=>{
 const r=await page.evaluate(()=>{
  gameState='LOBBY';setRejoinRuleMode('free');applyPlayerCountPreset(128);startCombatFromLobby();
  joinAsStreamer();
  const count=fighters.length,prota=fighters.find(f=>f.isStreamer&&!f.eliminated);
  triggerVictoryScreen(prota);
  const refused=addOrBoostFighter('@second_prota','twitch',true,'ninja',true)===null;
  return {count,prota:!!prota,refused,unchanged:fighters.length===count};
 });
 assert.deepEqual(r,{count:128,prota:true,refused:true,unchanged:true});
});
await check('The champion remains in both new lobby formats after clearing the old roster',async()=>{
 const r=await page.evaluate(()=>{
  gameState='LOBBY';applyPlayerCountPreset(2);startCombatFromLobby();
  const winner=fighters[0];applyFighterArchetype(winner,'ninja');
  const name=winner.name,key=winner.archetypeKey;
  triggerVictoryScreen(winner);openLobby(true);
  const banners=['16','9'].map(sfx=>{
   const node=document.getElementById('lobbyChampion'+sfx);
   return !node.classList.contains('hidden')&&node.textContent.includes(name);
  });
  const kept=fighters[0].name===name&&fighters[0].archetypeKey===key;
  openLobby(false);
  return {kept,banners,keptAgain:fighters[0].name===name&&fighters[0].archetypeKey===key};
 });
 assert.deepEqual(r,{kept:true,banners:[true,true],keptAgain:true});
});

await check('Taps keep the three entry rules independent throughout an active match',async()=>{
 const rows=await page.evaluate(()=>{
  const rows={};
  const begin=mode=>{
   gameState='LOBBY';isGamePaused=false;koSequenceActive=false;
   arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};
   setRejoinRuleMode(mode);applyPlayerCountPreset(2);startCombatFromLobby();
  };
  begin('free');
  const entry=ArenaLive.joinOnTap({username:'@free_tap',platformKey:'tiktok'});
  const free=fighters.find(f=>f.name==='@free_tap');
  const sameId=free.id;
  free.eliminated=true;free.hp=0;
  const rejoin=ArenaLive.joinOnTap({username:'@free_tap',platformKey:'tiktok'});
  rows.free={entry,rejoin,alive:!free.eliminated,unique:fighters.filter(f=>f.name==='@free_tap').length===1,
   sameId:free.id===sameId,rule:rejoinRuleMode};
  begin('timed');
  matchTimeSeconds=10;
  const timedEntry=ArenaLive.joinOnTap({username:'@timed_tap',platformKey:'tiktok'});
  const timed=fighters.find(f=>f.name==='@timed_tap');timed.eliminated=true;
  const timedRejoin=ArenaLive.joinOnTap({username:'@timed_tap',platformKey:'tiktok'});
  matchTimeSeconds=0;timed.eliminated=true;
  const expired=ArenaLive.joinOnTap({username:'@timed_tap',platformKey:'tiktok'});
  const expiredNew=ArenaLive.joinOnTap({username:'@timed_new',platformKey:'tiktok'});
  rows.timed={entry:timedEntry,rejoin:timedRejoin,expired,expiredNew,rule:rejoinRuleMode};
  begin('3_lives');
  MAX_OPPORTUNITIES=2;setPlayerLives(2);
  const lifeEntry=ArenaLive.joinOnTap({username:'@lives_tap',platformKey:'tiktok'});
  const life=fighters.find(f=>f.name==='@lives_tap');life.eliminated=true;
  const second=ArenaLive.joinOnTap({username:'@lives_tap',platformKey:'tiktok'});
  life.eliminated=true;
  const third=ArenaLive.joinOnTap({username:'@lives_tap',platformKey:'tiktok'});
  rows.lives={entry:lifeEntry,second,third,joinsUsed:life.joinsUsed,rule:rejoinRuleMode};
  return rows;
 });
 assert.deepEqual(rows,{
  free:{entry:true,rejoin:true,alive:true,unique:true,sameId:true,rule:'free'},
  timed:{entry:true,rejoin:true,expired:false,expiredNew:false,rule:'timed'},
  lives:{entry:true,second:true,third:false,joinsUsed:2,rule:'3_lives'}
 });
});
await check('The LIVE bridge re-enters an eliminated fighter on tap, with boosts separate from admission',async()=>{
 const result=await page.evaluate(()=>new Promise(resolve=>{
   gameState='LOBBY';koSequenceActive=false;isGamePaused=false;
   arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS};setRejoinRuleMode('free');
   applyPlayerCountPreset(2);startCombatFromLobby();
   const name='@bridge_rejoin';const first=ArenaLive.joinOnTap({username:name,platformKey:'tiktok'});
   const fighter=fighters.find(f=>f.name===name);
   fighter.eliminated=true;fighter.hp=0;
   const used=fighter.joinsUsed;
   window.arenaTestSocket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({
    type:'status',phase:'connected',isController:true,platformKey:'tiktok'})}));
   window.arenaTestSocket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({
    type:'social',platformKey:'tiktok',eventType:'taps',username:name,count:2,source:'test'})}));
   setTimeout(()=>resolve({first,alive:!fighter.eliminated,rejoined:fighter.joinsUsed===used+1,
    unique:fighters.filter(f=>f.name===name).length===1,
    counters:document.getElementById('bridge-taps-count').textContent}),1050);
 }));
 assert.equal(result.first,true);assert.equal(result.alive,true);assert.equal(result.rejoined,true);assert.equal(result.unique,true);
 assert.match(result.counters,/entradas\/reingresos:/);
});
await check('Bubbles appear for normal TikTok speech, never for any command or power',async()=>{
 const result=await page.evaluate(()=>{
  gameState='LOBBY';applyPlayerCountPreset(2);startCombatFromLobby();
  document.getElementById('showSpeechBubbleToggle').checked=true;
  document.querySelectorAll('.fighter-speech-bubble').forEach(n=>n.remove());
  const actor=fighters[0];chatRateLimits.clear();
  for(const command of ['!jugar','!guerrero','!kame','!rasen','!titan']) {
    processChatCommand(actor.name,actor.platformKey,command,null,true);
  }
  showFighterSpeechBubble(actor,'!trueno');
  const commands=document.querySelectorAll('.fighter-speech-bubble').length;
  processChatCommand(actor.name,actor.platformKey,'Un saludo desde el directo',null,true);
  const spoken=[...document.querySelectorAll('.fighter-speech-bubble')];
  const normal=spoken.length===2&&spoken.every(n=>n.textContent==='Un saludo desde el directo');
  return {commands,normal};
 });
 assert.deepEqual(result,{commands:0,normal:true});
});
await check('Optional HUD labels show only confirmed TikTok taps, !jugar and Prota',async()=>{
 const r=await page.evaluate(()=>{
   gameState='LOBBY';koSequenceActive=false;isGamePaused=false;
   arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS,maxPlayers:128};setRejoinRuleMode('free');
   applyPlayerCountPreset(4);startCombatFromLobby();
   const bot=fighters[0];
   setCombatDisplayOption('names',true);
   setCombatDisplayOption('tiktokNamesOnly',true);
   const botHidden=!shouldShowFighterLabel(bot);
   const entered=ArenaLive.joinOnTap({username:'@joined_by_tap',platformKey:'tiktok'});
   const tapped=fighters.find(f=>f.name==='@joined_by_tap');
   const tapVisible=entered&&shouldShowFighterLabel(tapped)&&tapped.joinedByTikTok;
   const played=ArenaLive.sendChat({username:'@joined_by_play',platformKey:'tiktok',message:'!jugar'});
   const playedFighter=fighters.find(f=>f.name==='@joined_by_play');
   const playVisible=played&&shouldShowFighterLabel(playedFighter)&&playedFighter.joinedByTikTok;
   joinAsStreamer();
   const prota=fighters.find(f=>f.isStreamer&&!f.eliminated);
   const protaVisible=!!prota&&shouldShowFighterLabel(prota);
   setCombatDisplayOption('names',false);
   const allHidden=![bot,tapped,playedFighter,prota].some(shouldShowFighterLabel);
   setCombatDisplayOption('names',true);
   const saved=JSON.parse(localStorage.getItem(ARENA_COMBAT_DISPLAY_KEY)||'{}');
   const setting=document.getElementById('showTikTokParticipantNamesOnlyToggle');
   const persisted=saved.tiktokNamesOnly===true&&setting?.checked===true;
   setCombatDisplayOption('tiktokNamesOnly',false);
   const oldViewRestored=shouldShowFighterLabel(bot);
   return {botHidden,tapVisible,playVisible,protaVisible,allHidden,persisted,oldViewRestored};
 });
 assert.deepEqual(r,{botHidden:true,tapVisible:true,playVisible:true,protaVisible:true,allHidden:true,persisted:true,oldViewRestored:true});
});
await check('LIVE participant filter hides simulated HP/energy above fighters and on both 1v1 HUDs',async()=>{
 const result=await page.evaluate(()=>{
   gameState='LOBBY';koSequenceActive=false;isGamePaused=false;
   arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS,maxPlayers:128};
   setRejoinRuleMode('free');applyPlayerCountPreset(2);startCombatFromLobby();
   setCombatDisplayOption('names',true);
   setCombatDisplayOption('tiktokNamesOnly',true);
   const [bot1,bot2]=fighters.filter(f=>!f.eliminated);
   renderBothScreensSimultaneously();
   const bothSimulated=![bot1,bot2].some(shouldShowFighterInformation);
   const bothCardsHidden=['16','9'].every(sfx=>document.getElementById('hud1v1Bars'+sfx).classList.contains('hidden'));
   const firstConfirm=ArenaLive.joinOnTap({username:bot1.name,platformKey:bot1.platformKey});
   renderBothScreensSimultaneously();
   const oneConfirmed=!firstConfirm&&shouldShowFighterInformation(bot1)&&!shouldShowFighterInformation(bot2);
   const oneCard=['16','9'].every(sfx=>{
     const card=document.getElementById('hud1v1Bars'+sfx);
     const first=document.getElementById('p1Name1v1_'+sfx).closest('.col-span-5');
     const second=document.getElementById('p2Name1v1_'+sfx).closest('.col-span-5');
     return !card.classList.contains('hidden')&&card.classList.contains('arena-duel-single')&&
       !first.classList.contains('hidden')&&second.classList.contains('hidden')&&
       card.querySelector('.col-span-1').classList.contains('hidden');
   });
   setCombatDisplayOption('names',false);
   const filterStillWorks=shouldShowFighterInformation(bot1)&&!shouldShowFighterInformation(bot2)&&
     document.getElementById('showTikTokParticipantNamesOnlyToggle').disabled===false;
   setCombatDisplayOption('tiktokNamesOnly',false);
   renderBothScreensSimultaneously();
   const bothRestored=['16','9'].every(sfx=>{
     const card=document.getElementById('hud1v1Bars'+sfx);
     return !card.classList.contains('hidden')&&!card.classList.contains('arena-duel-single')&&
       !document.getElementById('p1Name1v1_'+sfx).closest('.col-span-5').classList.contains('hidden')&&
       !document.getElementById('p2Name1v1_'+sfx).closest('.col-span-5').classList.contains('hidden');
   });
   setCombatDisplayOption('names',true);
   return {bothSimulated,bothCardsHidden,oneConfirmed,oneCard,filterStillWorks,bothRestored};
 });
 assert.deepEqual(result,{bothSimulated:true,bothCardsHidden:true,oneConfirmed:true,oneCard:true,filterStillWorks:true,bothRestored:true});
});
await check('Protagonist can join and rejoin mid-fight in free mode at a full simulated 128 roster',async()=>{
 const r=await page.evaluate(()=>{
   gameState='LOBBY';koSequenceActive=false;isGamePaused=false;
   arenaCombatRules={...ARENA_COMBAT_RULE_DEFAULTS,maxPlayers:128};
   setRejoinRuleMode('free');applyPlayerCountPreset(128);startCombatFromLobby();
   const fullBefore=fighters.length===128&&gameState==='COMBAT';
   joinAsStreamer();
   const prota=fighters.find(f=>f.isStreamer&&!f.eliminated);
   const joined=!!prota&&fighters.length===128;
   const id=prota?.id;
   if(prota){prota.eliminated=true;prota.hp=0;}
   joinAsStreamer();
   const rejoined=!!prota&&!prota.eliminated&&fighters.filter(f=>f.isStreamer).length===1&&prota.id===id;
   const finalCount=fighters.length;
   return {fullBefore,joined,rejoined,finalCount};
 });
 assert.deepEqual(r,{fullBefore:true,joined:true,rejoined:true,finalCount:128});
});
await check('Settings categories keep match, combat, HUD, audience, controls and audio in their proper tabs',async()=>{
 const r=await page.evaluate(()=>{
  const lives=document.getElementById('playerLivesSelect');
  const capacity=document.getElementById('arenaMaxPlayers');
  const classRule=document.getElementById('arenaClassRule');
  const damageRule=document.getElementById('arenaRuleDamage');
  const obs=document.getElementById('arenaObsVerticalFormat');
  const numbers=document.getElementById('showCombatNumbersToggle');
  const powerText=document.getElementById('showPowerTextToggle');
  const names=document.getElementById('showFighterNamesToggle');
  const audience=document.getElementById('autoAudienceRateSettings');
  const language=document.getElementById('languageSelect');
  const prota=document.getElementById('btnStreamerControl');
  const workspace=document.getElementById('arenaWorkspaceReset');
  const labels=[...document.querySelectorAll('#arenaSettingsTabs button')].map(n=>n.dataset.settingsTab);
  const visibleIn=(tab,node)=>{
   selectArenaSettingsTab(tab,false);
   return !node.closest('.arena-settings-section').hidden;
  };
  const namesDefault=names.checked;
  const mapping={
   match:visibleIn('match',lives)&&visibleIn('match',capacity)&&visibleIn('match',classRule),
   combat:visibleIn('combat',damageRule),
   display:visibleIn('broadcast',obs)&&visibleIn('broadcast',numbers)&&visibleIn('broadcast',powerText)&&visibleIn('broadcast',names),
   audience:visibleIn('audience',audience)&&!visibleIn('audience',numbers),
   audio:visibleIn('audio',language),
   controls:visibleIn('controls',prota),
   system:visibleIn('system',workspace)
  };
  const sameNodes=names===document.getElementById('showFighterNamesToggle')&&numbers===document.getElementById('showCombatNumbersToggle');
  const saved=JSON.parse(localStorage.getItem(ARENA_COMBAT_DISPLAY_KEY)||'{}');
  setCombatDisplayOption('names',false);
  const hidden=!showFighterNames&&document.getElementById('showFighterNamesToggle').checked===false;
  setCombatDisplayOption('names',true);
  const persisted=JSON.parse(localStorage.getItem(ARENA_COMBAT_DISPLAY_KEY)||'{}').names===true;
  document.getElementById('arenaSettingsSearch').value='vidas';
  selectArenaSettingsTab('broadcast',false);
  const searchFound=!lives.closest('.arena-settings-section').hidden;
  document.getElementById('arenaSettingsSearch').value='';
  selectArenaSettingsTab('match');
  return {labels,mapping,namesDefault,hidden,persisted,searchFound,sameNodes,
   stored:localStorage.getItem('arenaLiveSettingsNavV1')};
 });
 assert.deepEqual(r,{
  labels:['match','combat','classes','audience','broadcast','audio','controls','system'],
  mapping:{match:true,combat:true,display:true,audience:true,audio:true,controls:true,system:true},
  namesDefault:true,hidden:true,persisted:true,searchFound:true,sameNodes:true,stored:'match'
 });
});
await check('Real TikTok follower gift subscriber support routes to the real sender rather than the selected actor',async()=>{
 const r=await page.evaluate(()=>{
  gameState='LOBBY';isGamePaused=false;koSequenceActive=false;
  applyPlayerCountPreset(2);startCombatFromLobby();
  setArenaCombatRule('powerMode','full');socialBoostMultiplier=1;
  const outsider=fighters[0];
  const ownerId=ArenaLive.joinOnShare({username:'@event_owner',platformKey:'tiktok'});
  const owner=fighters.find(f=>f.id===ownerId);
  // Joining may change the combat mode and reinitialize existing actors.
  // Snapshot both actors only after the admission has completed.
  outsider.energy=0;outsider.shieldHP=0;outsider.berserkTimer=0;
  owner.energy=0;owner.shieldHP=0;owner.berserkTimer=0;
  document.getElementById('targetFighterSelect').value=String(outsider.id);
  const socket=window.arenaTestSocket;
  socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({
    type:'status',phase:'connected',isController:true,platformKey:'tiktok'})}));
  for(const kind of ['follow','subscribe','gift'])socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({
    type:'social',platformKey:'tiktok',eventType:kind,username:'@event_owner',eventId:kind+'-qa'})}));
  const count=document.getElementById('bridge-support-count').textContent;
  return {owner:!!owner,energy:owner.energy,shield:owner.shieldHP,berserk:owner.berserkTimer,
    untouched:outsider.energy===0&&outsider.shieldHP===0&&outsider.berserkTimer===0,count};
 });
 assert.equal(r.owner,true);assert.ok(r.energy>0);assert.ok(r.shield>0);assert.ok(r.berserk>0);
 assert.equal(r.untouched,true);assert.match(r.count,/Seguir: 1/);assert.match(r.count,/Regalos: 1/);
 assert.match(r.count,/Suscripciones: 1/);assert.match(r.count,/boosts: 3/);
});
assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks.length,errors:errors.length,version:release}));
} finally {await browser?.close();server.kill('SIGKILL');}
