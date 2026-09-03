import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Handshake,
  ArrowRight,
  ArrowLeft,
  Search,
  Sparkles,
  Check,
  MapPin,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Card } from "@/components/ui/card.jsx";
import { TopicPicker } from "@/components/topic-picker.jsx";
import { ProficiencySlider } from "@/components/ui/proficiency-slider.jsx";
import { DEFAULT_PROFICIENCY, proficiencyLabel } from "@/data/categories.js";
import { useAuth } from "@/hooks/use-auth.js";
import { useTaxonomy } from "@/hooks/use-p2p.js";
import { LocationSelect } from "@/components/location-select.jsx";
import { cn } from "@/lib/utils.js";

const STEPS = ["Your details", "Specializations"];

const ROLES = [
  {
    value: "seeker",
    title: "I'm a Seeker",
    desc: "I'm looking for people who can help me solve a problem.",
    icon: Search,
  },
  {
    value: "offerer",
    title: "I'm an Offerer",
    desc: "I want to offer my expertise and help others.",
    icon: Sparkles,
  },
];

export default function Register() {
  const navigate = useNavigate();
  const { registerWithApi } = useAuth();
  const taxonomy = useTaxonomy();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    role: "seeker",
    name: "",
    email: "",
    password: "",
    dob: "",
    country: "",
    city: "",
    problem: "",
    bio: "",
    proficiency: DEFAULT_PROFICIENCY,
    topics: [],
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isOfferer = form.role === "offerer";

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.password.length < 6) e.password = "At least 6 characters";
    if (!form.dob) e.dob = "Required";
    if (!form.country.trim()) e.country = "Required";
    if (!form.city.trim()) e.city = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep1()) setStep(1);
  };

  /** Creates the account through MT_INSERT_USER_MASTER (SP 1701). */
  const finish = async () => {
    if (form.topics.length === 0) {
      toast.error("Select at least one topic to continue.");
      return;
    }
    setBusy(true);
    try {
      const res = await registerWithApi(form);
      if (!res.ok) {
        setStep(0);
        setErrors({ email: res.error });
        toast.error(res.error);
        return;
      }
      toast.success(
        `Account created${res.savedId ? ` (#${res.savedId})` : ""} — welcome to EH!`,
      );
      navigate("/dashboard");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
        {/* header */}
        <div className="mb-8 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary">
              <Handshake className="size-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-extrabold">EH</span>
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Already have an account?
          </Link>
        </div>

        {/* stepper */}
        <div className="mb-8 flex items-center gap-3">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    i < step && "bg-primary text-primary-foreground",
                    i === step && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    i > step && "bg-muted text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="size-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    i === step ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        <Card className="flex-1 p-6">
          {step === 0 ? (
            <div className="space-y-6">
              {/* role */}
              <div className="space-y-2">
                <Label>I am registering as</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ROLES.map((r) => {
                    const active = form.role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => set("role", r.value)}
                        className={cn(
                          "flex flex-col gap-1.5 rounded-xl border-2 p-4 text-left transition-all cursor-pointer",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={cn(
                              "flex size-9 items-center justify-center rounded-lg",
                              active ? "bg-primary text-primary-foreground" : "bg-muted",
                            )}
                          >
                            <r.icon className="size-5" />
                          </div>
                          <div
                            className={cn(
                              "flex size-5 items-center justify-center rounded-full border-2",
                              active ? "border-primary bg-primary" : "border-muted-foreground/30",
                            )}
                          >
                            {active && <Check className="size-3 text-primary-foreground" />}
                          </div>
                        </div>
                        <p className="font-semibold">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" error={errors.name} className="sm:col-span-2">
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" />
                </Field>
                <Field label="Email" error={errors.email}>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
                </Field>
                <Field label="Password" error={errors.password}>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      className="pr-10"
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Date of birth" error={errors.dob}>
                  <Input
                    type="date"
                    value={form.dob}
                    onChange={(e) => set("dob", e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <LocationSelect
                    country={form.country}
                    city={form.city}
                    onCountry={(v) => set("country", v)}
                    onCity={(v) => set("city", v)}
                  />
                  {(errors.country || errors.city) && (
                    <p className="mt-1 text-xs font-medium text-destructive">
                      {errors.country || errors.city}
                    </p>
                  )}
                </div>
              </div>

              <Field
                label={isOfferer ? "Briefly, what do you help people with?" : "What problem are you trying to solve?"}
              >
                <Textarea
                  value={isOfferer ? form.bio : form.problem}
                  onChange={(e) => set(isOfferer ? "bio" : "problem", e.target.value)}
                  placeholder={
                    isOfferer
                      ? "e.g. I help early-stage founders ship their first product…"
                      : "e.g. I'm stuck scaling my database and need someone who's done it…"
                  }
                  rows={4}
                />
              </Field>

              {/* Offerers state their level up front; it seeds every topic they
                  pick on the next step, which they can then fine-tune. */}
              {isOfferer && (
                <div className="space-y-1.5 rounded-xl border bg-muted/30 p-3">
                  <Label>Your proficiency</Label>
                  <p className="text-[11px] text-muted-foreground">
                    How well do you know your subject overall? This sets the starting
                    level for each topic you pick next — {proficiencyLabel(form.proficiency)}{" "}
                    for now.
                  </p>
                  <ProficiencySlider
                    label="How well do you know your subject?"
                    value={form.proficiency}
                    onChange={(v) => set("proficiency", v)}
                  />
                </div>
              )}

              <div className="flex justify-end">
                <Button size="lg" onClick={next}>
                  Continue <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold">
                  {isOfferer ? "What can you offer?" : "What are you looking for?"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pick the categories and topics you{" "}
                  {isOfferer
                    ? "can help with, then set how well you know each one."
                    : "want help with."}
                </p>
                {isOfferer && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Proficiency is kept on this device for now — the server has no field
                    for it yet.
                  </p>
                )}
              </div>

              {taxonomy.loading ? (
                <div className="space-y-2" role="status" aria-label="Loading categories">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="shimmer h-3.5 w-1/3 rounded" />
                      <div className="mt-2 flex gap-1.5">
                        <div className="shimmer h-5 w-20 rounded-full" />
                        <div className="shimmer h-5 w-24 rounded-full" />
                        <div className="shimmer h-5 w-16 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : taxonomy.error ? (
                <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                  <p className="text-sm break-words">{taxonomy.error}</p>
                  <Button variant="outline" size="sm" onClick={taxonomy.reload}>
                    Try again
                  </Button>
                </div>
              ) : taxonomy.categories.length === 0 ? (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                  No categories have been set up yet — an admin needs to add them first.
                </p>
              ) : (
                <TopicPicker
                  categories={taxonomy.categories}
                  value={form.topics}
                  onChange={(t) => set("topics", t)}
                  withRating={isOfferer}
                  defaultRating={form.proficiency}
                />
              )}

              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <MapPin className="size-4" /> Location
                </span>{" "}
                {form.city}, {form.country} — used to find people near you.
              </div>

              <div className="flex justify-between">
                <Button variant="outline" size="lg" onClick={() => setStep(0)}>
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button size="lg" onClick={finish} disabled={busy}>
                  {busy ? "Creating…" : "Create account"}
                  {!busy && <Check className="size-4" />}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, error, children, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
