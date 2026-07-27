import * as React from "react";
import { cn } from "@/lib/utils.js";

const Input = React.forwardRef(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        // Small everywhere EXCEPT mobile text entry: iOS zooms the viewport when a
        // focused field is under 16px, so phones keep text-base. Buttons and
        // triggers have no such constraint and stay small at every width.
        "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-base sm:text-[13px] shadow-xs transition-colors",
        "placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export { Input };
