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
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Card } from "@/components/ui/card.jsx";
import { TopicPicker } from "@/components/topic-picker.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useApp } from "@/store/app-store.jsx";
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
  const { register } = useAuth();
  const { state } = useApp();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    role: "seeker",
    name: "",
    email: "",
    password: "",
    country: "",
    city: "",
    problem: "",
    bio: "",
    topics: [],
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isOfferer = form.role === "offerer";

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.password.length < 6) e.password = "At least 6 characters";
    if (!form.country.trim()) e.country = "Required";
    if (!form.city.trim()) e.city = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep1()) setStep(1);
  };

  const finish = () => {
    if (form.topics.length === 0) {
      toast.error("Select at least one topic to continue.");
      return;
    }
    const res = register(form);
    if (!res.ok) {
      setStep(0);
      setErrors({ email: res.error });
      return;
    }
    toast.success("Account created — welcome to Belop!");
    navigate("/dashboard");
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
            <span className="text-lg font-extrabold">Belop</span>
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
                  <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" />
                </Field>
                <Field label="Country" error={errors.country}>
                  <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="United Kingdom" />
                </Field>
                <Field label="City" error={errors.city}>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="London" />
                </Field>
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
                  {isOfferer ? "can help with — and rate your proficiency." : "want help with."}
                </p>
              </div>

              <TopicPicker
                categories={state.categories}
                value={form.topics}
                onChange={(t) => set("topics", t)}
                withRating={isOfferer}
              />

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
                <Button size="lg" onClick={finish}>
                  Create account <Check className="size-4" />
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
