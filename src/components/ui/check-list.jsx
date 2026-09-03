import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Input } from "@/components/ui/input.jsx";
import { cn } from "@/lib/utils.js";

/**
 * A list of tickable rows — the one way this app asks "which of these?".
 *
 * Replaces the chip/pill toggles that used to do this job: a chip cloud gives
 * no reading order, no tick state a screen reader can announce, and a moving
 * hit area as items wrap. Rows are 44px tall so they are comfortable on a phone.
 *
 * options: [{ value, label, hint?, disabled?, disabledReason? }]
 * selected: a Set of values (or anything with .has)
 */
export function CheckList({
  options = [],
  selected,
  onToggle,
  onToggleAll,
  searchable = false,
  searchPlaceholder = "Search…",
  selectAllLabel = "Select all",
  emptyText = "Nothing to choose from.",
  noMatchText = "Nothing matches that search.",
  className,
  listClassName = "max-h-64",
  disabled = false,
}) {
  const [query, setQuery] = useState("");
  const searchId = useId();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q),
    );
  }, [options, query]);

  const selectable = shown.filter((o) => !o.disabled);
  const allSelected =
    selectable.length > 0 && selectable.every((o) => selected?.has(o.value));

  if (options.length === 0) {
    return (
      <p
        className={cn(
          "rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground",
          className,
        )}
      >
        {emptyText}
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {searchable && options.length > 6 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={searchId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 pl-8"
          />
        </div>
      )}

      {onToggleAll && selectable.length > 1 && (
        <label className="flex min-h-11 cursor-pointer items-center gap-2 px-1 text-[11px] font-medium text-muted-foreground">
          <Checkbox
            checked={allSelected}
            disabled={disabled}
            onCheckedChange={() => onToggleAll(selectable, allSelected)}
          />
          {selectAllLabel} ({selectable.length})
        </label>
      )}

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          {noMatchText}
        </p>
      ) : (
        <ul className={cn("space-y-1 overflow-y-auto scrollbar-thin", listClassName)}>
          {shown.map((o) => {
            const on = Boolean(selected?.has(o.value));
            const off = disabled || o.disabled;
            return (
              <li key={o.value}>
                <label
                  title={o.disabledReason}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] transition-colors",
                    off
                      ? "cursor-not-allowed border-dashed text-muted-foreground/60"
                      : "cursor-pointer",
                    on && !off
                      ? "border-primary/50 bg-primary/10"
                      : !off && "hover:border-primary/40 hover:bg-accent",
                  )}
                >
                  <Checkbox
                    checked={on}
                    disabled={off}
                    onCheckedChange={() => !off && onToggle(o.value, !on)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{o.label}</span>
                    {o.hint && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {o.hint}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default CheckList;
