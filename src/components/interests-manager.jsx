import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, RefreshCw, AlertCircle, Layers, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { useCategories, useTopics, useUserCategories, useUserTopics } from "@/hooks/use-p2p.js";
import {
  addUserCategory,
  addUserTopic,
  removeUserCategory,
  removeUserTopic,
} from "@/api/p2p.js";
import { cn, hasId } from "@/lib/utils.js";

/**
 * A member's interests: areas with their topics nested inside.
 *
 * Backed by areas of interest (SP 1702 / view 1703) and topics of interest
 * (SP 1705 / view 1704). A topic row carries its category, so topics are
 * grouped under the area they belong to.
 *
 * Only two requests fire on load — the member's areas and the member's topics.
 * The pick-lists live in dialogs and fetch on open, scoped server-side to the
 * area being added to, rather than pulling the whole taxonomy up front.
 */
/** "Added Design" for one, "Added 3 areas" for several. */
function summarise(picked, one, many) {
  if (picked.length === 1) return `Added ${picked[0].label}`;
  return `Added ${picked.length} ${picked.length === 1 ? one : many}`;
}

export function InterestsManager({ userId, className }) {
  const myAreas = useUserCategories({ userId });
  const myTopics = useUserTopics({ userId });

  const [busy, setBusy] = useState(false);
  const [addingArea, setAddingArea] = useState(false);
  const [addingTopicFor, setAddingTopicFor] = useState(null); // the area object

  const reloadAreas = myAreas.reload;
  const reloadTopics = myTopics.reload;

  const run = useCallback(async (fn, okMsg, ...reloads) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      reloads.forEach((r) => r());
    } catch (err) {
      toast.error(err.message || "That didn't save.");
    } finally {
      setBusy(false);
    }
  }, []);

  /** Chosen topics, bucketed by the area they belong to. */
  const topicsByArea = useMemo(() => {
    const map = new Map();
    for (const t of myTopics.data) {
      if (!map.has(t.categoryId)) map.set(t.categoryId, []);
      map.get(t.categoryId).push(t);
    }
    return map;
  }, [myTopics.data]);

  const chosenAreaIds = useMemo(
    () => new Set(myAreas.data.map((a) => a.categoryId)),
    [myAreas.data],
  );
  const chosenTopicIds = useMemo(
    () => new Set(myTopics.data.map((t) => t.topicId)),
    [myTopics.data],
  );

  const loading = myAreas.loading || myTopics.loading;
  const error = myAreas.error || myTopics.error;
  const reloadAll = useCallback(() => {
    reloadAreas();
    reloadTopics();
  }, [reloadAreas, reloadTopics]);

  if (!hasId(userId)) {
    return (
      <div className={cn("rounded-lg border border-dashed p-6 text-center", className)}>
        <p className="text-xs text-muted-foreground">
          Choose a member above to see and edit their interests.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Layers className="size-3.5 text-primary" /> Areas of interest
          </p>
          <p className="text-[11px] text-muted-foreground">
            Add an area, then add topics within it.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={reloadAll}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => setAddingArea(true)}>
            <Plus className="size-3.5" /> Add area
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-xs break-words">{error}</p>
            <Button variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={reloadAll}>
              Try again
            </Button>
          </div>
        </div>
      )}

      {loading && !error && (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-3">
              <div className="shimmer h-4 w-1/3 rounded" />
              <div className="mt-2 flex gap-1.5">
                <div className="shimmer h-6 w-24 rounded-full" />
                <div className="shimmer h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && myAreas.data.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          No areas yet. Use “Add area” to get started.
        </p>
      )}

      {/* One card per area, with that area's topics inside it */}
      {!loading &&
        !error &&
        myAreas.data.map((area) => {
          const topics = topicsByArea.get(area.categoryId) || [];
          return (
            <div key={area.categoryId} className="rounded-lg border bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {area.categoryName || `Category #${area.categoryId}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {topics.length} topic{topics.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={busy}
                    onClick={() => setAddingTopicFor(area)}
                  >
                    <Plus className="size-3.5" /> Add topic
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${area.categoryName}`}
                    title="Remove this area"
                    disabled={busy}
                    onClick={() =>
                      // The two objects are stored independently, so clear this
                      // area's topics first or they'd be left orphaned.
                      run(
                        async () => {
                          for (const t of topics) {
                            await removeUserTopic(userId, t.topicId);
                          }
                          await removeUserCategory(userId, area.categoryId);
                        },
                        `Removed ${area.categoryName}`,
                        reloadAreas,
                        reloadTopics,
                      )
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {topics.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {topics.map((t) => (
                    <span
                      key={t.topicId}
                      className="inline-flex items-center gap-1 rounded-full bg-accent py-1 pl-2.5 pr-1 text-[11px] font-medium text-accent-foreground"
                    >
                      {t.topicName || `#${t.topicId}`}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => removeUserTopic(userId, t.topicId),
                            `Removed ${t.topicName}`,
                            reloadTopics,
                          )
                        }
                        aria-label={`Remove ${t.topicName}`}
                        title="Remove"
                        className="ml-0.5 flex size-4 items-center justify-center rounded-full hover:bg-destructive/15 hover:text-destructive cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No topics picked in this area yet.
                </p>
              )}
            </div>
          );
        })}

      {addingArea && (
        <AddAreaDialog
          onClose={() => setAddingArea(false)}
          chosenIds={chosenAreaIds}
          onPick={(picked) =>
            run(
              () => Promise.all(picked.map((p) => addUserCategory(userId, p.value))),
              summarise(picked, "area", "areas"),
              reloadAreas,
            )
          }
        />
      )}

      {addingTopicFor && (
        <AddTopicDialog
          area={addingTopicFor}
          onClose={() => setAddingTopicFor(null)}
          chosenIds={chosenTopicIds}
          onPick={(picked) =>
            run(
              () => Promise.all(picked.map((p) => addUserTopic(userId, p.value))),
              summarise(picked, "topic", "topics"),
              reloadTopics,
            )
          }
        />
      )}
    </div>
  );
}

