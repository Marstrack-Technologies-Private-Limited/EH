import { useNavigate, useParams, Link } from "react-router-dom";
import { MapPin, MessageSquare, Star, Calendar, ArrowLeft, Clock, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import { UserAvatar } from "@/components/user-avatar.jsx";
import { RoleBadge } from "@/components/role-badge.jsx";
import { OnlineDot } from "@/components/online-dot.jsx";
import { TopicList } from "@/components/topic-list.jsx";
import { MatchRing } from "@/components/match-ring.jsx";
import { ReviewDialog } from "@/components/review-dialog.jsx";
import { useApp } from "@/store/app-store.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { matchScore } from "@/lib/matching.js";
import { timeAgo } from "@/lib/utils.js";
import PageContainer from "@/components/layout/page-container.jsx";

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const { user: me } = useAuth();

  const person = state.users.find((u) => u.id === id);
  if (!person) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">User not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
      </PageContainer>
    );
  }

  const isOfferer = person.role === "offerer";
  const reviews = state.reviews.filter((r) => r.offererId === person.id);
  const match = isOfferer && me ? matchScore(me, person) : null;
  const canReview = me?.role === "seeker" && isOfferer && me.id !== person.id;

  return (
    <PageContainer>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="size-4" /> Back
      </Button>

      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/80 to-[var(--offerer)]/70" />
        <CardContent className="p-6 pt-0">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="rounded-full ring-4 ring-card">
                <UserAvatar user={person} className="size-24" showStatus />
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-bold">{person.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <RoleBadge role={person.role} />
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {person.city}, {person.country}</span>
                  <span className="inline-flex items-center gap-1"><OnlineDot online={person.online} /> {person.online ? "Online" : `Active ${timeAgo(person.lastActive)}`}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {canReview && <ReviewDialog offerer={person} />}
              {me?.id !== person.id && (
                <Button onClick={() => navigate(`/chat/${person.id}`)}>
                  <MessageSquare className="size-4" /> Message
                </Button>
              )}
            </div>
          </div>

          {/* stat row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {isOfferer && (
              <span className="inline-flex items-center gap-2">
                <StarRating value={person.rating} size="sm" />
                <span className="font-semibold">{person.rating ? person.rating.toFixed(1) : "New"}</span>
                <span className="text-muted-foreground">({person.reviewsCount} reviews)</span>
              </span>
            )}
            {person.responseMins != null && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-4" /> Replies in ~{person.responseMins}m
              </span>
            )}
            {person.hourlyRate != null && (
              <span className="font-semibold">${person.hourlyRate}/hr</span>
            )}
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="size-4" /> Joined {timeAgo(person.joinedAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>{isOfferer ? "About" : "Looking for"}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {isOfferer ? person.bio : person.problem || person.bio}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{isOfferer ? "Skills offered" : "Topics of interest"}</CardTitle></CardHeader>
            <CardContent>
              <TopicList
                topics={person.topics}
                showRating={isOfferer}
                highlightIds={match?.sharedTopicIds}
              />
            </CardContent>
          </Card>

          {isOfferer && (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2"><Star className="size-4" /> Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reviews.length ? (
                  reviews.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{r.seekerName}</span>
                        <div className="flex items-center gap-2">
                          <StarRating value={r.rating} size="sm" />
                          <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No reviews yet.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* match sidebar */}
        {match && (
          <div className="md:col-span-1">
            <Card className="md:sticky md:top-4">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-primary" /> Your match
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <MatchRing score={match.score} size={88} />
                <Badge variant="outline">{match.locationLabel}</Badge>
                <div className="w-full space-y-2 pt-2">
                  {Object.entries(match.breakdown).filter(([k]) => k !== "online").map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="capitalize text-muted-foreground">{k}</span>
                      <span className="font-medium">+{v}</span>
                    </div>
                  ))}
                </div>
                <Button className="mt-2 w-full" onClick={() => navigate(`/chat/${person.id}`)}>
                  Start chatting
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
