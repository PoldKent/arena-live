import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('release v0.1 is visible in Settings and the API', () => {
  assert.match(html, /id="arenaSettingsVersion"[^>]*>Arena Live v0\.1/);
  assert.match(html, /version: '0\.1\.0'/);
  assert.match(html, /function updateArenaObsGeometrySummary\(\)/);
});
test('lobby overlays have no redundant streaming format tags', () => {
  const lobby16 = html.match(/<div id="lobbyOverlay16"[\s\S]*?<!-- Lobby Rule Selector Pill -->/);
  const lobby9 = html.match(/<div id="lobbyOverlay9"[\s\S]*?id="lobbyDetectedMode9"/);
  assert.ok(lobby16 && !lobby16[0].includes('Lobby 16:9 en Vivo'));
  assert.ok(lobby9 && !lobby9[0].includes('TikTok Live 9:16'));
});
test('OBS calibration offers right offset, fixed footer and reset', () => {
  for (const id of ['arenaObsVerticalOffset','arenaObsFooterHeight','arenaObsGeometrySummary','arenaObsResetCalibration']) {
    assert.ok(html.includes('id="'+id+'"'));
  }
  assert.match(html, /function resetArenaObsCalibration\(\)/);
  assert.match(html, /--arena-vertical-nudge/);
  assert.match(html, /--arena-operator-footer-height/);
});
