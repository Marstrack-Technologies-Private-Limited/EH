import { useEffect, useState } from "react";
import { Paperclip, ExternalLink, FileWarning } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { cn } from "@/lib/utils.js";

const URGENCY_TONE = {
  Critical: "bg-destructive/15 text-destructive",
  "Semi urgent": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Moderate: "bg-primary/15 text-primary",
  "Can wait": "bg-muted text-muted-foreground",
};

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

/**
 * Preview one attachment.
 *
 * The upload service names every file with a bare uuid — no extension — and the
 * view stores only that URL, so the type cannot be known before loading it. So
 * probe: try it as an image first, and fall back to an iframe when that fails,
 * which is what renders a PDF or a text file. S3 sends the right content-type
 * and sets no X-Frame-Options, so the iframe displays inline rather than
 * downloading.
 */
function AttachmentFrame({ url }) {
  const [kind, setKind] = useState("probing");

  // Callers mount this with key={url}, so a new file starts fresh at "probing"
  // and the effect only ever settles state from the image's async callbacks.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setKind("image");
    img.onerror = () => setKind("frame");
    img.src = url;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  // One fixed-height box for all three states. Sizing the frame to its content
  // made the dialog jump every time a probe resolved or a file was switched.
  return (
    <div className="h-[52vh] min-h-64 overflow-hidden rounded-lg border bg-muted/30">
      {kind === "probing" && (
        <div className="flex h-full items-center justify-center">
          <p className="text-[11px] text-muted-foreground">Loading preview…</p>
        </div>
      )}
      {kind === "image" && (
        <div className="flex h-full items-center justify-center p-2">
          <img src={url} alt="Attachment" className="max-h-full max-w-full object-contain" />
        </div>
      )}
      {kind === "frame" && (
        <iframe
          src={url}
          title="Attachment"
          className="h-full w-full bg-white"
          // The file is user-supplied, so keep it sandboxed — it may render but
          // it may not script, navigate the opener, or submit forms.
          sandbox=""
        />
      )}
    </div>
  );
}

/**
 * The full-size view of one seek, with its attachments rendered inline.
 *
 * Used by both sides of the cycle — the seeker's "Your enquiries" list and the
 * offerer's inbox — so the two always show a request the same way.
 */
export function SeekViewerDialog({
  seek,
  detail,
  attachments = [],
  seekerName,
  open,
  onOpenChange,
}) {
  if (!seek) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Keyed by seek: a different request mounts a fresh body, so the selected
          attachment resets to the first without syncing state in an effect. */}
      <SeekViewerBody
        key={seek.id}
        seek={seek}
        detail={detail}
        attachments={attachments}
        seekerName={seekerName}
      />
    </Dialog>
  );
}

function SeekViewerBody({ seek, detail, attachments, seekerName }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const active = attachments[Math.min(activeIndex, attachments.length - 1)];
  const contact = [
    seek.byEmail && "Email",
    seek.byWhatsapp && "WhatsApp",
    seek.callOn && `Call ${seek.callOn}`,
  ].filter(Boolean);

  return (
      // Sizes to its content but never past the viewport, and the body scrolls
      // inside. Stable because the preview box below is a fixed height — the
      // dialog no longer resizes when a probe resolves or files are switched.
      <DialogContent className="flex max-h-[88vh] max-w-4xl flex-col gap-3 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
            <span className="font-mono text-sm">#{seek.id}</span>
            {seek.urgency && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  URGENCY_TONE[seek.urgency] || "bg-muted text-muted-foreground",
                )}
              >
                {seek.urgency}
              </span>
            )}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {seek.closed || "Open"}
            </span>
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            {seekerName ? `${seekerName} · ` : ""}
            {formatWhen(seek.raisedOn, seek.raisedAt)}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-thin pr-1">
          <section>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
              The issue
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {seek.narration || "(no description)"}
            </p>
          </section>

          {detail?.topics && (
            <section>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                Topics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {detail.topics.split(",").map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {t.trim()}
                  </span>
                ))}
              </div>
            </section>
          )}

          {detail?.to && (
            <section>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                Sent to
              </p>
              <p className="text-xs">{detail.to}</p>
            </section>
          )}

          {(contact.length > 0 || seek.preferredWeekDay) && (
            <section>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                Contact preference
              </p>
              <p className="text-xs">
                {contact.join(", ") || "None given"}
                {seek.preferredWeekDay ? ` · prefers ${seek.preferredWeekDay}` : ""}
              </p>
            </section>
          )}

          <section>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Paperclip className="size-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                Attachments {attachments.length > 0 && `(${attachments.length})`}
              </p>
              {active && (
                <a
                  href={active.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  Open in new tab <ExternalLink className="size-3" />
                </a>
              )}
            </div>

            {attachments.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
                <FileWarning className="size-4 shrink-0 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">
                  No files were attached to this enquiry.
                </p>
              </div>
            ) : (
              <>
                {attachments.length > 1 && (
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {attachments.map((a, i) => (
                      <button
                        key={a.url}
                        type="button"
                        onClick={() => setActiveIndex(i)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                          i === activeIndex
                            ? "bg-primary/15 text-primary"
                            : "border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        File {i + 1}
                      </button>
                    ))}
                  </div>
                )}
                {active && <AttachmentFrame key={active.url} url={active.url} />}
              </>
            )}
          </section>
        </div>
      </DialogContent>
  );
}
