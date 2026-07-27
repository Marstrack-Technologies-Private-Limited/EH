import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
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
