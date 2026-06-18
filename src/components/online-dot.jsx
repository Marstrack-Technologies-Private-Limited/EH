import { cn } from "@/lib/utils.js";

export function OnlineDot({ online, className }) {
  return (
    <span
      className={cn(
        "inline-block size-2.5 rounded-full ring-2 ring-background",
        online ? "bg-emerald-500" : "bg-muted-foreground/40",
        className,
      )}
      title={online ? "Online" : "Offline"}
    />
  );
}
