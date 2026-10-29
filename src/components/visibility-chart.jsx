import { memo } from "react";
import { Check, X } from "lucide-react";
import { VISIBILITY_COLUMNS, VISIBILITY_ROWS } from "@/data/visibility.js";
import { cn } from "@/lib/utils.js";

function Cell({ value }) {
  if (value === "yes") {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-[var(--offerer)]">
        <Check className="size-4" aria-hidden="true" /> Yes
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <X className="size-4" aria-hidden="true" /> No
      </span>
    );
  }
  return <span className="text-muted-foreground">{value}</span>;
}

/**
 * "Who can see what" — a table on md+, stacked cards on mobile so nothing
 * scrolls sideways at 360px. Data lives in src/data/visibility.js.
 */
export const VisibilityChart = memo(function VisibilityChart({ className }) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* mobile: one card per piece of information */}
      <ul className="space-y-2 md:hidden">
        {VISIBILITY_ROWS.map((r) => (
          <li key={r.info} className="rounded-lg border p-3">
            <p className="text-sm font-semibold">{r.info}</p>
            <dl className="mt-2 grid gap-1.5 text-sm">
              {VISIBILITY_COLUMNS.map((c) => (
                <div key={c.key} className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">{c.label}</dt>
                  <dd className="text-right">
                    <Cell value={r[c.key]} />
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {/* desktop: the full grid */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Information</th>
              {VISIBILITY_COLUMNS.map((c) => (
                <th key={c.key} className="px-4 py-2.5 font-semibold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VISIBILITY_ROWS.map((r) => (
              <tr key={r.info} className="border-t">
                <td className="px-4 py-2.5 font-medium">{r.info}</td>
                {VISIBILITY_COLUMNS.map((c) => (
                  <td key={c.key} className="px-4 py-2.5">
                    <Cell value={r[c.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
