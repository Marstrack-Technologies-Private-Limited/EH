import { useMemo } from "react";
import { useApp } from "@/store/app-store.jsx";
import { rankOfferers } from "@/lib/matching.js";

const DEFAULT_FILTERS = {
  query: "",
  categoryId: "all",
  topicId: "all",
  minRating: 0,
  location: "all", // all | city | country
  onlineOnly: false,
};

/**
 * Ranks offerers for the given seeker and applies search/filters.
 * Returns enriched results: { offerer, score, breakdown, sharedTopicIds, ... }.
 */
export function useMatches(seeker, filters = {}) {
  const { state } = useApp();
  const f = { ...DEFAULT_FILTERS, ...filters };

  return useMemo(() => {
    if (!seeker) return [];
    let offerers = state.users.filter((u) => u.role === "offerer");

    // location pre-filter
    if (f.location === "city") offerers = offerers.filter((o) => o.city === seeker.city);
    if (f.location === "country")
      offerers = offerers.filter((o) => o.country === seeker.country);
    if (f.onlineOnly) offerers = offerers.filter((o) => o.online);
    if (f.minRating) offerers = offerers.filter((o) => (o.rating || 0) >= f.minRating);

    // category / topic filter
    if (f.topicId && f.topicId !== "all")
      offerers = offerers.filter((o) => o.topics.some((t) => t.topicId === f.topicId));
    else if (f.categoryId && f.categoryId !== "all")
      offerers = offerers.filter((o) =>
        o.topics.some((t) => t.categoryId === f.categoryId),
      );

    // free-text query over name, bio, city, country
    const q = f.query.trim().toLowerCase();
    if (q)
      offerers = offerers.filter((o) =>
        [o.name, o.bio, o.city, o.country].filter(Boolean).join(" ").toLowerCase().includes(q),
      );

    return rankOfferers(seeker, offerers);
  }, [seeker, state.users, f.query, f.categoryId, f.topicId, f.minRating, f.location, f.onlineOnly]);
}

export { DEFAULT_FILTERS };
