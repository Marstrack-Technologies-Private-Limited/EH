import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Handshake,
  Search,
  Sparkles,
  Shield,
  Lock,
  Server,
  Paperclip,
  Smartphone,
  MessageCircle,
  Ban,
  Flag,
  LogOut,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { VisibilityChart } from "@/components/visibility-chart.jsx";
import { useAuth } from "@/hooks/use-auth.js";

// Public landing / "How it works" page. Served at "/" for signed-out visitors
// and at /how-it-works for everyone.
//
// Wording is a DRAFT for the client to confirm (client feedback, 2026-10-06:
// onboarding notice, visibility chart, rules of engagement, disclaimers).
// Every statement about data must match what the app really does — check
// src/data/visibility.js and PENDING-BACKEND.md before changing a claim.

const SECTIONS = [
  { id: "what", label: "What EH is" },
  { id: "modes", label: "Sign-in modes" },
  { id: "privacy", label: "Your information" },
  { id: "rules", label: "Sharing rules" },
  { id: "safety", label: "If you feel unsafe" },
  { id: "disclaimer", label: "Disclaimer" },
];

const MODES = [
  {
    icon: Search,
    title: "Seeker",
    tone: "text-[var(--seeker)]",
    body: "You need help with a problem. You pick a category and topics, describe what's wrong, and EH sends your request to offerers who signed up for that category.",
    sees: "Offerers' names, city, bio and topics. Never their email.",
  },
  {
    icon: Sparkles,
    title: "Offerer",
    tone: "text-[var(--offerer)]",
    body: "You help others with what you know. You choose the categories and topics you cover, and you only see requests in those categories.",
    sees: "Requests in your categories, and the seeker's name, city, bio and topics. Never their email.",
  },
  {
    icon: Shield,
    title: "Admin (EH team)",
    tone: "text-primary",
    body: "The EH team runs the platform. Admins manage categories, topics and member accounts.",
    sees: "Member records, including email, so they can help with account problems.",
  },
];

const STORAGE = [
  {
    icon: Server,
    title: "On EH's servers",
    body: "Your profile, interests and requests are saved in the EH database. The app talks to it over an encrypted (HTTPS) connection.",
  },
  {
    icon: Paperclip,
    title: "Attachments",
    body: "Files and photos you add to a request are kept in cloud file storage. Anyone who has the file's link can open it, so don't attach ID documents, bank details or anything you wouldn't want shared.",
  },
  {
    icon: Smartphone,
    title: "On your device",
    body: "Your sign-in and a few settings, like the skill level you give each topic, are kept in this browser for now. Signing out clears your sign-in.",
  },
  {
    icon: Lock,
    title: "What we collect",
    body: "Only what's needed to set up your profile and match you: name, email, password, date of birth, city and country, a short bio and your topics. We don't ask for a phone number or your address.",
  },
];

const RULES = [
  "Keep conversations inside EH. Don't move to phone, email or WhatsApp unless you really want to.",
  "If you choose to share your contact details, that's your decision and your risk. EH can't protect anything shared outside the app.",
  "Never share passwords, bank or card details, ID numbers or your home address.",
  "Share only what someone needs to help you with the problem.",
  "Be respectful. No harassment, threats, hate speech or sexual content.",
  "Don't record, screenshot or pass on someone's private details without their permission.",
];

const SAFETY = [
  {
    icon: LogOut,
    title: "Stop the conversation",
    body: "You never have to reply. Stop the conversation at any time and don't share anything more.",
  },
  {
    icon: Ban,
    title: "Block (coming soon)",
    body: "Blocking will stop that person from contacting you or seeing your requests again.",
  },
  {
    icon: Flag,
    title: "Report (coming soon)",
    body: "Reporting will send what happened to the EH team, who can warn or remove the member.",
  },
];

