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
  html.match(/const CLASS_RIVALRIES = Object\.freeze\([\s\S]*?\);/)[0],
  html.match(/const COMBAT_TARGET_PREFERENCE_RANGE = Object\.freeze\([\s\S]*?\);/)[0],
  functionSource('canFighterAttack'), functionSource('findPreferredCombatTarget')
].join('\n'), context);

// The published v0.1–v0.4 selector is the behavioral reference. Optimizing its
// work must preserve class rivalries, reachable targets, weakest HP and ties.
function publishedTarget(attacker, roster, inRange = () => true) {
  const candidates = roster.filter(other => other.id !== attacker.id
    && !attacker.eliminated && !other.eliminated && inRange(other));
  const distance = other => Math.hypot(other.x - attacker.x, other.y - attacker.y);
  candidates.sort((a, b) => distance(a) - distance(b));
  const closest = candidates[0];
  if (!closest) return null;
  const reachable = candidates.filter(other => distance(other) <= distance(closest) * 1.5 + 38);
  if (attacker.archetypeKey === 'titan') {
    return reachable.sort((a, b) => a.hp / Math.max(1, a.maxHp)
      - b.hp / Math.max(1, b.maxHp) || distance(a) - distance(b))[0] || closest;
  }
  const rivals = { kame: 'kame', ninja: 'esmeralda', trueno: 'ninja', esmeralda: 'trueno' };
  return reachable.find(other => other.archetypeKey === rivals[attacker.archetypeKey]) || closest;
}

test('target priorities match the published selector from 2 through 128 fighters', () => {
  let seed = 20261023;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const classes = ['kame', 'ninja', 'titan', 'trueno', 'esmeralda'];
  for (const count of [2, 8, 32, 64, 128]) {
    for (let scene = 0; scene < 12; scene++) {
      const roster = Array.from({ length: count }, (_, id) => ({
        id, x: Math.floor(random() * 900), y: Math.floor(random() * 500),
        hp: 1 + Math.floor(random() * 180), maxHp: 180,
        archetypeKey: classes[id % classes.length], eliminated: random() < 0.12
      }));
      context.fighters = roster;
      for (const attacker of roster) {
        for (const predicate of [null, other => Math.abs(other.y - attacker.y) < 75]) {
          assert.equal(context.findPreferredCombatTarget(attacker, predicate),
            publishedTarget(attacker, roster, predicate || undefined), `${count} fighters, actor ${attacker.id}`);
        }
      }
      assert.deepEqual(roster.map(f => f.id), Array.from({ length: count }, (_, id) => id));
    }
  }
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
