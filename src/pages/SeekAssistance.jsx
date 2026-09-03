import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Send,
  Paperclip,
  X,
  AlertCircle,
  Clock,
  Users,
  User as UserIcon,
  Layers,
  Info,
  Ticket,
  Mail,
  MessageCircle,
  Phone,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Input } from "@/components/ui/input.jsx";
import { CheckList } from "@/components/ui/check-list.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import {
  useCategories,
  useMyRegNo,
  useSeekAttachmentIndex,
  useSeekDetailIndex,
  useSeeks,
  useUserCategories,
  useUserTopics,
  useUsers,
} from "@/hooks/use-p2p.js";
import {
  deleteSeekAttachment,
  getUserByRegNo,
  isImageFile,
  saveSeek,
  saveSeekAttachment,
  saveSeekDetail,
} from "@/api/p2p.js";
import { uploadFile } from "@/api/http.js";
import { URGENCY_OPTIONS, USER_TYPE, WEEK_DAYS } from "@/api/config.js";
import PageContainer from "@/components/layout/page-container.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { SeekViewerDialog } from "@/components/seek-viewer.jsx";
import { cn, hasId } from "@/lib/utils.js";

/** Who the request goes to. */
const AUDIENCE = {
  OFFERER: "OFFERER",
  CATEGORY: "CATEGORY",
  TOPICS: "TOPICS",
};

/**
 * Combine a wall-clock time with today's date.
 *
 * @OT_SEEKER_REQUIRED_TO_BE_CONTACTED_PREFERRED_TIME is a DATETIME, but the
 * spec pairs it with a separate weekday dropdown — so the date half carries no
 * meaning and only the clock is asked for. Anchoring to today keeps the value
 * valid without inventing a date the seeker never chose.
 */
function timeToDateTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = String(hhmm).split(":");
  const d = new Date();
  d.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
  return d;
}

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
 * Compose the single detail line a seek is allowed.
 *
 * SP 1822 upserts on the seek id, so a seek has exactly one
 * OT_SEEK_PROBLEMS_REPORTED string — there is no row-per-topic. The topic
 * selection and the chosen offerer are the two things the header cannot hold,
 * so both go here, labelled, and `parseProblems` reads them back out.
 *
 * This is a stopgap for the missing columns, not a schema. If the backend adds
 * a real detail table with a topic id and an offerer id, delete this pair of
 * functions and write to those columns instead.
 */
function composeProblems({ topicNames, offererName }) {
  const parts = [];
  if (topicNames.length) parts.push(`Topics: ${topicNames.join(", ")}`);
  if (offererName) parts.push(`To: ${offererName}`);
  return parts.join(" | ");
}

function parseProblems(text) {
  if (!text) return { topics: "", to: "", raw: "" };
  const topics = /Topics:\s*([^|]*)/.exec(text)?.[1]?.trim() || "";
  const to = /To:\s*([^|]*)/.exec(text)?.[1]?.trim() || "";
  return { topics, to, raw: topics || to ? "" : text.trim() };
}

/** A stored DATETIME back into the "HH:MM" an <input type="time"> wants. */
function toTimeInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Last path segment of an S3 URL, for a short label. */
function fileLabel(url, i) {
  const tail = String(url).split("/").pop() || "";
  return tail ? `File ${i + 1} (${tail.slice(0, 8)}…)` : `File ${i + 1}`;
}

const URGENCY_TONE = {
  Critical: "bg-destructive/15 text-destructive",
  "Semi urgent": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Moderate: "bg-primary/15 text-primary",
  "Can wait": "bg-muted text-muted-foreground",
};

/**
 * Seek Assistance — the seeker's enquiry, saved as the first ticket.
 *
 * Live objects: view 1704 prefills the seeker's topics, 1699 lists offerers,
 * 1690 the categories, 1819 reserves the ticket number, SP 1821 saves the
 * header, SP 1822 the detail line, and views 1818 / 1820 read both back.
 *
 * Submit writes twice — the header first, because SP 1822 is keyed on the id
 * the header call returns. A failed detail write is reported without losing
 * the ticket, since the header is already committed by then.
 *
 * Files upload to the platform's file service (see FILE_UPLOAD_URL), then the
 * returned URL is linked to the seek with SP 1826 (documents) or 1827 (images)
 * and read back from views 1824 / 1825. Uploads run before the header so a
 * failed upload aborts the whole submit rather than leaving a ticket that
 * claims attachments it does not have.
 *
 * Neither attachment *delete* is usable yet, so the list is add-only — see the
 * note on DELETE_SEEK_DOCUMENT in config.js.
 */
