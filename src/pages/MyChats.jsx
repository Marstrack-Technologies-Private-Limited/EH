import { useMemo, useRef, useState } from "react";
import {
  Send,
  ArrowLeft,
  Paperclip,
  Clock,
  Mail,
  MessageSquare,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import PageContainer from "@/components/layout/page-container.jsx";
import { PLACEHOLDER_TICKETS, URGENCY_LABEL } from "@/data/chats-placeholder.js";
import { cn, initials } from "@/lib/utils.js";

const time = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const day = (iso) =>
  new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });

/**
 * My Chats — the replies a seeker's enquiry attracted.
 *
 * One ticket sits at the top; every offerer who responded gets their own thread
 * against that same ticket, and the seeker can talk to all of them separately.
 *
 * ⚠️ Runs on PLACEHOLDER data (src/data/chats-placeholder.js). There are no
 * backend objects for tickets, threads, messages, presence or notifications —
 * see PENDING-BACKEND.md. Sending a message updates local state only.
 */
export default function MyChats() {
  const [ticketId, setTicketId] = useState(PLACEHOLDER_TICKETS[0].id);
  const [threadRegNo, setThreadRegNo] = useState(null);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState({}); // regNo -> locally added messages
  const endRef = useRef(null);

  const ticket = useMemo(
    () => PLACEHOLDER_TICKETS.find((t) => t.id === ticketId),
    [ticketId],
  );
  const thread = ticket.threads.find((t) => t.offerer.regNo === threadRegNo) || null;

  const messages = useMemo(() => {
    if (!thread) return [];
    return [...thread.messages, ...(sent[thread.offerer.regNo] || [])];
  }, [thread, sent]);

  const send = () => {
    const text = draft.trim();
    if (!text || !thread) return;
    setSent((prev) => ({
      ...prev,
      [thread.offerer.regNo]: [
        ...(prev[thread.offerer.regNo] || []),
        {
          id: `local-${(prev[thread.offerer.regNo] || []).length + 1}`,
          from: "seeker",
          at: new Date().toISOString(),
          text,
        },
      ],
    }));
    setDraft("");
    requestAnimationFrame(() =>
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    );
  };

  return (
    <PageContainer>
      {/* Ticket picker — the enquiry being discussed */}
      <div className="-mx-3 mb-3 overflow-x-auto px-3 md:mx-0 md:px-0">
        <div className="flex w-max items-center gap-0.5 rounded-lg bg-muted p-1">
          {PLACEHOLDER_TICKETS.map((t) => {
            const unread = t.threads.reduce((s, th) => s + th.unread, 0);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTicketId(t.id);
                  setThreadRegNo(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer",
                  ticketId === t.id
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.topic}
                {unread > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[9px] font-bold leading-4 text-primary-foreground">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* The topic under discussion, pinned on top */}
      <section className="mb-3 rounded-lg border bg-card p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold md:text-base">{ticket.topic}</p>
            <p className="text-[11px] text-muted-foreground">
              {ticket.category} · {ticket.id} · raised {day(ticket.createdAt)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-accent px-2 py-1 text-[10px] font-semibold leading-none text-accent-foreground">
            {URGENCY_LABEL[ticket.urgency] || ticket.urgency}
          </span>
        </div>

        <p className="mt-2 text-[12px] text-muted-foreground">{ticket.issue}</p>

        {ticket.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ticket.attachments.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] text-muted-foreground"
              >
                <Paperclip className="size-3" /> {a}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Offerers who responded — list on mobile, side-by-side from md up */}
      <div className="grid gap-3 md:grid-cols-[16rem_1fr]">
        <div className={cn("space-y-2", thread && "hidden md:block")}>
          <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {ticket.threads.length} offerer{ticket.threads.length === 1 ? "" : "s"} responded
          </p>
          {ticket.threads.map((t) => {
            const last = [...t.messages, ...(sent[t.offerer.regNo] || [])].slice(-1)[0];
            return (
              <button
                key={t.offerer.regNo}
                type="button"
                onClick={() => setThreadRegNo(t.offerer.regNo)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg border bg-card p-2.5 text-left transition-colors cursor-pointer",
                  threadRegNo === t.offerer.regNo
                    ? "border-primary/50 bg-primary/5"
                    : "hover:border-primary/40 hover:bg-accent/40",
                )}
              >
                <span className="relative shrink-0">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary text-[11px] font-bold uppercase text-primary-foreground">
                    {initials(t.offerer.name)}
                  </span>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card",
                      t.offerer.online ? "bg-emerald-500" : "bg-muted-foreground/40",
                    )}
                    title={t.offerer.online ? "Online" : "Offline"}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold">
                      {t.offerer.name}
                    </span>
                    {t.unread > 0 && (
                      <span className="shrink-0 rounded-full bg-primary px-1.5 text-[9px] font-bold leading-4 text-primary-foreground">
                        {t.unread}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                    {t.offerer.headline}
                  </span>
                  {last && (
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                      {last.from === "seeker" ? "You: " : ""}
                      {last.text}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Thread */}
        <div className={cn("rounded-lg border bg-card", !thread && "hidden md:block")}>
          {!thread ? (
            <div className="flex h-full min-h-48 items-center justify-center p-6 text-center">
              <p className="text-xs text-muted-foreground">
                <MessageSquare className="mx-auto mb-2 size-5 opacity-40" />
                Pick an offerer to read and reply to their thread.
              </p>
            </div>
          ) : (
            <div className="flex h-[28rem] flex-col">
              <div className="flex items-center gap-2 border-b p-2.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 md:hidden"
                  onClick={() => setThreadRegNo(null)}
                  aria-label="Back to offerers"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold uppercase text-primary-foreground">
                  {initials(thread.offerer.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">
                    {thread.offerer.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {thread.offerer.online ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Online</span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-2.5" /> Offline — will be emailed
                      </span>
                    )}
                    {" · "}
                    {thread.offerer.city}, {thread.offerer.country}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin p-3">
                {messages.map((m) => {
                  const mine = m.from === "seeker";
                  return (
                    <div
                      key={m.id}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-[12px]",
                          mine
                            ? "rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm bg-muted",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <p
                          className={cn(
                            "mt-1 text-[9px]",
                            mine ? "text-primary-foreground/70" : "text-muted-foreground",
                          )}
                        >
                          <Clock className="mr-0.5 inline size-2.5" />
                          {time(m.at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-center gap-1.5 border-t p-2"
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Reply to ${thread.offerer.name.split(" ")[0]}…`}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="size-9 shrink-0"
                  disabled={!draft.trim()}
                  aria-label="Send"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-dashed p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          This screen runs on placeholder data — there are no backend objects for
          tickets, threads, messages, presence or email notifications yet. Replies you
          type stay in the page and are not saved. See PENDING-BACKEND.md.
        </p>
      </div>
    </PageContainer>
  );
}
