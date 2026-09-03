import { Slider } from "@/components/ui/slider.jsx";
import { PROFICIENCY, DEFAULT_PROFICIENCY, proficiencyLabel } from "@/data/categories.js";
import { cn } from "@/lib/utils.js";

/**
 * "How well do you know the topic?" — the five-stop proficiency slider.
 *
 * Novice → Expert, one stop per step. The labels underneath are tappable as
 * well as the handle: on a phone a 44px-tall label is a far easier target than
 * dragging a thumb to an exact stop.
 */
export function ProficiencySlider({
  value = DEFAULT_PROFICIENCY,
  onChange,
  label = "How well do you know the topic?",
  disabled = false,
  className,
  id,
}) {
  const level = Math.min(5, Math.max(1, Math.round(Number(value) || DEFAULT_PROFICIENCY)));
  const set = (v) => !disabled && onChange?.(v);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="text-xs font-semibold text-primary">{proficiencyLabel(level)}</span>
        </div>
      )}

      <Slider
        id={id}
        min={1}
        max={5}
        step={1}
        value={[level]}
        disabled={disabled}
        onValueChange={([v]) => set(v)}
        aria-label={label || "Proficiency"}
        aria-valuetext={proficiencyLabel(level)}
        className="py-2"
      />

      <div className="grid grid-cols-5 gap-0.5">
        {PROFICIENCY.map((p) => {
          const on = p.value === level;
          return (
            <button
              key={p.value}
              type="button"
              disabled={disabled}
              onClick={() => set(p.value)}
              aria-pressed={on}
              className={cn(
                // min-h-11 keeps each label a comfortable tap target on a phone,
                // where dragging the thumb onto an exact stop is fiddly.
                "flex min-h-11 flex-col items-center gap-1 rounded-md px-0.5 py-1.5 text-center text-[10px] leading-tight transition-colors sm:text-[11px]",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-accent",
                on ? "font-semibold text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  on ? "bg-primary" : "bg-muted-foreground/40",
                )}
              />
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The same scale, read-only — for showing someone else's level. */
export function ProficiencyMeter({ value, showLabel = true, className }) {
  const level = Math.min(5, Math.max(1, Math.round(Number(value) || 0)));

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={`${proficiencyLabel(level)} (${level} of 5)`}
    >
      {showLabel && (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {proficiencyLabel(level)}
        </span>
      )}
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {PROFICIENCY.map((p) => (
          <span
            key={p.value}
            className={cn(
              "h-1.5 w-3 rounded-full",
              p.value <= level ? "bg-primary" : "bg-muted-foreground/25",
            )}
          />
        ))}
      </span>
      <span className="sr-only">{proficiencyLabel(level)}</span>
    </span>
  );
}

export default ProficiencySlider;
