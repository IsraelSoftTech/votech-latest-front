/**
 * Keep calendar dates as YYYY-MM-DD in local time.
 * `toISOString()` and `new Date("YYYY-MM-DD")` both shift the day.
 */
function localYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toCalendarDateString(value) {
  if (value == null || value === "") return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return localYmd(value);
  }

  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  if (/^\d{4}-\d{2}-\d{2}T/.test(raw) || /^\d{4}-\d{2}-\d{2} /.test(raw)) {
    const parsed = new Date(raw.includes(" ") ? raw.replace(" ", "T") : raw);
    if (!Number.isNaN(parsed.getTime())) return localYmd(parsed);
  }

  return "";
}

export function formatCalendarDate(value, options) {
  const ymd = toCalendarDateString(value);
  if (!ymd) return "";
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(
    "en-US",
    options || { year: "numeric", month: "long", day: "numeric" }
  );
}

export function isOnOrAfterToday(value) {
  const day = toCalendarDateString(value);
  if (!day) return false;
  return day >= toCalendarDateString(new Date());
}
