import { Card, CardContent } from "@/components/ui/card.jsx";
import { cn } from "@/lib/utils.js";

export function KpiCard({ title, value, subtitle, icon, accent = "primary", className }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="flex items-start justify-between p-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            accent === "primary" && "bg-primary/10 text-primary",
            accent === "seeker" && "bg-[var(--seeker)]/15 text-[var(--seeker)]",
            accent === "offerer" && "bg-[var(--offerer)]/15 text-[var(--offerer)]",
            accent === "amber" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
          )}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
