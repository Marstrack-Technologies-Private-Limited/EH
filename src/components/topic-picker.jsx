import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { CheckList } from "@/components/ui/check-list.jsx";
import { ProficiencySlider } from "@/components/ui/proficiency-slider.jsx";
import { categoryIcon } from "@/components/icon-map.js";
import { DEFAULT_PROFICIENCY } from "@/data/categories.js";

/**
 * Reusable category → topic selector.
 * value: [{ topicId, categoryId, rating? }]
 * withRating: when true (offerers), each selected topic gets a proficiency
 * slider — Novice through Expert.
 *
 * Topics are a tick list rather than a chip cloud: a list reads in order, the
 * tick state is unambiguous, and each row is a full-width tap target.
 */
export function TopicPicker({
  categories,
  value = [],
  onChange,
  withRating = false,
  defaultRating = DEFAULT_PROFICIENCY,
}) {
  const [activeCat, setActiveCat] = useState(categories[0]?.id ?? "");
  const category = categories.find((c) => c.id === activeCat);
  const selectedIds = useMemo(() => new Set(value.map((v) => v.topicId)), [value]);

  const add = (topicIds, catId) =>
    onChange([
      ...value,
      ...topicIds
        .filter((id) => !selectedIds.has(id))
        .map((id) => ({
          topicId: id,
          categoryId: catId,
          ...(withRating ? { rating: defaultRating } : {}),
        })),
    ]);

  const remove = (topicIds) => {
    const drop = new Set(topicIds);
    onChange(value.filter((v) => !drop.has(v.topicId)));
  };

  const toggle = (topicId, on) => (on ? add([topicId], category.id) : remove([topicId]));

  const setRating = (topicId, rating) =>
    onChange(value.map((v) => (v.topicId === topicId ? { ...v, rating } : v)));

  const Icon = categoryIcon(category?.icon);

  /** How many of this category's topics are already picked. */
  const pickedHere = category
    ? category.topics.filter((t) => selectedIds.has(t.id)).length
    : 0;

  return (
    <div className="space-y-4">
      {/* category selector */}
      <Select value={activeCat} onValueChange={setActiveCat}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* tick list of the active category's topics */}
      {category && (
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Icon className="size-3.5" />
            {category.name} — tick the ones that apply
            {pickedHere > 0 && (
              <Badge variant="muted" className="ml-auto">
                {pickedHere} picked
              </Badge>
            )}
          </div>
          <CheckList
            options={category.topics.map((t) => ({ value: t.id, label: t.name }))}
            selected={selectedIds}
            onToggle={toggle}
            onToggleAll={(selectable, allSelected) =>
              allSelected
                ? remove(selectable.map((o) => o.value))
                : add(
                    selectable.map((o) => o.value),
                    category.id,
                  )
            }
            searchable
            searchPlaceholder={`Search ${category.name} topics…`}
            selectAllLabel="Select all in this category"
            emptyText="This category has no topics yet."
            listClassName="max-h-56"
          />
        </div>
      )}

      {/* selected topics summary + proficiency */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">
            Selected topics
            <Badge variant="muted" className="ml-2">
              {value.length}
            </Badge>
          </span>
        </div>
        {value.length === 0 ? (
          <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
            No topics selected yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {value.map((v) => {
              const cat = categories.find((c) => c.id === v.categoryId);
              const topic = cat?.topics.find((t) => t.id === v.topicId);
              if (!topic) return null;
              return (
                <li key={v.topicId} className="rounded-lg border bg-card px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{topic.name}</p>
                      <p className="text-xs text-muted-foreground">{cat?.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove([v.topicId])}
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-destructive cursor-pointer"
                      aria-label={`Remove ${topic.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  {withRating && (
                    <ProficiencySlider
                      compact
                      label="How well do you know it?"
                      className="mt-1"
                      value={v.rating ?? defaultRating}
                      onChange={(r) => setRating(v.topicId, r)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
