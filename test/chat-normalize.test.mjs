import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTikTokChat, normalizeCreatorHandle } from '../bridge/chat-normalize.mjs';

test('retains creator handle including dot', () => {
  assert.equal(normalizeCreatorHandle('https://www.tiktok.com/@polkent.live'), 'polkent.live');
  assert.equal(normalizeCreatorHandle('@polkent.live'), 'polkent.live');
});

test('rejects malformed creator handles', () => {
  assert.throws(() => normalizeCreatorHandle('example.com/@name/else'));
  assert.throws(() => normalizeCreatorHandle('";console.log(123);//'));
});

test('routes TikTok comment, using uniqueId rather than display name', () => {
  assert.deepEqual(normalizeTikTokChat({ user: { uniqueId: 'viewer_1', nickname: 'Nombre visible' }, comment: '!guerrero', msgId: '123' }), {
    type: 'chat', platformKey: 'tiktok', username: '@viewer_1', message: '!guerrero', eventId: '123'
  });
});

test('preserves valid unicode and removes control characters', () => {
  const event = normalizeTikTokChat({ uniqueId: '@éxito_漢字', comment: '  Hola\n<script>alert(1)</script>\t' });
  assert.equal(event.username, '@éxito_漢字');
  assert.equal(event.message, 'Hola <script>alert(1)</script>');
});

test('ignores empty or malformed comments', () => {
  assert.equal(normalizeTikTokChat({ uniqueId: 'test', comment: ' ' }), null);
  assert.equal(normalizeTikTokChat({ comment: 'hola' }), null);
  assert.equal(normalizeTikTokChat(null), null);
});

test('bounds identifiers and message length to game input limits', () => {
  const event = normalizeTikTokChat({ uniqueId: 'x'.repeat(200), comment: 'á'.repeat(500) });
  assert.equal(event.username.length, 25);
  assert.equal(event.message.length, 160);
});
