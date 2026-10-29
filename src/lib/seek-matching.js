// Which seeks an offerer is shown — the one rule behind Seeker Requests, the
// offerer Dashboard and the requests list on a seeker's profile.
//
// Client rule (2026-10-27): an offerer sees ONLY the seekers who asked for what
// that offerer offers — nothing outside it. Category alone is too coarse: an
// offerer who helps with "Dealing with Anxiety" must not get every Mental Health
// request.
//
// The seek's topics and chosen offerer live in the single SP 1822 detail line
// ("Topics: a, b | To: Name (#12)"), so they are composed and parsed here too.

/** Collapse case and runs of spaces — live topic names contain double spaces. */
export const normName = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * The detail line for one seek ticket. `offererId` is written next to the name
 * so a later rename of the offerer cannot misroute or lose the request.
 */
export function composeSeekDetail({ topicNames = [], offererName = "", offererId = null }) {
  const parts = [];
  if (topicNames.length) parts.push(`Topics: ${topicNames.join(", ")}`);
  if (offererName) {
    parts.push(offererId != null ? `To: ${offererName} (#${offererId})` : `To: ${offererName}`);
  }
  return parts.join(" | ");
}

/**
 * Read a detail line back. `to` is the display name without the id suffix;
 * `toId` is null for lines written before the id was added.
 */
export function parseSeekDetail(text) {
  const t = String(text || "");
  const topics = /Topics:\s*([^|]*)/.exec(t)?.[1]?.trim() || "";
  const toRaw = /To:\s*([^|]*)/.exec(t)?.[1]?.trim() || "";
  const idMatch = /\(#(\d+)\)\s*$/.exec(toRaw);
  const to = idMatch ? toRaw.slice(0, idMatch.index).trim() : toRaw;
  return {
    topics,
    topicNames: topics ? topics.split(",").map((s) => s.trim()).filter(Boolean) : [],
    to,
    toId: idMatch ? Number(idMatch[1]) : null,
    raw: topics || toRaw ? "" : t.trim(),
  };
}

/**
 * What one offerer serves, from their own interests.
 *
 * @param areas  view 1703 rows ({categoryId})
 * @param topics view 1704 rows ({topicId, topicName, categoryId})
 *
 * A category picked as an area with NO topics under it means "the whole
 * category". Once the offerer names topics in a category, only those topics
 * count there.
 */
export function offererScope({ id, name, areas = [], topics = [] }) {
  const topicsByCategory = new Map();
  for (const t of topics) {
    if (t.categoryId == null) continue;
    if (!topicsByCategory.has(t.categoryId)) topicsByCategory.set(t.categoryId, new Map());
    topicsByCategory.get(t.categoryId).set(normName(t.topicName), t.topicName);
  }
  const wholeCategories = new Set(
    areas.map((a) => a.categoryId).filter((cid) => cid != null && !topicsByCategory.has(cid)),
  );
  const categoryIds = [...new Set([...wholeCategories, ...topicsByCategory.keys()])].filter(
    (cid) => cid > 0,
  );
  return { id: id == null ? null : Number(id), name: normName(name), topicsByCategory, wholeCategories, categoryIds };
}

/** Is this seek addressed to a named offerer, and is that this offerer? */
function addressedTo(detail, scope) {
  if (detail.toId != null) return detail.toId === scope.id;
  return !!scope.name && normName(detail.to) === scope.name;
}

/**
 * Should this offerer see this seek? Returns `{ visible, reason, sharedTopics }`.
 *
 *  - Sent to a named offerer      → only that offerer, nobody else.
 *  - Category not served          → hidden.
 *  - Seek names topics            → shown when the offerer offers at least one
 *                                   of them in that category, or serves the
 *                                   whole category. Otherwise hidden.
 *  - Seek names no topics         → a request to the whole category; shown to
 *                                   everyone serving it.
 */
export function matchSeekToOfferer(seek, detailText, scope) {
  const detail = parseSeekDetail(detailText);

  if (detail.to) {
    const mine = addressedTo(detail, scope);
    return { visible: mine, reason: mine ? "direct" : "sent-to-another", sharedTopics: [] };
  }

  const cid = seek.categoryId;
  const offered = scope.topicsByCategory.get(cid);
  const whole = scope.wholeCategories.has(cid);
  if (!offered && !whole) return { visible: false, reason: "category", sharedTopics: [] };

  if (!detail.topicNames.length) {
    return { visible: true, reason: "category-wide", sharedTopics: [] };
  }

  const sharedTopics = offered
    ? detail.topicNames.filter((n) => offered.has(normName(n)))
    : [];
  if (sharedTopics.length) return { visible: true, reason: "topic", sharedTopics };
  if (whole) return { visible: true, reason: "whole-category", sharedTopics: [] };
  return { visible: false, reason: "topic", sharedTopics: [] };
}