export default function SeekAssistance() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const { regNo } = useMyRegNo(user);

  const offererParam = params.get("offerer");
  const [audience, setAudience] = useState(
    offererParam ? AUDIENCE.OFFERER : AUDIENCE.TOPICS,
  );

  const myTopics = useUserTopics({ userId: regNo });
  const myAreas = useUserCategories({ userId: regNo });
  const categories = useCategories();
  const offerers = useUsers({
    type: USER_TYPE.OFFERER,
    orderBy: "OM_USER_NAME",
    sortDir: "ASC",
  });
  const seeks = useSeeks({ seekerId: regNo });
  const seekDetails = useSeekDetailIndex();
  const seekAttachments = useSeekAttachmentIndex();

  const [targetOfferer, setTargetOfferer] = useState(null);
  const [pickedCategoryIds, setPickedCategoryIds] = useState(null);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState(null);
  const [issue, setIssue] = useState("");
  const [urgency, setUrgency] = useState(URGENCY_OPTIONS[0]);
  const [byEmail, setByEmail] = useState(true);
  const [byWhatsapp, setByWhatsapp] = useState(false);
  const [byCall, setByCall] = useState(false);
  const [phone, setPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [preferredWeekDay, setPreferredWeekDay] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [tab, setTab] = useState("raise");
  // When set, Submit updates this ticket instead of raising a new one. The
  // original date/time ride along so an edit does not silently re-stamp when
  // the request was raised.
  const [editing, setEditing] = useState(null);
  const [removingUrl, setRemovingUrl] = useState(null);

  // Resolve the offerer named in the query string.
  useEffect(() => {
    if (!offererParam) return;
    let cancelled = false;
    getUserByRegNo(Number(offererParam))
      .then((row) => {
        if (!cancelled && row) setTargetOfferer(row);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [offererParam]);

  // Seed the topic selection from the seeker's saved interests, once loaded.
  useEffect(() => {
    if (selectedTopicIds === null && myTopics.data.length > 0) {
      setSelectedTopicIds(new Set(myTopics.data.map((t) => t.topicId)));
    }
  }, [myTopics.data, selectedTopicIds]);

  const chosen = useMemo(() => selectedTopicIds ?? new Set(), [selectedTopicIds]);

  /** Files already on the ticket being edited — shown so they are not re-uploaded. */
  const existingAttachments = useMemo(
    () => (editing ? seekAttachments.index.get(editing.id) || [] : []),
    [editing, seekAttachments.index],
  );

  /**
   * OT_SEEKER_CATEGORY_ID is a single required value, so it is prefilled from
   * whatever the seeker has already told us — the categories behind the topics
   * they ticked, else the area of interest they signed up for — and stays
   * editable. Once they pick one by hand, stop overriding it.
   */
  /**
   * The distinct categories behind the currently ticked topics.
   *
   * A seeker's saved topics routinely span several categories, but the header
   * holds exactly one OT_SEEKER_CATEGORY_ID — so ticking topics from three
   * categories still files the request under one, and only offerers serving
   * that one will ever see it. Surfaced rather than hidden.
   */
  const spannedCategories = useMemo(() => {
    const byId = new Map();
    for (const t of myTopics.data) {
      if (chosen.has(t.topicId) && !byId.has(t.categoryId)) {
        byId.set(t.categoryId, { id: t.categoryId, name: t.categoryName });
      }
    }
    return [...byId.values()];
  }, [myTopics.data, chosen]);

  /**
   * Categories suggested from what the seeker has already told us — every
   * category behind a ticked topic, else the areas they signed up for.
   */
  const suggestedCategoryIds = useMemo(() => {
    const activeIds = new Set(categories.data.filter((c) => c.active).map((c) => c.id));
    const fromTopics = spannedCategories
      .map((c) => c.id)
      .filter((id) => id > 0 && activeIds.has(id));
    if (fromTopics.length) return fromTopics;
    const fromAreas = [...new Set(myAreas.data.map((a) => a.categoryId))].filter(
      (id) => id > 0 && activeIds.has(id),
    );
    return fromAreas.slice(0, 1);
  }, [spannedCategories, myAreas.data, categories.data]);

  // Derived rather than synced through an effect, so the suggestion can change
  // as topics load without a second render pass overwriting a hand-picked value.
  const categoryIds = categoryTouched ? pickedCategoryIds : suggestedCategoryIds;

  /**
   * The header holds one OT_SEEKER_CATEGORY_ID, and that single value decides
   * which offerers ever see the request. So selecting several categories is not
   * cosmetic — submit raises one ticket per category, which is the only way a
   * request reaches offerers in more than one of them.
   *
   * Editing is the exception: an existing ticket has exactly one category, so
   * picking another moves it rather than fanning out.
   */
  /**
   * Only active categories can be picked. An inactive one still appears if it
   * is already on the ticket being edited, shown read-only rather than dropped,
   * so an edit never silently reassigns a request to a different category.
   */
  const selectableCategories = useMemo(
    () => categories.data.filter((c) => c.active || categoryIds.includes(c.id)),
    [categories.data, categoryIds],
  );

  const toggleCategory = useCallback(
    (id) => {
      // Decided here rather than inside a state updater: an updater runs during
      // the next render, so a flag set in one is still unread when this function
      // returns — which silently skipped the topic sync.
      const wasOn = categoryIds.includes(id);
      let nextCategories;
      if (editing) nextCategories = [id];
      else if (wasOn) nextCategories = categoryIds.filter((x) => x !== id);
      else nextCategories = [...categoryIds, id];

      // Never leave it empty — the SP requires a category.
      if (!nextCategories.length) return;

      const turnedOn = nextCategories.includes(id);
      setCategoryTouched(true);
      setPickedCategoryIds(nextCategories);

      // The topic list and the category list describe the same choice, so keep
      // them in step: ticking a category ticks its topics, unticking clears them.
      setSelectedTopicIds((prev) => {
        const next = new Set(prev ?? myTopics.data.map((t) => t.topicId));
        for (const t of myTopics.data) {
          // Editing collapses to one category, so topics outside it go too.
          if (editing && t.categoryId !== id) next.delete(t.topicId);
          if (t.categoryId !== id) continue;
          if (turnedOn) next.add(t.topicId);
          else next.delete(t.topicId);
        }
        return next;
      });
    },
    [categoryIds, editing, myTopics.data],
  );

  const toggleTopic = (id) =>
    setSelectedTopicIds((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    setFiles((prev) => [...prev, ...incoming]);
  };

  /**
   * Every missing field in one list, so a single toast names them all rather
   * than making the seeker submit repeatedly to discover them one at a time.
   */
  const missing = useMemo(() => {
    const m = [];
    if (!issue.trim()) m.push("Description of the issue");
    if (!categoryIds.length) m.push("Category");
    if (!urgency) m.push("Urgency");
    if (audience === AUDIENCE.OFFERER && !targetOfferer) m.push("Offerer");
    if (audience === AUDIENCE.TOPICS && chosen.size === 0) m.push("At least one topic");
    if (!byEmail && !byWhatsapp && !byCall) m.push("At least one way to contact you");
    if ((byWhatsapp || byCall) && !phone.trim()) m.push("Phone / WhatsApp number");
    return m;
  }, [
    issue,
    categoryIds,
    urgency,
    audience,
    targetOfferer,
    chosen.size,
    byEmail,
    byWhatsapp,
    byCall,
    phone,
  ]);

  /**
   * Load an existing ticket back into the form.
   *
   * The header fields come straight off view 1818. Topics come from the detail
   * line as *names*, so they are matched back to the seeker's topic ids — a
   * topic they have since removed from their interests simply will not re-tick,
   * which is correct: it is no longer theirs to send.
   */
  const startEdit = useCallback(
    (seek) => {
      const detail = parseProblems(seekDetails.index.get(seek.id));

      setEditing({ id: seek.id, raisedOn: seek.raisedOn, raisedAt: seek.raisedAt });
      setIssue(seek.narration || "");
      setUrgency(seek.urgency || URGENCY_OPTIONS[0]);
      setByEmail(seek.byEmail);
      setByWhatsapp(seek.byWhatsapp);
      setByCall(Boolean(seek.callOn) && !seek.byWhatsapp);
      setPhone(seek.callOn || "");
      setPreferredWeekDay(seek.preferredWeekDay || "");
      setPreferredTime(toTimeInput(seek.preferredTime));
      setCategoryTouched(true);
      setPickedCategoryIds([seek.categoryId]);
      // Files already attached stay attached — there is no working delete SP —
      // so start with an empty picker; anything added here is appended.
      setFiles([]);

      const names = detail.topics
        ? detail.topics.split(",").map((t) => t.trim().toLowerCase())
        : [];
      setSelectedTopicIds(
        new Set(
          myTopics.data.filter((t) => names.includes(t.topicName.toLowerCase())).map((t) => t.topicId),
        ),
      );

      if (detail.to) setAudience(AUDIENCE.OFFERER);
      else if (names.length) setAudience(AUDIENCE.TOPICS);
      else setAudience(AUDIENCE.CATEGORY);

      setViewingId(null);
      setTab("raise");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [seekDetails.index, myTopics.data],
  );

  /**
   * Try to remove an attachment, and report what actually happened.
   *
   * The SP's status code can't be trusted — 1829 answers 201 and removes
   * nothing — so `deleteSeekAttachment` re-reads the row and tells us whether
   * it really went. Until the backend fixes 1828/1829 this lands on the
   * "not available yet" branch, and starts working on its own once they do.
   */
  const removeAttachment = useCallback(
    async (attachment) => {
      if (!editing) return;
      if (!window.confirm("Remove this attachment from the ticket?")) return;

      setRemovingUrl(attachment.url);
      try {
        const res = await deleteSeekAttachment({
          seekId: editing.id,
          url: attachment.url,
          isImage: attachment.kind === "image",
        });

        if (res.removed) {
          toast.success("Attachment removed");
          seekAttachments.reload();
        } else {
          toast.warning("Removing attachments isn't available yet", {
            description: `The file is still on ticket #${editing.id}. SP ${res.spname} ${
              res.called
                ? "reported success but deleted nothing"
                : "rejected the call"
            } — this will start working as soon as the backend fixes it.`,
          });
        }
      } catch (err) {
        toast.error("Could not remove the attachment", { description: err.message });
      } finally {
        setRemovingUrl(null);
      }
    },
    [editing, seekAttachments],
  );

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setIssue("");
    setFiles([]);
    setCategoryTouched(false);
    setUrgency(URGENCY_OPTIONS[0]);
    setByEmail(true);
    setByWhatsapp(false);
    setByCall(false);
    setPhone("");
    setPreferredWeekDay("");
    setPreferredTime("");
  }, []);

  const reloadSeeks = seeks.reload;
  const reloadDetails = seekDetails.reload;
  const reloadAttachments = seekAttachments.reload;

  const submit = useCallback(async () => {
    if (missing.length) {
      toast.error(`Missing ${missing.length} required field${missing.length > 1 ? "s" : ""}`, {
        description: missing.join(", "),
      });
      return;
    }

    // SP 1821 does no foreign-key check — a bad seeker id saves happily — so
    // confirm the resolved registration number before writing.
    if (!hasId(regNo)) {
      toast.error("Could not identify your member record", {
        description: "Sign in again so your registration number can be resolved.",
      });
      return;
    }

    const topicNames = myTopics.data
      .filter((t) => chosen.has(t.topicId))
      .map((t) => t.topicName);

    const confirmLines = [
      editing ? `Update enquiry #${editing.id}?` : "Submit this enquiry?",
      "",
      `Categor${categoryIds.length > 1 ? "ies" : "y"}: ${categoryIds
        .map((id) => categories.data.find((c) => c.id === id)?.name || id)
        .join(", ")}`,
      !editing && categoryIds.length > 1
        ? `This raises ${categoryIds.length} tickets — one per category.`
        : null,
      `Urgency: ${urgency}`,
      `Contact: ${[byEmail && "email", byWhatsapp && "WhatsApp", byCall && "call"]
        .filter(Boolean)
        .join(", ")}${phone.trim() ? ` (${phone.trim()})` : ""}`,
      preferredWeekDay || preferredTime
        ? `Preferred: ${[preferredWeekDay, preferredTime].filter(Boolean).join(" ")}`
        : null,
      topicNames.length && audience === AUDIENCE.TOPICS
        ? `Topics: ${topicNames.join(", ")}`
        : null,
      files.length
        ? `Attachments: ${files.length} file${files.length > 1 ? "s" : ""} will be uploaded` +
          (editing ? " and added to the ones already there" : "")
        : null,
    ].filter((l) => l !== null);

    if (!window.confirm(confirmLines.join("\n"))) return;

    setSaving(true);
    try {
      // Upload first: a file that fails should stop the ticket, not leave a
      // saved ticket that silently claims fewer attachments than were chosen.
      let uploaded = [];
      if (files.length) {
        setUploading(true);
        try {
          uploaded = await Promise.all(
            files.map(async (f) => ({ url: await uploadFile(f), isImage: isImageFile(f) })),
          );
        } finally {
          setUploading(false);
        }
      }

      const problems = composeProblems({
        topicNames: audience === AUDIENCE.TOPICS ? topicNames : [],
        offererName: audience === AUDIENCE.OFFERER ? targetOfferer?.name : "",
      });
      // One header per category. The header carries a single
      // OT_SEEKER_CATEGORY_ID and that value is what the offerer inbox filters
      // on, so a request that should reach two categories needs two rows.
      // Editing stays a single row — a ticket already has its category.
      const targets = editing ? [categoryIds[0]] : categoryIds;
      const warnings = [];
      const ids = [];

      for (const cid of targets) {
        // A real id switches SP 1821 to NEWEXISTING "EXISTING"; the original
        // raised date/time are passed back so an edit does not re-stamp them.
        const res = await saveSeek({
          id: editing?.id || 0,
          seekerId: regNo,
          categoryId: cid,
          narration: issue.trim(),
          urgency,
          byEmail,
          byWhatsapp,
          callOn: byWhatsapp || byCall ? phone.trim() : "",
          preferredTime: timeToDateTime(preferredTime),
          preferredWeekDay,
          ...(editing ? { raisedOn: editing.raisedOn, raisedAt: editing.raisedAt } : {}),
        });
        ids.push(res.id);

        // Both of these are keyed on the header id, so they can only run once
        // it has landed. Neither failure should lose the ticket already saved.
        if (problems) {
          try {
            await saveSeekDetail({ seekId: res.id, problems });
          } catch (err) {
            warnings.push(`#${res.id}'s topic detail did not save (${err.message})`);
          }
        }

        let attached = 0;
        for (const a of uploaded) {
          try {
            await saveSeekAttachment({ seekId: res.id, url: a.url, isImage: a.isImage });
            attached += 1;
          } catch {
            // Named below rather than thrown: the file is uploaded and the
            // ticket exists, only the link between them is missing.
          }
        }
        if (attached < uploaded.length) {
          warnings.push(
            `${uploaded.length - attached} of ${uploaded.length} attachments did not link to #${res.id}`,
          );
        }
      }

      const label = ids.map((n) => `#${n}`).join(", ");
      toast.success(
        editing
          ? `Enquiry ${label} updated`
          : ids.length > 1
            ? `${ids.length} tickets raised — ${label}`
            : `Enquiry submitted — ticket ${label}`,
        {
          description: warnings.length
            ? `Saved, but ${warnings.join("; ")}.`
            : editing
              ? "Your changes are live."
              : ids.length > 1
                ? "One per category, so offerers in each will see it."
                : "An offerer will pick this up.",
        },
      );

      setIssue("");
      setFiles([]);
      setEditing(null);
      setCategoryTouched(false);
      reloadSeeks();
      reloadDetails();
      reloadAttachments();
      // Jump to the list so the seeker sees the ticket they just raised or edited.
      setTab("list");
    } catch (err) {
      toast.error("Could not submit your enquiry", {
        description: err.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }, [
    missing,
    regNo,
    audience,
    chosen,
    files,
    categories.data,
    categoryIds,
    urgency,
    byEmail,
    byWhatsapp,
    byCall,
    phone,
    preferredWeekDay,
    preferredTime,
    issue,
    myTopics.data,
    targetOfferer,
    editing,
    reloadSeeks,
    reloadDetails,
    reloadAttachments,
  ]);

  if (!hasId(regNo)) {
    return (
      <PageContainer>
        <div className="flex items-start gap-2 rounded-lg border p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Seeking assistance needs a member record. Sign in as a Seeker to raise an
            enquiry.
          </p>
        </div>
      </PageContainer>
    );
  }

  const contactToggles = [
    { key: "email", label: "Email", icon: Mail, on: byEmail, set: setByEmail },
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, on: byWhatsapp, set: setByWhatsapp },
    { key: "call", label: "Call", icon: Phone, on: byCall, set: setByCall },
  ];

  return (
    <PageContainer>
      <div className="mb-3">
        <h1 className="text-lg font-bold tracking-tight md:text-xl">Seek assistance</h1>
        <p className="text-xs text-muted-foreground">
          Describe your issue and choose who should see it.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="raise">
            <Send className="size-3.5" /> Raise a request
          </TabsTrigger>
          <TabsTrigger value="list">
            <Ticket className="size-3.5" /> My enquiries
            {seeks.meta.totalRecords > 0 && ` (${seeks.meta.totalRecords})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="raise">
          <div className="space-y-3">
            {editing && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <Pencil className="size-4 shrink-0 text-primary" />
                <p className="text-[11px] text-primary">
                  Editing enquiry <span className="font-mono font-semibold">#{editing.id}</span> —
                  saving updates it instead of raising a new one.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 text-[11px]"
                  onClick={cancelEdit}
                >
                  Cancel edit
                </Button>
              </div>
            )}
        {/* Who it goes to */}
        <section className="rounded-lg border bg-card p-3">
          <p className="mb-2 text-sm font-semibold">Send this to</p>
          <div className="mb-3 inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-muted p-1">
            {[
              { key: AUDIENCE.OFFERER, label: "One offerer", icon: UserIcon },
              { key: AUDIENCE.CATEGORY, label: "Everyone in a category", icon: Layers },
              { key: AUDIENCE.TOPICS, label: "By my topics", icon: Users },
            ].map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setAudience(o.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer",
                  audience === o.key
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <o.icon className="size-3.5" />
                {o.label}
              </button>
            ))}
          </div>

          {audience === AUDIENCE.OFFERER && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                Offerer
              </Label>
              <Select
                value={targetOfferer ? String(targetOfferer.id) : ""}
                onValueChange={(v) =>
                  setTargetOfferer(offerers.data.find((o) => o.id === Number(v)) || null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an offerer…" />
                </SelectTrigger>
                <SelectContent>
                  {offerers.data.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name || "(no name)"} · {o.city || o.country || "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Or <Link to="/offerers" className="text-primary hover:underline">browse offerers</Link>{" "}
                to pick one.
              </p>
            </div>
          )}

          {audience === AUDIENCE.TOPICS && (
            <div className="border-t pt-3">
              <p className="text-sm font-semibold">Topics</p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Your saved topics, pre-ticked. Untick any that don't apply — this only
                affects the enquiry, not your saved interests.
              </p>
              {myTopics.loading ? (
                <div className="flex gap-1.5">
                  <div className="shimmer h-6 w-24 rounded-full" />
                  <div className="shimmer h-6 w-20 rounded-full" />
                </div>
              ) : myTopics.data.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  You haven't picked any topics yet —{" "}
                  <Link to="/interests" className="text-primary hover:underline">
                    add some
                  </Link>
                  , or send to a whole category instead.
                </p>
              ) : (
                <CheckList
                  options={myTopics.data.map((t) => ({
                    value: t.topicId,
                    label: t.topicName,
                    hint: t.categoryName,
                  }))}
                  selected={chosen}
                  onToggle={(id) => toggleTopic(id)}
                  onToggleAll={(shown, allSelected) =>
                    setSelectedTopicIds(
                      allSelected ? new Set() : new Set(shown.map((o) => o.value)),
                    )
                  }
                  searchable
                  searchPlaceholder="Search your topics…"
                  selectAllLabel="Tick all my topics"
                  listClassName="max-h-56"
                />
              )}
            </div>
          )}

          {/* OT_SEEKER_CATEGORY_ID — required on the header, whatever the audience. */}
          <div className="mt-3 space-y-1 border-t pt-3">
            <p className="text-sm font-semibold">Category this falls under</p>
            <p className="pb-1 text-[11px] text-muted-foreground">
              Ticking a category ticks its topics above. Offerers who serve a category
              are the ones who see your request.
            </p>
            {/* An inactive category can't be chosen, but one already on the
                ticket still lists — read-only — so an edit doesn't hide it. */}
            <CheckList
              options={selectableCategories.map((c) => ({
                value: c.id,
                label: c.name,
                hint: c.active ? undefined : "No longer an active category",
                disabled: !c.active,
                disabledReason: `${c.name} is no longer an active category`,
              }))}
              selected={new Set(categoryIds)}
              onToggle={(id) => toggleCategory(id)}
              searchable
              searchPlaceholder="Search categories…"
              listClassName="max-h-56"
            />
            <p className="text-[10px] text-muted-foreground">
              {editing
                ? "A ticket is filed under one category — picking another moves this one."
                : categoryIds.length > 1
                  ? `Prefilled from your areas and topics. ${categoryIds.length} selected, so ${categoryIds.length} tickets are raised — one per category — and offerers in each will see it.`
                  : "Prefilled from your areas and topics. Offerers who serve this category are the ones who will see your request."}
            </p>
          </div>
        </section>

        {/* The issue */}
        <section className="space-y-1 rounded-lg border bg-card p-3">
          <Label htmlFor="issue" className="text-sm font-semibold">
            Describe the issue in detail
          </Label>
          <Textarea
            id="issue"
            rows={6}
            className="min-h-28"
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder="What are you stuck on? What have you already tried?"
          />
        </section>

        {/* Attachments */}
        <section className="rounded-lg border bg-card p-3">
          <p className="mb-1.5 text-sm font-semibold">Attachments</p>

          {/* What is already on this ticket, when editing one. Shown by default
              so nobody re-uploads a file that is already there. */}
          {editing && existingAttachments.length > 0 && (
            <div className="mb-2 rounded-lg border bg-muted/30 p-2">
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                Already attached ({existingAttachments.length})
              </p>
              <ul className="space-y-1">
                {existingAttachments.map((a, i) => (
                  <li
                    key={a.url}
                    className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-[11px]"
                  >
                    <Paperclip className="size-3 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{fileLabel(a.url, i)}</span>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-primary hover:underline"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a)}
                      disabled={removingUrl === a.url}
                      title="Remove this attachment"
                      aria-label={`Remove attachment ${i + 1}`}
                      className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Anything you add below is added to these. Removing is wired up but the
                backend procedure isn't live yet — the bin icon will tell you.
              </p>
            </div>
          )}

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground">
            <Paperclip className="size-3.5" />
            {editing && existingAttachments.length > 0
              ? "Add more files or images"
              : "Add files or images"}
            <input
              type="file"
              multiple
              accept="*/*"
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-[11px]"
                >
                  <Paperclip className="size-3 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove ${f.name}`}
                    className="flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-destructive/15 hover:text-destructive cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Urgency + contact */}
        <section className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
              <Clock className="size-3" /> How urgent is this?
            </Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              Preferred day
            </Label>
            <Select value={preferredWeekDay} onValueChange={setPreferredWeekDay}>
              <SelectTrigger>
                <SelectValue placeholder="Any day" />
              </SelectTrigger>
              <SelectContent>
                {WEEK_DAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              How should we contact you?
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {contactToggles.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => c.set(!c.on)}
                  aria-pressed={c.on}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer",
                    c.on
                      ? "bg-primary/15 text-primary"
                      : "border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <c.icon className="size-3.5" />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {(byWhatsapp || byCall) && (
            <div className="space-y-1">
              <Label htmlFor="contact-value">Phone / WhatsApp number</Label>
              <Input
                id="contact-value"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 7xx xxx xxx"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="preferred-time">Preferred time</Label>
            <Input
              id="preferred-time"
              type="time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
            />
          </div>

          {byEmail && (
            <p className="text-[10px] text-muted-foreground sm:col-span-2">
              Email goes to your account address, {user?.email || "—"}.
            </p>
          )}
        </section>

        <Button className="h-10 w-full" onClick={submit} disabled={saving}>
          <Send className="size-4" />
          {uploading
            ? "Uploading files…"
            : saving
              ? "Saving…"
              : editing
                ? `Update enquiry #${editing.id}`
                : "Submit your issue"}
        </Button>
          </div>
        </TabsContent>

        <TabsContent value="list">
        {/* The seeker's own seeks — view 1818 filtered on OT_SEEKER_ID. */}
        <section className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Ticket className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Your enquiries</p>
            {seeks.meta.totalRecords > 0 && (
              <span className="text-[11px] text-muted-foreground">
                ({seeks.meta.totalRecords})
              </span>
            )}
          </div>

          {seeks.loading ? (
            <div className="space-y-1.5">
              <div className="shimmer h-12 rounded-md" />
              <div className="shimmer h-12 rounded-md" />
            </div>
          ) : seeks.error ? (
            <p className="text-[11px] text-destructive">{seeks.error}</p>
          ) : seeks.data.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              You haven't raised an enquiry yet. Your submitted tickets will appear here.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {seeks.data.map((s) => (
                <li key={s.id} className="rounded-md border p-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-semibold">#{s.id}</span>
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
                    <span className="text-[10px] text-muted-foreground">
                      {formatWhen(s.raisedOn, s.raisedAt)}
                    </span>
                    {/* Set by a closing SP that doesn't exist yet, so always open. */}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {s.closed || "Open"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewingId(s.id)}
                      aria-label={`View enquiry #${s.id}`}
                      title="View full enquiry"
                      className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      aria-label={`Edit enquiry #${s.id}`}
                      title="Edit this enquiry"
                      className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {s.narration || "(no description)"}
                  </p>
                  {(() => {
                    const d = parseProblems(seekDetails.index.get(s.id));
                    const atts = seekAttachments.index.get(s.id) || [];
                    if (!d.topics && !d.to && !d.raw && !atts.length) return null;
                    return (
                      <>
                        {(d.topics || d.to || d.raw) && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {d.topics && <>Topics: {d.topics}</>}
                            {d.topics && d.to && " · "}
                            {d.to && <>Sent to: {d.to}</>}
                            {d.raw}
                          </p>
                        )}
                        {atts.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {atts.map((a, i) => (
                              <a
                                key={a.url}
                                href={a.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-primary hover:underline"
                              >
                                <Paperclip className="size-2.5" />
                                {fileLabel(a.url, i)}
                              </a>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {(s.byEmail || s.byWhatsapp || s.callOn) && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Contact:{" "}
                      {[
                        s.byEmail && "email",
                        s.byWhatsapp && "WhatsApp",
                        s.callOn && `call ${s.callOn}`,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      {s.preferredWeekDay ? ` · ${s.preferredWeekDay}` : ""}
                      {s.preferredTime ? ` at ${toTimeInput(s.preferredTime)}` : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        </TabsContent>
      </Tabs>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          Everything here saves live: the header on SP 1821, your topics and chosen
          offerer on SP 1822, and each file on SP 1826 or 1827 after uploading to the
          file service. Attachments are add-only for now — neither delete procedure
          works yet. See PENDING-BACKEND.md.
        </p>
      </div>

      <SeekViewerDialog
        seek={seeks.data.find((s) => s.id === viewingId) || null}
        detail={parseProblems(seekDetails.index.get(viewingId))}
        attachments={seekAttachments.index.get(viewingId) || []}
        categoryName={
          categories.data.find(
            (c) => c.id === seeks.data.find((s) => s.id === viewingId)?.categoryId,
          )?.name
        }
        open={viewingId !== null}
        onOpenChange={(open) => !open && setViewingId(null)}
      />
    </PageContainer>
  );
}
