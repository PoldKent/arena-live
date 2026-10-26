import {readEngineSource} from './read-engine-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readEngineSource();
const client = await readFile(new URL('../bridge/bridge-client.js', import.meta.url), 'utf8');

test('dual fullscreen contains independent operator dock and original two game viewports', () => {
  for (const id of ['broadcastStageSection', 'btnFullscreenDual', 'arenaDualOperatorDock', 'dualMonitorsGrid', 'viewport16x9', 'viewport9x16', 'arenaOperatorPopover', 'arenaDualTikTokChat']) {
    assert.ok(html.includes('id="' + id + '"'), 'Missing ' + id);
  }
});

test('operator mode reuses rather than duplicates test/chat controls', () => {
  for (const id of ['audienceSimulatorPanel', 'chatSimulatorSidebar', 'btnAutoChat', 'chatFeed', 'targetFighterSelect']) {
    assert.equal(html.split('id="' + id + '"').length - 1, 1, id + ' duplicated');
  }
});

test('live mirror records chat before gameplay dispatch and supports browsing/export', () => {
  assert.match(client, /recordIncomingChat\(data\);[\s\S]*window\.ArenaLive\.sendChat/);
  for (const token of ['MAX_INCOMING_HISTORY = 50000', 'LIVE_WINDOW = 450', 'buttonOlder', 'buttonLatest', 'buttonExport']) {
    assert.ok(client.includes(token), 'Missing ' + token);
  }
});

