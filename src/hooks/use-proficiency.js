import { useCallback, useSyncExternalStore } from "react";
import {
  OVERALL_KEY,
  clampLevel,
  getUserLevels,
  setLevel as writeLevel,
  setOverall as writeOverall,
  subscribe,
} from "@/lib/proficiency-store.js";
import { DEFAULT_PROFICIENCY } from "@/data/categories.js";

const EMPTY = {};

/**
 * A member's per-topic proficiency levels.
 *
 * Device-local until the backend has a field for it — see
 * `src/lib/proficiency-store.js` for what was probed and what is needed.
 */
export function useProficiency(userId) {
  const levels = useSyncExternalStore(
    subscribe,
    () => (userId === null || userId === undefined ? EMPTY : getUserLevels(userId)),
    () => EMPTY,
  );

  const levelOf = useCallback(
    (topicId, fallback = DEFAULT_PROFICIENCY) => {
      const stored = levels[String(topicId)];
      return stored === undefined ? fallback : stored;
    },
    [levels],
  );

  const setLevel = useCallback(
    (topicId, level) => writeLevel(userId, topicId, level),
    [userId],
  );

  const setOverall = useCallback((level) => writeOverall(userId, level), [userId]);

  return {
    levels,
    levelOf,
    setLevel,
    overall: clampLevel(levels[OVERALL_KEY] ?? DEFAULT_PROFICIENCY, DEFAULT_PROFICIENCY),
    setOverall,
  };
}

export default useProficiency;
