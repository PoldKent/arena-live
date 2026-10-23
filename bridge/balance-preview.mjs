// Playable opt-in preview. Uses the balance rules only, never the simulation's
// clock/RNG/DOM harness. Normal server startup does not load this module.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { balanceVariant } from '../test/balance-variants.mjs';

const tuning = JSON.parse(await readFile(new URL('../docs/balance-candidate-v0.5.json', import.meta.url), 'utf8'));
export function renderBalancePreview(productionHtml) {
  let html = balanceVariant(productionHtml, 'nearest', tuning);
  for (const [before, after] of [
    ["const ARENA_RELEASE_VERSION = '0.5';", "const ARENA_RELEASE_VERSION = '0.5 · equilibrio (prueba)';"],
    ["version: '0.5.0',", "version: '0.5.0-balance-preview',"],
    ['<title>', '<title>🧪 Equilibrio · '],
    ["const titleSource = 'Arena Live — Prototipo Interactivo para Streams';", "const titleSource = '🧪 Equilibrio · Arena Live';"]
  ]) {
    assert.ok(html.includes(before), 'Preview label must match this game version');
    html = html.replace(before, after);
  }
  return html;
}
