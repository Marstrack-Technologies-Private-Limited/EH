import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils.js";

const Checkbox = React.forwardRef(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer size-5 shrink-0 rounded-md border border-input shadow-xs outline-none cursor-pointer transition-colors",
        "focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

export { Checkbox };
