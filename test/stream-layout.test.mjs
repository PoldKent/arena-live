import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const ids = [...html.slice(0,html.indexOf('<script')).matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);

test('unique IDs and original synchronized canvases', () => {
  assert.equal(ids.length, new Set(ids).size);
  for(const id of ['canvas16x9','canvas9x16','viewport16x9','viewport9x16','arenaDualOperatorDock','arenaPrepSwitchBtn']) {
    assert.equal(ids.filter(x => x === id).length, 1, id);
  }
});
test('responsive preparation and manual switching', () => {
  assert.match(html, /function arenaPreparationDefaultFocus\(\)/);
  assert.match(html, /\(max-width:767px\)/);
  assert.match(html, /setMonitorFocus\(arenaPreparationDefaultFocus\(\)\)/);
  assert.match(html, /function setArenaPreparationView\(nextFocus\)/);
});
test('fullscreen retains portrait on the right and fixed operator bands', () => {
  assert.match(html, /grid-template-rows:34px minmax\(0,1fr\) var\(--arena-operator-footer-height,76px\)!important/);
  assert.match(html, /translateX\(var\(--arena-vertical-nudge,10px\)\)/);
  assert.match(html, /function fitArenaDualOperatorMonitors\(\)/);
  assert.match(html, /moveArenaDualMonitorNode\('card-9x16', 'arenaDualUltrawideVerticalStage'\)/);
  assert.match(html, /id="arenaStreamMenuRail"/);
});
test('operator controls use existing game handlers', () => {
  for(const id of ['arenaDualPauseBtn','arenaDualLobbyBtn','btnStreamerJoin','arenaDualSettingsBtn','arenaDualTestsToggle']) {
    assert.ok(ids.includes(id), id);
  }
});
test('portrait text scales with fighter counts', () => {
  assert.match(html, /portraitLabel = targetCtx === ctx9/);
  assert.match(html, /packedFighterCount <= 8 \? 12/);
  assert.match(html, /packedFighterCount <= 32 \? 10/);
});

