import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Search as SearchIcon,
  Layers,
  Tag,
  Briefcase,
  Users,
  ArrowRight,
  RefreshCw,
  MapPin,
  AlertCircle,
  ChevronRight,
  LifeBuoy,
} from "lucide-react";
import { MatchRing } from "@/components/match-ring.jsx";
import { MemberActivity } from "@/components/member-activity.jsx";
import { useOffererMatches } from "@/hooks/use-offerer-matches.js";
import { isSeekOpen } from "@/api/p2p.js";
import { Button } from "@/components/ui/button.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import {
  useCounts,
  useMyRegNo,
  useOffererRequests,
  useSeeks,
  useUsers,
} from "@/hooks/use-p2p.js";
import { parseSeekDetail } from "@/lib/seek-matching.js";
import { USER_TYPE } from "@/api/config.js";
import { cn, hasId } from "@/lib/utils.js";
import PageContainer from "@/components/layout/page-container.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === "admin") return <AdminDashboard />;
  if (user.role === "offerer") return <OffererDashboard />;
  return <SeekerDashboard />;
}

function Wrap({ children }) {
  return <PageContainer className="space-y-3 md:space-y-4">{children}</PageContainer>;
}

function Heading({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold tracking-tight md:text-2xl">{title}</h1>
        <p className="text-xs text-muted-foreground md:text-sm">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

/** Compact live-count tile. Values come from the views, never from seed data. */
function Stat({ label, value, icon: Icon, loading, to }) {
  const body = (
    <>
      <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary md:size-9">
        <Icon className="size-3.5 md:size-4" />
      </div>
      {loading ? (
        // Placeholder sized to the number it replaces, so the tile doesn't jump
        // when the real count lands.
        <div
          className="shimmer mt-2 h-5 w-10 rounded md:mt-3 md:h-7 md:w-14"
          role="status"
          aria-label={`Loading ${label}`}
        />
      ) : (
        <p className="mt-2 text-xl font-bold tabular-nums leading-none md:mt-3 md:text-3xl">
          {value}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground md:text-sm">{label}</p>
    </>
  );
  const className =
    "rounded-lg border bg-card p-3 text-left transition-colors md:p-4";
  if (to)
    return (
      <Link to={to} className={cn(className, "hover:border-primary/50 hover:bg-accent/40")}>
        {body}
      </Link>
    );
  return <div className={className}>{body}</div>;
}

function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="text-xs break-words md:text-sm">{error}</p>
        <Button variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

/** Real people from MTVWUSERMASTER — no invented ratings or match scores. */
function PeopleList({ title, users, loading, error, reload, emptyText }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold md:text-base">{title}</h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={reload}
          disabled={loading}
          aria-label="Refresh"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      <ErrorNote error={error} onRetry={reload} />

      {/* Skeleton rows mirror the real card shape while the view loads. */}
      {loading &&
        !error &&
        Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-lg border bg-card px-3 py-2.5">
            <div className="shimmer h-3.5 w-2/5 rounded" />
            <div className="shimmer mt-1.5 h-3 w-3/5 rounded" />
            <div className="shimmer mt-1.5 h-3 w-1/3 rounded" />
          </div>
        ))}

      {!loading && !error && users.length === 0 && (
        <p className="rounded-lg border p-4 text-center text-xs text-muted-foreground">
          {emptyText}
        </p>
      )}

      {!loading &&
        !error &&
        users.map((u) => (
          <div
            key={`${u.id}-${u.email}`}
            className="rounded-lg border bg-card px-3 py-2.5"
          >
            <p className="truncate text-sm font-semibold leading-tight">
              {u.name || "(no name)"}
            </p>
            <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
              {u.email}
            </p>
            {(u.city || u.country) && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="size-3" />
                {[u.city, u.country].filter(Boolean).join(", ")}
              </p>
            )}
            {u.info && (
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{u.info}</p>
            )}
          </div>
        ))}
    </div>
  );
}

/* ---------------- Seeker ---------------- */

