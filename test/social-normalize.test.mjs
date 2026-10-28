import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTikTokLike } from '../bridge/social-normalize.mjs';

test('v2.5 LIKE event becomes viewer-targeted tap delta', () => {
  assert.deepEqual(normalizeTikTokLike({
    common: { msgId: 'like-123' },
    user: { displayId: 'viewer_actual', nickname: 'Nombre visible' },
    count: 7,
    total: 99999
  }), {
    type: 'social', platformKey: 'tiktok', eventType: 'taps',
    username: '@viewer_actual', count: 7, eventId: 'like-123'
  });
});

test('legacy IDs work without treating cumulative total as per-event taps', () => {
  assert.equal(normalizeTikTokLike({ user: { uniqueId: 'old_viewer' }, count: 3, total: 500 }).count, 3);
  assert.equal(normalizeTikTokLike({ user: { displayId: 'viewer' }, total: 500 }), null);
});

test('invalid or missing identities and counts cannot trigger social powers', () => {
  for (const event of [
    null, {}, { count: 20 }, { user: { displayId: 'a' } },
    { user: { displayId: 'a' }, count: 0 },
    { user: { displayId: 'a' }, count: -1 },
    { user: { displayId: 'a' }, count: 0.1 },
    { user: { displayId: 'a' }, count: 'NaN' },
    { user: { displayId: 'a' }, count: 2 ** 60 }
  ]) assert.equal(normalizeTikTokLike(event), null);
});

test('bounds huge batches and strips dangerous control characters', () => {
  const like = normalizeTikTokLike({
    user: { displayId: '@me\u0000ta' },
    count: 500000,
    common: { msgId: '77' }
  });
  assert.equal(like.username, '@meta');
  assert.equal(like.count, 10000);
  assert.equal(like.eventId, '77');
});
