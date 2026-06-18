import * as React from "react";
import { cn } from "@/lib/utils.js";

const Input = React.forwardRef(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors",
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
