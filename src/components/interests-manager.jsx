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
import { CheckList } from "@/components/ui/check-list.jsx";
import { ProficiencySlider } from "@/components/ui/proficiency-slider.jsx";
import { useCategories, useTopics, useUserCategories, useUserTopics } from "@/hooks/use-p2p.js";
import { useProficiency } from "@/hooks/use-proficiency.js";
import { removeLevel, setLevels } from "@/lib/proficiency-store.js";
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

export function InterestsManager({ userId, userType, className }) {
  const myAreas = useUserCategories({ userId });
  const myTopics = useUserTopics({ userId });
  const proficiency = useProficiency(userId);

  // Only offerers rate a topic — they are the ones offering to help with it.
  // A seeker is listing what they want help with, so no slider. The type is on
  // every row of both views, so the caller need not pass it.
  const resolvedType = (
    userType ||
    myTopics.data[0]?.userType ||
    myAreas.data[0]?.userType ||
    ""
  ).toUpperCase();
  const rates = resolvedType === "OFFERER" || resolvedType === "ALL";

  // Levels being edited but not yet saved, keyed by topic id. Sliders read
  // through here so a drag shows immediately; Save writes the lot.
  const [draft, setDraft] = useState({});

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

  /** What a topic's slider shows: the unsaved value if there is one. */
  const levelFor = (topicId) => draft[topicId] ?? proficiency.levelOf(topicId);

  const unsaved = Object.entries(draft).filter(
    ([topicId, level]) => level !== proficiency.levelOf(topicId),
  );

  const saveLevels = () => {
    setLevels(userId, draft);
    setDraft({});
    toast.success(
      unsaved.length === 1
        ? "Proficiency saved"
        : `Proficiency saved for ${unsaved.length} topics`,
    );
  };

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
            {rates && " Say how well you know each one, then press Save."}
          </p>
          {rates && (
            <p className="text-[10px] text-muted-foreground/80">
              Proficiency is kept on this device — the server has no field for it yet.
            </p>
          )}
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
                <ul className="space-y-1.5">
                  {topics.map((t) => (
                    <li key={t.topicId} className="rounded-lg border bg-background px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-[13px] font-medium">
                          <span className="text-muted-foreground">
                            {area.categoryName || `Category #${area.categoryId}`}
                          </span>
                          <span className="px-1.5 text-primary">•</span>
                          {t.topicName || `#${t.topicId}`}
                          {rates && (
                            <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                              (Offer Guidance)
                            </span>
                          )}
                        </p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            run(
                              async () => {
                                await removeUserTopic(userId, t.topicId);
                                removeLevel(userId, t.topicId);
                                setDraft(({ [t.topicId]: _dropped, ...rest }) => rest);
                              },
                              `Removed ${t.topicName}`,
                              reloadTopics,
                            )
                          }
                          aria-label={`Remove ${t.topicName}`}
                          title="Remove"
                          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      {rates && (
                        <ProficiencySlider
                          compact
                          label="How well do you know it?"
                          className="mt-1.5 border-t pt-1.5"
                          value={levelFor(t.topicId)}
                          onChange={(v) => setDraft((d) => ({ ...d, [t.topicId]: v }))}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No topics picked in this area yet.
                </p>
              )}
            </div>
          );
        })}

      {/* One Save for every slider on the screen — a drag is a draft until it
          is pressed, so a stray touch while scrolling changes nothing. */}
      {rates && !loading && !error && myTopics.data.length > 0 && (
        <div className="sticky bottom-16 z-10 -mx-1 rounded-lg border bg-card/95 p-2 backdrop-blur md:bottom-2">
          <Button
            className="h-11 w-full"
            disabled={unsaved.length === 0}
            onClick={saveLevels}
          >
            {unsaved.length === 0
              ? "Save"
              : `Save ${unsaved.length} change${unsaved.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      )}

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

  // CheckList hands back the rows it is currently showing (a search may have
  // narrowed them) plus whether they are all ticked already.
  const toggleAll = (shown, allSelected) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const o of shown) {
        if (allSelected) next.delete(o.value);
        else next.add(o.value);
      }
      return next;
    });

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

        {!loading && !error && (
          <CheckList
            options={options}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            searchable
            emptyText={emptyText}
            listClassName="max-h-64"
          />
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