function SeekerDashboard() {
  const { user } = useAuth();
  const matches = useOffererMatches(user);
  const seeks = useSeeks({ seekerId: matches.regNo });

  const ranked = useMemo(
    () => matches.rows.filter((r) => r.isMatch).sort((a, b) => b.score - a.score),
    [matches.rows],
  );
  const openSeeks = seeks.data.filter(isSeekOpen).length;
  const needs = matches.myTopics.length + matches.myAreas.length;
  const hasNeeds = needs > 0;

  return (
    <Wrap>
      <Heading
        title={`Hi ${String(user.name).split(" ")[0]}`}
        subtitle="Your matches and requests at a glance."
        action={
          <Button size="sm" className="h-11 shrink-0 md:h-9" asChild>
            <Link to="/offerers">
              <SearchIcon className="size-4" /> Find offerers
            </Link>
          </Button>
        }
      />

      <ErrorNote error={matches.error || seeks.error} onRetry={matches.reload} />

      {/* Each tile is the seeker's own number and opens the page behind it. */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <Stat
          label="Matched offerers"
          value={ranked.length}
          icon={Sparkles}
          loading={matches.loading}
          to="/offerers?sort=match&matches=1"
        />
        <Stat
          label="Open requests"
          value={openSeeks}
          icon={LifeBuoy}
          loading={seeks.loading}
          to="/seek-assistance?tab=list"
        />
        <Stat
          label="My topics & areas"
          value={needs}
          icon={Tag}
          loading={matches.loading}
          to="/profile"
        />
        <Stat
          label="Offerers available"
          value={matches.rows.length}
          icon={Users}
          loading={matches.loading}
          to="/offerers?sort=name"
        />
      </div>

      <section>
        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
          Your track record
        </p>
        <MemberActivity regNo={matches.regNo} type="SEEKER" />
      </section>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold md:text-base">Your top matches</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-9 text-xs" asChild>
              <Link to="/offerers?sort=match">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={matches.reload}
              disabled={matches.loading}
              aria-label="Refresh"
            >
              <RefreshCw className={cn("size-3.5", matches.loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {matches.loading &&
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-lg border bg-card px-3 py-2.5">
              <div className="shimmer h-3.5 w-2/5 rounded" />
              <div className="shimmer mt-1.5 h-3 w-3/5 rounded" />
            </div>
          ))}

        {!matches.loading && !hasNeeds && (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Add the areas and topics you need help with, and your best-matched
              offerers will show here.
            </p>
            <Button size="sm" className="mt-3 h-11 md:h-9" asChild>
              <Link to="/profile">Add my needs</Link>
            </Button>
          </div>
        )}

        {!matches.loading && hasNeeds && ranked.length === 0 && (
          <p className="rounded-lg border p-4 text-center text-xs text-muted-foreground">
            No offerer covers your topics yet.{" "}
            <Link to="/offerers" className="text-primary hover:underline">
              Browse everyone
            </Link>
            .
          </p>
        )}

        {!matches.loading &&
          ranked.slice(0, 5).map((r) => (
            <Link
              key={`${r.offerer.id}-${r.offerer.email}`}
              to={`/member/${r.offerer.id}`}
              className="flex min-h-11 items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <MatchRing score={r.score} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">
                  {r.offerer.name || "(no name)"}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {[
                    ...r.topics.filter((t) => r.sharedTopicIds.includes(t.topicId)).map((t) => t.topicName),
                    ...r.areas.filter((a) => r.sharedCategoryIds.includes(a.categoryId)).map((a) => a.categoryName),
                  ].join(", ") || "—"}
                </p>
                {(r.offerer.city || r.offerer.country) && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="size-3" />
                    {[r.offerer.city, r.offerer.country].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
      </div>
    </Wrap>
  );
}

/* ---------------- Offerer ---------------- */

const topicsOf = (detailText) => parseSeekDetail(detailText).topics;

/**
 * The offerer's dashboard shows the open requests they are matched to — the
 * same topic-level rule as Seeker Requests (`lib/seek-matching.js`) — as just
 * name, category and topic. Email is left off on purpose.
 *
 * Accept / Decline is not here yet: there is no offerer-response SP to save it
 * or notify the seeker (PENDING-BACKEND.md §2).
 */
function OffererDashboard() {
  const { user } = useAuth();
  const { regNo } = useMyRegNo(user);
  const requests = useOffererRequests({ offererId: regNo, offererName: user?.name });
  const seekers = useUsers({ type: USER_TYPE.SEEKER });

  const nameById = useMemo(() => {
    const map = new Map();
    for (const u of seekers.data) map.set(u.id, u.name);
    return map;
  }, [seekers.data]);

  const categoryName = (id) =>
    requests.categories.find((c) => c.categoryId === id)?.categoryName || `Category ${id}`;

  const rows = useMemo(
    () => [...requests.data].sort((a, b) => b.id - a.id).slice(0, 8),
    [requests.data],
  );

  const loading = requests.loading || seekers.loading;
  const error = requests.error || seekers.error;
  const reloadRequests = requests.reload;
  const reloadSeekers = seekers.reload;
  const reload = useCallback(() => {
    reloadRequests();
    reloadSeekers();
  }, [reloadRequests, reloadSeekers]);

  return (
    <Wrap>
      <Heading
        title={`Hi ${String(user.name).split(" ")[0]}`}
        subtitle="Seekers who need help with what you offer."
        action={
          <Button size="sm" variant="outline" className="h-9 shrink-0" asChild>
            <Link to="/profile">Profile</Link>
          </Button>
        }
      />

      <section>
        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
          Your track record
        </p>
        <MemberActivity regNo={regNo} type="OFFERER" />
      </section>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold md:text-base">Seekers looking for help</h2>
          <div className="flex items-center gap-1">
            {requests.data.length > rows.length && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                <Link to="/requests">View all ({requests.data.length})</Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={reload}
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        <ErrorNote error={error} onRetry={reload} />

        {loading &&
          !error &&
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-lg border bg-card px-3 py-2.5">
              <div className="shimmer h-3.5 w-2/5 rounded" />
              <div className="shimmer mt-1.5 h-3 w-3/5 rounded" />
            </div>
          ))}

        {!loading && !error && hasId(regNo) && requests.categoryIds.length === 0 && requests.data.length === 0 && (
          <p className="rounded-lg border p-4 text-center text-xs text-muted-foreground">
            You don't serve any categories yet. Add your areas on your{" "}
            <Link to="/profile" className="text-primary hover:underline">
              profile
            </Link>{" "}
            and matching seekers will show up here.
          </p>
        )}

        {!loading && !error && (requests.categoryIds.length > 0 || requests.data.length > 0) && rows.length === 0 && (
          <p className="rounded-lg border p-4 text-center text-xs text-muted-foreground">
            No seekers need help in your categories right now.
          </p>
        )}

        {!loading &&
          !error &&
          rows.map((s) => {
            const topics = topicsOf(requests.details.get(s.id));
            return (
              <Link
                key={s.id}
                to={`/member/${s.seekerId}`}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">
                    {nameById.get(s.seekerId) || `Seeker ${s.seekerId}`}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                    {categoryName(s.categoryId)}
                    {topics && ` · ${topics}`}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
      </div>
    </Wrap>
  );
}

/* ---------------- Admin ---------------- */

function AdminDashboard() {
  const { counts, loading, error, reload } = useCounts();

  return (
    <Wrap>
      <Heading
        title="Admin dashboard"
        subtitle="Live platform totals."
        action={
          <Button size="sm" className="h-9 shrink-0" asChild>
            <Link to="/admin">
              <Layers className="size-4" /> Manage <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <ErrorNote error={error} onRetry={reload} />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <Stat
          label="Categories"
          value={counts?.categories ?? 0}
          icon={Layers}
          loading={loading}
          to="/admin?tab=categories"
        />
        <Stat
          label="Topics"
          value={counts?.topics ?? 0}
          icon={Tag}
          loading={loading}
          to="/admin?tab=topics"
        />
        <Stat
          label="Services"
          value={counts?.services ?? 0}
          icon={Briefcase}
          loading={loading}
          to="/admin?tab=services"
        />
        <Stat
          label="Members"
          value={counts?.users ?? 0}
          icon={Users}
          loading={loading}
          to="/admin?tab=members"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-3">
        <Stat
          label="Seekers"
          value={counts?.seekers ?? 0}
          icon={SearchIcon}
          loading={loading}
          to={`/admin?tab=members&type=${USER_TYPE.SEEKER}`}
        />
        <Stat
          label="Offerers"
          value={counts?.offerers ?? 0}
          icon={Sparkles}
          loading={loading}
          to={`/admin?tab=members&type=${USER_TYPE.OFFERER}`}
        />
      </div>
    </Wrap>
  );
}
