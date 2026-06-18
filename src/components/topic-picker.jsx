import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import { categoryIcon } from "@/components/icon-map.js";
import { proficiencyLabel } from "@/data/categories.js";
import { cn } from "@/lib/utils.js";

/**
 * Reusable category → topic selector.
 * value: [{ topicId, categoryId, rating? }]
 * withRating: when true (offerers), each selected topic gets a 1–5 proficiency.
 */
export function TopicPicker({ categories, value = [], onChange, withRating = false }) {
  const [activeCat, setActiveCat] = useState(categories[0]?.id ?? "");
  const category = categories.find((c) => c.id === activeCat);
  const selectedIds = new Set(value.map((v) => v.topicId));

  const toggle = (topic, catId) => {
    if (selectedIds.has(topic.id)) {
      onChange(value.filter((v) => v.topicId !== topic.id));
    } else {
      onChange([
        ...value,
        { topicId: topic.id, categoryId: catId, ...(withRating ? { rating: 3 } : {}) },
      ]);
    }
  };

  const setRating = (topicId, rating) =>
    onChange(value.map((v) => (v.topicId === topicId ? { ...v, rating } : v)));

  const Icon = categoryIcon(category?.icon);

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

      {/* topic chips for the active category */}
      {category && (
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Icon className="size-3.5" />
            {category.name} — tap to select
          </div>
          <div className="flex flex-wrap gap-2">
            {category.topics.map((t) => {
              const active = selectedIds.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t, category.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent",
                  )}
                >
                  {active ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* selected topics summary + ratings */}
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
                <li
                  key={v.topicId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{topic.name}</p>
                    <p className="text-xs text-muted-foreground">{cat?.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {withRating && (
                      <>
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {proficiencyLabel(v.rating)}
                        </span>
                        <StarRating
                          value={v.rating}
                          size="sm"
                          onChange={(r) => setRating(v.topicId, r)}
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => onChange(value.filter((x) => x.topicId !== v.topicId))}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                      aria-label="Remove topic"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
