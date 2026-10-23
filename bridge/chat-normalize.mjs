/** Convert a LIVE chat payload into an Arena Live message without allowing HTML or control characters. */
export function normalizeTikTokChat(event) {
  if (!event || typeof event !== 'object') return null;
  // Prefer the stable TikTok unique ID: display nicknames need not be unique.
  const user = event.user && typeof event.user === 'object' ? event.user : {};
  const rawId = user.uniqueId ?? event.uniqueId ?? user.unique_id ?? event.unique_id;
  const username = String(rawId ?? '')
    .replace(/^@+/, '')
    .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e]/g, '')
    .trim()
    .slice(0, 24);
  const text = String(event.comment ?? event.text ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, 160);
  if (!username || !text) return null;
  return {
    type: 'chat',
    platformKey: 'tiktok',
    username: `@${username}`,
    message: text,
    eventId: String(event.msgId ?? event.messageId ?? event.id ?? '').slice(0, 100),
  };
}

export function normalizeCreatorHandle(value) {
  const handle = String(value ?? '')
    .replace(/^https?:\/\/(?:www\.)?tiktok\.com\/@/i, '')
    .replace(/^@/, '')
    .trim();
  if (!/^[a-zA-Z0-9._]{2,32}$/.test(handle)) {
    throw new Error('TIKTOK_USERNAME debe ser un nombre de usuario válido de TikTok.');
  }
  return handle;
}
