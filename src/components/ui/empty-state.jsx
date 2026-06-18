import { cn } from "@/lib/utils.js";

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed py-14 px-6 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-7" />
        </div>
      )}
      <h3 className="font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
