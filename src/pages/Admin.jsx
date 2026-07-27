import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Layers,
  Tag,
  Briefcase,
  Users,
  RefreshCw,
  Search,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useCategories, useServices, useTopics, useUsers } from "@/hooks/use-p2p.js";
import { saveCategory, saveService, saveTopic, saveUser } from "@/api/p2p.js";
import { USER_TYPE } from "@/api/config.js";
import PageContainer from "@/components/layout/page-container.jsx";
import { LocationSelect } from "@/components/location-select.jsx";
import { cn } from "@/lib/utils.js";

const VIEW_STORAGE_KEY = "eh_admin_view";

/**
 * Table-vs-card preference, held once for the whole panel and mirrored to
 * localStorage — pick table on one tab and every other tab opens as a table,
 * this session and the next.
 */
function useViewMode() {
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(VIEW_STORAGE_KEY) === "table" ? "table" : "card";
    } catch {
      return "card";
    }
  });

  const update = useCallback((next) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* private mode / quota — the in-memory choice still applies */
    }
  }, []);

  return [view, update];
}

export default function Admin() {
  const { user, apiUser, isApiAuthenticated } = useAuth();
  const [tab, setTab] = useState("categories");
  const [view, setView] = useViewMode();

  if (!user || user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const createdBy = apiUser?.email || apiUser?.userCode || user.email;

  return (
    // No page title or "signed in as" line here — the top bar already shows who
    // is signed in and which section is active.
    <PageContainer>
      {!isApiAuthenticated && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-xs md:text-sm">
            Not signed in to the backend — nothing can load or save. Sign in again
            using <strong>Admin</strong> mode.
          </p>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        {/* Scrollable strip so five tabs still fit a 360px screen */}
        <div className="-mx-3 overflow-x-auto px-3 md:mx-0 md:px-0">
          <TabsList className="w-max">
            <TabsTrigger value="categories" className="text-xs md:text-sm">
              <Layers className="size-3.5" /> Categories
            </TabsTrigger>
            <TabsTrigger value="topics" className="text-xs md:text-sm">
              <Tag className="size-3.5" /> Topics
            </TabsTrigger>
            <TabsTrigger value="services" className="text-xs md:text-sm">
              <Briefcase className="size-3.5" /> Services
            </TabsTrigger>
            <TabsTrigger value="members" className="text-xs md:text-sm">
              <Users className="size-3.5" /> Members
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="categories">
          <CategoriesTab createdBy={createdBy} view={view} onView={setView} />
        </TabsContent>
        <TabsContent value="topics">
          <TopicsTab createdBy={createdBy} view={view} onView={setView} />
        </TabsContent>
        <TabsContent value="services">
          <ServicesTab createdBy={createdBy} view={view} onView={setView} />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab view={view} onView={setView} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

/* ------------------------------------------------------------ shared bits */

/**
 * Search + add + refresh on a single row. Backend filters are exact-match only,
 * so this search narrows the already-loaded rows client-side.
 */
function Toolbar({ query, onQuery, placeholder, onRefresh, loading, onAdd, addLabel }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>
      {onAdd && (
        <Button
          size="icon"
          className="size-9 shrink-0"
          onClick={onAdd}
          aria-label={addLabel}
          title={addLabel}
        >
          <Plus className="size-4" />
        </Button>
      )}
      <Button
        variant="outline"
        size="icon"
        className="size-9 shrink-0"
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh"
        title="Refresh"
      >
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      </Button>
    </div>
  );
}

/** Tells the user exactly what the list below is showing. */
function ListCaption({ shown, total, noun, filterNote }) {
  return (
    <p className="px-0.5 text-[11px] text-muted-foreground md:text-xs">
      Showing <span className="font-semibold text-foreground">{shown}</span>
      {shown !== total && <> of {total}</>} {noun}
      {filterNote ? ` · ${filterNote}` : ""}
    </p>
  );
}

function ListState({ loading, error, empty, emptyText, onRetry }) {
  if (loading)
    // Skeletons shaped like the rows they stand in for, so nothing shifts when
    // the data arrives.
    return (
      <div className="space-y-2" role="status" aria-label="Loading">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-lg border bg-card px-3 py-2.5">
            <div className="shimmer h-3.5 w-1/3 rounded" />
            <div className="mt-1.5 flex gap-1.5">
              <div className="shimmer h-4 w-14 rounded-full" />
              <div className="shimmer h-4 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  if (error)
    return (
      <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
        <p className="text-xs break-words md:text-sm">{error}</p>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  if (empty)
    return (
      <p className="rounded-lg border p-4 text-center text-xs text-muted-foreground">
        {emptyText}
      </p>
    );
  return null;
}

/**
 * A secondary attribute of a row — its category, who created it, its ID.
 *
 * Wears the theme's own soft accent tint (same purple family as the primary, so
 * it complements rather than competes) to read as a *sub-value* of the title
 * above it, and always names what it is.
 */
function Field({ label, value }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-baseline gap-1 rounded-full bg-accent px-2 py-1 leading-none text-accent-foreground">
      {label && (
        <span className="text-[9px] font-semibold uppercase tracking-wide opacity-60">
          {label}
        </span>
      )}
      <span className="max-w-[12rem] truncate font-medium">{value}</span>
    </span>
  );
}

/**
 * Column sorting — fully server-side.
 *
 * `orderby` names the column and `sortby` gives ASC/DESC, so both the column and
 * the direction are resolved by SQL over the whole table, not per page.
 */
function useSort(initial) {
  const [sort, setSort] = useState(initial);

  const toggle = useCallback((column) => {
    setSort((prev) =>
      prev.key === column.key
        ? { ...prev, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key: column.key, column: column.sortColumn, dir: "asc" },
    );
  }, []);

  return [sort, toggle];
}

/**
 * Debounce the search box so a server round-trip doesn't fire on every keypress.
 */
function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Table ⇄ card switch. Same shape and active wash as the other segmented controls. */
function ViewToggle({ value, onChange }) {
  const options = [
    { key: "card", label: "Card view", icon: LayoutGrid },
    { key: "table", label: "Table view", icon: TableIcon },
  ];
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          aria-label={o.label}
          aria-pressed={value === o.key}
          title={o.label}
          className={cn(
            "flex size-7 items-center justify-center rounded-md transition-colors cursor-pointer",
            value === o.key
              ? "bg-primary/15 text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <o.icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

/**
 * Table rendering of the same rows the cards show.
 *
 * Scrolls inside its own container so the page body never scrolls sideways on
 * a phone.
 */
function DataTable({ columns, rows, getKey, onView, onEdit, sort, onSort }) {
  const actionCols = (onView ? 1 : 0) + (onEdit ? 1 : 0);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[32rem] border-collapse text-left">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((c) => {
              const sortable = Boolean(c.sortColumn && onSort);
              const isSorted = sortable && sort?.key === c.key;
              const Arrow = !isSorted ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
              return (
                <th
                  key={c.key}
                  aria-sort={
                    isSorted ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
                  }
                  className="whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(c)}
                      title={`Sort by ${c.label}`}
                      className={cn(
                        "flex items-center gap-1 uppercase tracking-wide transition-colors cursor-pointer",
                        isSorted ? "text-primary" : "hover:text-foreground",
                      )}
                    >
                      {c.label}
                      <Arrow className={cn("size-3", !isSorted && "opacity-40")} />
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
            {actionCols > 0 && (
              <th className="px-2 py-2" style={{ width: `${actionCols * 2.25}rem` }} />
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getKey(row)} className="border-b last:border-0 hover:bg-accent/40">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="max-w-[16rem] truncate px-3 py-2 text-[12px] align-middle"
                >
                  {c.render(row)}
                </td>
              ))}
              {actionCols > 0 && (
                <td className="px-2 py-2 align-middle">
                  <div className="flex items-center gap-0.5">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => onView(row)}
                        aria-label="View details"
                        title="View details"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => onEdit(row)}
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ active, className }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-[10px] font-semibold leading-none",
        active
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/**
 * Compact row. Status and the edit action sit absolutely in the right gutter so
 * the text column keeps one rhythm on phone and desktop alike.
 */
function Row({ title, fields, active, badge, onView, onEdit }) {
  return (
    // Flex rather than an absolutely-positioned right gutter: the status and
    // edit controls can never sit on top of wrapped sub-value pills.
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 md:py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight md:text-[15px]">
          {title}
        </p>
        {fields?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] leading-none md:text-[11px]">
            {fields}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {badge}
        {active !== undefined && <StatusPill active={active} />}
        {onView && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onView}
            aria-label="View details"
            title="View details"
          >
            <Eye className="size-3.5" />
          </Button>
        )}
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onEdit}
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** Full-width on mobile, constrained above; body scrolls if it gets long. */
function FormDialog({ open, onOpenChange, title, onSubmit, busy, submitLabel, children }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] overflow-y-auto p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-3"
        >
          {children}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-9" disabled={busy}>
              {busy ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Read-only detail popup — the same record the row summarises, with every field
 * spelled out. The pencil beside the close button promotes it to an edit.
 */
function ViewDialog({ open, onOpenChange, title, fields, onEdit }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] overflow-y-auto p-4 sm:max-w-md">
        <DialogHeader>
          {/* Leave room for the pencil + the built-in close button */}
          <DialogTitle className="pr-16 text-base">{title}</DialogTitle>
        </DialogHeader>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit this record"
            title="Edit"
            className="absolute right-11 top-4 rounded-md opacity-60 transition-opacity hover:opacity-100 cursor-pointer"
          >
            <Pencil className="size-4" />
          </button>
        )}

        <dl className="divide-y rounded-lg border">
          {fields.map((f) => (
            <div key={f.label} className="grid grid-cols-3 gap-2 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {f.label}
              </dt>
              <dd className="col-span-2 break-words text-[13px]">
                {f.value === "" || f.value === null || f.value === undefined ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  f.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActiveField({ checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--primary)]"
      />
      <span className="text-xs font-medium">Active</span>
    </label>
  );
}

function CategoryPicker({ value, onChange, categories }) {
  return (
    <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger>
        <SelectValue placeholder="Select a category…" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Category filter shared by the topics and services tabs. */
function CategoryFilter({ value, onChange, categories }) {
  return (
    <div>
      <Label className="mb-1.5 block text-[10px] uppercase tracking-wide text-muted-foreground/70">
        Category
      </Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger>
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Turn a save result into the toast the backend's `message` id implies. */
function toastSaved(noun, result, isEdit) {
  const suffix = result?.id ? ` (#${result.id})` : "";
  toast.success(`${noun} ${isEdit ? "updated" : "created"}${suffix}`);
}

/* -------------------------------------------------------------- categories */

function CategoriesTab({ createdBy, view, onView }) {
  // Default ordering: by ID.
  const [sort, toggleSort] = useSort({
    key: "id",
    column: "OM_CATEGORY_NO",
    dir: "asc",
  });
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const { data, loading, error, reload } = useCategories({
    orderBy: sort.column,
    sortDir: sort.dir,
    search,
  });
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);

  const openEdit = useCallback((c) => {
    setViewing(null);
    setEditing({ id: c.id, name: c.name, active: c.active });
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        sortColumn: "OM_CATEGORY_NO",
        sortValue: (c) => c.id,
        render: (c) => `#${c.id}`,
      },
      {
        key: "name",
        label: "Category",
        sortColumn: "OM_CATEGORY_NAME",
        sortValue: (c) => c.name,
        render: (c) => <span className="font-medium">{c.name}</span>,
      },
      {
        key: "by",
        label: "Created by",
        sortColumn: "OM_CATEGORY_CREATED_BY",
        sortValue: (c) => c.createdBy,
        render: (c) => c.createdBy || "—",
      },
      {
        key: "status",
        label: "Status",
        sortColumn: "OM_CATEGORY_ACTIVE",
        sortValue: (c) => (c.active ? 1 : 0),
        render: (c) => <StatusPill active={c.active} />,
      },
    ],
    [],
  );

  const filtered = data;

  const submit = useCallback(async () => {
    if (!editing.name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await saveCategory({
        id: editing.id,
        name: editing.name.trim(),
        active: editing.active,
        createdBy,
      });
      toastSaved("Category", res, editing.id > 0);
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message || "Could not save the category.");
    } finally {
      setBusy(false);
    }
  }, [editing, createdBy, reload]);

  return (
    <div className="space-y-2">
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search categories…"
        onRefresh={reload}
        loading={loading}
        onAdd={() => setEditing({ id: 0, name: "", active: true })}
        addLabel="Add category"
      />

      <div className="flex items-center justify-between gap-2">
        {!loading && !error ? (
          <ListCaption shown={filtered.length} total={filtered.length} noun="categories" />
        ) : (
          <span />
        )}
        <ViewToggle value={view} onChange={onView} />
      </div>

      <ListState
        loading={loading}
        error={error}
        empty={!filtered.length}
        emptyText={query ? "No categories match that search." : "No categories yet."}
        onRetry={reload}
      />

      {!loading && !error && filtered.length > 0 && view === "table" && (
        <DataTable
          columns={columns}
          rows={filtered}
          getKey={(c) => c.id}
          onView={setViewing}
          onEdit={openEdit}
          sort={sort}
          onSort={toggleSort}
        />
      )}

      {!loading &&
        !error &&
        view === "card" &&
        filtered.map((c) => (
          <Row
            key={c.id}
            title={c.name}
            active={c.active}
            fields={[
              <Field key="id" label="ID" value={`#${c.id}`} />,
              <Field key="by" label="Created by" value={c.createdBy} />,
            ]}
            onView={() => setViewing(c)}
            onEdit={() => openEdit(c)}
          />
        ))}

      {viewing && (
        <ViewDialog
          open
          onOpenChange={(o) => !o && setViewing(null)}
          title={viewing.name}
          onEdit={() => openEdit(viewing)}
          fields={[
            { label: "ID", value: `#${viewing.id}` },
            { label: "Name", value: viewing.name },
            { label: "Status", value: viewing.active ? "Active" : "Inactive" },
            { label: "Created by", value: viewing.createdBy },
            {
              label: "Created",
              value: viewing.createdAt
                ? new Date(viewing.createdAt).toLocaleString()
                : "",
            },
          ]}
        />
      )}

      {editing && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing.id > 0 ? `Edit category #${editing.id}` : "New category"}
          onSubmit={submit}
          busy={busy}
          submitLabel={editing.id > 0 ? "Save" : "Create"}
        >
          <div className="space-y-1">
            <Label htmlFor="cat-name">Category name</Label>
            <Input
              id="cat-name"
              autoFocus
              className="h-9"
              value={editing.name}
              onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Software Development"
            />
          </div>
          <ActiveField
            checked={editing.active}
            onChange={(v) => setEditing((s) => ({ ...s, active: v }))}
          />
        </FormDialog>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ topics */

function TopicsTab({ createdBy, view, onView }) {
  const { data: categories } = useCategories();
  const [categoryId, setCategoryId] = useState(0);
  const [sort, toggleSort] = useSort({ key: "id", column: "TOPICID", dir: "asc" });
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const { data, loading, error, reload } = useTopics({
    categoryId: categoryId || undefined,
    orderBy: sort.column,
    sortDir: sort.dir,
    search,
  });
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);

  const activeCategory = categories.find((c) => c.id === categoryId);

  const openEdit = useCallback((t) => {
    setViewing(null);
    setEditing({ id: t.id, name: t.name, categoryId: t.categoryId, active: true });
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        sortColumn: "TOPICID",
        sortValue: (t) => t.id,
        render: (t) => `#${t.id}`,
      },
      {
        key: "name",
        label: "Topic",
        sortColumn: "TOPICNAME",
        sortValue: (t) => t.name,
        render: (t) => <span className="font-medium">{t.name}</span>,
      },
      {
        key: "cat",
        label: "Category",
        sortColumn: "CATEGORYNAME",
        sortValue: (t) => t.categoryName,
        render: (t) => t.categoryName || `#${t.categoryId}`,
      },
    ],
    [],
  );

  const filtered = data;

  const submit = useCallback(async () => {
    if (!editing.name.trim()) {
      toast.error("Topic name is required.");
      return;
    }
    if (!editing.categoryId) {
      toast.error("Pick a category for this topic.");
      return;
    }
    setBusy(true);
    try {
      const res = await saveTopic({
        id: editing.id,
        categoryId: editing.categoryId,
        name: editing.name.trim(),
        active: editing.active,
        createdBy,
      });
      toastSaved("Topic", res, editing.id > 0);
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message || "Could not save the topic.");
    } finally {
      setBusy(false);
    }
  }, [editing, createdBy, reload]);

  return (
    <div className="space-y-2">
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search topics…"
        onRefresh={reload}
        loading={loading}
        onAdd={() =>
          setEditing({ id: 0, name: "", categoryId: categoryId || 0, active: true })
        }
        addLabel="Add topic"
      />

      {/* Server-side filter — CATEGORYNO on view 1693 */}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <CategoryFilter
            value={categoryId}
            onChange={setCategoryId}
            categories={categories}
          />
        </div>
        <ViewToggle value={view} onChange={onView} />
      </div>

      {!loading && !error && (
        <ListCaption
          shown={filtered.length}
          total={filtered.length}
          noun="topics"
          filterNote={activeCategory ? `in ${activeCategory.name}` : "all categories"}
        />
      )}

      <ListState
        loading={loading}
        error={error}
        empty={!filtered.length}
        emptyText={
          query
            ? "No topics match that search."
            : categoryId
              ? "No topics in this category yet."
              : "No topics yet."
        }
        onRetry={reload}
      />

      {!loading && !error && filtered.length > 0 && view === "table" && (
        <DataTable
          columns={columns}
          rows={filtered}
          getKey={(t) => t.id}
          onView={setViewing}
          onEdit={openEdit}
          sort={sort}
          onSort={toggleSort}
        />
      )}

      {!loading &&
        !error &&
        view === "card" &&
        filtered.map((t) => (
          <Row
            key={t.id}
            title={t.name}
            fields={[
              <Field key="id" label="ID" value={`#${t.id}`} />,
              <Field
                key="cat"
                label="Category"
                value={t.categoryName || `#${t.categoryId}`}
              />,
            ]}
            onView={() => setViewing(t)}
            onEdit={() => openEdit(t)}
          />
        ))}

      {viewing && (
        <ViewDialog
          open
          onOpenChange={(o) => !o && setViewing(null)}
          title={viewing.name}
          onEdit={() => openEdit(viewing)}
          fields={[
            { label: "ID", value: `#${viewing.id}` },
            { label: "Topic", value: viewing.name },
            { label: "Category", value: viewing.categoryName },
            { label: "Category ID", value: `#${viewing.categoryId}` },
          ]}
        />
      )}

      {editing && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing.id > 0 ? `Edit topic #${editing.id}` : "New topic"}
          onSubmit={submit}
          busy={busy}
          submitLabel={editing.id > 0 ? "Save" : "Create"}
        >
          <div className="space-y-1">
            <Label>Category</Label>
            <CategoryPicker
              value={editing.categoryId}
              onChange={(v) => setEditing((s) => ({ ...s, categoryId: v }))}
              categories={categories}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="topic-name">Topic name</Label>
            <Input
              id="topic-name"
              autoFocus
              className="h-9"
              value={editing.name}
              onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Web Development"
            />
          </div>
          <ActiveField
            checked={editing.active}
            onChange={(v) => setEditing((s) => ({ ...s, active: v }))}
          />
        </FormDialog>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- services */

function ServicesTab({ createdBy, view, onView }) {
  const { data: categories } = useCategories();
  const [categoryId, setCategoryId] = useState(0);
  const [sort, toggleSort] = useSort({ key: "id", column: "OM_SERVICE_ID", dir: "asc" });
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const { data, loading, error, reload } = useServices({
    categoryId: categoryId || undefined,
    orderBy: sort.column,
    sortDir: sort.dir,
    search,
  });
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const activeCategory = categories.find((c) => c.id === categoryId);

  const openEdit = useCallback((s) => {
    setViewing(null);
    setEditing({
      id: s.id,
      name: s.name,
      description: s.description,
      categoryId: s.categoryId,
      active: s.active,
    });
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        sortColumn: "OM_SERVICE_ID",
        sortValue: (s) => s.id,
        render: (s) => `#${s.id}`,
      },
      {
        key: "name",
        label: "Service",
        sortColumn: "OM_SERVICE_NAME",
        sortValue: (s) => s.name,
        render: (s) => <span className="font-medium">{s.name}</span>,
      },
      {
        key: "cat",
        label: "Category",
        sortColumn: "OM_CATEGORY_NAME",
        sortValue: (s) => s.categoryName,
        render: (s) => s.categoryName || `#${s.categoryId}`,
      },
      {
        key: "desc",
        label: "Description",
        sortColumn: "OM_SERVICE_DESCRIPTION",
        sortValue: (s) => s.description,
        render: (s) => s.description || "—",
      },
      {
        key: "status",
        label: "Status",
        sortColumn: "OM_SERVICE_ACTIVE",
        sortValue: (s) => (s.active ? 1 : 0),
        render: (s) => <StatusPill active={s.active} />,
      },
    ],
    [],
  );

  const filtered = data;

  const submit = useCallback(async () => {
    if (!editing.name.trim()) {
      toast.error("Service name is required.");
      return;
    }
    if (!editing.categoryId) {
      toast.error("Pick a category for this service.");
      return;
    }
    setBusy(true);
    try {
      const res = await saveService({
        id: editing.id,
        categoryId: editing.categoryId,
        name: editing.name.trim(),
        description: editing.description.trim(),
        active: editing.active,
        createdBy,
      });
      toastSaved("Service", res, editing.id > 0);
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message || "Could not save the service.");
    } finally {
      setBusy(false);
    }
  }, [editing, createdBy, reload]);

  return (
    <div className="space-y-2">
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search services…"
        onRefresh={reload}
        loading={loading}
        onAdd={() =>
          setEditing({
            id: 0,
            name: "",
            description: "",
            categoryId: categoryId || 0,
            active: true,
          })
        }
        addLabel="Add service"
      />

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <CategoryFilter
            value={categoryId}
            onChange={setCategoryId}
            categories={categories}
          />
        </div>
        <ViewToggle value={view} onChange={onView} />
      </div>

      {!loading && !error && (
        <ListCaption
          shown={filtered.length}
          total={filtered.length}
          noun="services"
          filterNote={activeCategory ? `in ${activeCategory.name}` : "all categories"}
        />
      )}

      <ListState
        loading={loading}
        error={error}
        empty={!filtered.length}
        emptyText={query ? "No services match that search." : "No services yet."}
        onRetry={reload}
      />

      {!loading && !error && filtered.length > 0 && view === "table" && (
        <DataTable
          columns={columns}
          rows={filtered}
          getKey={(s) => s.id}
          onView={setViewing}
          onEdit={openEdit}
          sort={sort}
          onSort={toggleSort}
        />
      )}

      {!loading &&
        !error &&
        view === "card" &&
        filtered.map((s) => (
          <Row
            key={s.id}
            title={s.name}
            active={s.active}
            fields={[
              <Field key="id" label="ID" value={`#${s.id}`} />,
              <Field
                key="cat"
                label="Category"
                value={s.categoryName || `#${s.categoryId}`}
              />,
              <Field key="desc" label="Details" value={s.description} />,
            ]}
            onView={() => setViewing(s)}
            onEdit={() => openEdit(s)}
          />
        ))}

      {viewing && (
        <ViewDialog
          open
          onOpenChange={(o) => !o && setViewing(null)}
          title={viewing.name}
          onEdit={() => openEdit(viewing)}
          fields={[
            { label: "ID", value: `#${viewing.id}` },
            { label: "Service", value: viewing.name },
            { label: "Category", value: viewing.categoryName },
            { label: "Description", value: viewing.description },
            { label: "Status", value: viewing.active ? "Active" : "Inactive" },
            { label: "Created by", value: viewing.createdBy },
            {
              label: "Created",
              value: viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : "",
            },
          ]}
        />
      )}

      {editing && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing.id > 0 ? `Edit service #${editing.id}` : "New service"}
          onSubmit={submit}
          busy={busy}
          submitLabel={editing.id > 0 ? "Save" : "Create"}
        >
          <div className="space-y-1">
            <Label>Category</Label>
            <CategoryPicker
              value={editing.categoryId}
              onChange={(v) => setEditing((s) => ({ ...s, categoryId: v }))}
              categories={categories}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="svc-name">Service name</Label>
            <Input
              id="svc-name"
              autoFocus
              className="h-9"
              value={editing.name}
              onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Code Review"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="svc-desc">Description</Label>
            <Textarea
              id="svc-desc"
              rows={3}
              className="min-h-16"
              value={editing.description}
              onChange={(e) => setEditing((s) => ({ ...s, description: e.target.value }))}
              placeholder="What does this service cover?"
            />
          </div>
          <ActiveField
            checked={editing.active}
            onChange={(v) => setEditing((s) => ({ ...s, active: v }))}
          />
        </FormDialog>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- members */

const MEMBER_FILTERS = [
  { value: "", label: "All" },
  { value: USER_TYPE.SEEKER, label: "Seekers" },
  { value: USER_TYPE.OFFERER, label: "Offerers" },
];

function MemberTypePill({ type }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-[10px] font-semibold leading-none",
        type === USER_TYPE.OFFERER
          ? "bg-[var(--offerer)]/15 text-[var(--offerer)]"
          : type === USER_TYPE.SEEKER
            ? "bg-[var(--seeker)]/15 text-[var(--seeker)]"
            : "bg-muted text-muted-foreground",
      )}
    >
      {type || "—"}
    </span>
  );
}

function MembersTab({ view, onView }) {
  const [type, setType] = useState("");
  const [sort, toggleSort] = useSort({
    key: "id",
    column: "OM_USER_REG_NO",
    dir: "asc",
  });
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const { data, loading, error, reload } = useUsers({
    type: type || undefined,
    orderBy: sort.column,
    sortDir: sort.dir,
    search,
  });
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);

  const openEdit = useCallback((u) => {
    setViewing(null);
    setEditing({
      regNo: u.id,
      name: u.name,
      email: u.email,
      // View 1699 exposes the stored password, so an edit can round-trip it
      // rather than silently resetting the member's credentials.
      password: u.raw?.OM_USER_PASSWORD || "",
      userType: u.type || USER_TYPE.SEEKER,
      country: u.country,
      city: u.city,
      personalInformation: u.info,
      dob: "",
      active: u.active,
    });
  }, []);

  const submit = useCallback(async () => {
    if (!editing.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!editing.email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (!editing.password) {
      toast.error("A password is required.");
      return;
    }
    if (!editing.country || !editing.city) {
      toast.error("Pick a country and city.");
      return;
    }
    if (!editing.dob) {
      toast.error("Date of birth is required — the members view doesn't return it.");
      return;
    }
    setBusy(true);
    try {
      const res = await saveUser({ ...editing, name: editing.name.trim() });
      toastSaved("Member", res, editing.regNo > 0);
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message || "Could not save the member.");
    } finally {
      setBusy(false);
    }
  }, [editing, reload]);

  const columns = useMemo(
    () => [
      {
        key: "id",
        label: "Reg no",
        sortColumn: "OM_USER_REG_NO",
        sortValue: (u) => u.id,
        render: (u) => `#${u.id}`,
      },
      {
        key: "name",
        label: "Name",
        sortColumn: "OM_USER_NAME",
        sortValue: (u) => u.name,
        render: (u) => <span className="font-medium">{u.name || "(no name)"}</span>,
      },
      {
        key: "email",
        label: "Email",
        sortColumn: "OM_USER_EMAIL",
        sortValue: (u) => u.email,
        render: (u) => u.email,
      },
      {
        key: "loc",
        label: "Location",
        sortColumn: "OM_USER_CITY",
        sortValue: (u) => u.city,
        render: (u) => [u.city, u.country].filter(Boolean).join(", ") || "—",
      },
      {
        key: "type",
        label: "Type",
        sortColumn: "OM_USER_SEEKER_GUIDANCE_ALL",
        sortValue: (u) => u.type,
        render: (u) => <MemberTypePill type={u.type} />,
      },
    ],
    [],
  );

  const filtered = data;

  const activeFilter = MEMBER_FILTERS.find((f) => f.value === type);

  return (
    <div className="space-y-2">
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Search members…"
        onRefresh={reload}
        loading={loading}
        onAdd={() =>
          setEditing({
            regNo: 0,
            name: "",
            email: "",
            password: "",
            userType: type || USER_TYPE.SEEKER,
            country: "",
            city: "",
            personalInformation: "",
            dob: "",
            active: true,
          })
        }
        addLabel="Add member"
      />

      {/* Server-side filter — OM_USER_SEEKER_GUIDANCE_ALL on view 1699 */}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          {/* No label — All / Seekers / Offerers speaks for itself */}
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1">
            {MEMBER_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setType(f.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer",
                  type === f.value
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <ViewToggle value={view} onChange={onView} />
      </div>

      {!loading && !error && (
        <ListCaption
          shown={filtered.length}
          total={filtered.length}
          noun="members"
          filterNote={activeFilter?.value ? activeFilter.label : "all types"}
        />
      )}

      <ListState
        loading={loading}
        error={error}
        empty={!filtered.length}
        emptyText={query ? "No members match that search." : "No members registered yet."}
        onRetry={reload}
      />

      {!loading && !error && filtered.length > 0 && view === "table" && (
        <DataTable
          columns={columns}
          rows={filtered}
          getKey={(u) => `${u.id}-${u.email}`}
          onView={setViewing}
          onEdit={openEdit}
          sort={sort}
          onSort={toggleSort}
        />
      )}

      {!loading &&
        !error &&
        view === "card" &&
        filtered.map((u) => (
          <Row
            key={`${u.id}-${u.email}`}
            title={u.name || "(no name)"}
            fields={[
              <Field key="id" label="Reg no" value={`#${u.id}`} />,
              <Field key="mail" label="Email" value={u.email} />,
              <Field
                key="loc"
                label="Location"
                value={[u.city, u.country].filter(Boolean).join(", ")}
              />,
            ]}
            badge={<MemberTypePill type={u.type} />}
            onView={() => setViewing(u)}
            onEdit={() => openEdit(u)}
          />
        ))}

      {viewing && (
        <ViewDialog
          open
          onOpenChange={(o) => !o && setViewing(null)}
          title={viewing.name || "(no name)"}
          onEdit={() => openEdit(viewing)}
          fields={[
            { label: "Reg no", value: `#${viewing.id}` },
            { label: "Name", value: viewing.name },
            { label: "Email", value: viewing.email },
            { label: "Type", value: viewing.type },
            { label: "Country", value: viewing.country },
            { label: "City", value: viewing.city },
            { label: "About", value: viewing.info },
            {
              label: "Registered",
              value: viewing.registeredAt
                ? new Date(viewing.registeredAt).toLocaleString()
                : "",
            },
            {
              label: "Expires",
              value: viewing.expiresAt
                ? new Date(viewing.expiresAt).toLocaleString()
                : "",
            },
          ]}
        />
      )}

      {editing && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing.regNo > 0 ? `Edit member #${editing.regNo}` : "New member"}
          onSubmit={submit}
          busy={busy}
          submitLabel={editing.regNo > 0 ? "Save" : "Create"}
        >
          <div className="space-y-1">
            <Label htmlFor="mem-name">Full name</Label>
            <Input
              id="mem-name"
              autoFocus
              className="h-9"
              value={editing.name}
              onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mem-email">Email</Label>
            <Input
              id="mem-email"
              type="email"
              className="h-9"
              value={editing.email}
              onChange={(e) => setEditing((s) => ({ ...s, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mem-pass">Password</Label>
            <Input
              id="mem-pass"
              className="h-9"
              value={editing.password}
              onChange={(e) => setEditing((s) => ({ ...s, password: e.target.value }))}
              placeholder={editing.regNo > 0 ? "" : "Set an initial password"}
            />
          </div>
          <div className="space-y-1">
            <Label>User type</Label>
            <Select
              value={editing.userType}
              onValueChange={(v) => setEditing((s) => ({ ...s, userType: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USER_TYPE.SEEKER}>Seeker</SelectItem>
                <SelectItem value={USER_TYPE.OFFERER}>Offerer</SelectItem>
                <SelectItem value={USER_TYPE.ALL}>All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <LocationSelect
            country={editing.country}
            city={editing.city}
            onCountry={(v) => setEditing((s) => ({ ...s, country: v }))}
            onCity={(v) => setEditing((s) => ({ ...s, city: v }))}
          />
          <div className="space-y-1">
            <Label htmlFor="mem-dob">Date of birth</Label>
            <Input
              id="mem-dob"
              type="date"
              className="h-9"
              value={editing.dob}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setEditing((s) => ({ ...s, dob: e.target.value }))}
            />
            {editing.regNo > 0 && (
              <p className="text-[10px] text-muted-foreground">
                The members view doesn't return the stored date of birth, so it has to
                be re-entered on every edit — saving without it would blank the record.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="mem-info">About</Label>
            <Textarea
              id="mem-info"
              rows={3}
              className="min-h-16"
              value={editing.personalInformation}
              onChange={(e) =>
                setEditing((s) => ({ ...s, personalInformation: e.target.value }))
              }
            />
          </div>
          <ActiveField
            checked={editing.active}
            onChange={(v) => setEditing((s) => ({ ...s, active: v }))}
          />
        </FormDialog>
      )}
    </div>
  );
}
