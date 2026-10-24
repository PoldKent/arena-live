import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const visibleVersion = pkg.version.split('.').slice(0, 2).join('.');
const escapedVersion = pkg.version.replaceAll('.', '\\.');
const escapedVisibleVersion = visibleVersion.replaceAll('.', '\\.');

test('the published package, title, Settings footer and API share one release', () => {
  assert.match(html, new RegExp('<title>Arena Live v' + escapedVisibleVersion));
  assert.match(html, new RegExp('id="arenaVersionInfo"[^>]*>Arena Live v' + escapedVisibleVersion));
  assert.match(html, new RegExp("version: '" + escapedVersion + "'"));
  assert.match(html, new RegExp("const ARENA_RELEASE_VERSION = '" + escapedVisibleVersion + "'"));
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

