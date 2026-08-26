const TZ = "Africa/Douala";

export function getCameroonNowParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach((p) => {
    if (p.type !== "literal") map[p.type] = p.value;
  });
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function formatCameroonClock(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatTime12From24(timeStr) {
  if (!timeStr) return "—";
  const match = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;
  let h = Number(match[1]);
  const m = String(Number(match[2])).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/** Split "HH:mm" (24h) into 12-hour picker parts */
export function parse24To12Parts(timeStr) {
  const match = String(timeStr || "07:30").match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return { hour12: 7, minute: 30, period: "AM" };
  }
  const h24 = Number(match[1]);
  const minute = Number(match[2]);
  const period = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 || 12;
  return { hour12, minute, period };
}

/** Combine 12-hour picker parts into "HH:mm" (24h) for API */
export function format12PartsTo24(hour12, minute, period) {
  let h = Number(hour12);
  const m = Math.min(59, Math.max(0, Number(minute) || 0));
  if (period === "AM") {
    if (h === 12) h = 0;
  } else if (h !== 12) {
    h += 12;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);
export const HOUR12_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export function parseTimeToMinutes(timeValue) {
  if (!timeValue) return 0;
  const raw = String(timeValue).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function getMinutesInCameroonNow(date = new Date()) {
  const p = getCameroonNowParts(date);
  return p.hour * 60 + p.minute;
}

export function formatMinutesAs12h(totalMinutes) {
  const mins = Math.max(0, Number(totalMinutes) || 0);
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function normalizeGraceMinutes(value, fallback = 30) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(Math.round(n), 24 * 60);
}

function getCheckoutGraceMinutes(settings) {
  return normalizeGraceMinutes(settings?.checkout_grace_minutes_after_end, 30);
}

function getCheckoutCloseMinutes(settings) {
  const schoolEnd = parseTimeToMinutes(
    String(settings.school_end_time || "17:00:00").slice(0, 8)
  );
  return schoolEnd + getCheckoutGraceMinutes(settings);
}

function computeCheckOutAllowed(settings, nowMinutes) {
  const checkInOpens = parseTimeToMinutes(
    String(settings.check_in_opens_at || "06:00:00").slice(0, 8)
  );
  const schoolEnd = parseTimeToMinutes(
    String(settings.school_end_time || "17:00:00").slice(0, 8)
  );
  const checkoutClose = getCheckoutCloseMinutes(settings);

  if (nowMinutes > checkoutClose) return false;

  if (settings.allow_checkout_before_end) {
    return nowMinutes >= checkInOpens;
  }

  return nowMinutes >= schoolEnd;
}

export function buildScannerStatusFromSettings(settings, date = new Date()) {
  if (!settings) {
    return {
      check_in_allowed: false,
      check_out_allowed: false,
      check_in_opens_at_display: "—",
      school_end_time_display: "—",
      checkout_closes_at_display: "—",
      checkout_grace_minutes_after_end: 30,
      allow_checkout_before_end: false,
      check_in_before_open: false,
      check_in_after_close: false,
      check_out_before_school_end: false,
      check_out_after_close: false,
    };
  }

  const nowMinutes = getMinutesInCameroonNow(date);
  const checkInOpens = parseTimeToMinutes(
    String(settings.check_in_opens_at || "06:00:00").slice(0, 8)
  );
  const schoolEnd = parseTimeToMinutes(
    String(settings.school_end_time || "17:00:00").slice(0, 8)
  );
  const checkoutClose = getCheckoutCloseMinutes(settings);
  const grace = getCheckoutGraceMinutes(settings);
  const allowEarly = Boolean(settings.allow_checkout_before_end);

  return {
    check_in_allowed: nowMinutes >= checkInOpens && nowMinutes < schoolEnd,
    check_out_allowed: computeCheckOutAllowed(settings, nowMinutes),
    check_in_opens_at_display: formatTime12From24(
      String(settings.check_in_opens_at || "06:00").slice(0, 5)
    ),
    school_end_time_display: formatTime12From24(
      String(settings.school_end_time || "17:00").slice(0, 5)
    ),
    checkout_closes_at_display: formatMinutesAs12h(checkoutClose),
    checkout_grace_minutes_after_end: grace,
    allow_checkout_before_end: allowEarly,
    check_in_before_open: nowMinutes < checkInOpens,
    check_in_after_close: nowMinutes >= schoolEnd,
    check_out_before_school_end: nowMinutes < schoolEnd,
    check_out_after_close: nowMinutes > checkoutClose,
  };
}

export function parseQrToken(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const urlMatch = s.match(/[?&]token=([^&\s]+)/i);
  if (urlMatch) return decodeURIComponent(urlMatch[1]);
  const uuidMatch = s.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  if (uuidMatch) return uuidMatch[0];
  return s;
}

export function todayIsoDateInCameroon() {
  const p = getCameroonNowParts();
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
