// Analysis-only adapter for the actual classic-script engine in index.html.
// Physics, AI, RNG calls in particles, damage, powers and mode transitions stay intact.
window.ArenaBalanceHarness = (() => {
  const STEP = 1000 / 60;
  const classes = ['kame', 'ninja', 'titan', 'trueno', 'esmeralda'];
  const original = {
    damage: applyDamage, ko: handleFighterKO,
    queue: queueFighterSkillWindup, execute: executeFighterSkill
  };
  let seed = 1, now = 0, timerId = 0, winner = null, stats = new Map(), cast = null, damageDepth = 0;
  const timers = new Map();
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const shuffle = list => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  Math.random = random;
  Date.now = () => 1800000000000 + now;
  window.setTimeout = (fn, delay = 0, ...args) => {
    const id = ++timerId; timers.set(id, { due: now + Math.max(0, Number(delay) || 0), fn, args }); return id;
  };
  window.clearTimeout = id => timers.delete(id);
  // Timers such as the 1.1 s mode-transition slow motion follow simulated time.
  const tickTimers = () => {
    for (const [id, timer] of timers) if (timer.due <= now + 1e-7) {
      timers.delete(id); timer.fn(...timer.args);
    }
  };
  localizationObserver.disconnect();
  appendChatMessage = addKillFeed = showDualBanner = playSound = spawnFloatingText = () => {};
  updateTargetSelectDropdown = updateHudFighterCards = updateStreamerJoinButton = updatePhaseUI = () => {};
  refreshArenaCombatRuleControls = () => {};
  triggerFinalKOSequence = value => { winner = value; koSequenceActive = true; };

  const fighterStats = fighter => stats.get(fighter?.id);
  applyDamage = function(target, amount, attacker, critical, knockback, attackType) {
    const hp = target.hp, shield = target.shieldHP || 0, charging = target.castingSkill;
    damageDepth++;
    try { original.damage(target, amount, attacker, critical, knockback, attackType); }
    finally { damageDepth--; }
    const effective = Math.max(0, Math.min(hp, hp - target.hp));
    const absorbed = Math.max(0, shield - (target.shieldHP || 0));
    const row = fighterStats(attacker), victim = fighterStats(target);
    if (row) {
      row.hpDamage += effective;
      row[attackType === 'special' ? 'specialHpDamage' : 'normalHpDamage'] += effective;
      row.absorbed += absorbed;
    }
    if (charging && !target.castingSkill && !target.eliminated && victim) victim.interrupted++;
    if (cast && attacker?.id === cast.actor && (effective > 0 || absorbed > 0)) {
      cast.targets.add(target.id); cast.hpDamage += effective;
    }
  };
  queueFighterSkillWindup = function(fighter, ...args) {
    const previous = fighter?.castingSkill, energy = fighter?.energy || 0;
    const result = original.queue(fighter, ...args);
    const row = fighterStats(fighter);
    if (row && !previous && fighter.castingSkill) { row.started++; row.energySpent += energy - fighter.energy; }
    return result;
  };
  executeFighterSkill = function(fighter, command) {
    const row = fighterStats(fighter);
    const previous = cast;
    cast = { actor: fighter.id, targets: new Set(), hpDamage: 0 };
    try { return original.execute(fighter, command); }
    finally {
      if (row) {
        row.executed++; row.hitCasts += Number(cast.targets.size > 0);
        row.specialTargets += cast.targets.size;
      }
      cast = previous;
    }
  };
  handleFighterKO = function(victim, killer) {
    if (victim.eliminated) return;
    const row = fighterStats(victim);
    if (row) { row.deathSeconds = now / 1000; row.deathCause = damageDepth ? 'hp' : 'fall'; }
    original.ko(victim, killer);
  };

  function reset(config) {
    seed = config.seed >>> 0; now = 0; winner = null; timers.clear(); stats = new Map(); cast = null; damageDepth = 0;
    arenaRoundRevision++; fighters = []; particles = []; activeEffects = []; floatingTexts = []; confetti = [];
    eliminationOrder = []; currentWinner = null; gameState = 'LOBBY'; koSequenceActive = false;
    isGamePaused = false; gamePace = 1; slowMoFactor = 1;
    autoAttackEnabled = true; autoChatEnabled = false; soundEnabled = false; countdownsEnabled = false;
    streamerManualControl = false; rejoinRuleMode = 'free'; MAX_OPPORTUNITIES = 1;
    arenaCombatRules = { ...ARENA_COMBAT_RULE_DEFAULTS, powerMode: config.powerMode || 'full' };
    let keys;
    if (config.pair) keys = config.first ? [...config.pair].reverse() : [...config.pair];
    else keys = shuffle(Array.from({ length: config.count }, (_, i) => classes[(i + config.rotation) % 5]));
    fighters = keys.map((key, i) => new Fighter(`@balance_${i}`, 'tiktok', false, key));
    totalParticipants = fighters.length;
    // A normal lobby selects its mode before combat. Prevent the previous trial's
    // mode from granting a transition shield/slow motion to the next trial.
    evaluateArenaMode(true);
    startCombatFromLobby();
    if (config.pair) {
      const leftClass = config.side ? config.pair[1] : config.pair[0];
      for (const f of fighters) { f.x = WORLD_W * (f.archetypeKey === leftClass ? 0.32 : 0.68); f.facing = f.x < WORLD_W / 2 ? 1 : -1; }
    } else {
      // Keep canonical spawn positions, shuffle processing order independently.
      shuffle(fighters);
    }
    for (const f of fighters) stats.set(f.id, {
      classKey: f.archetypeKey, hpDamage: 0, specialHpDamage: 0, normalHpDamage: 0, absorbed: 0,
      started: 0, executed: 0, hitCasts: 0, specialTargets: 0, interrupted: 0, energySpent: 0,
      deathSeconds: null, deathCause: null
    });
    // Default counters and all five archetypes are checked on every match.
    if (fighters.some(f => f.hp !== 180 || f.baseDamage !== 12 || f.energy !== 50 || f.coopCount !== 1)) throw Error('Unequal initial combat stats');
  }

  function run(config) {
    reset(config);
    const roster = [...fighters], maxSteps = Math.round((config.seconds || 180) * 60);
    let steps = 0;
    while (!winner && steps < maxSteps) {
      now += STEP; tickTimers(); updatePhysicsAndAI(); steps++;
    }
    const finite = roster.every(f => [f.x, f.y, f.hp, f.energy, f.damageDealt].every(Number.isFinite));
    if (!finite) throw Error('Non-finite combat state');
    return {
      ...config, steps, seconds: steps / 60, winner: winner?.archetypeKey || null,
      alive: roster.filter(f => !f.eliminated).length,
      fighters: roster.map(f => ({ ...stats.get(f.id), hp: f.hp, kills: f.kills,
        nominalDamage: f.damageDealt, survived: !f.eliminated }))
    };
  }

  function probe(classKey, mode = 'iso') {
    reset({ seed: 2108, count: 5, rotation: 0 });
    activeMode = mode;
    const actor = fighters.find(f => f.archetypeKey === classKey);
    // Fixture exposes target limit, horizontal/vertical range and direction.
    const offsets = [[60, 0], [120, 0], [200, 0], [280, 0], [500, 0], [-60, 0], [60, 160]];
    fighters = [actor, ...offsets.map((xy, i) => {
      const f = new Fighter('@probe_' + i, 'tiktok', false, 'ninja');
      f.x = 240 + xy[0]; f.y = 250 + xy[1]; f.probeOffset = xy; return f;
    })];
    actor.x = 240; actor.y = 250; actor.facing = 1; actor.energy = 100; actor.activeSpecialFactor = 1;
    const before = fighters.slice(1).map(f => f.hp);
    executeFighterSkill(actor, CLASS_COMMANDS[classKey].powers[0]);
    return { classKey, mode, targets: fighters.slice(1).map((f, i) => ({ offset: f.probeOffset,
      damage: before[i] - f.hp, vx: f.vx, vy: f.vy, vz: f.vz })).filter(x => x.damage > 0) };
  }
  function reference(config) {
    const measured = { damage: applyDamage, ko: handleFighterKO, queue: queueFighterSkillWindup, execute: executeFighterSkill };
    try {
      applyDamage = original.damage; handleFighterKO = original.ko;
      queueFighterSkillWindup = original.queue; executeFighterSkill = original.execute;
      return run(config);
    } finally {
      applyDamage = measured.damage; handleFighterKO = measured.ko;
      queueFighterSkillWindup = measured.queue; executeFighterSkill = measured.execute;
    }
  }
  return { run, reference, probe, meta: () => ({ version: ArenaLive.version, defaults: { ...ARENA_COMBAT_RULE_DEFAULTS },
    ai: AI_SPECIAL_RULES, targeting: typeof COMBAT_TARGET_POLICY === 'undefined' ? 'nearest-counterfactual' : COMBAT_TARGET_POLICY,
    balance: typeof ARENA_CLASS_BALANCE === 'undefined' ? null : ARENA_CLASS_BALANCE, hz: 60 }) };
})();
