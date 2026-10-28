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

test('routes v2.5 protobuf chat to the game with a stable handle and native message ID', () => {
  assert.deepEqual(normalizeTikTokChat({
    common: { msgId: '777001' },
    user: { displayId: 'viewer_actual', nickname: 'Nombre visible' },
    content: '!jugar'
  }), {
    type: 'chat', platformKey: 'tiktok', username: '@viewer_actual', message: '!jugar', eventId: '777001'
  });
});

test('prefers the stable uniqueId when both v2.5 and legacy IDs are present', () => {
  assert.deepEqual(normalizeTikTokChat({
    common: { msgId: '778' },
    user: { uniqueId: 'viewer_legacy', displayId: 'viewer_display' },
    content: '!rayo'
  }), {
    type: 'chat', platformKey: 'tiktok', username: '@viewer_legacy', message: '!rayo', eventId: '778'
  });
});

test('falls back to the modern displayId when legacy uniqueId is empty', () => {
  const event = normalizeTikTokChat({ user: { uniqueId: '', displayId: '@viewer2' }, content: 'hola' });
  assert.equal(event.username, '@viewer2');
  assert.equal(event.message, 'hola');
});
