import { Badge } from "@/components/ui/badge.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import { categoryIcon } from "@/components/icon-map.js";
import { proficiencyLabel } from "@/data/categories.js";
import { useApp } from "@/store/app-store.jsx";

// Renders a user's topics grouped by category. Shows proficiency for offerers.
export function TopicList({ topics = [], showRating = false, highlightIds = [] }) {
  const { topicIndex } = useApp();
  const highlight = new Set(highlightIds);

  const byCat = {};
  for (const t of topics) {
    const info = topicIndex.topics[t.topicId];
    if (!info) continue;
    (byCat[info.categoryId] ||= []).push({ ...t, ...info });
  }

  const cats = Object.keys(byCat);
  if (cats.length === 0)
    return <p className="text-sm text-muted-foreground">No topics added yet.</p>;

  return (
    <div className="space-y-4">
      {cats.map((catId) => {
        const cat = topicIndex.cats[catId];
        const Icon = categoryIcon(cat?.icon);
        return (
          <div key={catId}>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon className="size-3.5" /> {cat?.name}
            </div>
            <div className="space-y-1.5">
              {byCat[catId].map((t) => (
                <div
                  key={t.topicId}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    {t.name}
                    {highlight.has(t.topicId) && <Badge variant="offerer">match</Badge>}
                  </span>
                  {showRating && t.rating != null && (
                    <span className="inline-flex items-center gap-2">
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {proficiencyLabel(t.rating)}
                      </span>
                      <StarRating value={t.rating} size="sm" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
