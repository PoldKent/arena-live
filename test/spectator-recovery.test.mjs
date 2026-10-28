import {readEngineSource} from './read-engine-source.mjs';
import test from 'node:test';
 import assert from 'node:assert/strict';
import vm from 'node:vm';

const html=await readEngineSource();
function source(name) {
 const found=html.match(new RegExp('        function '+name+'\\([\\s\\S]*?\\n        }\\n'));
 assert.ok(found,name);
 return found[0];
}
function engine() {
 const setup=html.match(/        const SPECTATOR_RECOVERY = Object\.freeze\([\s\S]*?\n        \}\);/)?.[0];
 const range=html.match(/        const SPECTATOR_RECOVERY_DISTANCE = [\s\S]*?;\n/)?.[0];
 assert.ok(setup&&range);
 const effects=[],e=vm.createContext({
  WORLD_W:960,STAGE_LEFT:125,STAGE_RIGHT:835,
  playSound(){},addActiveEffect(effect){effects.push(effect);},
  arenaVisualRandom:()=>0.5,spawnParticle(){},spawnFloatingText(){}
 });
 vm.runInContext([setup,range,...['isSpectatorLaunchRecoverable','performFighterJump','trySpectatorEdgeRecovery'].map(source),
  'globalThis.rescueDistance=SPECTATOR_RECOVERY_DISTANCE;'].join('\n'),e);
 return {e,effects};
}
function fighter(x,extra={}) {
 return {x,y:370,radius:17.5,vx:7,vy:1,facing:1,isStreamer:false,
  eliminated:false,castingSkill:null,color:'#00f3ff',onGround:false,
  jumpsLeft:1,maxJumps:2,doubleJumpCooldown:0,recoveryJumpUsed:false,
  extraRecoveryUsed:false,edgeRecoveryPending:true,knockbackTimer:18,...extra};
}
test('AI consumes one aerial jump at a reachable distance on either side and steers inward',()=>{
 for(const side of [-1,1]){
  const {e,effects}=engine();
  assert.ok(e.rescueDistance>45&&e.rescueDistance<90);
  const f=fighter(side===1?835+e.rescueDistance+8:125-e.rescueDistance-8,
    {vx:side*7,facing:side});
  assert.equal(e.trySpectatorEdgeRecovery(f,540*.79),true);
  assert.equal(f.jumpsLeft,0);
  assert.equal(f.recoveryJumpUsed,true);
  assert.ok(f.vx*side<0);
  assert.ok(f.vy<0);
  assert.equal(effects.filter(x=>x.type==='doubleJump').length,1);
  assert.equal(e.trySpectatorEdgeRecovery(f,540*.79),false);
 }
});
test('no premature, late, manual or triple-jump recovery',()=>{
 const {e}=engine(),floor=540*.79;
 assert.equal(e.trySpectatorEdgeRecovery(fighter(835+e.rescueDistance-1),floor),false);
 assert.equal(e.trySpectatorEdgeRecovery(fighter(835+e.rescueDistance+5,{vy:-6,y:290}),floor),false);
 const spent=fighter(835+e.rescueDistance+12,{jumpsLeft:0});
 assert.equal(e.trySpectatorEdgeRecovery(spent,floor),false);
 assert.equal(spent.jumpsLeft,0);
 assert.equal(e.trySpectatorEdgeRecovery(fighter(835+e.rescueDistance+12,{y:floor+150}),floor),false);
 assert.equal(e.trySpectatorEdgeRecovery(fighter(835+e.rescueDistance+12,{isStreamer:true}),floor),false);
});
test('lateral drag is lower in falling launches and decorative dots are not painted',()=>{
 assert.match(html,/f\.knockbackTimer > 0\s*\? \(isOffStage \? 0\.975 : 0\.96\)/);
 assert.match(html,/f\.fallDrop > 0 \? 0\.91 : 0\.84/);
 assert.doesNotMatch(html,/const pipX = drawX/);
 assert.match(html,/this\.maxJumps = 2/);
});
