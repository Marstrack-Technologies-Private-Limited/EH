import { useEffect, useMemo, useRef, useState } from "react";
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
const asOption = (o) => (typeof o === "string" ? { key: o, label: o, value: o } : o);

function Combo({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  emptyText,
  minQuery = 0,
}) {
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

  const q = query.trim().toLowerCase();
  const tooShort = q.length < minQuery;

  const filtered = useMemo(() => {
    if (tooShort) return [];
    const out = [];
    // Starts-with matches first, then contains — "lis" should put Lisbon on top.
    const later = [];
    for (const raw of options) {
      const o = asOption(raw);
      const l = o.label.toLowerCase();
      if (!q || l.startsWith(q)) out.push(o);
      else if (l.includes(q)) later.push(o);
      // Cap the rendered list — some countries have thousands of cities.
      if (out.length >= 300) break;
    }
    return out.concat(later).slice(0, 300);
  }, [options, q, tooShort]);

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
            "flex h-11 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-base shadow-xs md:h-9 md:text-[13px]",
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
                placeholder={minQuery ? `Type at least ${minQuery} letters…` : "Type to search…"}
                className="h-10 border-0 pl-7 text-base shadow-none focus-visible:ring-0 md:h-8 md:text-sm"
              />
            </div>
            <ul role="listbox" className="max-h-56 overflow-y-auto scrollbar-thin p-1">
              {filtered.length === 0 && (
                <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {tooShort ? `Type at least ${minQuery} letters to search.` : emptyText || "No matches."}
                </li>
              )}
              {filtered.map((opt) => {
                const selected = opt.label === value || opt.value === value;
                return (
                  <li key={opt.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm cursor-pointer md:min-h-0 md:text-[13px]",
                        selected
                          ? "bg-primary/15 text-primary"
                          : "hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {selected && <Check className="size-3.5 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * `country-state-city` inlines every city on earth — ~16 MB unpacked, which
 * added ~8 MB to the main bundle when imported statically. Loading it on demand
 * puts it in its own chunk so the app shell stays small; the dataset only
 * arrives when a form with a location picker is actually opened.
 */
let dataPromise = null;
function loadLocationData() {
  if (!dataPromise) {
    dataPromise = import("country-state-city").then((m) => {
      const countries = m.Country.getAllCountries();
      const nameByIso = new Map(countries.map((c) => [c.isoCode, c.name]));
      // Every city on earth as "City, Country", de-duplicated (the dataset
      // repeats names across states) and sorted, for the country-free search.
      const seen = new Set();
      const allCities = [];
      for (const c of m.City.getAllCities()) {
        const country = nameByIso.get(c.countryCode);
        const key = `${c.name}|${country}`;
        if (!country || seen.has(key)) continue;
        seen.add(key);
        allCities.push({ key, label: `${c.name}, ${country}`, value: { city: c.name, country } });
      }
      // Plain comparison: localeCompare over ~134k rows stalls the page.
      allCities.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
      return { countries, City: m.City, allCities };
    });
  }
  return dataPromise;
}

/**
 * City and country (client, 2026-10-30): the user can just type their city —
 * every city worldwide is searchable — and the country fills itself in. Picking
 * a country first is optional; it only narrows the city list.
 *
 * Values are the plain names the API stores, not ISO codes.
 */
export function LocationSelect({ country, city, onCountry, onCity, className }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadLocationData().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const countryNames = useMemo(
    () => (data ? data.countries.map((c) => c.name) : []),
    [data],
  );

  // With a country chosen, only its cities; otherwise every city, "City, Country".
  const cityOptions = useMemo(() => {
    if (!data) return [];
    const match = data.countries.find((c) => c.name === country);
    if (!match) return data.allCities;
    const list = data.City.getCitiesOfCountry(match.isoCode) || [];
    return [...new Set(list.map((c) => c.name))]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ key: name, label: name, value: { city: name, country } }));
  }, [data, country]);

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      <Combo
        label="City"
        value={city}
        onChange={(next) => {
          onCity(next.city);
          if (next.country !== country) onCountry(next.country);
        }}
        options={cityOptions}
        disabled={!data}
        // Thousands of matches otherwise — wait for a couple of letters.
        minQuery={country ? 0 : 2}
        placeholder={data ? "Search your city" : "Loading cities…"}
        emptyText="No city by that name."
      />
      <Combo
        label="Country"
        value={country}
        onChange={(next) => {
          onCountry(next);
          // The old city almost certainly isn't in the new country.
          if (next !== country) onCity("");
        }}
        options={countryNames}
        disabled={!data}
        placeholder={data ? "Select a country" : "Loading countries…"}
      />
    </div>
  );
}

export default LocationSelect;