function Section({ id, title, intro, children }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
        {intro && <p className="max-w-[65ch] text-sm text-muted-foreground md:text-base">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function InfoCard({ icon: Icon, title, body, tone, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className={tone || "size-5 text-primary"} size={20} aria-hidden="true" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const { hash } = useLocation();

  // React Router doesn't scroll to #anchors on navigation (e.g. the
  // /how-it-works#privacy links on Register and Profile), so do it here.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="min-h-screen bg-background">
      {/* top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <Handshake className="size-4 text-primary-foreground" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">EH</span>
          </Link>
          {isAuthenticated ? (
            <Button asChild size="sm" className="min-h-11 md:min-h-9">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="min-h-11 md:min-h-9">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="min-h-11 md:min-h-9">
                <Link to="/register">Join</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-12 px-4 py-8 md:space-y-16 md:px-6 md:py-12">
        {/* intro */}
        <div id="what" className="scroll-mt-20 space-y-4">
          <h1 className="max-w-[20ch] text-3xl font-extrabold leading-tight tracking-tight text-balance md:text-5xl">
            Get help from people who've solved it before.
          </h1>
          <p className="max-w-[60ch] text-base text-muted-foreground md:text-lg">
            EH is a peer-to-peer help platform. Seekers ask for help with a problem, and
            offerers who know that subject reply. Your email and contact details are never
            shown to other members.
          </p>
          {!isAuthenticated && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="lg" className="min-h-11">
                <Link to="/register">
                  Create an account <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-11">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          )}

          {/* on-page contents */}
          <nav aria-label="On this page" className="flex flex-wrap gap-2 pt-4">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium hover:border-primary/50 md:min-h-9"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>

        <Section
          id="modes"
          title="Three ways to sign in"
          intro="Pick your mode on the sign-in screen. Each mode sees only what it needs."
        >
          <div className="grid gap-3 md:grid-cols-3">
            {MODES.map((m) => (
              <InfoCard key={m.title} icon={m.icon} title={m.title} body={m.body} tone={`size-5 ${m.tone}`}>
                <p className="mt-auto border-t pt-2 text-xs">
                  <span className="font-semibold">Can see: </span>
                  <span className="text-muted-foreground">{m.sees}</span>
                </p>
              </InfoCard>
            ))}
          </div>
        </Section>

        <Section
          id="privacy"
          title="Your information"
          intro="EH only collects what it needs to create your profile and match seekers with offerers. Your contact details are never shown to other members."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {STORAGE.map((s) => (
              <InfoCard key={s.title} {...s} />
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <h3 className="font-semibold">Who can see what</h3>
            <VisibilityChart />
            <p className="text-xs text-muted-foreground">
              Controls to choose which parts of your profile are public are on the way. A
              full privacy policy will follow.
            </p>
          </div>
        </Section>

        <Section
          id="rules"
          title="Rules for sharing information"
          intro="These rules keep everyone safe. Breaking them can get an account removed."
        >
          <ul className="grid gap-2">
            {RULES.map((r) => (
              <li key={r} className="flex gap-3 rounded-lg border p-3 text-sm">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="safety"
          title="If you feel uncomfortable"
          intro="You're always in control of a conversation. If someone makes you uneasy, you don't owe them a reply."
        >
          <div className="grid gap-3 md:grid-cols-3">
            {SAFETY.map((s) => (
              <InfoCard key={s.title} {...s} />
            ))}
          </div>
          <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <p>
              If you think you're in danger, contact your local emergency services first.
            </p>
          </div>
        </Section>

        <Section id="disclaimer" title="Disclaimer">
          <div className="max-w-[65ch] space-y-3 text-sm text-muted-foreground">
            <p>
              Help on EH comes from other members sharing their own experience. It isn't
              professional, medical, legal or financial advice. Check anything important
              with a qualified professional before you act on it.
            </p>
            <p>
              EH connects members but doesn't check every answer and isn't responsible for
              advice given, or for anything agreed or shared outside the app.
            </p>
          </div>
        </Section>
      </main>

      <footer className="border-t">
        <p className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted-foreground md:px-6">
          © {new Date().getFullYear()} tech23.net. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
