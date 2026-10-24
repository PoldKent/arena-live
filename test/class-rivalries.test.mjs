import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const source=name=>{const m=html.match(new RegExp(`        function ${name}\\([\\s\\S]*?\\n        }\\n`));assert.ok(m,name);return m[0];};
const constant=name=>{const m=html.match(new RegExp(`        const ${name} = Object\\.freeze\\([\\s\\S]*?\\n        \\}\\);`));assert.ok(m,name);return m[0];};
const keys=['kame','ninja','titan','trueno','esmeralda'];
const matrix=[[1,.9,1.1,1,1],[1.1,1,1,1,.9],[.9,1,1,1.1,1],[1,1,.9,1,1.1],[1,1.1,1,.9,1]];
function engine(){
 const e=vm.createContext({gameState:'COMBAT',activeMode:'iso',arenaCombatRules:{damage:1,knockback:0,powerMode:'full'},
  ARENA_GROUND_JUMP_IMPULSE:9.4,ARENA_SPECIAL_LAUNCH_MULTIPLIER:2,screenShake:0,
  spawnFloatingText(){},spawnParticle(){},playSound(){},handleFighterKO(f){f.hp=0;f.eliminated=true;}});
 vm.runInContext([constant('ARENA_CLASS_RIVALRIES'),...['getArenaClassDamageMultiplier','canFighterAttack','getFighterAttackDamageMultiplier','applyDamage'].map(source)].join('\n'),e);
 return e;
}
const fighter=(id,key)=>({id,archetypeKey:key,x:id*20,y:200,hp:1000,maxHp:1000,damageTaken:0,damageDealt:0,shieldHP:0,shieldTimer:0,immunityTimer:0});
test('chain A has exactly one prey and one counter per class, including reciprocal damage and neutral mirrors',()=>{
 const e=engine();
 for(let a=0;a<5;a++){
  const row=keys.map(b=>e.getArenaClassDamageMultiplier(keys[a],b));assert.deepEqual(row,matrix[a]);
  assert.equal(row.filter(x=>x===1.1).length,1);assert.equal(row.filter(x=>x===.9).length,1);assert.equal(row.filter(x=>x===1).length,3);
 }
 assert.equal(e.getArenaClassDamageMultiplier(undefined,'titan'),1);assert.equal(e.getArenaClassDamageMultiplier('kame',null),1);
 assert.equal(e.getArenaClassDamageMultiplier('unknown','ninja'),1);
 assert.equal(vm.runInContext('Object.isFrozen(ARENA_CLASS_RIVALRIES) && Object.isFrozen(ARENA_CLASS_RIVALRIES.beats)',e),true);
});
test('ordinary, critical and special damage apply rivalry once before the final HP rounding',()=>{
 const e=engine();
 for(let a=0;a<5;a++)for(let b=0;b<5;b++)for(const mode of ['1v1','smash','iso'])for(const [type,raw,crit] of [['normal',12,false],['normal',20,true],['special',60,true]]){
  e.activeMode=mode;const actor=fighter(0,keys[a]),target=fighter(1,keys[b]);
  e.applyDamage(target,raw,actor,crit,9.4,type);
  assert.equal(1000-target.hp,Math.round(raw*matrix[a][b]),`${mode}/${keys[a]}/${keys[b]}/${type}/${crit}`);
  assert.equal(actor.damageDealt,1000-target.hp);assert.equal(target.lastAttacker,actor);
 }
 const actor=fighter(0,'ninja'),target=fighter(1,'ninja');e.applyDamage(target,12,actor);assert.equal(target.hp,988,'Shinobi mirrors receive damage');
});
test('rivalry composes with charge, audience boosts and round rules, then defense still absorbs it',()=>{
 const e=engine(),actor=fighter(0,'kame'),target=fighter(1,'titan');
 actor.activeSpecialFactor=.5;actor.specialAmplifyTimer=10;actor.likeBoostTimer=10;e.arenaCombatRules.damage=1.25;
 // 40 × 1.5 × 1.3 × .5 = 39; then × 1.25 × 1.1 -> 54 HP.
 e.applyDamage(target,40,actor,true,9.4,'special');assert.equal(target.hp,946);
 target.hp=1000;target.shieldHP=100;target.shieldTimer=10;e.applyDamage(target,40,actor,true,9.4,'special');
 assert.equal(target.hp,1000);assert.equal(target.shieldHP,46);
 target.shieldHP=0;target.shieldTimer=0;target.immunityTimer=10;e.applyDamage(target,40,actor,true,9.4,'special');assert.equal(target.hp,981);
 e.arenaCombatRules.powerMode='melee';const hp=target.hp;e.applyDamage(target,40,actor,true,9.4,'special');assert.equal(target.hp,hp);
});
