import {readEngineSource} from './read-engine-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html = await readEngineSource();
const source = name => {
  const match = html.match(new RegExp(`        function ${name}\\([\\s\\S]*?\\n        }\\n`));
  assert.ok(match, name);
  return match[0];
};

test('all 512 combat status combinations retain their symbols, order, shield condition and five-icon limit', () => {
  const symbols = ['👊','❤️','💜','🌟','🔋','💚','🔹','🛡️','💎'];
  const timers = ['tapKnockbackTimer','likeBoostTimer','specialAmplifyTimer','critBoostTimer',
    'energyRegenerationTimer','healthRegenerationTimer','immunityTimer','shieldTimer','berserkTimer'];
  const e = vm.createContext({ARENA_STATUS_ICONS:symbols, arenaStatusIconCache:new Map(), MAX_STATUS_ICON_SETS:64});
  vm.runInContext(source('getArenaFighterStatusIcons'), e);
  for (let mask = 0; mask < 512; mask++) for (const shieldHP of [0, 45]) {
    const fighter = Object.fromEntries(timers.map((name, i) => [name, mask & (1 << i) ? 100 : 0]));
    fighter.shieldHP = shieldHP;
    const expected = timers.flatMap((name, i) => fighter[name] > 0 && (name !== 'shieldTimer' || shieldHP > 0) ? [symbols[i]] : []).slice(0, 5);
    const actual = e.getArenaFighterStatusIcons(fighter);
    assert.deepEqual(Array.from(actual), expected);
    assert.equal(Object.isFrozen(actual), true);
    assert.equal(e.getArenaFighterStatusIcons(fighter), actual);
    assert.ok(e.arenaStatusIconCache.size <= 64);
  }
});

function effectsEngine() {
  const e = vm.createContext({WORLD_W:960, WORLD_H:540, isGamePaused:false, gamePace:1, slowMoFactor:1,
    screenShake:0, skyFlashTimer:0, gameState:'COMBAT',arenaSimulationTick:0,koSequenceActive:false,drainArenaAudienceQueue(){},advanceArenaRoundClock(){},flushArenaTickChatBatch(){},resolveMeleeAttacks(){}, fighters:[], confetti:[],
    particles:[], floatingTexts:[], activeEffects:[], updateSmartCamera9x16(){}});
  vm.runInContext(source('updatePhysicsAndAI'), e);
  return e;
}

test('bulk expiry preserves every surviving effect value, identity and draw order at different simulation speeds', () => {
  for (const pace of [.75, 1, 1.25]) {
    const e = effectsEngine(); e.gamePace = pace;
    const particles = Array.from({length:720}, (_, id) => ({id, x:id/3, y:id/7, vx:id%5-2,
      vy:id%7-3, gravity:id%3 === 0 ? 0 : .04, life:id%60+.25}));
    const texts = Array.from({length:120}, (_, id) => ({id, y:id*2, life:id%30+.25}));
    const effects = Array.from({length:160}, (_, id) => ({id, timer:id%40+.25}));
    e.particles = particles.slice(); e.floatingTexts = texts.slice(); e.activeEffects = effects.slice();
    const containers = [e.particles, e.floatingTexts, e.activeEffects];
    let expectedParticles = structuredClone(particles), expectedTexts = structuredClone(texts), expectedEffects = structuredClone(effects);
    for (let frame = 0; frame < 90; frame++) {
      expectedParticles = expectedParticles.map(p => ({...p, x:p.x+p.vx*pace, y:p.y+p.vy*pace,
        vy:p.vy+(p.gravity||.1)*pace, life:p.life-pace})).filter(p => p.life > 0);
      expectedTexts = expectedTexts.map(p => ({...p, y:p.y-.85*pace, life:p.life-pace})).filter(p => p.life > 0);
      expectedEffects = expectedEffects.map(p => ({...p, timer:p.timer-pace})).filter(p => p.timer > 0);
      e.updatePhysicsAndAI();
      assert.deepEqual(Array.from(e.particles), expectedParticles);
      assert.deepEqual(Array.from(e.floatingTexts), expectedTexts);
      assert.deepEqual(Array.from(e.activeEffects), expectedEffects);
      assert.ok(e.particles.every(p => particles[p.id] === p));
      assert.ok(e.floatingTexts.every(p => texts[p.id] === p));
      assert.ok(e.activeEffects.every(p => effects[p.id] === p));
      assert.equal(e.particles, containers[0]);
      assert.equal(e.floatingTexts, containers[1]);
      assert.equal(e.activeEffects, containers[2]);
    }
  }
});

test('paused simulation does not age or move pending visual effects', () => {
  const e = effectsEngine();
  e.particles = [{x:1, y:2, vx:3, vy:4, life:5}];
  e.floatingTexts = [{y:1, life:5}]; e.activeEffects = [{timer:5}]; e.isGamePaused = true;
  const before = JSON.stringify([e.particles, e.floatingTexts, e.activeEffects]);
  e.updatePhysicsAndAI();
  assert.equal(JSON.stringify([e.particles, e.floatingTexts, e.activeEffects]), before);
});

test('limited powers match a stable full-sort oracle through 128 targets without changing range eligibility', () => {
  let limit = null;
  const e = vm.createContext({fighters:[], getFighterSpecialRule:() => ({targets:limit})});
  vm.runInContext(source('canFighterAttack') + source('getFighterSpecialTargets'), e);
  for (const count of [2, 8, 32, 64, 128]) for (limit of [null, 1, 2, 3]) {
    const actor = {id:0, x:100, y:200};
    // Repeated and mirrored positions exercise stable ties and zero distance.
    const roster = Array.from({length:count}, (_, id) => ({id, x:100+(id%7-3)*12,
      y:200+(id%5-2)*9, eliminated:id%11===10, fallDrop:id%13===12?10:0}));
    roster[0] = actor; e.fighters = roster;
    const allowed = roster.filter(other => other.id !== actor.id && !other.eliminated && !(other.fallDrop > 0));
    let calls = 0;
    const range = other => { calls++; return other.y >= actor.y - 10; };
    const candidates = allowed.filter(other => other.y >= actor.y - 10);
    const expected = limit == null ? candidates : candidates.slice().sort((a,b) =>
      Math.hypot(a.x-actor.x,a.y-actor.y)-Math.hypot(b.x-actor.x,b.y-actor.y)).slice(0,limit);
    assert.deepEqual(Array.from(e.getFighterSpecialTargets(actor, range)), expected);
    assert.equal(calls, allowed.length);
    assert.equal(e.fighters, roster);
  }
});
