/** Normalize a single per-update TikTok LIKE event. Never use cumulative room totals. */
export function normalizeTikTokLike(event) {
  if (!event || typeof event !== 'object') return null;
  const user = event.user && typeof event.user === 'object' ? event.user : {};
  // v2.5 protobuf payloads use displayId; older connectors used uniqueId.
  const rawId = user.uniqueId || user.displayId || user.unique_id || user.display_id
    || event.uniqueId || event.displayId || event.unique_id || event.display_id;
  const username = String(rawId ?? '')
    .replace(/^@+/, '')
    .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e]/g, '')
    .trim()
    .slice(0, 24);
  // "count" is the delta for this event, "total" is cumulative: don't replay totals.
  const count = Number(event.count);
  if (!username || !Number.isSafeInteger(count) || count <= 0) return null;
  return {
    type: 'social',
    platformKey: 'tiktok',
    eventType: 'taps',
    username: '@' + username,
    count: Math.min(count, 10000),
    eventId: String(event.common?.msgId ?? event.msgId ?? event.messageId ?? event.id ?? '').slice(0, 100)
  };
}

/** A genuine SHARE event targets its own viewer, never a random spectator. */
export function normalizeTikTokShare(event) {
  if(!event||typeof event!=='object')return null;
  const user=event.user&&typeof event.user==='object'?event.user:{};
  const raw=user.uniqueId||user.displayId||user.unique_id||user.display_id
    ||event.uniqueId||event.displayId||event.unique_id||event.display_id;
  const username=String(raw??'').replace(/^@+/,'')
    .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e]/g,'').trim().slice(0,24);
  if(!username||!/^[a-zA-Z0-9_.-]+$/.test(username))return null;
  return {type:'social',platformKey:'tiktok',eventType:'share',username:'@'+username,
    eventId:String(event.common?.msgId??event.msgId??event.messageId??event.id??'').slice(0,100)};
}

/**
 * Verified, viewer-targeted LIVE support. Unlike room totals, each item
 * represents an actual viewer event. Never infer paid events from chat.
 */
export function normalizeTikTokSupport(eventType,event) {
  if(!['follow','gift','subscribe'].includes(eventType)||!event||typeof event!=='object')return null;
  const user=event.user&&typeof event.user==='object'?event.user:{};
  const raw=user.uniqueId||user.displayId||user.unique_id||user.display_id
    ||event.uniqueId||event.displayId||event.unique_id||event.display_id;
  const username=String(raw??'').replace(/^@+/,'')
    .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e]/g,'').trim().slice(0,24);
  if(!/^[a-zA-Z0-9_.-]{1,24}$/.test(username))return null;
  // Streak gifts are updated throughout a streak; only the final repeatEnd
  // (or a single gift) may trigger one game benefit.
  if(eventType==='gift'){
    const streak=Number(event.giftType??event.gift?.giftType??0)===1;
    if(streak && event.repeatEnd!==true && event.repeatEnd!==1)return null;
  }
  const value={
    type:'social',platformKey:'tiktok',eventType,username:'@'+username,
    eventId:String(event.common?.msgId??event.msgId??event.messageId??event.id??'').slice(0,100)
  };
  if(eventType==='gift'){
    value.giftName=String(event.gift?.name??event.giftName??'Regalo').slice(0,56);
    const repeat=Number(event.repeatCount??1);
    value.repeatCount=Number.isSafeInteger(repeat)&&repeat>0?Math.min(repeat,1000):1;
  }
  return value;
}
export function normalizeTikTokRoomUser(event) {
  const count=Number(event?.viewerCount??event?.userCount??event?.roomUserCount);
  if(!Number.isSafeInteger(count)||count<0||count>10_000_000)return null;
  return {type:'audience',platformKey:'tiktok',eventType:'roomUser',count};
}
export function normalizeTikTokMember(event) {
  const user=event?.user&&typeof event.user==='object'?event.user:{};
  const raw=user.uniqueId||user.displayId||event?.uniqueId||event?.displayId;
  const name=String(raw??'').replace(/^@+/,'').trim().slice(0,24);
  if(!/^[a-zA-Z0-9_.-]{1,24}$/.test(name))return null;
  return {type:'audience',platformKey:'tiktok',eventType:'member',username:'@'+name};
}
