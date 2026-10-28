import {readEngineSource} from './read-engine-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html=await readEngineSource();
const match=html.match(/        function findPreferredCombatTarget\(attacker, inRange = null\) \{[\s\S]*?\n        \}/);
assert.ok(match,'game target scan must be present');
const beats={kame:'titan',titan:'trueno',trueno:'esmeralda',esmeralda:'ninja',ninja:'kame'};

const valid=(attacker,other)=>!!(attacker&&other&&attacker.id!==other.id
  &&!attacker.eliminated&&!other.eliminated&&!(attacker.fallDrop>0)&&!(other.fallDrop>0));

function reference(fighters,attacker,policy,inRange=null){
  if(!attacker)return null;
  const prey=policy.kind==='prey'?beats[attacker.archetypeKey]:null;
  let closest=null,closestSq=Infinity,preferred=null,preferredSq=Infinity;
  for(const other of fighters){
    if(!valid(attacker,other)||inRange&&!inRange(other))continue;
    const same=other.archetypeKey===attacker.archetypeKey;
    const dx=other.x-attacker.x,dy=other.y-attacker.y,distanceSq=dx*dx+dy*dy;
    if(distanceSq<closestSq){closest=other;closestSq=distanceSq;}
    if(((policy.kind==='same'&&same)||(policy.kind==='other'&&!same)||(policy.kind==='prey'&&other.archetypeKey===prey))
       &&distanceSq<preferredSq){preferred=other;preferredSq=distanceSq;}
  }
  return preferred&&(policy.absolute||preferredSq*10000<=closestSq*policy.distanceFactor)?preferred:closest;
}

test('128-player AI selection retains the exact baseline priority, exclusions and stable ties',()=>{
  const kinds=['same','other','prey','closest'];
  const classes=['kame','ninja','titan','trueno','esmeralda'];
  const fighters=Array.from({length:127},(_,id)=>({
    id,x:(id*83)%960,y:(id*53)%540,archetypeKey:classes[id%5],
    eliminated:id%29===0,fallDrop:id%31===0?4:0
  }));
  fighters.splice(54,0,null); // Defensive parity for incomplete roster entries.
  const ctx=vm.createContext({fighters,canFighterAttack:valid,
    ArenaCore:{combatTargetPolicy:()=>ctx.policy},
    ARENA_CLASS_RIVALRIES:{beats},arenaRuntime:{},policy:null});
  vm.runInContext(match[0],ctx);
  let checked=0;
  for(const kind of kinds){
    ctx.policy={kind,absolute:false,distanceFactor:kind==='same'?15625:13225};
    for(const actor of fighters){
      for(const range of [null,135,280]){
        const inRange=range==null?null:other=>Math.abs(other.x-(actor?.x??0))<=range;
        const expected=reference(fighters,actor,ctx.policy,inRange);
        const actual=ctx.findPreferredCombatTarget(actor,inRange);
        assert.equal(actual,expected,`policy=${kind}, actor=${actor?.id}, range=${range}`);
        checked++;
      }
    }
  }
  assert.equal(checked,128*4*3);
});
