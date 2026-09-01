export function getApiBaseUrl() {
  const isDev =
    process.env.NODE_ENV === 'development' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  return process.env.REACT_APP_API_URL || (isDev ? 'http://localhost:5000' : 'https://api.votechs7academygroup.com');
}

export function resolveMediaUrl(fileUrl) {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
  return `${getApiBaseUrl()}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
}

export function normalizeMessage(raw) {
  if (!raw) return null;
  const msg = raw.data || raw;
  return {
    ...msg,
    read: Boolean(msg.read_at),
  };
}

export function formatChatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getInitials(name, fallback = '?') {
  if (!name || typeof name !== 'string') return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const CHAT_EMOJIS = [
  '😀', '😂', '😍', '🥰', '😊', '😎', '🙏', '👍', '👏', '🎉',
  '❤️', '🔥', '💯', '✅', '⭐', '🙌', '😢', '😡', '🤔', '👋',
  '💪', '🎓', '📚', '✏️', '📝', '📎', '📷', '🎥', '💬', '🕐',
];
