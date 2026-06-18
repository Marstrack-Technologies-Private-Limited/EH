import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils.js";

const SIZES = { sm: "size-3.5", md: "size-5", lg: "size-7" };

/**
 * Reusable star rating. Read-only by default; pass `onChange` to make it interactive.
 */
export function StarRating({
  value = 0,
  max = 5,
  size = "md",
  onChange,
  className,
  showValue = false,
}) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === "function";
  const display = hover || value;

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: max }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= display;
        return (
          <button
            key={idx}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange(idx)}
            onMouseEnter={() => interactive && setHover(idx)}
            onMouseLeave={() => interactive && setHover(0)}
            className={cn(interactive ? "cursor-pointer" : "cursor-default", "leading-none")}
            aria-label={`${idx} star${idx > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                SIZES[size],
                "transition-colors",
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1.5 text-sm font-medium text-muted-foreground">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
