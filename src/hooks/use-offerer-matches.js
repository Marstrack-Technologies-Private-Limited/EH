import { useCallback, useMemo } from "react";
import { useInterestIndex, useMyRegNo, useUsers } from "@/hooks/use-p2p.js";
import { USER_TYPE } from "@/api/config.js";
import { liveMatchScore } from "@/lib/live-matching.js";

/**
 * Every offerer, scored against the signed-in seeker — the one source for
 * Find Offerers and the seeker Dashboard, so both show the same matches.
 *
 * Live objects: 1699 (offerers + the seeker's own location), 1703 + 1704
 * (everyone's areas and topics, read whole once and indexed).
 * The seeker's needs are the areas/topics on their Profile.
 */
export function useOffererMatches(user, { search } = {}) {
  const { regNo, loading: regLoading } = useMyRegNo(user);
  const offerers = useUsers({
    type: USER_TYPE.OFFERER,
    search,
    orderBy: "OM_USER_NAME",
    sortDir: "ASC",
  });
  const interests = useInterestIndex();

  const mine = interests.index.get(regNo);
  const seeker = useMemo(
    () => ({
      topicIds: new Set((mine?.topics || []).map((t) => t.topicId)),
      categoryIds: new Set([
        ...(mine?.areas || []).map((a) => a.categoryId),
        ...(mine?.topics || []).map((t) => t.categoryId).filter((id) => id != null),
      ]),
      city: user?.city || "",
      country: user?.country || "",
    }),
    [mine, user?.city, user?.country],
  );

  const rows = useMemo(
    () =>
      offerers.data
        .filter((o) => o.id !== regNo)
        .map((o) => {
          const entry = {
            offerer: o,
            areas: interests.index.get(o.id)?.areas || [],
            topics: interests.index.get(o.id)?.topics || [],
          };
          return { ...entry, ...liveMatchScore(seeker, entry) };
        }),
    [offerers.data, interests.index, seeker, regNo],
  );

  const reloadOfferers = offerers.reload;
  const reloadInterests = interests.reload;
  const reload = useCallback(() => {
    reloadOfferers();
    reloadInterests();
  }, [reloadOfferers, reloadInterests]);

  return {
    rows,
    regNo,
    myTopics: mine?.topics || [],
    myAreas: mine?.areas || [],
    loading: regLoading || offerers.loading || interests.loading,
    error: offerers.error || interests.error,
    reload,
  };
}
