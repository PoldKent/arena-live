// Empirical balance study using the real browser engine. Does not modify powers.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { summarizeBalance } from './balance-summary.mjs';
const productionHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const variant = 'published';
const html = productionHtml;
const harness = await readFile(new URL('./balance-harness.js', import.meta.url), 'utf8');
const pilot = process.env.ARENA_BALANCE_PILOT === '1';
const duelSeeds = Number(process.env.ARENA_BALANCE_DUEL_SEEDS || (pilot ? 2 : 50));
const arenaSeeds = Number(process.env.ARENA_BALANCE_ARENA_SEEDS || (pilot ? 2 : 40));
const seedStart = Number(process.env.ARENA_BALANCE_SEED_START || 0);
const seconds = Number(process.env.ARENA_BALANCE_SECONDS || 180);
const counts = (process.env.ARENA_BALANCE_COUNTS || '5,10,25,125').split(',').map(Number);
const output = resolve(process.env.ARENA_BALANCE_OUTPUT || 'reports/balance/latest.json');
const classes = ['kame', 'ninja', 'titan', 'trueno', 'esmeralda'];
assert.ok(Number.isInteger(duelSeeds) && duelSeeds >= 0 && Number.isInteger(arenaSeeds) && arenaSeeds >= 0, 'Seed counts must be nonnegative integers');
assert.ok(Number.isSafeInteger(seedStart) && seedStart >= 0 && seedStart + Math.max(duelSeeds, arenaSeeds) < 100000, 'Invalid seed offset');
assert.ok(Number.isFinite(seconds) && seconds > 0 && seconds <= 3600, 'Duration must be 0–3600 seconds');
assert.ok(counts.every(n => Number.isInteger(n) && n >= 5 && n <= 128 && n % 5 === 0), 'Balanced arenas need a multiple of five, up to 128');
const tasks = [];
for (const powerMode of ['full', 'noSpecials']) {
  for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) {
    for (let s = 0; s < duelSeeds; s++) for (let variant = 0; variant < 4; variant++) {
      tasks.push({ kind: 'duel', powerMode, pair: [classes[a], classes[b]], baseSeed: s + seedStart,
        seed: 41000 + (s + seedStart) * 7919, side: variant % 2, first: Math.floor(variant / 2), seconds });
    }
  }
}
for (const count of counts) for (let s = 0; s < arenaSeeds; s++) for (let rotation = 0; rotation < 5; rotation++) {
  tasks.push({ kind: 'arena', count, powerMode: 'full', baseSeed: s + seedStart,
    seed: 91000 + (s + seedStart) * 7919, rotation, seconds });
}
const server = createServer((_, response) => { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
let browser;
try {
  const options = { headless: true, args: ['--disable-gpu'] };
  if (process.env.ARENA_BROWSER_EXECUTABLE) options.executablePath = process.env.ARENA_BROWSER_EXECUTABLE;
  if (process.env.ARENA_BROWSER_LIBRARY_PATH) options.env = { ...process.env, LD_LIBRARY_PATH: process.env.ARENA_BROWSER_LIBRARY_PATH };
  browser = await chromium.launch(options);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.stack));
  await page.addInitScript(() => { window.setInterval = () => 0; window.requestAnimationFrame = () => 0; });
  await page.route(/https:\/\//, route => route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load' });
  await page.addScriptTag({ content: harness });
  const metadata = await page.evaluate(() => ArenaBalanceHarness.meta());
  const smoke = { kind: 'duel', pair: ['kame', 'ninja'], seed: 111, baseSeed: 0, side: 0, first: 0, seconds: 30 };
  const deterministic = await page.evaluate(config => [ArenaBalanceHarness.run(config), ArenaBalanceHarness.run(config)], smoke);
  assert.deepEqual(deterministic[0], deterministic[1], 'Identical seed must reproduce the complete match');
  const crossScenario = await page.evaluate(config => {
    const before = ArenaBalanceHarness.run(config);
    ArenaBalanceHarness.run({ count: 25, rotation: 3, seed: 999, seconds: 10 });
    return [before, ArenaBalanceHarness.run(config)];
  }, smoke);
  assert.deepEqual(crossScenario[0], crossScenario[1], 'Previous arena/mode must not bias a repeated duel');
  const parity = await page.evaluate(() => {
    const shape = r => ({ winner: r.winner, seconds: r.seconds, alive: r.alive,
      fighters: r.fighters.map(({ classKey, hp, kills, nominalDamage, survived }) => ({ classKey, hp, kills, nominalDamage, survived })) });
    return [
      { pair: ['kame', 'ninja'], seed: 207, side: 1, first: 1, seconds: 60 },
      { count: 25, rotation: 2, seed: 991, seconds: 120 },
      { count: 125, rotation: 1, seed: 731, seconds: 120 }
    ].map(config => [shape(ArenaBalanceHarness.run(config)), shape(ArenaBalanceHarness.reference(config))]);
  });
  for (const [measured, reference] of parity) assert.deepEqual(measured, reference, 'Telemetry must not change combat results');
  const probes = await page.evaluate(() => ['iso', 'smash', '1v1'].flatMap(mode => ['kame', 'ninja', 'titan', 'trueno', 'esmeralda'].map(key => ArenaBalanceHarness.probe(key, mode))));
  const results = [], started = Date.now();
  for (let i = 0; i < tasks.length; i += 10) {
    const group = tasks.slice(i, i + 10);
    results.push(...await page.evaluate(configs => configs.map(config => ArenaBalanceHarness.run(config)), group));
    if (i % (tasks.length >= 10000 ? 1000 : 100) === 0 || i + 10 >= tasks.length) console.log(JSON.stringify({ completed: results.length, total: tasks.length, elapsedSeconds: Math.round((Date.now() - started) / 1000) }));
  }
  assert.deepEqual(errors, [], 'Browser engine must have no JavaScript errors');
  const bytes = Buffer.from(html);
  const productionBytes = Buffer.from(productionHtml);
  const report = { metadata: { ...metadata, variant,
    productionGitBlob: createHash('sha1').update(`blob ${productionBytes.length}\0`).update(productionBytes).digest('hex'),
    engineGitBlob: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
    browser: await browser.version(), duelSeeds, arenaSeeds, seedStart, counts, maxSeconds: seconds, matches: results.length,
    method: 'Seeded AI, no audience boosts or re-entry, canonical spawns; crossed duel side/order and rotated arena assignments; virtual 60Hz timers; UI and rendering suppressed, combat/particle RNG preserved.' },
    probes, deterministic: true, telemetryParity: true, crossScenarioParity: true, errors, results };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report) + '\n');
  const summary = await summarizeBalance(report, output.replace(/\.json$/, ''));
  console.log(JSON.stringify({ output, matches: results.length, elapsedSeconds: (Date.now() - started) / 1000,
    duels: summary.duels.classes.map(({name,winPct})=>({name,winPct})),
    arenas: Object.fromEntries(Object.entries(summary.arenas).map(([n,g])=>[n,g.classes.map(({name,winPct})=>({name,winPct}))])) }));
} finally { await browser?.close(); await new Promise(r => server.close(r)); }
