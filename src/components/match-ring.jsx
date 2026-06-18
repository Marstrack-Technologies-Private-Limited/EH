import { cn } from "@/lib/utils.js";

// Circular match-score indicator (0–100).
export function MatchRing({ score, size = 56 }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color =
    score >= 80 ? "text-emerald-500" : score >= 60 ? "text-primary" : score >= 40 ? "text-amber-500" : "text-muted-foreground";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-muted" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          fill="none"
          className={cn("stroke-current transition-all", color)}
        />
      </svg>
      <span className={cn("absolute text-sm font-bold", color)}>{score}</span>
    </div>
  );
}
