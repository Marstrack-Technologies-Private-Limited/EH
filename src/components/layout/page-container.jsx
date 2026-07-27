import { cn } from "@/lib/utils.js";

/**
 * The single content column for every screen.
 *
 * The top bar uses the identical `max-w-6xl` + horizontal padding, so the page
 * title in the bar and the content beneath it share one left edge. Change the
 * width here and both move together — never hard-code a different max-w on a
 * page, or it will drift out of alignment with the bar.
 */
export const CONTAINER = "mx-auto w-full max-w-6xl px-4 md:px-6";

export default function PageContainer({ className, children }) {
  return <div className={cn(CONTAINER, "py-4 md:py-6", className)}>{children}</div>;
}
