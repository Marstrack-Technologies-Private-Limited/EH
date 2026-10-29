import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search as SearchIcon,
  RefreshCw,
  MapPin,
  Send,
  AlertCircle,
  Layers,
  Info,
  SlidersHorizontal,
  X,
  UserRound,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { LocationSelect } from "@/components/location-select.jsx";
import { MatchRing } from "@/components/match-ring.jsx";
import { useCategories, useTopics } from "@/hooks/use-p2p.js";
import { useOffererMatches } from "@/hooks/use-offerer-matches.js";
import { useAuth } from "@/hooks/use-auth.js";
import { liveScoreLabel } from "@/lib/live-matching.js";
import PageContainer from "@/components/layout/page-container.jsx";
import { cn, initials } from "@/lib/utils.js";

/** Debounce so a server round-trip doesn't fire on every keypress. */
function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const SORTS = [
  { value: "match", label: "Best match" },
  { value: "name", label: "Name A–Z" },
];

const norm = (s) => String(s || "").trim().toLowerCase();

/**
 * Find Offerers — the seeker's ONE place to search, filter and see matches
 * (client feedback 2026-10-15: Discover and Top Matches folded in here).
 *
 * Live: view 1699 for offerers (server-side LIKE search on name/email/city/
 * country), 1703/1704 for everyone's areas and topics, 1690/1693 for filters.
 * Match score = the seeker's Profile topics/areas + location — see
 * `lib/live-matching.js`.
 */
