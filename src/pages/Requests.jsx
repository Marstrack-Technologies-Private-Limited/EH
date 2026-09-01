import { useCallback, useMemo, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import {
  useMyRegNo,
  useOffererRequests,
  useSeekAttachmentIndex,
  useSeekDetailIndex,
  useUsers,
} from "@/hooks/use-p2p.js";
import PageContainer from "@/components/layout/page-container.jsx";
import { SeekViewerDialog } from "@/components/seek-viewer.jsx";
import { cn, hasId, initials } from "@/lib/utils.js";

const URGENCY_TONE = {
  Critical: "bg-destructive/15 text-destructive",
  "Semi urgent": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Moderate: "bg-primary/15 text-primary",
  "Can wait": "bg-muted text-muted-foreground",
};

/** Critical first, so the most urgent requests sort to the top. */
const URGENCY_RANK = { Critical: 0, "Semi urgent": 1, Moderate: 2, "Can wait": 3 };

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

function topicsOf(detailText) {
  return (/Topics:\s*([^|]*)/.exec(detailText || "")?.[1] || "").trim();
}

/**
 * Seeker requests — the offerer's inbox.
 *
 * An offerer sees a seek only when its category is one they signed up for
 * (view 1703 → view 1818), and only while it is still open. There is no
 * "show me everything" escape hatch: seeing outside your categories is the
 * thing this screen exists to prevent.
 *
 * Responding is built but **held**: the offerer's response stored procedure
 * has not been issued yet, so Send validates and previews and then says so
 * rather than pretending to save. Wiring it is one call in `sendResponse`.
 *
 * WhatsApp and email delivery are likewise the backend's to trigger — the seek
 * carries the seeker's stated preference, so this screen shows what they asked
 * for and the SP will act on it.
 */
export default function Requests() {
  const { user } = useAuth();
  const { regNo } = useMyRegNo(user);

  const requests = useOffererRequests({ offererId: regNo });
  const details = useSeekDetailIndex();
  const attachments = useSeekAttachmentIndex();
  const seekers = useUsers();

  const [query, setQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");
  const [openId, setOpenId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [replies, setReplies] = useState({});

  const seekerById = useMemo(() => {
    const map = new Map();
    for (const u of seekers.data) map.set(u.id, u);
    return map;
  }, [seekers.data]);

  const categoryName = useCallback(
    (id) => requests.categories.find((c) => c.categoryId === id)?.categoryName || `Category ${id}`,
    [requests.categories],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.data
      .filter((s) => (urgencyFilter === "ALL" ? true : s.urgency === urgencyFilter))
      .filter((s) => {
        if (!q) return true;
        const seeker = seekerById.get(s.seekerId);
        return [
          String(s.id),
          s.narration,
          s.urgency,
          seeker?.name,
          seeker?.city,
          topicsOf(details.index.get(s.id)),
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .sort(
        (a, b) =>
          (URGENCY_RANK[a.urgency] ?? 9) - (URGENCY_RANK[b.urgency] ?? 9) || b.id - a.id,
      );
  }, [requests.data, urgencyFilter, query, seekerById, details.index]);

  const sendResponse = useCallback(
    (seek) => {
      const text = (replies[seek.id] || "").trim();
      if (!text) {
        toast.error("Nothing to send", { description: "Type your response first." });
        return;
      }

      const channels = [
        seek.byEmail && "email",
        seek.byWhatsapp && "WhatsApp",
        seek.callOn && `call ${seek.callOn}`,
      ].filter(Boolean);

      // Deliberately not faking a save — there is no response object to call.
      toast.error("No response endpoint yet", {
        description:
          `Ready to send ${text.length} characters to ticket #${seek.id}` +
          (channels.length ? `, to be delivered by ${channels.join(" and ")}.` : ".") +
          " Send the offerer response SP and its parameters and this will submit.",
      });
    },
    [replies],
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
          Open requests in the categories you serve.
        </p>
      </div>

      {/* Which categories are in play — the answer to "why am I seeing this?" */}
      {requests.categories.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            Your areas
          </span>
          {requests.categories.map((c) => (
            <span
              key={c.categoryId}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {c.categoryName}
            </span>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ticket, seeker, topic or text…"
          />
        </div>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="h-9 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All urgencies</SelectItem>
            {Object.keys(URGENCY_RANK).map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {requests.loading ? (
        <div className="space-y-2">
          <div className="shimmer h-24 rounded-lg" />
          <div className="shimmer h-24 rounded-lg" />
        </div>
      ) : requests.error ? (
        <p className="text-xs text-destructive">{requests.error}</p>
      ) : requests.categoryIds.length === 0 ? (
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
              ? "No open requests in your categories right now."
              : "No request matches this search or urgency filter."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((s) => {
            const seeker = seekerById.get(s.seekerId);
            const topics = topicsOf(details.index.get(s.id));
            const atts = attachments.index.get(s.id) || [];
            const isOpen = openId === s.id;

            return (
              <li key={s.id} className="rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                    {initials(seeker?.name || "?")}
                  </span>
                  <span className="text-sm font-semibold">
                    {seeker?.name || `Seeker ${s.seekerId}`}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">#{s.id}</span>
                  {s.urgency && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        URGENCY_TONE[s.urgency] || "bg-muted text-muted-foreground",
                      )}
                    >
                      {s.urgency}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formatWhen(s.raisedOn, s.raisedAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewingId(s.id)}
                    aria-label={`View request #${s.id}`}
                    title="View full request"
                    className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                  >
                    <Eye className="size-3.5" />
                  </button>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {categoryName(s.categoryId)}
                  </span>
                  {topics && <span>Topics: {topics}</span>}
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

                {isOpen ? (
                  <div className="mt-2 space-y-1.5">
                    <Label htmlFor={`reply-${s.id}`} className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      Your response
                    </Label>
                    <Textarea
                      id={`reply-${s.id}`}
                      rows={4}
                      value={replies[s.id] || ""}
                      onChange={(e) =>
                        setReplies((prev) => ({ ...prev, [s.id]: e.target.value }))
                      }
                      placeholder="How can you help with this?"
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-8" onClick={() => sendResponse(s)}>
                        <Send className="size-3.5" /> Send response
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => setOpenId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-8"
                    onClick={() => setOpenId(s.id)}
                  >
                    <Send className="size-3.5" /> Respond
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          The list is live: your categories from view 1703, open requests from view 1818,
          topics from 1820 and attachments from 1824/1825. Sending a response is held
          until the offerer response procedure is issued — nothing is faked. Open/closed
          currently treats an empty status as open, because SP 1821 has no parameter for
          it and no seek has been closed yet.
        </p>
      </div>

      <SeekViewerDialog
        seek={requests.data.find((s) => s.id === viewingId) || null}
        detail={{ topics: topicsOf(details.index.get(viewingId)) }}
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
