import {readEngineSource} from './read-engine-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = await readEngineSource();

test('fullscreen hide rule excludes the right vertical stage', () => {
  assert.match(html, /#broadcastStageSection:fullscreen>:not\(#arenaDualOperatorDock\):not\(#arenaDualUltrawideVerticalStage\):not\(#arenaStreamLeftColumn\) \{display:none!important;?\}/);
});

test('both game viewports and ultrawide mounts have unique ids', () => {
  for (const id of ['arenaDualUltrawideVerticalStage','arenaDualCenterStageMount','viewport9x16','viewport16x9']) {
    assert.equal(html.split('id="' + id + '"').length - 1, 1);
  }
});

test('right-side 9:16 column has vertical priority', () => {
  assert.match(html, /grid-template-columns:var\(--arena-stream-width,260px\) minmax\(0,1fr\) min\(56\.25dvh,23\.5vw\)!important;/);
  assert.match(html, /moveArenaDualMonitorNode\('card-9x16', 'arenaDualUltrawideVerticalStage'\)/);
  assert.match(html, /function unmountArenaDualTools\(\) \{\s*restoreArenaDualMonitorNodes\(\)/);
});

test('ultrawide detection supports Windows display scaling', () => {
  assert.match(html, /window\.innerWidth >= 1600 && window\.innerHeight >= 680/);
  assert.match(html, /window\.innerWidth \/ Math\.max\(1, window\.innerHeight\)\) >= 2\.18/);
});

