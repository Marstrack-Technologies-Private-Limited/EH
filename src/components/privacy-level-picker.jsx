import { Check, EyeOff, Scale, BadgeCheck } from "lucide-react";
import { PRIVACY_LEVEL, PRIVACY_OPTIONS } from "@/api/config.js";
import { cn } from "@/lib/utils.js";

const ICONS = { [PRIVACY_LEVEL.A]: EyeOff, [PRIVACY_LEVEL.B]: Scale, [PRIVACY_LEVEL.C]: BadgeCheck };

/**
 * The A / B / C sign-up option, as a radio group of cards. Saved to
 * OM_USER_PRIVACY_LEVEL via SP 1701. C is shown but disabled until phone and
 * ID verification exist.
 */
export function PrivacyLevelPicker({ value, onChange, compact = false }) {
  return (
    <div role="radiogroup" aria-label="Privacy option" className="grid gap-2 sm:grid-cols-3">
      {PRIVACY_OPTIONS.map((o) => {
        const Icon = ICONS[o.value];
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={!o.available}
            onClick={() => o.available && onChange(o.value)}
            className={cn(
              "flex min-h-11 flex-col gap-1 rounded-xl border-2 text-left transition-all",
              compact ? "p-2.5" : "p-3",
              !o.available && "cursor-not-allowed opacity-50",
              o.available && "cursor-pointer",
              active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Icon className="size-4 shrink-0 text-primary" />
                {o.value} · {o.title}
              </span>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  active ? "border-primary bg-primary" : "border-muted-foreground/30",
                )}
              >
                {active && <Check className="size-3 text-primary-foreground" />}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">{o.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

export default PrivacyLevelPicker;
