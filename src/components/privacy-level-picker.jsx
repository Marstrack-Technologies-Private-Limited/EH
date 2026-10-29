import { Check, EyeOff, Scale } from "lucide-react";
import { PRIVACY_LEVEL } from "@/api/config.js";
import { cn } from "@/lib/utils.js";

/** The two options offered in the MVP — kept short so the cards stay tidy. */
const OPTIONS = [
  {
    value: PRIVACY_LEVEL.A,
    title: "Maximum privacy",
    desc: "Display name only. No real name or photo.",
    icon: EyeOff,
  },
  {
    value: PRIVACY_LEVEL.B,
    title: "Balanced",
    desc: "Display name, plus optional photo and location.",
    icon: Scale,
  },
];

/**
 * The A / B sign-up option as two radio cards, saved to OM_USER_PRIVACY_LEVEL
 * via SP 1701. C (high verification) needs phone + ID checks, so it is only
 * mentioned as coming later rather than shown as a disabled card.
 */
export function PrivacyLevelPicker({ value, onChange, compact = false }) {
  return (
    <div className="space-y-1.5">
      <div role="radiogroup" aria-label="Privacy option" className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 text-left transition-colors",
                compact ? "p-2.5" : "p-3",
                active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <o.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{o.title}</span>
                <span className="block text-xs text-muted-foreground">{o.desc}</span>
              </span>
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  active ? "border-primary bg-primary" : "border-muted-foreground/30",
                )}
              >
                {active && <Check className="size-3 text-primary-foreground" />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        High verification (real name, phone and ID checks) is coming later.
      </p>
    </div>
  );
}

export default PrivacyLevelPicker;
