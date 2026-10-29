// Normalize viewer-specific TikTok LIVE events once, never from room totals.
// Account handles are intentionally stricter than arbitrary chat display names.
const handlePattern=/^[a-zA-Z0-9_.-]{1,24}$/;
const invisible=/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e]/g;
function viewerHandle(event){
  if(!event||typeof event!=='object')return null;
  const user=event.user&&typeof event.user==='object'?event.user:{};
  const raw=user.uniqueId||user.displayId||user.unique_id||user.display_id
    ||event.uniqueId||event.displayId||event.unique_id||event.display_id;
  const handle=String(raw??'').replace(/^@+/,'').replace(invisible,'').trim().slice(0,24);
  return handlePattern.test(handle)?'@'+handle:null;
}
function eventId(event){
  return String(event.common?.msgId??event.msgId??event.messageId??event.id??'').slice(0,100);
}

/** Normalize a single per-update TikTok LIKE event, never cumulative totals. */
export function normalizeTikTokLike(event){
  const username=viewerHandle(event);
  if(!username)return null;
  const count=Number(event.count);
  if(!Number.isSafeInteger(count)||count<=0)return null;
  return {type:'social',platformKey:'tiktok',eventType:'taps',username,
    count:Math.min(count,10000),eventId:eventId(event)};
}

/** A genuine SHARE targets its own viewer, not a random spectator. */
export function normalizeTikTokShare(event){
  const username=viewerHandle(event);
  if(!username)return null;
  return {type:'social',platformKey:'tiktok',eventType:'share',username,eventId:eventId(event)};
}

/** Viewer-targeted follows/gifts/subscriptions; streak rewards only at the end. */
export function normalizeTikTokSupport(eventType,event){
  if(!['follow','gift','subscribe'].includes(eventType))return null;
  const username=viewerHandle(event);
  if(!username)return null;
  if(eventType==='gift'){
    const streak=Number(event.giftType??event.gift?.giftType??0)===1;
    if(streak&&event.repeatEnd!==true&&event.repeatEnd!==1)return null;
  }
  const value={type:'social',platformKey:'tiktok',eventType,username,eventId:eventId(event)};
  if(eventType==='gift'){
    value.giftName=String(event.gift?.name??event.giftName??'Regalo').slice(0,56);
    const repeat=Number(event.repeatCount??1);
    value.repeatCount=Number.isSafeInteger(repeat)&&repeat>0?Math.min(repeat,1000):1;
  }
  return value;
}

/** Room population is informational: it never adds a fighter. */
export function normalizeTikTokRoomUser(event){
  const count=Number(event?.viewerCount??event?.userCount??event?.roomUserCount);
  if(!Number.isSafeInteger(count)||count<0||count>10_000_000)return null;
  return {type:'audience',platformKey:'tiktok',eventType:'roomUser',count};
}
export function normalizeTikTokMember(event){
  const username=viewerHandle(event);
  if(!username)return null;
  return {type:'audience',platformKey:'tiktok',eventType:'member',username};
}
