import { useMemo } from "react";
import { useMyRegNo, useOffererRequests, useOffererResponseIndex } from "@/hooks/use-p2p.js";
import { hasId } from "@/lib/utils.js";

/**
 * Counts shown as badges on nav items, keyed by route.
 *
 * Offerer: "/requests" = requests for what they offer that they haven't
 * answered yet. Everyone else gets no badges for now.
 */
export function useNavBadges(user) {
  const isOfferer = user?.role === "offerer";
  const { regNo } = useMyRegNo(isOfferer ? user : null);
  const enabled = isOfferer && hasId(regNo);

  const requests = useOffererRequests({ offererId: regNo, offererName: user?.name, enabled });
  const responses = useOffererResponseIndex({ offererId: regNo, enabled });

  return useMemo(() => {
    if (!enabled || requests.loading || responses.loading) return {};
    const unanswered = requests.data.filter((s) => !responses.index.has(s.id)).length;
    return unanswered ? { "/requests": unanswered } : {};
  }, [enabled, requests.loading, requests.data, responses.loading, responses.index]);
}

/** The little count bubble used by both navs. */
export const badgeLabel = (n) => (n > 99 ? "99+" : String(n));
