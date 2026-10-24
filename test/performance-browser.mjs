// Reproducible CPU/raster workload. No TikTok connection and no machine-specific FPS assertions.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const current = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const sources = [['current', current]];
if (process.env.ARENA_PERF_BASELINE) sources.unshift(['baseline', await readFile(process.env.ARENA_PERF_BASELINE, 'utf8')]);
const css = process.env.ARENA_TEST_CSS ? await readFile(process.env.ARENA_TEST_CSS, 'utf8') : null;
const server = createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').searchParams.get('source');
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(sources.find(([key]) => key === name)?.[1] || current);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const launch = { headless: true, args: ['--disable-gpu'] };
if (process.env.ARENA_BROWSER_EXECUTABLE) launch.executablePath = process.env.ARENA_BROWSER_EXECUTABLE;
if (process.env.ARENA_BROWSER_LIBRARY_PATH) launch.env = { ...process.env, LD_LIBRARY_PATH: process.env.ARENA_BROWSER_LIBRARY_PATH };
let browser;
const checks = [], errors = [], measurements = [];
const check = async (name, fn) => { await fn(); checks.push(name); console.log('PASS', name); };
try {
  browser = await chromium.launch(launch);
  for (const [source] of sources) {
    const page = await browser.newPage({ viewport: { width: 1720, height: 720 } });
    page.on('pageerror', error => errors.push(error.stack));
    await page.addInitScript(() => {
      let seed = 4521;
      Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      // Only the automatic simulation loop is held. Layout/focus callbacks still run.
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => callback.name === 'gameLoop' ? 0 : raf(callback);
    });
    if (css) {
      await page.route(/https:\/\/cdn\.tailwindcss\.com/, route => route.fulfill({ contentType: 'text/javascript', body: 'const style=document.createElement("style");style.textContent=' + JSON.stringify(css) + ';document.head.appendChild(style);' }));
      await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)/, route => route.abort());
    }
    await page.goto(`http://127.0.0.1:${server.address().port}/?source=${source}`, { waitUntil: 'load' });
    for (const count of [32, 64, 128]) {
      const setup = await page.evaluate(count => {
        soundEnabled = false; autoChatEnabled = false; countdownsEnabled = false;
        isGamePaused = false; gameState = 'LOBBY';
        // Constant-population CPU comparison: HP alone no longer prevents real ring-outs.
        // Use the same no-knockback control in both sources; full launches run below.
        setArenaCombatRule('knockback', 0);
        const start = performance.now();
        applyPlayerCountPreset(count); startCombatFromLobby(); autoAttackEnabled = true; setMonitorFocus('dual');
        // Keep a constant population while measuring normal pursuit/separation;
        // autonomous special bursts are exercised separately below.
        for (const f of fighters) { f.hp = f.maxHp = 100000; f.aiSpecialCooldown = 100000; }
        return { setupMs: performance.now() - start, bodies: fighters.length };
      }, count);
      assert.equal(setup.bodies, count);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      const metrics = await page.evaluate(() => {
        const sample = (fn, iterations) => {
          for (let i = 0; i < 12; i++) fn();
          const values = [];
          for (let i = 0; i < iterations; i++) {
            const start = performance.now(); fn(); values.push(performance.now() - start);
          }
          values.sort((a, b) => a - b);
          return { mean: values.reduce((a, b) => a + b, 0) / values.length,
            median: values[Math.floor(values.length / 2)], p95: values[Math.floor(values.length * 0.95)] };
        };
        const targeting = sample(() => { for (const f of fighters) findPreferredCombatTarget(f); }, 60);
        const simulation = sample(updatePhysicsAndAI, 120);
        // Flush each capture so deferred Canvas raster work is included in draw time.
        const drawing = sample(() => {
          renderBothScreensSimultaneously();
          ctx16.getImageData(0, 0, 1, 1); ctx9.getImageData(0, 0, 1, 1);
        }, 18);
        return { targeting, simulation, drawing, alive: fighters.filter(f => !f.eliminated).length,
          finite: fighters.every(f => [f.x, f.y, f.hp, f.energy].every(Number.isFinite)) };
      });
      measurements.push({ source, count, ...setup, ...metrics });
      assert.equal(metrics.alive, count); assert.equal(metrics.finite, true);
      if (source === 'current') checks.push(`${count} fighters simulate and render both captures with finite state`);
      console.log('MEASURE', JSON.stringify(measurements.at(-1)));
    }
    if (source === 'current') {
      await page.evaluate(()=>setArenaCombatRule('knockback',1));
      await check('128-player scenario also loads during combat; mode transitions and capacity remain correct', async () => {
        const result = await page.evaluate(() => {
          applyPlayerCountPreset(8); const smash = [fighters.length, activeMode];
          applyPlayerCountPreset(128); const arena = [fighters.length, activeMode];
          setArenaCombatRule('maxPlayers', 32); applyPlayerCountPreset(128);
          const capped = [fighters.length, getArenaPlayerLimit()];
          setArenaCombatRule('maxPlayers', 128); applyPlayerCountPreset(128);
          return { smash, arena, capped, restored: fighters.length };
        });
        assert.deepEqual(result, { smash: [8, 'smash'], arena: [128, 'iso'], capped: [32, 32], restored: 128 });
      });
      await check('preparation skips its hidden capture and switching or dual view repaints fresh game state', async () => {
        const result = await page.evaluate(() => {
          const red = ctx => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 1, 1); ctx.restore(); };
          const isRed = ctx => { const p = ctx.getImageData(0, 0, 1, 1).data; return p[0] === 255 && p[1] === 0 && p[2] === 0; };
          setMonitorFocus('16:9'); red(ctx9); renderBothScreensSimultaneously(); const hidden9 = isRed(ctx9);
          setMonitorFocus('9:16'); red(ctx16); renderBothScreensSimultaneously();
          const hidden16 = isRed(ctx16), fresh9 = !isRed(ctx9);
          setMonitorFocus('dual'); renderBothScreensSimultaneously();
          return { hidden9, hidden16, fresh9, fresh16: !isRed(ctx16) };
        });
        assert.deepEqual(result, { hidden9: true, hidden16: true, fresh9: true, fresh16: true });
      });
      await check('label metric cache follows renamed fighters, life counters and loaded fonts', async () => {
        const result = await page.evaluate(() => {
          renderBothScreensSimultaneously();
          const original = CanvasRenderingContext2D.prototype.measureText;
          let calls = 0;
          CanvasRenderingContext2D.prototype.measureText = function(...args) { calls++; return original.apply(this, args); };
          try {
            renderBothScreensSimultaneously(); const unchanged = calls;
            fighters[0].name = '@NuevoNombreDePrueba'; renderBothScreensSimultaneously(); const renamed = calls;
            fighters[0].joinsUsed++; renderBothScreensSimultaneously(); const lifeChanged = calls;
            document.fonts.dispatchEvent(new Event('loadingdone')); renderBothScreensSimultaneously();
            return { unchanged, renamed, lifeChanged, fontsChanged: calls };
          } finally { CanvasRenderingContext2D.prototype.measureText = original; }
        });
        assert.equal(result.unchanged, 0);
        assert.ok(result.renamed >= 2); assert.ok(result.lifeChanged > result.renamed);
        assert.ok(result.fontsChanged > result.lifeChanged);
      });
      await check('unchanged duel HUD values do not recreate text or trigger localization each frame', async () => {
        const mutations = await page.evaluate(() => {
          applyPlayerCountPreset(2); renderBothScreensSimultaneously();
          const observer = new MutationObserver(() => {});
          for (const suffix of ['16', '9']) observer.observe(document.getElementById(`hud1v1Bars${suffix}`), { subtree: true, childList: true, attributes: true });
          renderBothScreensSimultaneously();
          const count = observer.takeRecords().length; observer.disconnect();
          applyPlayerCountPreset(128);
          return count;
        });
        assert.equal(mutations, 0);
      });
      await check('128 autonomous fighters still charge/fire specials and keep transient effects bounded', async () => {
        const result = await page.evaluate(() => {
          startCombatFromLobby(); autoAttackEnabled = true;
          for (const f of fighters) { f.hp = f.maxHp = 100000; f.aiSpecialCooldown = 0; f.energy = 100; }
          const feed=document.getElementById('chatFeed');feed.replaceChildren();
          const observer=new MutationObserver(()=>{});observer.observe(feed,{childList:true});
          const execute=executeFighterSkill;let executed=0,charging=0,maxEffects=0,maxParticles=0;
          executeFighterSkill=(...args)=>{executed++;return execute(...args);};
          try {
            updatePhysicsAndAI();charging=fighters.filter(f=>f.castingSkill).length;
            for (let i = 0; i < 180; i++) {
              updatePhysicsAndAI();
              maxEffects = Math.max(maxEffects, activeEffects.length); maxParticles = Math.max(maxParticles, particles.length);
            }
          } finally {executeFighterSkill=execute;}
          const logged=observer.takeRecords().flatMap(r=>[...r.addedNodes]).filter(n=>n.dataset?.chatEvent==='special');observer.disconnect();
          renderBothScreensSimultaneously();
          return { charging, maxEffects, maxParticles, capEffects: MAX_ACTIVE_EFFECTS, capParticles: MAX_PARTICLES,
            executed,logged:logged.length,linked:logged.every(n=>fighters.some(f=>f.id===n.dataset.fighterId&&CLASS_COMMANDS[f.archetypeKey].powers[0]===n.dataset.command)),history:feed.childElementCount,retention:chatRetention,
            fired: fighters.some(f => f.energy < 100 && !f.castingSkill),
            finite: fighters.every(f => [f.x, f.y, f.hp, f.energy].every(Number.isFinite)) };
        });
        assert.ok(result.charging > 0); assert.equal(result.fired, true); assert.equal(result.finite, true);
        assert.ok(result.maxEffects <= result.capEffects); assert.ok(result.maxParticles <= result.capParticles);
        assert.ok(result.executed>0);assert.equal(result.logged,result.executed);assert.equal(result.linked,true);assert.ok(result.history<=result.retention);
      });
      await check('128-player powers retain real text and damage labels while transient history remains bounded',async()=>{
        const result=await page.evaluate(()=>{
          gameState='LOBBY';applyPlayerCountPreset(128);startCombatFromLobby();autoAttackEnabled=true;
          setCombatDisplayOption('powerText',true);setCombatDisplayOption('numbers',true);
          for(const f of fighters){f.hp=f.maxHp=100000;f.aiSpecialCooldown=0;f.energy=100;}
          for(let i=0;i<90;i++)updatePhysicsAndAI();
          // Include a dense burst after real autonomous casts; old animations must be discarded.
          for(let i=0;i<300;i++)spawnFloatingText(200,300,i%2?'☄️ Kame':'−12');
          renderBothScreensSimultaneously();
          const result={count:floatingTexts.length,cap:MAX_FLOATING_TEXTS,names:floatingTexts.some(ft=>ft.text.includes('Kame')),numbers:floatingTexts.some(ft=>ft.text.includes('12')),finite:fighters.every(f=>[f.x,f.y,f.hp,f.energy].every(Number.isFinite))};
          setCombatDisplayOption('powerText',false);setCombatDisplayOption('numbers',false);return result;
        });
        assert.equal(result.count,result.cap);assert.equal(result.names,true);assert.equal(result.numbers,true);assert.equal(result.finite,true);
      });
      await check('expired KO notices release detached badges instead of accumulating through a stream', async () => {
        await page.evaluate(() => { addKillFeed('K.O. performance cleanup', 'ko'); });
        await page.waitForFunction(() => !koFeedBatch.has('K.O. performance cleanup'), null, { timeout: 5000 });
      });
      await check('replacing a scenario clears old powers and a pending victory cannot overwrite the new match', async () => {
        const result = await page.evaluate(() => {
          triggerFinalKOSequence(fighters[0], 'Prueba de ronda anterior');
          addActiveEffect({ type: 'kamehameha', x: 100, y: 100, timer: 200, maxTimer: 200 });
          applyPlayerCountPreset(64);
          return { bodies: fighters.length, oldEffects: activeEffects.length, finalizing: koSequenceActive, pace: slowMoFactor };
        });
        assert.deepEqual(result, { bodies: 64, oldEffects: 0, finalizing: false, pace: 1 });
        await page.waitForTimeout(2800);
        assert.equal(await page.evaluate(() => gameState), 'COMBAT');
        assert.equal(await page.evaluate(() => fighters.length), 64);
      });
      await check('500 received comments keep history and automatic follow without rebuilding toolbar state per message', async () => {
        await page.evaluate(() => {
          window.WebSocket = class extends EventTarget {
            constructor() { super(); window.arenaPerformanceSocket = this; queueMicrotask(() => this.dispatchEvent(new Event('open'))); }
          };
        });
        await page.addScriptTag({ content: await readFile(new URL('../bridge/bridge-client.js', import.meta.url), 'utf8') });
        const burst = await page.evaluate(() => {
          const socket = window.arenaPerformanceSocket;
          const deliver = value => socket.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(value) }));
          deliver({ type: 'status', phase: 'connected', account: '@polkent.live', isController: true });
          let statusEvents = 0;
          const changed = () => statusEvents++;
          window.addEventListener('arena-bridge-status', changed);
          const start = performance.now();
          for (let i = 0; i < 500; i++) deliver({ type: 'chat', platformKey: 'tiktok', username: 'perf_receive', message: i % 20 === 0 ? '!jugar' : `comentario ${i}` });
          window.removeEventListener('arena-bridge-status', changed);
          return { dispatchMs: performance.now() - start, statusEvents };
        });
        await page.waitForFunction(() => document.getElementById('bridge-count').textContent.includes('500'));
        assert.equal(burst.statusEvents, 0);
        assert.equal(await page.locator('.arena-tiktok-chat-line').count(), 450);
        assert.ok(await page.locator('.arena-tiktok-chat-line.is-command').count() > 0);
        assert.equal(await page.locator('#arenaTikTokChatFeed').evaluate(n => n.scrollHeight - n.scrollTop - n.clientHeight < 3), true);
        console.log('CHAT_BURST', JSON.stringify(burst));
      });
      if (process.env.ARENA_TEST_SCREENSHOTS) {
        await mkdir(process.env.ARENA_TEST_SCREENSHOTS, { recursive: true });
        await page.evaluate(() => { gameState = 'LOBBY'; applyPlayerCountPreset(128); });
        await page.locator('#btnFullscreenDual').click();
        await page.evaluate(() => renderBothScreensSimultaneously());
        await page.screenshot({ path: join(process.env.ARENA_TEST_SCREENSHOTS, 'stream-128.png') });
      }
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  const sourceHashes = sources.map(([source, content]) => {
    const bytes = Buffer.from(content);
    return { source, version: content.match(/version: '([\d.]+)'/)?.[1],
      gitBlob: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') };
  });
  const report = { passed: checks.length, errors: errors.length, checks, measurements, sourceHashes,
    environment: { node: process.version, browser: await browser.version(), gpu: 'disabled; software raster and readback included', viewport: '1720x720', simulationHz: 60,
      workload: 'Constant-population timings disable knockback in both sources and suppress autonomous specials; subsequent stress checks restore full knockback and specials.' } };
  if (process.env.ARENA_PERF_REPORT) await writeFile(process.env.ARENA_PERF_REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
