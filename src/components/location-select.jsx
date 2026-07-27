import { useEffect, useMemo, useRef, useState } from "react";
import { Country, City } from "country-state-city";
import { Check, ChevronDown, Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { cn } from "@/lib/utils.js";

/**
 * Country + city pickers backed by the `country-state-city` dataset, so both are
 * chosen from a fixed list instead of typed free-hand — the API stores plain
 * names, and free text meant "Kenya", "kenya" and "KE" all became separate values.
 *
 * A native <select> can't be searched, and 250 countries / 100+ cities need
 * searching, so this is a listbox with a filter box rather than a Select.
 */
function Combo({ label, value, onChange, options, placeholder, disabled, emptyText }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    // Cap the rendered list — some countries have thousands of cities.
    return list.slice(0, 300);
  }, [options, query]);

  return (
    <div className="space-y-1" ref={boxRef}>
      <Label>{label}</Label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setOpen((v) => !v);
            setQuery("");
          }}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-[13px] shadow-xs",
            "disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
            <div className="relative border-b p-1.5">
              <SearchIcon className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search…"
                className="h-8 border-0 pl-7 shadow-none focus-visible:ring-0"
              />
            </div>
            <ul role="listbox" className="max-h-56 overflow-y-auto scrollbar-thin p-1">
              {filtered.length === 0 && (
                <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {emptyText || "No matches."}
                </li>
              )}
              {filtered.map((opt) => (
                <li key={opt}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={opt === value}
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] cursor-pointer",
                      opt === value
                        ? "bg-primary/15 text-primary"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <span className="truncate">{opt}</span>
                    {opt === value && <Check className="size-3.5 shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const COUNTRIES = Country.getAllCountries();
const COUNTRY_NAMES = COUNTRIES.map((c) => c.name);

/**
 * Country and city, where the city list follows the chosen country.
 *
 * Values are the plain names the API stores, not ISO codes.
 */
export function LocationSelect({ country, city, onCountry, onCity, className }) {
  const cities = useMemo(() => {
    const match = COUNTRIES.find((c) => c.name === country);
    if (!match) return [];
    const list = City.getCitiesOfCountry(match.isoCode) || [];
    // De-duplicate: the dataset repeats city names across states.
    return [...new Set(list.map((c) => c.name))].sort((a, b) => a.localeCompare(b));
  }, [country]);

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      <Combo
        label="Country"
        value={country}
        onChange={(next) => {
          onCountry(next);
          // The old city almost certainly isn't in the new country.
          if (next !== country) onCity("");
        }}
        options={COUNTRY_NAMES}
        placeholder="Select a country…"
      />
      <Combo
        label="City"
        value={city}
        onChange={onCity}
        options={cities}
        disabled={!country}
        placeholder={country ? "Select a city…" : "Pick a country first"}
        emptyText={
          country ? "No cities listed for this country." : "Pick a country first."
        }
      />
    </div>
  );
}

export default LocationSelect;
