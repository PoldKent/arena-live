import {readEngineSource} from './read-engine-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const html=await readEngineSource();
test('the 16:9 duel is wide and the visible HP names, percentages, and energy tracks have large type',()=>{
  assert.match(html, /#viewport16x9 #hud1v1Bars16\{width:86%!important;max-width:1480px!important/);
  assert.match(html, /#viewport16x9 #hud1v1Bars16 div:has\(> #p1Bar1v1_16\)/);
  for(const id of ['p1Bar1v1_16','p2Bar1v1_16','p1HpText1v1_16','p2HpText1v1_16','p1Energy1v1_16','p2Energy1v1_16'])
    assert.match(html,new RegExp('id="'+id+'"'));
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
