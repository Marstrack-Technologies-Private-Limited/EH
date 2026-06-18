// Core peer-matching algorithm.
// Scores an offerer against a seeker (0–100) from topic overlap, the offerer's
// self-rated proficiency on the shared topics, their review reputation, and
// location proximity — plus a small bonus for being online right now.
// Returns a transparent breakdown so the UI can explain *why* it matched.

const WEIGHTS = { topics: 50, proficiency: 20, reputation: 20, location: 10 };

export function matchScore(seeker, offerer) {
  const seekerTopicIds = (seeker.topics || []).map((t) => t.topicId);
  const offererTopics = new Map(
    (offerer.topics || []).map((t) => [t.topicId, t.rating ?? 3]),
  );
  const shared = seekerTopicIds.filter((id) => offererTopics.has(id));

  // 1) Topic coverage — share of the seeker's interests the offerer covers.
  const coverage = seekerTopicIds.length ? shared.length / seekerTopicIds.length : 0;
  const topicPts = coverage * WEIGHTS.topics;

  // 2) Average proficiency on the shared topics.
  const avgProf = shared.length
    ? shared.reduce((s, id) => s + (offererTopics.get(id) || 3), 0) / shared.length
    : 0;
  const profPts = (avgProf / 5) * WEIGHTS.proficiency;

  // 3) Offerer reputation from past reviews.
  const ratingPts = ((offerer.rating || 0) / 5) * WEIGHTS.reputation;

  // 4) Location proximity.
  let locPts = 2;
  let locationLabel = "Remote";
  if (seeker.city && offerer.city === seeker.city) {
    locPts = WEIGHTS.location;
    locationLabel = "Same city";
  } else if (seeker.country && offerer.country === seeker.country) {
    locPts = WEIGHTS.location * 0.6;
    locationLabel = "Same country";
  } else {
    locationLabel = "Different country";
  }

  const onlineBonus = offerer.online ? 3 : 0;
  const total = Math.min(
    100,
    Math.round(topicPts + profPts + ratingPts + locPts + onlineBonus),
  );

  return {
    score: total,
    sharedTopicIds: shared,
    coverage,
    locationLabel,
    breakdown: {
      topics: Math.round(topicPts),
      proficiency: Math.round(profPts),
      reputation: Math.round(ratingPts),
      location: Math.round(locPts),
      online: onlineBonus,
    },
  };
}

export function rankOfferers(seeker, offerers) {
  return offerers
    .map((offerer) => ({ offerer, ...matchScore(seeker, offerer) }))
    .sort((a, b) => b.score - a.score);
}

export function scoreLabel(score) {
  if (score >= 80) return { label: "Excellent match", variant: "success" };
  if (score >= 60) return { label: "Strong match", variant: "default" };
  if (score >= 40) return { label: "Fair match", variant: "warning" };
  return { label: "Weak match", variant: "muted" };
}
