import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Inbox,
  Paperclip,
  Mail,
  MessageCircle,
  Phone,
  Send,
  AlertCircle,
  Info,
  Clock,
  Search,
  Eye,
  UserRound,
  Check,
  X,
  SlidersHorizontal,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import {
  useMyRegNo,
  useOffererRequests,
  useOffererResponseIndex,
  useSeekAttachmentIndex,
  useUsers,
} from "@/hooks/use-p2p.js";
import { parseSeekDetail } from "@/lib/seek-matching.js";
import { saveOffererResponse } from "@/api/p2p.js";
import { RESPONSE_DECISION, SPS } from "@/api/config.js";
import PageContainer from "@/components/layout/page-container.jsx";
import { SeekViewerDialog } from "@/components/seek-viewer.jsx";
import { hasId, initials } from "@/lib/utils.js";

function formatWhen(dateValue, timeValue) {
  const d = dateValue ? new Date(dateValue) : null;
  const t = timeValue ? new Date(timeValue) : null;
  if (!d || Number.isNaN(d.getTime())) return "—";
  const day = d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (!t || Number.isNaN(t.getTime())) return day;
  return `${day}, ${t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

/** Clock only — the date half of a preferred-contact time carries no meaning. */
function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const topicsOf = (detailText) => parseSeekDetail(detailText).topics;

/** Why this seek reached this offerer — see `matchSeekToOfferer`. */
function matchLabel(match) {
  if (match?.reason === "direct") return "Sent to you";
  if (match?.reason === "topic") return `You offer: ${match.sharedTopics.join(", ")}`;
  if (match?.reason === "whole-category") return "You serve this whole category";
  return "Open to the whole category";
}

/**
 * Seeker requests — the offerer's inbox.
 *
 * An offerer sees ONLY the seeks that ask for what they offer, while still
 * open: a topic they offer, a category they serve whole, or a seek sent to them
 * by name. A seek sent to another offerer is never shown. The rule lives in
 * `lib/seek-matching.js`. There is no "show me everything" escape hatch.
 *
 * Responding saves on SP 1905 (accept or decline + a message). The backend
 * emails the seeker from SQL, so Send asks for confirmation first. What this
 * offerer already answered comes back from view 1903.
 */
export default function Requests() {
  const { user } = useAuth();
  const { regNo } = useMyRegNo(user);

  const requests = useOffererRequests({ offererId: regNo, offererName: user?.name });
  const attachments = useSeekAttachmentIndex();
  const seekers = useUsers();

  const [query, setQuery] = useState("");
  // Filters (client, 2026-10-30). "all" = no filter on that field.
  const [sort, setSort] = useState("newest");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  // Mobile: the filters live in a popup so they don't fill half the screen.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // ?seek=<id> — opened from a seeker's profile to jump to one request.
  const [params, setParams] = useSearchParams();
  const focusId = Number(params.get("seek")) || null;
  const clearFocus = () => {
    const next = new URLSearchParams(params);
    next.delete("seek");
    setParams(next, { replace: true });
  };
  const [openId, setOpenId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [replies, setReplies] = useState({});
  const [decisions, setDecisions] = useState({});
  const [sendingId, setSendingId] = useState(null);
  const responses = useOffererResponseIndex({ offererId: regNo, enabled: hasId(regNo) });

  // Newest first from the view, so [0] is this offerer's latest answer.
  const myResponse = useCallback(
    (seekId) => (responses.index.get(seekId) || [])[0] || null,
    [responses.index],
  );

  const seekerById = useMemo(() => {
    const map = new Map();
    for (const u of seekers.data) map.set(u.id, u);
    return map;
  }, [seekers.data]);

  const categoryName = useCallback(
    (id) => requests.categories.find((c) => c.categoryId === id)?.categoryName || `Category ${id}`,
    [requests.categories],
  );



  /** When the request was raised, for sorting; falls back to the ticket number. */
  const raisedTime = (r) => (r.raisedAt || r.raisedOn)?.getTime?.() || 0;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = requests.data.filter((s) => {
      if (focusId) return s.id === focusId;
      if (categoryFilter !== "all" && s.categoryId !== Number(categoryFilter)) return false;
      if (statusFilter !== "all") {
        const mine = myResponse(s.id);
        if (statusFilter === "new" && mine) return false;
        if (statusFilter === "accepted" && mine?.decision !== RESPONSE_DECISION.ACCEPT) return false;
        if (statusFilter === "declined" && mine?.decision !== RESPONSE_DECISION.REJECT) return false;
      }
      if (!q) return true;
      const seeker = seekerById.get(s.seekerId);
      return [
        String(s.id),
        s.narration,
        seeker?.name,
        seeker?.city,
        topicsOf(requests.details.get(s.id)),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
    const dir = sort === "oldest" ? 1 : -1;
    return list.sort((a, b) => dir * (raisedTime(a) - raisedTime(b) || a.id - b.id));
  }, [
    requests.data,
    requests.details,
    query,
    seekerById,
    focusId,
    categoryFilter,
    statusFilter,
    sort,
    myResponse,
  ]);

  const activeFilterCount =
    Number(categoryFilter !== "all") + Number(statusFilter !== "all");
  const filtersOn = activeFilterCount > 0 || sort !== "newest";
  const resetFilters = () => {
    setSort("newest");
    setCategoryFilter("all");
    setStatusFilter("all");
    setQuery("");
  };

  const reloadResponses = responses.reload;
  const sendResponse = useCallback(
    async (seek) => {
      const text = (replies[seek.id] || "").trim();
      const decision = decisions[seek.id];
      const missing = [!decision && "Accept or Decline", !text && "a message"].filter(Boolean);
      if (missing.length) {
        toast.error("Response incomplete", { description: `Add ${missing.join(" and ")}.` });
        return;
      }

      const verb = decision === RESPONSE_DECISION.ACCEPT ? "ACCEPT" : "DECLINE";
      if (
        !window.confirm(
          `${verb} ticket #${seek.id}?

"${text.slice(0, 200)}${text.length > 200 ? "…" : ""}"

` +
            "The seeker will be emailed your response.",
        )
      ) {
        return;
      }

      setSendingId(seek.id);
      try {
        await saveOffererResponse({
          seekId: seek.id,
          offererId: regNo,
          decision,
          narration: text,
        });
        setReplies((prev) => ({ ...prev, [seek.id]: "" }));
        setOpenId(null);
        toast.success(decision === RESPONSE_DECISION.ACCEPT ? "Accepted" : "Declined", {
          description: `Response saved on ticket #${seek.id}. The seeker is emailed by the system.`,
        });
        reloadResponses();
      } catch (err) {
        toast.error(`Response not saved (SP ${SPS.SAVE_OFFERER_RESPONSE})`, {
          description: err.message,
        });
      } finally {
        setSendingId(null);
      }
    },
    [replies, decisions, regNo, reloadResponses],
  );

  if (!hasId(regNo)) {
    return (
      <PageContainer>
        <div className="flex items-start gap-2 rounded-lg border p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            This screen needs a member record. Sign in as an Offerer to see the requests
            in the categories you serve.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-3">
        <h1 className="text-lg font-bold tracking-tight md:text-xl">Seeker requests</h1>
        <p className="text-xs text-muted-foreground">
          Only open requests that ask for what you offer.
        </p>
      </div>

      {/* What this offerer offers — the answer to "why am I seeing this?" */}
      {requests.categories.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
            You offer
          </p>
          {/* One line, swipe/scroll sideways — never wraps into a tall block. */}
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
            {requests.categories.map((c) => {
              const topicNames = [
                ...(requests.scope.topicsByCategory.get(c.categoryId)?.values() || []),
              ];
              return (
                <span
                  key={c.categoryId}
                  className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                >
                  {c.categoryName}
                  {topicNames.length ? `: ${topicNames.join(", ")}` : " (all topics)"}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {focusId ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
          <p className="text-xs text-primary">
            Showing request <span className="font-mono font-semibold">#{focusId}</span> only.
          </p>
          <Button size="sm" variant="ghost" className="ml-auto h-11 md:h-8" onClick={clearFocus}>
            Show all requests
          </Button>
        </div>
      ) : (
        <div className="mb-3 space-y-2">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 pl-8 text-base md:h-9 md:text-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search seeker, topic or text…"
              />
            </div>
            <Button
              type="button"
              variant={filtersOn ? "default" : "outline"}
              className="h-11 shrink-0 md:hidden"
              onClick={() => setFiltersOpen(true)}
              aria-label="Filters"
            >
              <SlidersHorizontal className="size-4" />
              Filters
              {activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
          </div>
          <div className="hidden gap-2 md:grid md:grid-cols-3">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-11 md:h-9" aria-label="Sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 md:h-9" aria-label="Your response">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any response</SelectItem>
                <SelectItem value="new">Not answered yet</SelectItem>
                <SelectItem value="accepted">I accepted</SelectItem>
                <SelectItem value="declined">I declined</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 md:h-9" aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {requests.categories.map((c) => (
                  <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                    {c.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(filtersOn || query) && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <SlidersHorizontal className="size-3.5" />
              {rows.length} of {requests.data.length} shown
              <Button size="sm" variant="ghost" className="ml-auto h-11 md:h-7" onClick={resetFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </div>
      )}

      {requests.loading ? (
        <div className="space-y-2">
          <div className="shimmer h-24 rounded-lg" />
          <div className="shimmer h-24 rounded-lg" />
        </div>
      ) : requests.error ? (
        <p className="text-xs text-destructive">{requests.error}</p>
      ) : requests.categoryIds.length === 0 && requests.data.length === 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-dashed p-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            You don't serve any categories yet, so there is nothing to show. Add your
            areas of interest on your profile and requests raised against them will
            appear here.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-dashed p-3">
          <Inbox className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            {requests.data.length === 0
              ? "No open requests for what you offer right now."
              : "No request matches these filters."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((s) => {
            const seeker = seekerById.get(s.seekerId);
            const topics = topicsOf(requests.details.get(s.id));
            const atts = attachments.index.get(s.id) || [];
            const isOpen = openId === s.id;

            return (
              <li key={s.id} className="rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                    {initials(seeker?.name || "?")}
                  </span>
                  <Link
                    to={`/member/${s.seekerId}`}
                    className="text-sm font-semibold hover:text-primary hover:underline"
                  >
                    {seeker?.name || `Seeker ${s.seekerId}`}
                  </Link>
                  <span className="font-mono text-[11px] text-muted-foreground">#{s.id}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formatWhen(s.raisedOn, s.raisedAt)}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {categoryName(s.categoryId)}
                  </span>
                  {topics && <span>Topics: {topics}</span>}
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    {matchLabel(s.match)}
                  </span>
                  {seeker?.city && <span>· {seeker.city}</span>}
                </div>

                <p className="mt-2 whitespace-pre-wrap text-xs">
                  {s.narration || "(no description)"}
                </p>

                {atts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {atts.map((a, i) => (
                      <a
                        key={a.url}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-primary hover:underline"
                      >
                        <Paperclip className="size-2.5" />
                        Attachment {i + 1}
                      </a>
                    ))}
                  </div>
                )}

                {/* How the seeker asked to be reached — the SP will act on this. */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <Clock className="size-3" />
                  <span>Reply via</span>
                  {s.byEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" /> {seeker?.email || "email"}
                    </span>
                  )}
                  {s.byWhatsapp && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="size-3" /> WhatsApp {s.callOn}
                    </span>
                  )}
                  {s.callOn && !s.byWhatsapp && (
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" /> {s.callOn}
                    </span>
                  )}
                  {!s.byEmail && !s.byWhatsapp && !s.callOn && <span>no preference given</span>}
                  {(s.preferredWeekDay || s.preferredTime) && (
                    <span>
                      · prefers {[s.preferredWeekDay, formatTime(s.preferredTime)].filter(Boolean).join(" ")}
                    </span>
                  )}
                </div>

                {/* Answered: one clear, final status — no second response. */}
                {myResponse(s.id) && (
                  <div
                    className={
                      "mt-2 flex items-start gap-2 rounded-md px-2.5 py-2 text-[11px] " +
                      (myResponse(s.id).decision === RESPONSE_DECISION.ACCEPT
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {myResponse(s.id).decision === RESPONSE_DECISION.ACCEPT ? (
                      <Check className="mt-0.5 size-3.5 shrink-0" />
                    ) : (
                      <X className="mt-0.5 size-3.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold">
                        You {myResponse(s.id).decision === RESPONSE_DECISION.ACCEPT ? "accepted" : "declined"}{" "}
                        this request
                        {myResponse(s.id).respondedAt &&
                          ` on ${myResponse(s.id).respondedAt.toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                          })}`}
                      </p>
                      {myResponse(s.id).narration && (
                        <p className="mt-0.5 line-clamp-2 opacity-90">
                          “{myResponse(s.id).narration}”
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {isOpen && !myResponse(s.id) ? (
                  <div className="mt-2 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        [RESPONSE_DECISION.ACCEPT, "Accept", Check],
                        [RESPONSE_DECISION.REJECT, "Decline", X],
                      ].map(([value, label, Icon]) => (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={decisions[s.id] === value ? "default" : "outline"}
                          className="h-11 md:h-8"
                          aria-pressed={decisions[s.id] === value}
                          onClick={() => setDecisions((prev) => ({ ...prev, [s.id]: value }))}
                        >
                          <Icon className="size-3.5" /> {label}
                        </Button>
                      ))}
                    </div>
                    <Label htmlFor={`reply-${s.id}`} className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      Your response
                    </Label>
                    <Textarea
                      id={`reply-${s.id}`}
                      rows={4}
                      maxLength={1000}
                      className="text-base md:text-sm"
                      value={replies[s.id] || ""}
                      onChange={(e) =>
                        setReplies((prev) => ({ ...prev, [s.id]: e.target.value }))
                      }
                      placeholder="How can you help with this?"
                    />
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-11 md:h-8"
                        disabled={sendingId === s.id}
                        onClick={() => sendResponse(s)}
                      >
                        <Send className="size-3.5" />{" "}
                        {sendingId === s.id ? "Sending…" : "Send response"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-11 md:h-8"
                        onClick={() => setOpenId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Labelled actions — a bare eye icon left offerers guessing
                  // what it opened (client, 2026-10-27).
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {/* Once answered, the decision is final — no "respond again". */}
                    {!myResponse(s.id) && (
                      <Button
                        size="sm"
                        className="h-11 md:h-8"
                        onClick={() => setOpenId(s.id)}
                      >
                        <Send className="size-3.5" /> Respond
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 md:h-8"
                      onClick={() => setViewingId(s.id)}
                    >
                      <Eye className="size-3.5" /> View request
                    </Button>
                    <Button size="sm" variant="outline" className="h-11 md:h-8" asChild>
                      <Link to={`/member/${s.seekerId}`}>
                        <UserRound className="size-3.5" /> Seeker profile
                      </Link>
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          You see a request only if it asks for a service you offer, covers a whole
          category you serve, or was sent to you. When you respond, the seeker is
          emailed.
        </p>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Filter requests</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-11 w-full" aria-label="Sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full" aria-label="Your response">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any response</SelectItem>
                <SelectItem value="new">Not answered yet</SelectItem>
                <SelectItem value="accepted">I accepted</SelectItem>
                <SelectItem value="declined">I declined</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 w-full" aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {requests.categories.map((c) => (
                  <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                    {c.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="h-11"
              onClick={resetFilters}
            >
              Clear
            </Button>
            <Button className="h-11" onClick={() => setFiltersOpen(false)}>
              Show {rows.length} request{rows.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SeekViewerDialog
        seek={requests.data.find((s) => s.id === viewingId) || null}
        detail={{ topics: topicsOf(requests.details.get(viewingId)) }}
        attachments={attachments.index.get(viewingId) || []}
        seeker={seekerById.get(requests.data.find((s) => s.id === viewingId)?.seekerId)}
        categoryName={categoryName(
          requests.data.find((s) => s.id === viewingId)?.categoryId,
        )}
        open={viewingId !== null}
        onOpenChange={(open) => !open && setViewingId(null)}
      />
    </PageContainer>
  );
}
