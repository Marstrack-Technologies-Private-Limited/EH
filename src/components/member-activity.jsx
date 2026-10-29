import { useEffect, useState } from "react";
import { getMemberActivity } from "@/api/p2p.js";
import { hasId, cn } from "@/lib/utils.js";

/**
 * A member's track record as three small tiles — the numbers that tell the
 * other side whether this person is genuine (client, 2026-10-30).
 *
 *  - seeker:  requests posted · offers they accepted · ratings given
 *  - offerer: offers seekers accepted · ratings received · average stars
 *
 * Shown on their public profile, their own profile and their dashboard.
 */
export function MemberActivity({ regNo, type, className }) {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasId(regNo) || !type) return;
    let cancelled = false;
    setLoading(true);
    getMemberActivity({ regNo, type })
      .then((a) => !cancelled && setActivity(a))
      .catch(() => !cancelled && setActivity(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [regNo, type]);

  const isOfferer = String(type).toUpperCase() === "OFFERER";
  const tiles = isOfferer
    ? [
        ["Offers accepted", activity?.accepted],
        ["Ratings received", activity?.ratingsReceived],
        [
          "Average stars",
          activity?.averageStars != null ? activity.averageStars.toFixed(1) : activity ? "—" : null,
        ],
      ]
    : [
        ["Requests posted", activity?.raised],
        ["Offers accepted", activity?.accepted],
        ["Ratings given", activity?.ratingsGiven],
      ];

  if (!loading && !activity) return null;

  return (
    <dl className={cn("grid w-full grid-cols-3 gap-1.5", className)}>
      {tiles.map(([label, value]) => (
        <div key={label} className="rounded-lg bg-muted/60 px-1 py-2 text-center">
          {loading ? (
            <div className="shimmer mx-auto h-5 w-6 rounded" />
          ) : (
            <dd className="text-base font-bold">{value ?? 0}</dd>
          )}
          <dt className="text-[10px] leading-tight text-muted-foreground">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

export default MemberActivity;
