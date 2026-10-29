import { useMemo } from "react";
import { Star, Info, AlertCircle } from "lucide-react";
import PageHeader from "@/components/layout/page-header.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useMyRegNo, useRatings, useUsers } from "@/hooks/use-p2p.js";
import { averageStars } from "@/api/p2p.js";
import { USER_TYPE } from "@/api/config.js";
import { hasId } from "@/lib/utils.js";
import PageContainer from "@/components/layout/page-container.jsx";

function formatDate(d) {
  return d
    ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "";
}

/**
 * Ratings seekers gave this offerer after completed work — view 1906, filtered
 * server-side on OT_TO_OFFERER_ID. Saved by SP 1907 from the seeker's
 * "Your enquiries" list.
 *
 * Each rating names the request it was for (OT_SEEKERS_REQUEST_ID).
 */
export default function Reviews() {
  const { user } = useAuth();
  const { regNo } = useMyRegNo(user);
  const ratings = useRatings({ offererId: regNo });
  const seekers = useUsers({ type: USER_TYPE.SEEKER });

  const nameOf = useMemo(() => {
    const map = new Map(seekers.data.map((u) => [u.id, u.name]));
    return (id) => map.get(id) || `Seeker #${id}`;
  }, [seekers.data]);

  const rows = useMemo(
    () => [...ratings.data].sort((a, b) => (b.ratedAt?.getTime() || 0) - (a.ratedAt?.getTime() || 0)),
    [ratings.data],
  );
  const avg = averageStars(rows);
  const starsMissing = rows.length > 0 && rows.every((r) => r.stars == null);
  const dist = [5, 4, 3, 2, 1].map((n) => ({
    n,
    count: rows.filter((r) => r.stars === n).length,
  }));
  const rated = rows.filter((r) => r.stars != null).length;

  return (
    <PageContainer>
      <PageHeader
        title="My reviews"
        description="Ratings seekers left after you completed work for them."
      />

      {!hasId(regNo) ? (
        <p className="text-xs text-muted-foreground">Sign in as an Offerer to see your reviews.</p>
      ) : ratings.loading ? (
        <div className="space-y-2">
          <div className="shimmer h-24 rounded-lg" />
          <div className="shimmer h-16 rounded-lg" />
        </div>
      ) : ratings.error ? (
        <p className="text-xs text-destructive">{ratings.error} (view 1906)</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Once a seeker's request is complete they can rate you, and it shows up here."
        />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
              <div className="text-center sm:border-r sm:pr-8">
                <p className="text-4xl font-bold">{avg != null ? avg.toFixed(1) : "—"}</p>
                <StarRating value={avg || 0} className="mt-2 justify-center" />
                <p className="mt-1 text-sm text-muted-foreground">
                  {rows.length} review{rows.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex-1 space-y-1.5">
                {dist.map((d) => (
                  <div key={d.n} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-muted-foreground">{d.n}</span>
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: rated ? `${(d.count / rated) * 100}%` : 0 }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs text-muted-foreground">{d.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {starsMissing && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-dashed p-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">
                Star values are saved but view 1906 doesn't return them yet, so only the
                review text is shown.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {rows.map((r, i) => (
              <Card key={`${r.seekerId}-${r.ratedAt?.getTime() || i}`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {nameOf(r.seekerId)}
                      {r.seekId != null && (
                        <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">
                          #{r.seekId}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {r.stars != null && <StarRating value={r.stars} size="sm" />}
                      <span className="text-xs text-muted-foreground">{formatDate(r.ratedAt)}</span>
                    </div>
                  </div>
                  {r.comments && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {r.comments}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          Live from view 1906. Seekers can rate only after the work on their request is
          complete.
        </p>
      </div>
    </PageContainer>
  );
}
