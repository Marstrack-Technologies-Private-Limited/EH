import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Is this a usable record id?
 *
 * Registration number 0 is a real member in this data, so `if (id)` silently
 * treats that member as "not signed in". Always test with this instead.
 */
export function hasId(id) {
  return id !== null && id !== undefined && id !== "" && Number.isFinite(Number(id));
}

export function initials(name = "") {
  const parts = String(name).split(" ").filter(Boolean);
  // Two words → one letter each ("Aisha Khan" → AK).
  if (parts.length > 1) {
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }
  // Single word (or a bare username) → its first two characters ("siddique" → SI).
  return (parts[0] || "").slice(0, 2).toUpperCase();
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

/**
 * A loaded Date as yyyy-mm-dd for a date input; "" for none or the SQL epoch
 * (an empty DATETIME is stored as 1900-01-01).
 *
 * Never `String(date).slice(0, 10)`: that yields "Mon May 05", which re-saves
 * as the year 2001.
 */
export function toYmd(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime()) || d.getFullYear() <= 1900) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
