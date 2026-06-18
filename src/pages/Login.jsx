import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Handshake, Mail, Lock, Copy, Check, ArrowRight, Search, Sparkles, Shield } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Card } from "@/components/ui/card.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { DEMO_LOGINS } from "@/data/users.js";
import { cn } from "@/lib/utils.js";

const ROLE_ICON = { seeker: Search, offerer: Sparkles, admin: Shield };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const res = login(email, password);
    if (res.ok) {
      toast.success(`Welcome back, ${res.user.name.split(" ")[0]}!`);
      navigate("/dashboard");
    } else {
      setError(res.error);
    }
  };

  const fill = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError("");
  };

  const copy = async (acc) => {
    try {
      await navigator.clipboard.writeText(`${acc.email} / ${acc.password}`);
      setCopied(acc.email);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard may be blocked */
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-[var(--offerer)]/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <Handshake className="size-6 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">Belop</span>
        </div>
        <div className="relative max-w-md space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight">
            Where seekers meet the people who can help.
          </h1>
          <p className="text-sidebar-foreground/70">
            Belop matches you with peers by topic, proficiency and location — then
            lets you chat one-on-one in real time. Find the right person, faster.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {["Smart matching", "1:1 chat", "Ratings & feedback", "Global"].map((t) => (
              <span key={t} className="rounded-full bg-sidebar-accent px-3 py-1 text-xs font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-sidebar-foreground/40">
          © {new Date().getFullYear()} Belop — MVP prototype
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary">
                <Handshake className="size-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-extrabold">Belop</span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Use a demo account below or your own credentials.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full">
              Sign in <ArrowRight className="size-4" />
            </Button>
          </form>

          {/* Demo accounts */}
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">DEMO ACCOUNTS</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {DEMO_LOGINS.map((acc) => {
                const Icon = ROLE_ICON[acc.role];
                return (
                  <Card
                    key={acc.email}
                    className={cn(
                      "flex items-center gap-3 p-2.5 transition-colors hover:border-primary/50",
                    )}
                  >
                    <button
                      onClick={() => fill(acc)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium capitalize">
                          {acc.role} · {acc.name}
                        </p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {acc.email} · {acc.password}
                        </p>
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => copy(acc)}
                      title="Copy credentials"
                    >
                      {copied === acc.email ? (
                        <Check className="size-4 text-emerald-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </Card>
                );
              })}
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Click a card to autofill, then press Sign in.
            </p>
          </div>

          <p className="text-center text-sm text-muted-foreground">
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