/**
 * Shell shared by both pickers — multi-select, so several areas or topics can
 * be added in one go rather than reopening the dialog for each.
 */
function PickerDialog({ title, subtitle, loading, error, options, emptyText, onPick, onClose }) {
  const [selected, setSelected] = useState(() => new Set());

  const toggle = (value) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const allSelected = options.length > 0 && selected.size === options.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(options.map((o) => o.value)));

  const chosen = options.filter((o) => selected.has(o.value));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] overflow-hidden p-4 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="pr-8 text-base">{title}</DialogTitle>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </DialogHeader>

        {loading && (
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shimmer h-9 rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-xs break-words">{error}</p>
          </div>
        )}

        {!loading && !error && options.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
            {emptyText}
          </p>
        )}

        {!loading && !error && options.length > 0 && (
          <>
            {options.length > 1 && (
              <label className="flex cursor-pointer items-center gap-2 px-1 text-[11px] font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="size-4 accent-[var(--primary)]"
                />
                Select all ({options.length})
              </label>
            )}

            <ul className="max-h-64 space-y-1 overflow-y-auto scrollbar-thin">
              {options.map((o) => {
                const on = selected.has(o.value);
                return (
                  <li key={o.value}>
                    <label
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px] transition-colors",
                        on
                          ? "border-primary/50 bg-primary/10"
                          : "hover:border-primary/40 hover:bg-accent",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(o.value)}
                        className="size-4 shrink-0 accent-[var(--primary)]"
                      />
                      <span className="truncate">{o.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" className="h-9" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-9"
            disabled={chosen.length === 0}
            onClick={() => {
              onPick(chosen);
              onClose();
            }}
          >
            <Plus className="size-3.5" />
            {chosen.length > 1 ? `Add ${chosen.length}` : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Categories not already chosen. Fetches only while open. */
function AddAreaDialog({ chosenIds, onPick, onClose }) {
  const { data, loading, error } = useCategories();
  const options = data
    .filter((c) => c.active && !chosenIds.has(c.id))
    .map((c) => ({ value: c.id, label: c.name }));

  return (
    <PickerDialog
      title="Add an area of interest"
      loading={loading}
      error={error}
      options={options}
      emptyText="You've already added every available area."
      onPick={onPick}
      onClose={onClose}
    />
  );
}

/**
 * Topics of ONE area, filtered server-side by that category, fetched only while
 * the dialog is open.
 */
function AddTopicDialog({ area, chosenIds, onPick, onClose }) {
  const { data, loading, error } = useTopics({ categoryId: area.categoryId });
  const options = data
    .filter((t) => !chosenIds.has(t.id))
    .map((t) => ({ value: t.id, label: t.name }));

  const areaName = area.categoryName || `Category #${area.categoryId}`;

  return (
    <PickerDialog
      title={`Add a topic in ${areaName}`}
      subtitle={`Only topics that belong to ${areaName} are listed.`}
      loading={loading}
      error={error}
      options={options}
      emptyText={
        data.length === 0
          ? `Sorry — there are no topics in ${areaName} yet. An admin needs to create some first.`
          : `You've already added every topic in ${areaName}.`
      }
      onPick={onPick}
      onClose={onClose}
    />
  );
}

export default InterestsManager;
