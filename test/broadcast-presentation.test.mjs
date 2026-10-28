import {readEngineSource} from './read-engine-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html=await readEngineSource();
test('the 16:9 duel is wide and HP amounts and energy tracks have large type',()=>{
  assert.match(html, /#viewport16x9 #hud1v1Bars16\{width:86%!important;max-width:1480px!important/);
  assert.match(html, /#viewport16x9 #hud1v1Bars16 div:has\(> #p1Bar1v1_16\)/);
  for(const id of ['p1Bar1v1_16','p2Bar1v1_16','p1HpText1v1_16','p2HpText1v1_16','p1Energy1v1_16','p2Energy1v1_16'])
    assert.match(html,new RegExp('id="'+id+'"'));
});

test('duel HUD displays current HP amounts on both screens, preserving relative fills and energy percentages',()=>{
  for (const suffix of ['16','9']) for(const side of ['p1','p2'])
    assert.match(html,new RegExp('id="'+side+'HpText1v1_'+suffix+'"[^>]*>180 HP<'));
  const match=html.match(/function formatArenaFighterHp\(fighter\) \{[\s\S]*?\n        \}/);
  assert.ok(match,'pure HP formatter exists');
  const format=vm.runInNewContext('('+match[0]+')');
  assert.equal(format({hp:180,maxHp:180}),'180 HP');
  assert.equal(format({hp:74.01,maxHp:180}),'75 HP');
  assert.equal(format({hp:0,maxHp:180}),'0 HP');
  assert.equal(format({hp:-3,maxHp:180}),'0 HP');
  assert.ok(html.includes('writeArenaHudText(p1HpText, formatArenaFighterHp(p1));'));
  assert.ok(html.includes('writeArenaHudText(p2HpText, formatArenaFighterHp(p2));'));
  assert.ok(html.includes('writeArenaHudWidth(document.getElementById('));
  assert.ok(html.includes('), p1Pct);'));
  assert.ok(html.includes('), p2Pct);'));
  assert.ok(html.includes('writeArenaHudText(p1EnergyText, '));
});

test('GO has exactly one centered unboxed element in each capture',()=>{
  for(const suffix of ['16','9']){
    const element=html.match(new RegExp('<div id="arenaStartSplash'+suffix+'"[^>]*><span>GO!</span></div>','g'))||[];
    assert.equal(element.length,1);
  }
  assert.match(html,/\.arena-go-overlay\{[^}]*position:absolute;inset:0;z-index:39;display:flex;align-items:center;justify-content:center/);
  assert.match(html,/if \(priority === 'start'\)/);
  assert.match(html,/splash\.classList\.remove\('hidden'\)/);
  assert.match(html,/banner\?\.classList\.add\('hidden'\)/);
});

test('KO has GO-sized text centered without a box in both captures',()=>{
  for(const suffix of ['16','9']){
    const element=html.match(new RegExp('<div id="koSlowMoOverlay'+suffix+'" class="arena-ko-overlay hidden"[^>]*><span id="koSlowMoTitle'+suffix+'">KO!</span></div>','g'))||[];
    assert.equal(element.length,1);
    assert.doesNotMatch(element[0],/bg-black|rounded-2xl|border-2/);
  }
  assert.match(html,/\.arena-ko-overlay\{[^}]*position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center/);
  assert.match(html,/koTitle.textContent = reason === 'timed' \? 'FIN!' : 'KO!'/);
  assert.doesNotMatch(html,/id="koSlowMoSub(?:16|9)"/);
  assert.doesNotMatch(html,/Double Jump Wing Pips Indicator/);
});

test('victory has newly designed, legible cards in both capture formats',()=>{
  for(const suffix of ['16','9']){
    const markup=html.match(new RegExp('<section id="victoryOverlay'+suffix+'"[^>]*>[\\s\\S]*?<\\/section>'))?.[0];
    assert.ok(markup,'winner markup '+suffix);
    for(const field of ['victoryWinnerName','victoryWinnerPlatform','victoryStatKills',
      'victoryStatDamage','victoryStatLikes','victoryCountdownText','victoryRunnersUp'])
      assert.ok(markup.includes('id="'+field+suffix+'"'),field+suffix);
    assert.ok(markup.includes('¡CAMPEÓN DE LA ARENA!'));
    assert.ok(markup.includes('rematchSamePlayers()'));
    assert.ok(markup.includes('openLobby(true)'));
  }
  assert.match(html,/#viewport9x16 \.arena-victory-name\{font-size:clamp\(26px,7\.3cqw,44px\)/);
  assert.match(html,/for\(const sfx of \['16','9'\]\) document\.getElementById\('victoryCountdownText'\+sfx\)/);
});

test('lobby opacity and champion persistence are integrated on both broadcasts',()=>{
  assert.match(html,/#viewport16x9 \.arena-onboarding-card, #viewport9x16 \.arena-onboarding-card/);
  assert.match(html,/#viewport16x9 \.arena-audience-guide, #viewport9x16 \.arena-audience-guide \{ opacity: var\(--arena-hud-opacity\)/);
  for(const id of ['lobbyChampion16','lobbyChampion9'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/const champion = currentWinner \|\| arenaRoundResult\?\.winner \|\| arenaLobbyChampion/);
  assert.match(html,/if \(arenaLobbyChampion\) \{[\s\S]*?const retained = new Fighter/);
});
test('LIVE chat speech and late duel re-entry are not hidden behind simulator-only routing',()=>{
  assert.match(html,/const accepted = executeArenaChatAction\(username,platformKey,clean,explicitFighter\)/);
  assert.match(html,/if\(owner\)showFighterSpeechBubble\(owner,clean\)/);
  assert.doesNotMatch(html,/Duelo final: la inscripción y el reingreso están cerrados/);
  assert.match(html,/joinOnShare\(\{username='',platformKey='tiktok'\}=\{\}\)/);
});

test('audience call-to-action is tap-based, command bubbles remain excluded',()=>{
 assert.equal((html.match(/¡DALE <strong>TAP TAP<\/strong> <span>PARA UNIRTE!<\/span>/g)||[]).length,2);
 assert.match(html,/Dale <strong>tap tap<\/strong> en el LIVE de TikTok/);
 assert.match(html,/canonicalizeChatCommandText\(text\)\.startsWith\('!'\)/);
 assert.match(html,/joinOnTap\(\{ username = '', platformKey = 'tiktok' \}/);
 assert.match(html,/rejoinRuleMode === 'timed' && matchTimeSeconds <= 0/);
});

test('result card respects the shared HUD opacity variable in both full-HD viewports',()=>{
 assert.match(html,/#viewport16x9 \.arena-victory-card, #viewport9x16 \.arena-victory-card,/);
 assert.match(html,/#viewport16x9 \.arena-audience-guide, #viewport9x16 \.arena-audience-guide \{ opacity: var\(--arena-hud-opacity\); \}/);
 assert.match(html,/function setArenaHudOpacity\(input\) \{/);
 assert.match(html,/setArenaRuntimeOption\('hudOpacity',amount\)/);
 for(const suffix of ['16','9']){
   assert.match(html,new RegExp('id="victoryOverlay'+suffix+'"'));
   assert.match(html,new RegExp('id="victoryWinnerName'+suffix+'"'));
 }
});

test('v0.27 keeps all settings by ID while navigating seven coherent categories',()=>{
 for(const name of ['match','combat','classes','audience','broadcast','audio','controls','system'])
   assert.match(html,new RegExp('data-settings-tab="'+name+'"'));
 for(const id of ['arenaSettingsSearch','arenaSettingsNav','arenaCombatRulesCard','arenaBalancePanel','arenaObsCalibrationPanel','playerLivesSelect','matchDurationSelect','arenaWorkspaceReset'])
   assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/function installArenaSettingsNavigator\(\)/);
 assert.match(html,/installArenaSettingsNavigator\(\);\s*for\(const args/);
 assert.match(html,/localStorage\.getItem\('arenaLiveRejoinModeV1'\)/);
 assert.match(html,/localStorage\.setItem\('arenaLiveRejoinModeV1',rejoinRuleMode\)/);
 for(const id of ['arenaPanelPowers','arenaPanelPlayers','arenaPanelSocial','arenaPanelScenarios','arenaPanelSimulation','arenaPanelBridge'])
   assert.match(html,new RegExp('data-workspace-reveal="'+id+'"'));
});

test('real TikTok LIVE follow gift and subscription events have isolated viewer-targeted boosts',()=>{
 const bridge=html; // client itself is validated in bridge tests
 assert.match(bridge,/joinOnShare\(\{username='',platformKey='tiktok'\}=\{\}\)/);
 assert.match(bridge,/ARENA_SOCIAL_EVENT_TYPES = Object\.freeze\(\['taps', 'likes', 'share', 'follow', 'subscribe'/);
});

test('six HUD options filter labels, HP and energy independently without touching 1v1',()=>{
 const source=html.slice(html.indexOf('        let showFighterNames = true;'),html.indexOf('        const ARENA_COMBAT_DISPLAY_KEY'));
 assert.ok(source.includes('function shouldShowFighterHpBar'));
 assert.ok(source.includes('function shouldShowFighterEnergyBar'));
 const state=vm.createContext({});
 vm.runInContext(source.replace('let showFighterNames = true','var showFighterNames = true'),state);
 const bot={isStreamer:false,joinedByTikTok:false};
 const viewer={isStreamer:false,joinedByTikTok:true};
 const prota={isStreamer:true,joinedByTikTok:false};
 assert.equal(vm.runInContext('shouldShowFighterLabel',state)(bot),true);
 vm.runInContext('showSimulatedFighterNames=false;showSimulatedFighterHpBars=false;showSimulatedFighterEnergyBars=false',state);
 for(const method of ['shouldShowFighterLabel','shouldShowFighterHpBar','shouldShowFighterEnergyBar']){
  assert.equal(vm.runInContext(method,state)(bot),false);
  assert.equal(vm.runInContext(method,state)(viewer),true);
  assert.equal(vm.runInContext(method,state)(prota),true);
 }
 vm.runInContext('showSimulatedFighterHpBars=true',state);
 assert.equal(vm.runInContext('shouldShowFighterHpBar',state)(bot),true);
 assert.equal(vm.runInContext('shouldShowFighterEnergyBar',state)(bot),false);
 assert.match(html,/if \(gameState !== 'LOBBY' && \(shouldShowFighterHpBar\(f\) \|\| shouldShowFighterEnergyBar\(f\)\)\)/);
 assert.match(html,/if \(shouldShowFighterHpBar\(f\)\)/);
 assert.match(html,/if \(shouldShowFighterEnergyBar\(f\)\)/);
 assert.doesNotMatch(html,/syncArenaDuelFighterInformation/);
 for(const suffix of ['16','9']){
  assert.match(html,new RegExp('id="hud1v1Bars'+suffix+'"'));
  assert.match(html,new RegExp('id="p1Bar1v1_'+suffix+'"'));
  assert.match(html,new RegExp('id="p2Bar1v1_'+suffix+'"'));
 }
 assert.match(html,/writeArenaHudText\(p1HpText, formatArenaFighterHp\(p1\)\)/);
 assert.match(html,/writeArenaHudText\(p2HpText, formatArenaFighterHp\(p2\)\)/);
 for(const option of ['simulatedNames','simulatedHpBars','simulatedEnergyBars']){
  assert.ok(html.includes(option));
 }
});
