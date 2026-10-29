// Seeker → offerer matching on LIVE data only.
//
// The older `matching.js` scores seed users and leans on ratings, reviews and
// online status — none of which the backend holds yet. This one uses only what
// the views actually return:
//   - topics of interest   (view 1704) — the strongest signal
//   - areas / categories   (view 1703)
//   - country + city       (view 1699)
// Proficiency and reputation join the score once the backend stores them
// (PENDING-BACKEND.md §4 and §7).

export const LIVE_WEIGHTS = { topics: 60, areas: 25, location: 15 };

const norm = (s) => String(s || "").trim().toLowerCase();

/**
 * @param seeker  { topicIds:Set, categoryIds:Set, city, country }
 * @param offerer { offerer, areas:[{categoryId}], topics:[{topicId}] }
 */
export function liveMatchScore(seeker, { offerer, areas, topics }) {
  const offTopics = new Set(topics.map((t) => t.topicId));
  const offAreas = new Set(areas.map((a) => a.categoryId));
  // An offerer's topics also imply their categories.
  for (const t of topics) if (t.categoryId != null) offAreas.add(t.categoryId);

  const sharedTopicIds = [...seeker.topicIds].filter((id) => offTopics.has(id));
  const sharedCategoryIds = [...seeker.categoryIds].filter((id) => offAreas.has(id));

  const topicCov = seeker.topicIds.size ? sharedTopicIds.length / seeker.topicIds.size : 0;
  const areaCov = seeker.categoryIds.size
    ? sharedCategoryIds.length / seeker.categoryIds.size
    : 0;

  let location = 0;
  let locationLabel = "Different country";
  if (seeker.city && norm(offerer.city) === norm(seeker.city)) {
    location = LIVE_WEIGHTS.location;
    locationLabel = "Same city";
  } else if (seeker.country && norm(offerer.country) === norm(seeker.country)) {
    location = LIVE_WEIGHTS.location * 0.6;
    locationLabel = "Same country";
  } else if (!offerer.country) {
    locationLabel = "Location not set";
  }

  const breakdown = {
    topics: Math.round(topicCov * LIVE_WEIGHTS.topics),
    areas: Math.round(areaCov * LIVE_WEIGHTS.areas),
    location: Math.round(location),
  };

  return {
    score: Math.min(100, breakdown.topics + breakdown.areas + breakdown.location),
    // "Matched" means they cover something the seeker asked for — location alone
    // is not a match.
    isMatch: sharedTopicIds.length > 0 || sharedCategoryIds.length > 0,
    sharedTopicIds,
    sharedCategoryIds,
    locationLabel,
    breakdown,
  };
}

export function liveScoreLabel(score) {
  if (score >= 75) return "Excellent match";
  if (score >= 50) return "Strong match";
  if (score >= 25) return "Fair match";
  return "Weak match";
}
