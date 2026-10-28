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
