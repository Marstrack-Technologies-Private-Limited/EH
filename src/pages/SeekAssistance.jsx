import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useCategories, useMyRegNo, useUserTopics, useUsers } from "@/hooks/use-p2p.js";
import { getUserByRegNo } from "@/api/p2p.js";
import { USER_TYPE } from "@/api/config.js";
import PageContainer from "@/components/layout/page-container.jsx";
import { cn, hasId } from "@/lib/utils.js";

const URGENCY = [
  { value: "IMMEDIATE", label: "Immediate" },
  { value: "24H", label: "Within 24 hours" },
  { value: "3D", label: "Within 3 days" },
  { value: "1W", label: "Within a week" },
  { value: "FLEXIBLE", label: "No rush / flexible" },
];

const CONTACT = [
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "WHATSAPP", label: "WhatsApp" },
];

/** Who the request goes to. */
const AUDIENCE = {
  OFFERER: "OFFERER",
  CATEGORY: "CATEGORY",
  TOPICS: "TOPICS",
};

/**
 * Seek Assistance — the seeker's enquiry that becomes the first ticket.
 *
 * The seeker's own topics come from view 1704 and prefill the selection; they
 * can be removed here, and more added, without touching their saved interests.
 *
 * NOTE: there is no ticket object on the backend yet, so Submit is held. SPs
 * 1706–1708 are deployed but undocumented (they answer 501 to an empty body,
 * where a non-existent id answers 403), so one of those may well be it — the
 * parameter names are needed before this can be wired.
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
  const categories = useCategories();
  const offerers = useUsers({ type: USER_TYPE.OFFERER, orderBy: "OM_USER_NAME", sortDir: "ASC" });

  const [targetOfferer, setTargetOfferer] = useState(null);
  const [categoryId, setCategoryId] = useState(0);
  const [selectedTopicIds, setSelectedTopicIds] = useState(null);
  const [issue, setIssue] = useState("");
  const [urgency, setUrgency] = useState("IMMEDIATE");
  const [contactBy, setContactBy] = useState("EMAIL");
  const [contactValue, setContactValue] = useState("");
  const [files, setFiles] = useState([]);

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

  const chosen = selectedTopicIds ?? new Set();
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

  const missing = useMemo(() => {
    const m = [];
    if (!issue.trim()) m.push("Description of the issue");
    if (audience === AUDIENCE.OFFERER && !targetOfferer) m.push("Offerer");
    if (audience === AUDIENCE.CATEGORY && !categoryId) m.push("Category");
    if (audience === AUDIENCE.TOPICS && chosen.size === 0) m.push("At least one topic");
    if (contactBy !== "EMAIL" && !contactValue.trim()) m.push("Contact number");
    return m;
  }, [issue, audience, targetOfferer, categoryId, chosen.size, contactBy, contactValue]);

  const submit = () => {
    if (missing.length) {
      toast.error(`Missing ${missing.length} required field${missing.length > 1 ? "s" : ""}`, {
        description: missing.join(", "),
      });
      return;
    }
    // Deliberately not faking a save — there is no ticket object to call.
    toast.error("No ticket endpoint yet", {
      description:
        "The backend has no Seek Assistance / ticket stored procedure documented. Send the object ID and parameters and this will submit.",
    });
  };

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

  return (
    <PageContainer>
      <div className="mb-3">
        <h1 className="text-lg font-bold tracking-tight md:text-xl">Seek assistance</h1>
        <p className="text-xs text-muted-foreground">
          Describe your issue and choose who should see it.
        </p>
      </div>

      <div className="space-y-3">
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

          {audience === AUDIENCE.CATEGORY && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                Category
              </Label>
              <Select value={String(categoryId)} onValueChange={(v) => setCategoryId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.data.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {audience === AUDIENCE.TOPICS && (
            <div>
              <Label className="mb-1.5 block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                Your topics — untick any that don't apply
              </Label>
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
                <div className="flex flex-wrap gap-1.5">
                  {myTopics.data.map((t) => {
                    const on = chosen.has(t.topicId);
                    return (
                      <button
                        key={t.topicId}
                        type="button"
                        onClick={() => toggleTopic(t.topicId)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                          on
                            ? "bg-primary/15 text-primary"
                            : "border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t.topicName}
                        <span className="ml-1 opacity-60">· {t.categoryName}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Changing these only affects this enquiry — your saved interests stay as
                they are.
              </p>
            </div>
          )}
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
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground">
            <Paperclip className="size-3.5" />
            Add files or images
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
                {URGENCY.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
              How should we contact you?
            </Label>
            <Select value={contactBy} onValueChange={setContactBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {contactBy === "EMAIL" ? (
            <p className="text-[10px] text-muted-foreground sm:col-span-2">
              We'll use your account email.
            </p>
          ) : (
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="contact-value">
                {contactBy === "WHATSAPP" ? "WhatsApp number" : "Phone number"}
              </Label>
              <Input
                id="contact-value"
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                placeholder="+254 7xx xxx xxx"
              />
            </div>
          )}
        </section>

        <Button className="h-10 w-full" onClick={submit}>
          <Send className="size-4" /> Submit your issue
        </Button>

        <div className="flex items-start gap-2 rounded-lg border border-dashed p-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            This form can't save yet — the backend has no ticket object. Everything else
            here is live: your topics come from view 1704 and the offerer list from view
            1699.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
