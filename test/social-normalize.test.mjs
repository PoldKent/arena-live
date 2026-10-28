import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTikTokLike, normalizeTikTokShare, normalizeTikTokSupport, normalizeTikTokRoomUser, normalizeTikTokMember } from '../bridge/social-normalize.mjs';

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

test('a verified share uses its account handle and event id without applying a tap',()=>{
  assert.deepEqual(normalizeTikTokShare({user:{displayId:'some_viewer'},common:{msgId:'share-123'}}),{
    type:'social',platformKey:'tiktok',eventType:'share',username:'@some_viewer',eventId:'share-123'
  });
  assert.equal(normalizeTikTokShare({user:{displayId:''}}),null);
  assert.equal(normalizeTikTokShare({user:{displayId:'bad name'}}),null);
});

test('LIVE follows and subscriptions target verified viewer handles',()=>{
 assert.deepEqual(normalizeTikTokSupport('follow',{user:{uniqueId:'abc'},msgId:'f1'}),{
  type:'social',platformKey:'tiktok',eventType:'follow',username:'@abc',eventId:'f1'
 });
 assert.equal(normalizeTikTokSupport('subscribe',{user:{displayId:'bad name'}}),null);
 assert.equal(normalizeTikTokSupport('follow',{uniqueId:'@sub_one'}).username,'@sub_one');
 assert.equal(normalizeTikTokSupport('social',{uniqueId:'viewer'}),null);
});
test('gift streak does not apply a boost until repeatEnd and sends one bounded event',()=>{
 const base={user:{displayId:'gift_viewer'},common:{msgId:'gift-3'},giftType:1,giftName:'Rose',repeatCount:5000};
 assert.equal(normalizeTikTokSupport('gift',{...base,repeatEnd:false}),null);
 assert.deepEqual(normalizeTikTokSupport('gift',{...base,repeatEnd:true}),{
  type:'social',platformKey:'tiktok',eventType:'gift',username:'@gift_viewer',eventId:'gift-3',
  giftName:'Rose',repeatCount:1000
 });
 assert.equal(normalizeTikTokSupport('gift',{user:{displayId:'a'},giftType:0})?.repeatCount,1);
});
test('viewer totals and member entries remain informational, never trigger attacks',()=>{
 assert.deepEqual(normalizeTikTokRoomUser({viewerCount:199}),{
  type:'audience',platformKey:'tiktok',eventType:'roomUser',count:199
 });
 assert.equal(normalizeTikTokRoomUser({viewerCount:-1}),null);
 assert.deepEqual(normalizeTikTokMember({user:{displayId:'viewer'}}),{
  type:'audience',platformKey:'tiktok',eventType:'member',username:'@viewer'
 });
});
