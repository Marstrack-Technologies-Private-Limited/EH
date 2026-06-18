import { useNavigate } from "react-router-dom";
import { MapPin, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import { UserAvatar } from "@/components/user-avatar.jsx";
import { MatchRing } from "@/components/match-ring.jsx";
import { useApp } from "@/store/app-store.jsx";

/**
 * Search / match result card.
 * match: { offerer, score, sharedTopicIds, locationLabel } from useMatches.
 */
export function OffererCard({ match }) {
  const navigate = useNavigate();
  const { topicIndex } = useApp();
  const { offerer, score, sharedTopicIds = [], locationLabel } = match;

  const shared = sharedTopicIds
    .map((id) => topicIndex.topics[id]?.name)
    .filter(Boolean);
  const otherCount = (offerer.topics?.length || 0) - shared.length;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <button onClick={() => navigate(`/u/${offerer.id}`)} className="shrink-0 cursor-pointer">
            <UserAvatar user={offerer} className="size-14" showStatus />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button
                  onClick={() => navigate(`/u/${offerer.id}`)}
                  className="truncate font-semibold hover:underline cursor-pointer"
                >
                  {offerer.name}
                </button>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  {offerer.city}, {offerer.country}
                  <span className="text-muted-foreground/40">·</span>
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                    {locationLabel}
                  </Badge>
                </div>
              </div>
              {typeof score === "number" && <MatchRing score={score} size={50} />}
            </div>

            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{offerer.bio}</p>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <StarRating value={offerer.rating} size="sm" />
                <span className="font-medium text-foreground">{offerer.rating.toFixed(1)}</span>
                ({offerer.reviewsCount})
              </span>
              {offerer.responseMins != null && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" /> ~{offerer.responseMins}m reply
                </span>
              )}
              {offerer.hourlyRate != null && (
                <span className="font-medium text-foreground">${offerer.hourlyRate}/hr</span>
              )}
            </div>

            {shared.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {shared.slice(0, 4).map((name) => (
                  <Badge key={name} variant="offerer">
                    {name}
                  </Badge>
                ))}
                {otherCount > 0 && <Badge variant="muted">+{otherCount} more</Badge>}
              </div>
            )}

            <div className="mt-3 flex gap-2">
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
}
