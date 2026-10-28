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
