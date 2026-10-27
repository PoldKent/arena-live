import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import '../engine/arena-core.js';
import {readEngineSource} from './read-engine-source.mjs';
const html=await readEngineSource(),core=globalThis.ArenaCore;
const functions=['canFighterAttack','findPreferredCombatTarget'].map(name=>html.match(new RegExp(`        function ${name}\\([\\s\\S]*?\\n        }\\n`))[0]).join('\n');
const beats={kame:'titan',titan:'trueno',trueno:'esmeralda',esmeralda:'ninja',ninja:'kame'};
const cases={
 kame:{key:'warriorTargeting',modes:{local:['same',1.25],always:['same',Infinity],nearest:['nearest',1],prey:['prey',1.25]}},
 ninja:{key:'shinobiTargeting',modes:{local:['other',1.15],always:['other',Infinity],nearest:['nearest',1],prey:['prey',1.25]}},
 titan:{key:'titanTargeting',modes:{nearest:['nearest',1],prey:['prey',1.25],same:['same',1.25],other:['other',1.25]}},
 trueno:{key:'lightningTargeting',modes:{nearest:['nearest',1],prey:['prey',1.25],same:['same',1.25],other:['other',1.25]}},
 esmeralda:{key:'spiritTargeting',modes:{nearest:['nearest',1],prey:['prey',1.25],same:['same',1.25],other:['other',1.25]}}
};
test('each class preference matches a sorted-distance oracle through 128 fighters without changing roster order',()=>{
 const context=vm.createContext({ArenaCore:core,ARENA_CLASS_RIVALRIES:{beats},arenaRuntime:core.normalizeRuntime(),fighters:[]});vm.runInContext(functions,context);
 let seed=31017;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),classes=Object.keys(cases);
 for(const count of [2,9,32,128])for(let scene=0;scene<6;scene++){
  const roster=Array.from({length:count},(_,id)=>({id,x:Math.floor(random()*500),y:Math.floor(random()*300),archetypeKey:classes[id%5],eliminated:random()<.06,fallDrop:random()<.05?20:0}));context.fighters=roster;
  for(const actor of roster)for(const [mode,[kind,margin]]of Object.entries(cases[actor.archetypeKey].modes)){
   context.arenaRuntime={...core.normalizeRuntime(),[cases[actor.archetypeKey].key]:mode};
   for(const predicate of [null,other=>Math.abs(other.y-actor.y)<65]){
    const eligible=roster.filter(f=>f!==actor&&!f.eliminated&&!actor.eliminated&&!(f.fallDrop>0)&&!(actor.fallDrop>0)&&(!predicate||predicate(f)));
    const distance=f=>Math.hypot(f.x-actor.x,f.y-actor.y);eligible.sort((a,b)=>distance(a)-distance(b));
    const preferred=kind==='nearest'?null:eligible.find(f=>kind==='same'?f.archetypeKey===actor.archetypeKey:kind==='other'?f.archetypeKey!==actor.archetypeKey:f.archetypeKey===beats[actor.archetypeKey]);
    const expected=preferred&&(margin===Infinity||distance(preferred)<=distance(eligible[0])*margin)?preferred:eligible[0]||null;
    assert.equal(context.findPreferredCombatTarget(actor,predicate),expected,`${count}/${actor.archetypeKey}/${mode}`);
   }
  }
  assert.deepEqual(roster.map(f=>f.id),Array.from({length:count},(_,id)=>id));
 }
});
test('old Warrior settings migrate and all other classes keep their previous defaults',()=>{
 const runtime=core.normalizeRuntime({warriorTargeting:'always'});assert.equal(runtime.warriorTargeting,'always');assert.equal(runtime.shinobiTargeting,'local');
 for(const key of ['titanTargeting','lightningTargeting','spiritTargeting'])assert.equal(runtime[key],'nearest');
 assert.equal(core.combatTargetPolicy('kame',runtime).absolute,true);assert.equal(core.combatTargetPolicy('ninja',runtime).distanceFactor,13225);
});
test('class options reject foreign policies and preserve a disabled training adaptation preference',()=>{
 const result=core.normalizeRuntime({titanTargeting:'always',shinobiTargeting:'same',spiritTargeting:'prey',testAdaptClass:false,foreign:'ignored'});
 assert.equal(result.titanTargeting,'nearest');assert.equal(result.shinobiTargeting,'local');assert.equal(result.spiritTargeting,'prey');assert.equal(result.testAdaptClass,false);assert.equal(Object.hasOwn(result,'foreign'),false);
 for(const key of ['unknown','__proto__','constructor',null])assert.equal(core.combatTargetPolicy(key,{}).kind,'nearest');
});
