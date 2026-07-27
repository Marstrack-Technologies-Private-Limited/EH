import { cn } from "@/lib/utils.js";

export function Skeleton({ className, ...props }) {
  // `shimmer` is defined in index.css — a sweeping band rather than an opacity pulse.
  return <div className={cn("shimmer rounded-md", className)} {...props} />;
}
