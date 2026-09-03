/**
 * Per-topic proficiency — device-local, and deliberately so.
 *
 * ⚠️ STOPGAP. There is nowhere on the backend to put this yet. Verified live
 * 2026-09-04:
 *
 *   - views 1703 / 1704 / 1699 carry no proficiency-like column;
 *   - SP 1705 (MT_INSERT_DELETE_USER_TOPICS) 501s on ANY extra key —
 *     PROFICIENCY, PROFICIENCYLEVEL, TOPICPROFICIENCY, USERPROFICIENCY,
 *     RATING, KNOWLEDGELEVEL, LEVEL, EXPERTISE all tried, all 501, while the
 *     same body without the extra key returns 201;
 *   - SPs 1706 / 1707 / 1708 (registered but undocumented) 501 on every
 *     proficiency-shaped parameter set tried.
 *
 * So the level is captured in the UI and kept in this browser, which is honest
 * about its reach: every screen that shows it says the value is stored on this
 * device. See PENDING-BACKEND.md § "Proficiency" for the parameter the backend
 * needs to add — once `@PROFICIENCY` lands on 1705 and the column on 1704,
 * delete this file and read/write the real field instead.
 *
 * Shape: { "<userId>": { "<topicId>": 1..5, overall: 1..5 } }
 */

const KEY = "eh.proficiency.v1";
const OVERALL = "overall";

const listeners = new Set();
let cache = null;

// One shared empty object for "this member has set nothing". A fresh {} per
// call would make useSyncExternalStore see a new snapshot on every render.
const NONE = Object.freeze({});

function readAll() {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function writeAll(next) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full quota — the value still holds for this session.
  }
  listeners.forEach((fn) => fn());
}

/** Clamp anything the UI or an old payload hands us onto the 1–5 scale. */
export function clampLevel(value, fallback = 3) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(5, Math.max(1, n));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Every level this member has set, keyed by topic id (as a string). */
export function getUserLevels(userId) {
  if (userId === null || userId === undefined || userId === "") return NONE;
  return readAll()[String(userId)] || NONE;
}

export function getLevel(userId, topicId, fallback = 3) {
  const stored = getUserLevels(userId)[String(topicId)];
  return stored === undefined ? fallback : clampLevel(stored, fallback);
}

export function setLevel(userId, topicId, level) {
  if (userId === null || userId === undefined || userId === "") return;
  const all = readAll();
  const key = String(userId);
  writeAll({
    ...all,
    [key]: { ...(all[key] || {}), [String(topicId)]: clampLevel(level) },
  });
}

/** Merge several at once — used when registration saves a whole selection. */
export function setLevels(userId, levels = {}) {
  if (userId === null || userId === undefined || userId === "") return;
  const entries = Object.entries(levels).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return;
  const all = readAll();
  const key = String(userId);
  const merged = { ...(all[key] || {}) };
  for (const [topicId, level] of entries) merged[String(topicId)] = clampLevel(level);
  writeAll({ ...all, [key]: merged });
}

export function removeLevel(userId, topicId) {
  if (userId === null || userId === undefined || userId === "") return;
  const all = readAll();
  const key = String(userId);
  if (!all[key] || all[key][String(topicId)] === undefined) return;
  const next = { ...all[key] };
  delete next[String(topicId)];
  writeAll({ ...all, [key]: next });
}

/** The single level an offerer gives at sign-up, before any topic is rated. */
export function getOverall(userId, fallback = 3) {
  const stored = getUserLevels(userId)[OVERALL];
  return stored === undefined ? fallback : clampLevel(stored, fallback);
}

export function setOverall(userId, level) {
  setLevel(userId, OVERALL, level);
}

export const OVERALL_KEY = OVERALL;
