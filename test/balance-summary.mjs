// Aggregate seeded studies; keep side/order rotations in the same bootstrap cluster.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const [primaryPath, duelPath, nearestPath, prefix = 'docs/balance-v0.5'] = process.argv.slice(2);
assert.ok(primaryPath && duelPath && nearestPath, 'Usage: node test/balance-summary.mjs primary.json expanded-duels.json nearest.json [output-prefix]');
const [primary, expanded, nearest] = await Promise.all([primaryPath, duelPath, nearestPath].map(async p => JSON.parse(await readFile(p, 'utf8'))));
const classes = ['kame', 'ninja', 'titan', 'trueno', 'esmeralda'];
const labels = { kame: 'Guerrero', ninja: 'Shinobi', titan: 'Titán', trueno: 'Rayo', esmeralda: 'Espíritu' };
const engine = expanded.metadata.engineGitBlob;
assert.equal(primary.metadata.engineGitBlob, engine);
assert.equal(nearest.metadata.productionGitBlob, engine);
assert.equal(nearest.metadata.variant, 'nearest');
for (const study of [primary, expanded, nearest]) { assert.equal(study.deterministic, true); assert.deepEqual(study.errors, []); }
const published = [...expanded.results.filter(r => r.kind === 'duel'), ...primary.results.filter(r => r.kind === 'arena')];
let rngState = 20261023;
const random = () => ((rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0) / 4294967296);
const round = x => Math.round(x * 10000) / 10000;

function scoreCI(matches, key) {
  const groups = new Map();
  for (const r of matches) {
    const group = groups.get(r.baseSeed) || { total: 0, points: 0 };
    group.total++; group.points += r.winner === key ? 1 : r.winner === null ? 0.5 : 0;
    groups.set(r.baseSeed, group);
  }
  const values = [...groups.values()].map(x => x.points / x.total), samples = [];
  for (let sample = 0; sample < 2000; sample++) {
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[Math.floor(random() * values.length)];
    samples.push(sum / values.length * 100);
  }
  samples.sort((a, b) => a - b);
  return { seeds: values.length, low: round(samples[50]), high: round(samples[1949]) };
}

function aggregate(matches) {
  assert.ok(matches.length);
  const timeouts = matches.filter(r => r.winner === null).length;
  const rows = classes.map(key => {
    const eligible = matches.filter(r => r.fighters.some(f => f.classKey === key));
    const individuals = eligible.flatMap(r => r.fighters.filter(f => f.classKey === key));
    const wins = eligible.filter(r => r.winner === key).length;
    const draws = eligible.filter(r => r.winner === null).length;
    const totals = Object.fromEntries(['hpDamage', 'specialHpDamage', 'normalHpDamage', 'kills', 'started', 'executed', 'hitCasts', 'specialTargets', 'interrupted', 'energySpent']
      .map(field => [field, individuals.reduce((sum, f) => sum + f[field], 0)]));
    const lifeSeconds = eligible.reduce((sum, r) => sum + r.fighters.filter(f => f.classKey === key).reduce((n, f) => n + (f.deathSeconds ?? r.seconds), 0), 0);
    return { classKey: key, name: labels[key], matches: eligible.length, fighters: individuals.length, wins, draws,
      winPct: round(100 * wins / eligible.length), scorePct: round(100 * (wins + draws / 2) / eligible.length),
      scoreCI95: scoreCI(eligible, key), meanHpDamage: round(totals.hpDamage / individuals.length),
      meanKills: round(totals.kills / individuals.length), meanSurvivalSeconds: round(lifeSeconds / individuals.length),
      specialDamagePerExecution: round(totals.specialHpDamage / Math.max(1, totals.executed)),
      specialTargetsPerExecution: round(totals.specialTargets / Math.max(1, totals.executed)),
      specialHitPct: round(100 * totals.hitCasts / Math.max(1, totals.executed)),
      chargeExecutedPct: round(100 * totals.executed / Math.max(1, totals.started)),
      hpDeaths: individuals.filter(f => f.deathCause === 'hp').length,
      fallDeaths: individuals.filter(f => f.deathCause === 'fall').length,
      totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, round(v)])) };
  });
  assert.equal(rows.reduce((sum, r) => sum + r.wins, 0), matches.length - timeouts);
  return { matches: matches.length, timeouts, maxSeconds: expanded.metadata.maxSeconds, classes: rows };
}

