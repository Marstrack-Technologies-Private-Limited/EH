import { useNavigate } from "react-router-dom";
import { MessageSquare, MapPin, Sparkles, Info } from "lucide-react";
import PageHeader from "@/components/layout/page-header.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { UserAvatar } from "@/components/user-avatar.jsx";
import { MatchRing } from "@/components/match-ring.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useApp } from "@/store/app-store.jsx";
import { useMatches } from "@/hooks/use-matches.js";
import { scoreLabel } from "@/lib/matching.js";

const BARS = [
  { key: "topics", label: "Topic overlap", max: 50 },
  { key: "proficiency", label: "Proficiency", max: 20 },
  { key: "reputation", label: "Reputation", max: 20 },
  { key: "location", label: "Location", max: 10 },
];

export default function Matches() {
  const { user } = useAuth();
  const { topicIndex } = useApp();
  const navigate = useNavigate();
  const matches = useMatches(user).filter((m) => m.score > 0);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <PageHeader
        title="Your top matches"
        description="Ranked by topic overlap, proficiency, reputation and location."
      />

      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            Each score blends how many of your topics an offerer covers (50%), their
            self-rated proficiency (20%), their review reputation (20%) and how close
            they are to you (10%). Online offerers get a small boost.
          </p>
        </CardContent>
      </Card>

      {matches.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No matches yet"
          description="Add a few topics of interest to your profile so we can find people for you."
          action={<Button onClick={() => navigate("/profile")}>Update profile</Button>}
        />
      ) : (
        <div className="space-y-4">
          {matches.map((m) => {
            const { offerer, score, breakdown, sharedTopicIds, locationLabel } = m;
            const lbl = scoreLabel(score);
            const shared = sharedTopicIds.map((id) => topicIndex.topics[id]?.name).filter(Boolean);
            return (
              <Card key={offerer.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:justify-center sm:border-r sm:pr-5">
                      <MatchRing score={score} size={68} />
                      <Badge variant={lbl.variant}>{lbl.label}</Badge>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <UserAvatar user={offerer} className="size-12" showStatus />
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => navigate(`/u/${offerer.id}`)}
                            className="font-semibold hover:underline cursor-pointer"
                          >
                            {offerer.name}
                          </button>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" /> {offerer.city} · {locationLabel}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <StarRating value={offerer.rating} size="sm" /> {offerer.rating.toFixed(1)} ({offerer.reviewsCount})
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{offerer.bio}</p>

                      {shared.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {shared.map((n) => (
                            <Badge key={n} variant="offerer">{n}</Badge>
                          ))}
                        </div>
                      )}

                      {/* breakdown */}
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {BARS.map((b) => {
                          const val = breakdown[b.key];
                          const pct = (val / b.max) * 100;
                          return (
                            <div key={b.key}>
                              <div className="mb-1 flex justify-between text-xs">
                                <span className="text-muted-foreground">{b.label}</span>
                                <span className="font-medium">{val}/{b.max}</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button size="sm" onClick={() => navigate(`/chat/${offerer.id}`)}>
                          <MessageSquare className="size-4" /> Message
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/u/${offerer.id}`)}>
                          View profile
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
