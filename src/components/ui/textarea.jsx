import * as React from "react";
import { cn } from "@/lib/utils.js";

const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        // Same rule as Input: 16px on phones to stop iOS zooming on focus, small above.
        "flex min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-base sm:text-[13px] shadow-xs transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export { Textarea };