const duels = aggregate(published.filter(r => r.kind === 'duel' && r.powerMode === 'full'));
const noSpecials = aggregate(published.filter(r => r.kind === 'duel' && r.powerMode === 'noSpecials'));
for (const row of noSpecials.classes) assert.equal(row.scorePct, 50, 'Mirrored equal-stat duels must be symmetric without powers');
const arenas = Object.fromEntries(primary.metadata.counts.map(n => [n, aggregate(published.filter(r => r.kind === 'arena' && r.count === n))]));
const neutral = Object.fromEntries(nearest.metadata.counts.map(n => [n, aggregate(nearest.results.filter(r => r.count === n))]));
const matrix = Object.fromEntries(classes.map(key => [key, Object.fromEntries(classes.filter(k => k !== key).map(other => {
  const games = published.filter(r => r.kind === 'duel' && r.powerMode === 'full' && r.pair.includes(key) && r.pair.includes(other));
  return [other, { matches: games.length, wins: games.filter(r => r.winner === key).length,
    draws: games.filter(r => r.winner === null).length, winPct: round(100 * games.filter(r => r.winner === key).length / games.length) }];
}))]));
const combined = [...published.map(r => ({ ...r, variant: 'published' })), ...nearest.results.map(r => ({ ...r, variant: 'nearest' }))];
const caseKeys = combined.map(r => [r.variant, r.kind, r.powerMode, r.count || 2, r.pair?.join('/'), r.baseSeed, r.side, r.first, r.rotation].join('|'));
assert.equal(new Set(caseKeys).size, combined.length, 'Each trial must be counted exactly once');
const header = 'variant,kind,power_mode,players,class_a,class_b,base_seed,side,first,rotation,winner,seconds\n';
const csv = header + combined.map(r => [r.variant, r.kind, r.powerMode, r.count || 2,
  r.pair?.[0] || '', r.pair?.[1] || '', r.baseSeed, r.side ?? '', r.first ?? '', r.rotation ?? '', r.winner || 'timeout', r.seconds].join(',')).join('\n') + '\n';
const archive = gzipSync(Buffer.from(csv), { level: 9 });
const summary = { version: '0.5.0', productionEngineGitBlob: engine,
  sampling: { publishedMatches: published.length, counterfactualMatches: nearest.results.length, uniqueMatches: combined.length,
    duelSeeds: expanded.metadata.duelSeeds, arenaSeeds: primary.metadata.arenaSeeds, rotationsPerArenaSeed: 5,
    variantsPerDuelSeed: 4, maxSeconds: expanded.metadata.maxSeconds, browser: expanded.metadata.browser,
    note: 'Earlier 50-seed duels and pilot runs are excluded to avoid double-counting repeated trials.' },
  methodology: { timerHz: 60, externalBoosts: false, reentry: false, targeting: 'published class rivalries; neutral control removes class preferences including lightning prioritization',
    intervals: '2000 bootstrap resamples of seed clusters; side/order/class rotations remain together. Intervals describe this simulation, not human skill or LIVE outcomes.' },
  duels, noSpecials, arenas, nearestTargetControl: neutral, duelMatrix: matrix, probes: primary.probes,
  evidence: { archive: prefix.split('/').at(-1) + '-matches.csv.gz', rows: combined.length,
    sha256: createHash('sha256').update(archive).digest('hex') } };
await mkdir(dirname(prefix), { recursive: true });
await writeFile(prefix + '-summary.json', JSON.stringify(summary, null, 2) + '\n');
await writeFile(prefix + '-matches.csv.gz', archive);
console.log(JSON.stringify({ uniqueMatches: combined.length, archiveBytes: archive.length,
  duels: duels.classes.map(({ name, wins, matches, winPct, scoreCI95 }) => ({ name, wins, matches, winPct, scoreCI95 })),
  arena125: arenas[125]?.classes.map(({ name, winPct }) => ({ name, winPct })) }));
