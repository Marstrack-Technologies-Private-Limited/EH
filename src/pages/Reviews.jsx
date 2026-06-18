import { Star } from "lucide-react";
import PageHeader from "@/components/layout/page-header.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useApp } from "@/store/app-store.jsx";
import { timeAgo } from "@/lib/utils.js";

export default function Reviews() {
  const { user } = useAuth();
  const { state, topicIndex } = useApp();
  const reviews = state.reviews.filter((r) => r.offererId === user.id);

  const dist = [5, 4, 3, 2, 1].map((n) => ({
    n,
    count: reviews.filter((r) => r.rating === n).length,
  }));
  const total = reviews.length;
  const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <PageHeader title="My reviews" description="Feedback seekers left after sessions with you." />

      {total === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Once you help seekers, their feedback shows up here." />
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
              <div className="text-center sm:border-r sm:pr-8">
                <p className="text-5xl font-bold">{avg.toFixed(1)}</p>
                <StarRating value={avg} className="mt-2 justify-center" />
                <p className="mt-1 text-sm text-muted-foreground">{total} reviews</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {dist.map((d) => (
                  <div key={d.n} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-muted-foreground">{d.n}</span>
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: total ? `${(d.count / total) * 100}%` : 0 }} />
                    </div>
                    <span className="w-6 text-right text-xs text-muted-foreground">{d.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.seekerName}</span>
                    <div className="flex items-center gap-2">
                      <StarRating value={r.rating} size="sm" />
                      <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                    </div>
                  </div>
                  {r.topicId && topicIndex.topics[r.topicId] && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      on {topicIndex.topics[r.topicId].name}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
