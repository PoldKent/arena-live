import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const functionSource = name => {
  const match = html.match(new RegExp(`        function ${name}\\([\\s\\S]*?\\n        }\\n`));
  assert.ok(match, `Missing engine function ${name}`);
  return match[0];
};
const context = vm.createContext({ fighters: [] });
vm.runInContext([
  functionSource('canFighterAttack'), functionSource('findPreferredCombatTarget')
].join('\n'), context);

// Independent stable-sort oracle: class preference first, then distance.
function nearestTarget(attacker, roster, inRange = () => true) {
  const candidates = roster.filter(other => other.id !== attacker.id
    && !attacker.eliminated && !other.eliminated && !(attacker.fallDrop > 0) && !(other.fallDrop > 0) && inRange(other));
  const distance = other => Math.hypot(other.x - attacker.x, other.y - attacker.y);
  const priority = other => attacker.archetypeKey === 'kame' ? (other.archetypeKey === 'kame' ? 0 : 1)
    : attacker.archetypeKey === 'ninja' ? (other.archetypeKey === 'ninja' ? 1 : 0) : 0;
  candidates.sort((a, b) => priority(a) - priority(b) || distance(a) - distance(b));
  return candidates[0] || null;
}

test('class priorities and nearest ties match a stable-sort oracle from 2 through 128 fighters', () => {
  let seed = 20261023;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const classes = ['kame', 'ninja', 'titan', 'trueno', 'esmeralda'];
  for (const count of [2, 8, 32, 64, 128]) {
    for (let scene = 0; scene < 12; scene++) {
      const roster = Array.from({ length: count }, (_, id) => ({
        id, x: Math.floor(random() * 900), y: Math.floor(random() * 500),
        hp: 1 + Math.floor(random() * 180), maxHp: 180,
        archetypeKey: classes[id % classes.length], eliminated: random() < 0.12, fallDrop:random()<0.08?10:0
      }));
      context.fighters = roster;
      for (const attacker of roster) {
        for (const predicate of [null, other => Math.abs(other.y - attacker.y) < 75]) {
          assert.equal(context.findPreferredCombatTarget(attacker, predicate),
            nearestTarget(attacker, roster, predicate || undefined), `${count} fighters, actor ${attacker.id}`);
        }
      }
      assert.deepEqual(roster.map(f => f.id), Array.from({ length: count }, (_, id) => id));
    }
  }
});

test('Shinobi preference is not immunity and automatically becomes a final between Shinobi', () => {
  const actor={id:0,x:0,y:0,archetypeKey:'ninja'},ally={id:1,x:10,y:0,archetypeKey:'ninja'},outsider={id:2,x:100,y:0,archetypeKey:'titan'};
  context.fighters=[actor,ally,outsider];
  assert.equal(context.findPreferredCombatTarget(actor),outsider);
  assert.equal(context.canFighterAttack(actor,ally),true);
  assert.equal(context.findPreferredCombatTarget(actor,f=>f.x<20),ally,'out-of-reach preference must not stop an available attack');
  outsider.eliminated=true;assert.equal(context.findPreferredCombatTarget(actor),ally);
  outsider.eliminated=false;outsider.fallDrop=1;assert.equal(context.findPreferredCombatTarget(actor),ally,'sinking outsiders are not valid targets');
  ally.eliminated=true;assert.equal(context.findPreferredCombatTarget(actor),null);
});

test('Warriors prefer Warriors while Titans attack the nearest of any class',()=>{
  const actor={id:0,x:0,y:0,archetypeKey:'kame'},warrior={id:1,x:90,y:0,archetypeKey:'kame'},titan={id:2,x:10,y:0,archetypeKey:'titan'};
  context.fighters=[actor,warrior,titan];assert.equal(context.findPreferredCombatTarget(actor),warrior);
  assert.equal(context.findPreferredCombatTarget(actor,f=>f.x<20),titan);
  actor.archetypeKey='titan';assert.equal(context.findPreferredCombatTarget(actor),titan,'a Titan can attack another Titan');
});

test('targeting preserves roster order for ties and evaluates range only once per eligible rival', () => {
  const actor = { id: 0, x: 0, y: 0, archetypeKey: 'titan', hp: 180, maxHp: 180 };
  const rivals = [1, 2].map(id => ({ id, x: id === 1 ? -30 : 30, y: 0, hp: 20, maxHp: 100 }));
  context.fighters = [actor, ...rivals];
  let checks = 0;
  assert.equal(context.findPreferredCombatTarget(actor, () => { checks++; return true; }), rivals[0]);
  assert.equal(checks, 2);
  assert.equal(context.findPreferredCombatTarget(null), null);
  assert.equal(context.findPreferredCombatTarget(actor, () => false), null);
});
