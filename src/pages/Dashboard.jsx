import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Compass,
  MessagesSquare,
  Star,
  Users,
  Tag,
  Layers,
  TrendingUp,
  ArrowRight,
  MapPin,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Progress } from "@/components/ui/progress.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import { KpiCard } from "@/components/kpi-card.jsx";
import { OffererCard } from "@/components/offerer-card.jsx";
import { UserAvatar } from "@/components/user-avatar.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useApp } from "@/store/app-store.jsx";
import { useMatches } from "@/hooks/use-matches.js";
import { timeAgo } from "@/lib/utils.js";

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === "admin") return <AdminDashboard />;
  if (user.role === "offerer") return <OffererDashboard />;
  return <SeekerDashboard />;
}

function Wrap({ children }) {
  return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">{children}</div>;
}

function MyConversations() {
  const { user } = useAuth();
  const { state, topicIndex } = useApp();
  const navigate = useNavigate();
  const convos = state.conversations.filter((c) => c.participants.includes(user.id));

  if (convos.length === 0) return null;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent messages</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/chat">View all <ArrowRight className="size-4" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {convos.slice(0, 4).map((c) => {
          const otherId = c.participants.find((p) => p !== user.id);
          const other = state.users.find((u) => u.id === otherId);
          const last = c.messages[c.messages.length - 1];
          if (!other) return null;
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/chat/${otherId}`)}
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent cursor-pointer"
            >
              <UserAvatar user={other} className="size-10" showStatus />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{other.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(last.ts)}</span>
                </div>
                <p className="truncate text-sm text-muted-foreground">{last.text}</p>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ---------------- Seeker ---------------- */
function SeekerDashboard() {
  const { user } = useAuth();
  const matches = useMatches(user);
  const top = matches.slice(0, 3);
  const online = matches.filter((m) => m.offerer.online).length;

  return (
    <Wrap>
      <PageHeader
        title={`Hi ${user.name.split(" ")[0]} 👋`}
        description="Here's who can help you right now."
        actions={
          <Button asChild>
            <Link to="/search"><Compass className="size-4" /> Discover offerers</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="Matches" value={matches.length} subtitle="based on your topics" icon={<Sparkles className="size-5" />} accent="seeker" />
        <KpiCard title="Online now" value={online} subtitle="available to chat" icon={<MessagesSquare className="size-5" />} accent="offerer" />
        <KpiCard title="Your topics" value={user.topics.length} subtitle="interests" icon={<Tag className="size-5" />} accent="primary" />
        <KpiCard title="Best match" value={top[0] ? `${top[0].score}%` : "—"} subtitle={top[0]?.offerer.name} icon={<TrendingUp className="size-5" />} accent="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your top matches</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/matches">See all <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
          {top.length ? (
            top.map((m) => <OffererCard key={m.offerer.id} match={m} />)
          ) : (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No matches yet — add more topics to your profile.</CardContent></Card>
          )}
        </div>
        <MyConversations />
      </div>
    </Wrap>
  );
}

/* ---------------- Offerer ---------------- */
function OffererDashboard() {
  const { user } = useAuth();
  const { state } = useApp();
  const myReviews = state.reviews.filter((r) => r.offererId === user.id);
  const completeness = Math.min(
    100,
    (user.bio ? 25 : 0) + (user.topics.length ? 35 : 0) + (user.avatar ? 15 : 10) + (user.reviewsCount ? 25 : 0),
  );

  return (
    <Wrap>
      <PageHeader
        title={`Hi ${user.name.split(" ")[0]} 👋`}
        description="Your offerer overview."
        actions={
          <Button asChild variant="outline">
            <Link to="/profile">Edit profile</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="Rating" value={user.rating ? user.rating.toFixed(1) : "—"} subtitle={`${user.reviewsCount} reviews`} icon={<Star className="size-5" />} accent="amber" />
        <KpiCard title="Skills offered" value={user.topics.length} subtitle="topics" icon={<Tag className="size-5" />} accent="offerer" />
        <KpiCard title="Conversations" value={state.conversations.filter((c) => c.participants.includes(user.id)).length} subtitle="active chats" icon={<MessagesSquare className="size-5" />} accent="primary" />
        <KpiCard title="Avg. reply" value={user.responseMins ? `${user.responseMins}m` : "—"} subtitle="response time" icon={<TrendingUp className="size-5" />} accent="seeker" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Profile strength</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">{completeness}%</span>
              <Badge variant={completeness >= 80 ? "success" : "warning"}>
                {completeness >= 80 ? "Great" : "Add more"}
              </Badge>
            </div>
            <Progress value={completeness} />
            <p className="text-sm text-muted-foreground">
              A complete profile ranks higher in seeker matches.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/profile">Improve profile</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Latest feedback</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link to="/reviews">All reviews <ArrowRight className="size-4" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {myReviews.length ? (
              myReviews.slice(0, 3).map((r) => (
                <div key={r.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{r.seekerName}</span>
                    <StarRating value={r.rating} size="sm" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <MyConversations />
    </Wrap>
  );
}

/* ---------------- Admin ---------------- */
function AdminDashboard() {
  const { state } = useApp();
  const topicCount = state.categories.reduce((s, c) => s + c.topics.length, 0);
  const seekers = state.users.filter((u) => u.role === "seeker").length;
  const offerers = state.users.filter((u) => u.role === "offerer").length;

  return (
    <Wrap>
      <PageHeader
        title="Admin dashboard"
        description="Platform overview and taxonomy management."
        actions={<Button asChild><Link to="/admin"><Layers className="size-4" /> Manage taxonomy</Link></Button>}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="Users" value={state.users.length} subtitle={`${seekers} seekers · ${offerers} offerers`} icon={<Users className="size-5" />} accent="primary" />
        <KpiCard title="Categories" value={state.categories.length} icon={<Layers className="size-5" />} accent="offerer" />
        <KpiCard title="Topics" value={topicCount} icon={<Tag className="size-5" />} accent="seeker" />
        <KpiCard title="Reviews" value={state.reviews.length} icon={<Star className="size-5" />} accent="amber" />
      </div>

      <Card>
        <CardHeader><CardTitle>Categories at a glance</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-0">
          {state.categories.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-muted-foreground">{c.topics.length} topics</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </Wrap>
  );
}
