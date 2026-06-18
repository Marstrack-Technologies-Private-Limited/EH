import { useMemo, useState } from "react";
import { Search as SearchIcon, SlidersHorizontal, X, Users } from "lucide-react";
import PageHeader from "@/components/layout/page-header.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Slider } from "@/components/ui/slider.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { OffererCard } from "@/components/offerer-card.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useApp } from "@/store/app-store.jsx";
import { useMatches, DEFAULT_FILTERS } from "@/hooks/use-matches.js";
import { useDebounce } from "@/hooks/use-debounce.js";

export default function Search() {
  const { user } = useAuth();
  const { state } = useApp();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 250);

  const activeFilters = { ...filters, query: debounced };
  const results = useMatches(user, activeFilters);

  const category = state.categories.find((c) => c.id === filters.categoryId);
  const topicOptions = useMemo(() => category?.topics ?? [], [category]);

  const set = (k, v) =>
    setFilters((f) => ({ ...f, [k]: v, ...(k === "categoryId" ? { topicId: "all" } : {}) }));
  const reset = () => {
    setFilters(DEFAULT_FILTERS);
    setQuery("");
  };

  const hasFilters =
    filters.categoryId !== "all" ||
    filters.topicId !== "all" ||
    filters.minRating > 0 ||
    filters.location !== "all" ||
    filters.onlineOnly ||
    debounced;

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <PageHeader
        title="Discover offerers"
        description="Find people who can help — ranked by how well they match you."
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardContent className="space-y-5 p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <SlidersHorizontal className="size-4" /> Filters
                </span>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-xs">
                    <X className="size-3.5" /> Clear
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={filters.categoryId} onValueChange={(v) => set("categoryId", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {state.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {topicOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Topic</Label>
                  <Select value={filters.topicId} onValueChange={(v) => set("topicId", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All topics</SelectItem>
                      {topicOptions.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Location</Label>
                <Select value={filters.location} onValueChange={(v) => set("location", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Anywhere</SelectItem>
                    <SelectItem value="city">My city ({user.city})</SelectItem>
                    <SelectItem value="country">My country ({user.country})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Min. rating</Label>
                  <span className="inline-flex items-center gap-1 text-xs font-medium">
                    {filters.minRating > 0 ? (
                      <>
                        <StarRating value={filters.minRating} size="sm" /> {filters.minRating}+
                      </>
                    ) : (
                      "Any"
                    )}
                  </span>
                </div>
                <Slider
                  value={[filters.minRating]}
                  onValueChange={([v]) => set("minRating", v)}
                  min={0}
                  max={5}
                  step={1}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2.5">
                <Checkbox
                  checked={filters.onlineOnly}
                  onCheckedChange={(v) => set("onlineOnly", !!v)}
                />
                <span className="text-sm">Online now only</span>
              </label>
            </CardContent>
          </Card>
        </aside>

        {/* Results */}
        <div className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, skill, or location…"
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{results.length}</span> offerer
              {results.length !== 1 ? "s" : ""} found
            </p>
            {hasFilters && (
              <Badge variant="muted">Filtered</Badge>
            )}
          </div>

          {results.length ? (
            <div className="grid gap-3">
              {results.map((m) => (
                <OffererCard key={m.offerer.id} match={m} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No offerers match"
              description="Try widening your filters or clearing them to see everyone."
              action={<Button onClick={reset} variant="outline">Clear filters</Button>}
            />
          )}
        </div>
      </div>
    </div>
  );
}
