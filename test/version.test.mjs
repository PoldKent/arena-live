import {readEngineSource} from './read-engine-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html = await readEngineSource();
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
  const lobby16 = html.match(/<section id="lobbyOverlay16"[\s\S]*?<\/section>/);
  const lobby9 = html.match(/<section id="lobbyOverlay9"[\s\S]*?<\/section>/);
  assert.ok(lobby16 && !lobby16[0].includes('Lobby 16:9 en Vivo'));
  assert.ok(lobby9 && !lobby9[0].includes('TikTok Live 9:16'));
  for (const id of ['arenaAudienceGuide16','arenaAudienceGuide9','lobbyDetectedMode16','lobbyDetectedMode9','lobbyCountdownText16','lobbyCountdownText9']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.ok(lobby16[0].includes('!jugar') && lobby9[0].includes('!jugar'));
  for (const command of ['!guerrero','!kame','!shinobi','!rasen','!titan','!coloso','!rayo','!trueno','!espiritu','!enred']) {
    const guides = [...html.matchAll(/<aside id="arenaAudienceGuide(?:16|9)"[\s\S]*?<\/aside>/g)];
    assert.equal(guides.length,2);
    assert.ok(guides.every(match => match[0].includes(command)),command);
  }
});
test('OBS calibration offers right offset, fixed footer and reset', () => {
  for (const id of ['arenaObsVerticalOffset','arenaObsFooterHeight','arenaObsGeometrySummary','arenaObsResetCalibration']) {
    assert.ok(html.includes('id="'+id+'"'));
  }
  assert.match(html, /function resetArenaObsCalibration\(\)/);
  assert.match(html, /--arena-vertical-nudge/);
  assert.match(html, /--arena-operator-footer-height/);
});

