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
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useCounts, useUsers } from "@/hooks/use-p2p.js";
import { USER_TYPE } from "@/api/config.js";
import { cn } from "@/lib/utils.js";
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
  const { counts, loading, error, reload } = useCounts();
  const offerers = useUsers({ type: USER_TYPE.OFFERER });

  return (
    <Wrap>
      <Heading
        title={`Hi ${String(user.name).split(" ")[0]}`}
        subtitle="People and topics available to you right now."
        action={
          <Button size="sm" className="h-9 shrink-0" asChild>
            <Link to="/search">
              <SearchIcon className="size-4" /> Discover
            </Link>
          </Button>
        }
      />

      <ErrorNote error={error} onRetry={reload} />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <Stat label="Offerers" value={counts?.offerers ?? 0} icon={Sparkles} loading={loading} />
        <Stat label="Categories" value={counts?.categories ?? 0} icon={Layers} loading={loading} />
        <Stat label="Topics" value={counts?.topics ?? 0} icon={Tag} loading={loading} />
        <Stat label="Services" value={counts?.services ?? 0} icon={Briefcase} loading={loading} />
      </div>

      <PeopleList
        title="Offerers on the platform"
        users={offerers.data.slice(0, 8)}
        loading={offerers.loading}
        error={offerers.error}
        reload={offerers.reload}
        emptyText="No offerers have registered yet."
      />
    </Wrap>
  );
}

/* ---------------- Offerer ---------------- */

function OffererDashboard() {
  const { user } = useAuth();
  const { counts, loading, error, reload } = useCounts();
  const seekers = useUsers({ type: USER_TYPE.SEEKER });

  return (
    <Wrap>
      <Heading
        title={`Hi ${String(user.name).split(" ")[0]}`}
        subtitle="Who is looking for help, and what you can offer."
        action={
          <Button size="sm" variant="outline" className="h-9 shrink-0" asChild>
            <Link to="/profile">Profile</Link>
          </Button>
        }
      />

      <ErrorNote error={error} onRetry={reload} />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <Stat label="Seekers" value={counts?.seekers ?? 0} icon={Users} loading={loading} />
        <Stat label="Categories" value={counts?.categories ?? 0} icon={Layers} loading={loading} />
        <Stat label="Topics" value={counts?.topics ?? 0} icon={Tag} loading={loading} />
        <Stat label="Services" value={counts?.services ?? 0} icon={Briefcase} loading={loading} />
      </div>

      <PeopleList
        title="Seekers looking for help"
        users={seekers.data.slice(0, 8)}
        loading={seekers.loading}
        error={seekers.error}
        reload={seekers.reload}
        emptyText="No seekers have registered yet."
      />
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
          to="/admin"
        />
        <Stat
          label="Topics"
          value={counts?.topics ?? 0}
          icon={Tag}
          loading={loading}
          to="/admin"
        />
        <Stat
          label="Services"
          value={counts?.services ?? 0}
          icon={Briefcase}
          loading={loading}
          to="/admin"
        />
        <Stat
          label="Members"
          value={counts?.users ?? 0}
          icon={Users}
          loading={loading}
          to="/admin"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-3">
        <Stat label="Seekers" value={counts?.seekers ?? 0} icon={SearchIcon} loading={loading} />
        <Stat label="Offerers" value={counts?.offerers ?? 0} icon={Sparkles} loading={loading} />
      </div>
    </Wrap>
  );
}
