import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import '../engine/arena-core.js';

const source=await readFile(new URL('../engine/arena-game.js',import.meta.url),'utf8');
function sourceFunction(name){
    const match=source.match(new RegExp('        function '+name+'\\([\\s\\S]*?\\n        }\\n'));
    assert.ok(match,'Missing canonical function: '+name);
    return match[0];
}
test('free round joins remain open outside duel; timed expiration and 1v1 lock',()=>{
    const ctx=vm.createContext({gameState:'COMBAT',activeMode:'smash',rejoinRuleMode:'free',matchTimeSeconds:0,koSequenceActive:false});
    vm.runInContext(sourceFunction('arenaEntryLocked'),ctx);
    assert.equal(ctx.arenaEntryLocked(false),false);
    ctx.activeMode='1v1';assert.equal(ctx.arenaEntryLocked(false),true);
    assert.equal(ctx.arenaEntryLocked(true),true);
    ctx.activeMode='iso';ctx.rejoinRuleMode='3_lives';assert.equal(ctx.arenaEntryLocked(false),false);
    ctx.rejoinRuleMode='timed';assert.equal(ctx.arenaEntryLocked(false),true);
    ctx.matchTimeSeconds=10;assert.equal(ctx.arenaEntryLocked(false),false);
    ctx.gameState='VICTORY';assert.equal(ctx.arenaEntryLocked(false),true);
});
test('AI melee chooses up and down and falls back to forward',()=>{
    const ctx=vm.createContext({});
    vm.runInContext(sourceFunction('arenaChooseMeleeAim'),ctx);
    const f={x:0,y:100,radius:17.5};
    assert.equal(ctx.arenaChooseMeleeAim(f,{x:10,y:35},55),'up');
    assert.equal(ctx.arenaChooseMeleeAim(f,{x:10,y:165},55),'down');
    assert.equal(ctx.arenaChooseMeleeAim(f,{x:120,y:35},55),'forward');
});
test('downward floor bounce hits one grounded opponent per side',()=>{
    const fighter={id:'a',x:480,y:408,radius:17.5,z:0,fallDrop:0,onGround:true};
    const targets=[
        {id:'L',x:430,y:408,radius:17.5,onGround:true},
        {id:'LL',x:390,y:408,radius:17.5,onGround:true},
        {id:'R',x:515,y:408,radius:17.5,onGround:true},
        {id:'RR',x:560,y:408,radius:17.5,onGround:true},
        {id:'air',x:490,y:250,radius:17.5,onGround:false}
    ];
    const ctx=vm.createContext({WORLD_H:540,STAGE_LEFT:100,STAGE_RIGHT:860,activeMode:'smash',
        fighters:[fighter,...targets],canFighterAttack:(a,b)=>a!==b&&!b.eliminated});
    vm.runInContext(sourceFunction('arenaGroundBounceTargets'),ctx);
    assert.deepEqual(Array.from(ctx.arenaGroundBounceTargets(fighter,null,50),x=>x.id),['L','R']);
    fighter.y=240;assert.equal(ctx.arenaGroundBounceTargets(fighter,null,50).length,0);
});
test('simultaneous mutual basics clash with no mutual damage and both recoil',()=>{
    const a={id:'a',x:400,y:400,vx:0,vy:0,onGround:true},b={id:'b',x:440,y:400,vx:0,vy:0,onGround:true};
    const c={id:'c',x:550,y:400,vx:0,vy:0,onGround:true},damage=[];
    const ctx=vm.createContext({pendingMeleeAttacks:[
      {attacker:a,hits:[{target:b,aim:'forward'}],damage:12,isCrit:false},
      {attacker:b,hits:[{target:a,aim:'forward'}],damage:12,isCrit:false},
      {attacker:c,hits:[{target:a,aim:'forward'}],damage:12,isCrit:false}
    ],gameState:'COMBAT',koSequenceActive:false,arenaCombatRules:{knockback:1},
      ARENA_GROUND_JUMP_IMPULSE:9.4,activeMode:'smash',canFighterAttack:(a,b)=>a!==b,
      applyDamage:(target,amount,attacker)=>damage.push([attacker.id,target.id,amount]),
      spawnFloatingText:()=>{},playSound:()=>{}});
    vm.runInContext(sourceFunction('resolveMeleeAttacks'),ctx);
    assert.deepEqual(damage,[['c','a',12]]);
    assert.ok(a.vx<0&&b.vx>0);
    assert.equal(ctx.pendingMeleeAttacks.length,0);
});
test('life reset cooldown and canonical tick integration stay synchronized',()=>{
    const f={maxHp:180,maxJumps:2};
    globalThis.ArenaCore.resetLife(f);assert.equal(f.attackCooldown,6);
    assert.match(source,/attacker\.attackCooldown=attacker\.berserkTimer>0\?4:6/);
    assert.match(source,/resolveMeleeAttacks\(\);\s*\/\/ Update Smart/);
});
