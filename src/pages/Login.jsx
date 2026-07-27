import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Handshake,
  Mail,
  Lock,
  ArrowRight,
  Search,
  Sparkles,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { LOGIN_MODE } from "@/api/config.js";
import { cn } from "@/lib/utils.js";

const MODES = [
  {
    value: LOGIN_MODE.SEEKER,
    label: "Seeker",
    icon: Search,
    blurb: "Find people who can help you.",
    landing: "/dashboard",
  },
  {
    value: LOGIN_MODE.OFFERER,
    label: "Offerer",
    icon: Sparkles,
    blurb: "Offer your expertise to others.",
    landing: "/dashboard",
  },
  {
    value: LOGIN_MODE.ADMIN,
    label: "Admin",
    icon: Shield,
    blurb: "Manage categories, topics & services.",
    // Every mode lands on the dashboard; admins reach the panel from the nav.
    landing: "/dashboard",
  },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(LOGIN_MODE.SEEKER);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const active = MODES.find((m) => m.value === mode);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await login(email, password, mode);
      if (res.ok) {
        toast.success(`Signed in as ${res.user.name} (${active.label})`);
        navigate(active.landing);
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — desktop only */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-[var(--offerer)]/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <Handshake className="size-6 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">EH</span>
        </div>
        <div className="relative max-w-md space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight">
            Where seekers meet the people who can help.
          </h1>
          <p className="text-sidebar-foreground/70">
            EH matches you with peers by topic, proficiency and location — then
            lets you chat one-on-one in real time.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-foreground/40">
          © {new Date().getFullYear()} tech23.net — All rights reserved.
        </p>
      </div>

      {/*
        Form panel — carries the brand treatment on mobile, plain on desktop.
        The header and footer are absolutely positioned so the card centres
        against the FULL panel height rather than the leftover space between them.
      */}
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sidebar p-4 sm:p-8 lg:min-h-0 lg:bg-background lg:p-12">
        {/* Ambient glow, mobile/tablet only */}
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/25 blur-3xl lg:hidden" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 size-72 rounded-full bg-[var(--offerer)]/20 blur-3xl lg:hidden" />

        {/* Brand title + quote, pinned top on mobile */}
        <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-1.5 px-4 pt-8 text-sidebar-foreground lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Handshake className="size-4 text-sidebar-primary-foreground" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">EH</span>
          </div>
          <p className="max-w-[18rem] text-center text-[13px] italic text-sidebar-foreground/60">
            “Where seekers meet the people,
            <br />
            who can help.”
          </p>
        </div>

        {/* Copyright, pinned bottom on mobile */}
        <p className="absolute inset-x-0 bottom-0 px-4 pb-6 text-center text-[11px] text-sidebar-foreground/40 lg:hidden">
          © {new Date().getFullYear()} tech23.net — All rights reserved.
        </p>

        <div className="relative w-full max-w-[22rem] space-y-5 rounded-2xl border bg-background p-6 shadow-xl lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold tracking-tight">Sign in</h2>
            <p className="text-[13px] text-muted-foreground">{active.blurb}</p>
          </div>

          {/* Mode selector — compact segmented control */}
          <div
            role="radiogroup"
            aria-label="Sign in as"
            className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
          >
            {MODES.map((m) => {
              const on = mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setMode(m.value);
                    setError("");
                  }}
                  className={cn(
                    "flex h-9 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-all cursor-pointer",
                    on
                      ? "bg-primary/15 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <m.icon className="size-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="px-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-[13px] font-medium text-destructive">{error}</p>}

            <Button type="submit" className="h-10 w-full" disabled={busy}>
              {busy ? "Signing in…" : `Sign in as ${active.label}`}
              {!busy && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <p className="text-center text-[13px] text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
