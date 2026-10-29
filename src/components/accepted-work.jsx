import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { useOffererResponseIndex, useUsers } from "@/hooks/use-p2p.js";
import { latestPerOfferer, listSeeks, MAX_ANY_OF_VALUES } from "@/api/p2p.js";
import { RESPONSE_DECISION, USER_TYPE } from "@/api/config.js";

/**
 * Work in hand: requests where the seeker accepted this offerer's offer, in one
 * place on their profile (client, 2026-10-30). Each row opens the request on Seeker
 * Requests.
 */
export function AcceptedWork({ offererId }) {
  const responses = useOffererResponseIndex({ offererId });
  const seekers = useUsers({ type: USER_TYPE.SEEKER });
  const [seeks, setSeeks] = useState(new Map());

  // Newest acceptance per request.
  const accepted = useMemo(() => {
    const out = [];
    for (const list of responses.index.values()) {
      // The newest row is the current state (the seeker's answer may be a new row).
      const latest = latestPerOfferer(list).find((r) => r.offererId === offererId);
      if (latest?.decision === RESPONSE_DECISION.ACCEPT) out.push(latest);
    }
    return out.sort((a, b) => (b.respondedAt?.getTime() || 0) - (a.respondedAt?.getTime() || 0));
  }, [responses.index, offererId]);

  const ids = useMemo(() => accepted.map((r) => r.seekId), [accepted]);

  // The requests themselves, for the seeker and description.
  useEffect(() => {
    if (!ids.length) return;
    let cancelled = false;
    listSeeks(
      ids.length <= MAX_ANY_OF_VALUES
        ? { anyOf: { column: "OT_SEEK_ASSISTANCE_ID", values: ids } }
        : {},
    )
      .then((res) => {
        if (!cancelled) setSeeks(new Map(res.data.map((s) => [s.id, s])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const nameOf = (id) => seekers.data.find((u) => u.id === id)?.name || "A seeker";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="size-4 text-primary" /> Accepted work
          {accepted.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {accepted.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {responses.loading ? (
          <div className="shimmer h-12 rounded-lg" />
        ) : accepted.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            When a seeker accepts your offer, the request shows up here.
          </p>
        ) : (
          accepted.map((r) => {
            const seek = seeks.get(r.seekId);
            return (
              <Link
                key={r.seekId}
                to={`/requests?seek=${r.seekId}`}
                className="flex min-h-11 items-center gap-2 rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {seek ? nameOf(seek.seekerId) : "Request"}
                    {r.respondedAt && (
                      <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                        accepted your offer{" "}
                        {r.respondedAt.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </p>
                  {seek?.narration && (
                    <p className="truncate text-[11px] text-muted-foreground">{seek.narration}</p>
                  )}
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export default AcceptedWork;
