import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquareQuote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import { useRatings, useUsers } from "@/hooks/use-p2p.js";
import { hasId } from "@/lib/utils.js";

const PAGE = 5;

/**
 * Written reviews on a profile (client, 2026-10-30), newest first, five at a
 * time with "Show more".
 *
 *  - offerer: reviews seekers left them
 *  - seeker:  reviews they left for offerers — shows how they treat people
 */
export function MemberReviews({ regNo, type, own = false }) {
  const isOfferer = String(type).toUpperCase() === "OFFERER";
  const ratings = useRatings(isOfferer ? { offererId: regNo } : { seekerId: regNo });
  const users = useUsers();
  const [shown, setShown] = useState(PAGE);

  const nameOf = useMemo(() => {
    const map = new Map(users.data.map((u) => [u.id, u.displayName || u.name]));
    return (id) => map.get(id) || "A member";
  }, [users.data]);

  const rows = useMemo(
    () =>
      [...ratings.data].sort(
        (a, b) => (b.ratedAt?.getTime() || 0) - (a.ratedAt?.getTime() || 0),
      ),
    [ratings.data],
  );

  if (!hasId(regNo)) return null;

  const title = isOfferer
    ? own
      ? "Reviews you received"
      : "Reviews"
    : own
      ? "Reviews you wrote"
      : "Reviews they wrote";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <MessageSquareQuote className="size-4 text-primary" /> {title}
          {rows.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {rows.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ratings.loading ? (
          <div className="shimmer h-16 rounded-lg" />
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No reviews yet.</p>
        ) : (
          <>
            {rows.slice(0, shown).map((r, i) => {
              const otherId = isOfferer ? r.seekerId : r.offererId;
              return (
                <div key={`${r.seekerId}-${r.offererId}-${r.seekId}-${i}`} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      to={`/member/${otherId}`}
                      className="text-sm font-medium hover:text-primary hover:underline"
                    >
                      {isOfferer ? nameOf(otherId) : `For ${nameOf(otherId)}`}
                    </Link>
                    {r.stars != null && <StarRating value={r.stars} size="sm" />}
                    {r.ratedAt && (
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {r.ratedAt.toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  {r.comments && (
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
                      {r.comments}
                    </p>
                  )}
                </div>
              );
            })}
            {shown < rows.length && (
              <Button
                variant="outline"
                className="h-11 w-full md:h-9"
                onClick={() => setShown((n) => n + PAGE)}
              >
                Show more ({rows.length - shown} left)
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default MemberReviews;