export default function Offerers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const [categoryId, setCategoryId] = useState(Number(params.get("category")) || 0);
  const [topicId, setTopicId] = useState(0);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [matchesOnly, setMatchesOnly] = useState(params.get("matches") === "1");
  const sort = params.get("sort") === "name" ? "name" : "match";
  const [showFilters, setShowFilters] = useState(false);

  const { rows, myTopics, myAreas, loading, error, reload } = useOffererMatches(user, {
    search,
  });
  const categories = useCategories();
  const topics = useTopics({ categoryId: categoryId || undefined, enabled: categoryId > 0 });

  const setSort = (v) =>
    setParams(
      (p) => {
        p.set("sort", v);
        return p;
      },
      { replace: true },
    );

  // Category / topic / location live on different views than the offerers, and
  // this API can't join, so they narrow the already-loaded list here.
  const results = useMemo(() => {
    let list = rows;
    if (topicId) list = list.filter((r) => r.topics.some((t) => t.topicId === topicId));
    else if (categoryId)
      list = list.filter(
        (r) =>
          r.areas.some((a) => a.categoryId === categoryId) ||
          r.topics.some((t) => t.categoryId === categoryId),
      );
    if (country) list = list.filter((r) => norm(r.offerer.country) === norm(country));
    if (city) list = list.filter((r) => norm(r.offerer.city) === norm(city));
    if (matchesOnly) list = list.filter((r) => r.isMatch);

    const byName = (a, b) => a.offerer.name.localeCompare(b.offerer.name);
    return [...list].sort(sort === "match" ? (a, b) => b.score - a.score || byName(a, b) : byName);
  }, [rows, topicId, categoryId, country, city, matchesOnly, sort]);

  const activeCount =
    (categoryId ? 1 : 0) + (topicId ? 1 : 0) + (country ? 1 : 0) + (city ? 1 : 0) +
    (matchesOnly ? 1 : 0);
  const clear = () => {
    setCategoryId(0);
    setTopicId(0);
    setCountry("");
    setCity("");
    setMatchesOnly(false);
    setQuery("");
  };
  const hasNeeds = myTopics.length > 0 || myAreas.length > 0;

  const filters = (
    <div className="space-y-4 rounded-lg border bg-card p-3 md:p-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4" /> Filters
        </span>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} className="h-9 px-2 text-xs">
            <X className="size-3.5" /> Clear
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Category</Label>
        <Select
          value={String(categoryId)}
          onValueChange={(v) => {
            setCategoryId(Number(v));
            setTopicId(0);
          }}
        >
          <SelectTrigger className="min-h-11 md:min-h-9">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All categories</SelectItem>
            {categories.data
              .filter((c) => c.active)
              .map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {categoryId > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Topic</Label>
          <Select value={String(topicId)} onValueChange={(v) => setTopicId(Number(v))}>
            <SelectTrigger className="min-h-11 md:min-h-9">
              <SelectValue placeholder="All topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All topics</SelectItem>
              {topics.data.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">Location</Label>
          {user?.country && (
            <button
              type="button"
              className="min-h-9 text-xs text-primary hover:underline"
              onClick={() => {
                setCountry(user.country);
                setCity("");
              }}
            >
              My country
            </button>
          )}
        </div>
        <LocationSelect
          country={country}
          city={city}
          onCountry={setCountry}
          onCity={setCity}
          className="sm:grid-cols-1"
        />
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
        <Checkbox checked={matchesOnly} onCheckedChange={(v) => setMatchesOnly(!!v)} />
        <span className="text-sm">Only offerers matching my needs</span>
      </label>
    </div>
  );

  return (
    <PageContainer>
      <div className="mb-3">
        <h1 className="text-lg font-bold tracking-tight md:text-2xl">Find offerers</h1>
        <p className="text-xs text-muted-foreground md:text-sm">
          Search, filter and see who matches the needs on your profile.
        </p>
      </div>

      {!loading && !hasNeeds && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            Add the areas and topics you need help with on your{" "}
            <Link to="/profile" className="font-medium text-primary hover:underline">
              profile
            </Link>{" "}
            so we can rank offerers by how well they match you.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Filters: always visible on desktop, toggled on mobile. */}
        <aside className="hidden lg:sticky lg:top-4 lg:block lg:self-start">{filters}</aside>

        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, city or country…"
                className="min-h-11 pl-8 text-base md:min-h-9 md:text-sm"
              />
            </div>
            <Button
              variant="outline"
              className="relative size-11 shrink-0 lg:hidden"
              onClick={() => setShowFilters((v) => !v)}
              aria-label="Filters"
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="size-4" />
              {activeCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              className="size-11 shrink-0 md:size-9"
              onClick={reload}
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            </Button>
          </div>

          {showFilters && <div className="lg:hidden">{filters}</div>}

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{results.length}</span> offerer
              {results.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">Sort</Label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="text-xs break-words">{error}</p>
                <Button variant="outline" size="sm" className="mt-2 h-9 text-xs" onClick={reload}>
                  Try again
                </Button>
              </div>
            </div>
          )}

          {loading &&
            !error &&
            [0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border bg-card p-3">
                <div className="shimmer h-4 w-1/3 rounded" />
                <div className="shimmer mt-2 h-3 w-2/3 rounded" />
                <div className="mt-2 flex gap-1.5">
                  <div className="shimmer h-5 w-20 rounded-full" />
                  <div className="shimmer h-5 w-24 rounded-full" />
                </div>
              </div>
            ))}

          {!loading && !error && results.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-xs text-muted-foreground">
                {query || activeCount
                  ? "No offerers match that search and these filters."
                  : "No offerers have registered yet."}
              </p>
              {(query || activeCount > 0) && (
                <Button variant="outline" size="sm" className="mt-3 h-9" onClick={clear}>
                  Clear filters
                </Button>
              )}
            </div>
          )}

          {!loading &&
            !error &&
            results.map((r) => (
              <OffererResult
                key={`${r.offerer.id}-${r.offerer.email}`}
                row={r}
                showScore={hasNeeds}
                onRequest={() => navigate(`/seek-assistance?offerer=${r.offerer.id}`)}
              />
            ))}

          {/* Honest about what the backend can't yet supply. */}
          <div className="flex items-start gap-2 rounded-lg border border-dashed p-3">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">
              Match score uses your profile topics (60), areas (25) and location (15).
              Ratings, reviews, proficiency, online status and experience aren&apos;t
              stored on the backend yet, so they aren&apos;t scored or filtered.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function OffererResult({ row, showScore, onRequest }) {
  const { offerer, areas, topics, score, sharedTopicIds, sharedCategoryIds, locationLabel } =
    row;
  const sharedT = new Set(sharedTopicIds);
  const sharedA = new Set(sharedCategoryIds);
  // Matching chips first, so "why this offerer" is the first thing you read.
  const orderedTopics = [...topics].sort(
    (a, b) => Number(sharedT.has(b.topicId)) - Number(sharedT.has(a.topicId)),
  );
  const profile = `/member/${offerer.id}`;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-3">
        <Link
          to={profile}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold uppercase text-primary-foreground"
          aria-label={`View ${offerer.name || "offerer"}'s profile`}
        >
          {initials(offerer.name || offerer.email)}
        </Link>

        <div className="min-w-0 flex-1">
          <Link to={profile} className="block truncate text-sm font-semibold hover:underline">
            {offerer.name || "(no name)"}
          </Link>
          {(offerer.city || offerer.country) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="size-3" />
              {[offerer.city, offerer.country].filter(Boolean).join(", ")}
              {showScore && <span className="text-muted-foreground/70">· {locationLabel}</span>}
            </p>
          )}
          {offerer.info && (
            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{offerer.info}</p>
          )}
        </div>

        {showScore && (
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <MatchRing score={score} size={44} />
            <span className="text-[9px] text-muted-foreground">{liveScoreLabel(score)}</span>
          </div>
        )}
      </div>

      {(areas.length > 0 || topics.length > 0) && (
        <div className="mt-2 border-t pt-2">
          <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            <Layers className="size-3" /> Covers
            {showScore && sharedT.size + sharedA.size > 0 && (
              <span className="normal-case tracking-normal text-primary">
                · highlighted = matches your needs
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {areas.map((a) => (
              <span
                key={`a-${a.categoryId}`}
                className={cn(
                  "rounded-full px-2 py-1 text-[10px] font-semibold leading-none",
                  sharedA.has(a.categoryId)
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground",
                )}
              >
                {a.categoryName}
              </span>
            ))}
            {orderedTopics.map((t) => (
              <span
                key={`t-${t.topicId}`}
                className={cn(
                  "rounded-full border px-2 py-1 text-[10px] leading-none",
                  sharedT.has(t.topicId)
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground",
                )}
              >
                {t.topicName}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" className="min-h-11 text-xs md:min-h-9" onClick={onRequest}>
          <Send className="size-3.5" /> Request help
        </Button>
        <Button size="sm" variant="outline" className="min-h-11 text-xs md:min-h-9" asChild>
          <Link to={profile}>
            <UserRound className="size-3.5" /> View profile
          </Link>
        </Button>
      </div>
    </div>
  );
}
