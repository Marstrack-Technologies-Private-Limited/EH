import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  RefreshCw,
  MapPin,
  Send,
  AlertCircle,
  Layers,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { useCategories, useInterestIndex, useUsers } from "@/hooks/use-p2p.js";
import { USER_TYPE } from "@/api/config.js";
import PageContainer from "@/components/layout/page-container.jsx";
import { initials } from "@/lib/utils.js";
import { cn } from "@/lib/utils.js";

/** Debounce so a server round-trip doesn't fire on every keypress. */
function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Search for offerers — view 1699 filtered to OFFERER, joined against each
 * offerer's areas (view 1703) and topics (view 1704) so a seeker can see what
 * they actually cover before enquiring.
 *
 * "Send enquiry" hands the chosen offerer to the Seek Assistance form.
 */
export default function Offerers() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const [areaId, setAreaId] = useState(0);

  const { data: offerers, loading, error, reload } = useUsers({
    type: USER_TYPE.OFFERER,
    search,
    orderBy: "OM_USER_NAME",
    sortDir: "ASC",
  });
  const categories = useCategories();
  const interests = useInterestIndex();

  // Narrowing by area happens here because the filter lives on a different
  // view (1703) than the offerers themselves (1699), and this API can't join.
  const rows = useMemo(() => {
    const withInterests = offerers.map((o) => ({
      offerer: o,
      areas: interests.index.get(o.id)?.areas || [],
      topics: interests.index.get(o.id)?.topics || [],
    }));
    if (!areaId) return withInterests;
    return withInterests.filter((r) => r.areas.some((a) => a.categoryId === areaId));
  }, [offerers, interests.index, areaId]);

  const activeArea = categories.data.find((c) => c.id === areaId);

  return (
    <PageContainer>
      <div className="mb-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search offerers by name, email or city…"
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => {
              reload();
              interests.reload();
            }}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
        </div>

        <div>
          <Label className="mb-1.5 block text-[10px] uppercase tracking-wide text-muted-foreground/70">
            Area of expertise
          </Label>
          <Select value={String(areaId)} onValueChange={(v) => setAreaId(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="All areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All areas</SelectItem>
              {categories.data.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="px-0.5 text-[11px] text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{rows.length}</span>{" "}
          offerer{rows.length === 1 ? "" : "s"}
          {activeArea ? ` in ${activeArea.name}` : ""}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-xs break-words">{error}</p>
            <Button variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={reload}>
              Try again
            </Button>
          </div>
        </div>
      )}

      {loading && !error && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-3">
              <div className="shimmer h-4 w-1/3 rounded" />
              <div className="shimmer mt-2 h-3 w-2/3 rounded" />
              <div className="mt-2 flex gap-1.5">
                <div className="shimmer h-5 w-20 rounded-full" />
                <div className="shimmer h-5 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          {query || areaId
            ? "No offerers match that search."
            : "No offerers have registered yet."}
        </p>
      )}

      <div className="space-y-2">
        {!loading &&
          !error &&
          rows.map(({ offerer, areas, topics }) => (
            <div key={`${offerer.id}-${offerer.email}`} className="rounded-lg border bg-card p-3">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold uppercase text-primary-foreground">
                  {initials(offerer.name || offerer.email)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {offerer.name || "(no name)"}
                  </p>
                  {(offerer.city || offerer.country) && (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="size-3" />
                      {[offerer.city, offerer.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {offerer.info && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {offerer.info}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  className="h-8 shrink-0 text-xs"
                  onClick={() => navigate(`/seek-assistance?offerer=${offerer.id}`)}
                >
                  <Send className="size-3.5" /> Enquire
                </Button>
              </div>

              {(areas.length > 0 || topics.length > 0) && (
                <div className="mt-2 border-t pt-2">
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    <Layers className="size-3" /> Covers
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {areas.map((a) => (
                      <span
                        key={`a-${a.categoryId}`}
                        className="rounded-full bg-accent px-2 py-1 text-[10px] font-semibold leading-none text-accent-foreground"
                      >
                        {a.categoryName}
                      </span>
                    ))}
                    {topics.map((t) => (
                      <span
                        key={`t-${t.topicId}`}
                        className="rounded-full border px-2 py-1 text-[10px] leading-none text-muted-foreground"
                      >
                        {t.topicName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Honest about what the backend can't yet supply. */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-dashed p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          Experience, testimonials and cases-handled counts aren't shown yet — there is
          no view or column for them on the backend. They'll appear here once those
          objects exist.
        </p>
      </div>
    </PageContainer>
  );
}
