import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Pencil, Calendar, Mail, AlertCircle, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/layout/page-header.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { UserAvatar } from "@/components/user-avatar.jsx";
import { RoleBadge } from "@/components/role-badge.jsx";
import { InterestsManager } from "@/components/interests-manager.jsx";
import { MemberProfileEditor } from "@/components/member-profile-editor.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { getUserByRegNo } from "@/api/p2p.js";
import { useMyRegNo } from "@/hooks/use-p2p.js";
import { hasId } from "@/lib/utils.js";
import { PRIVACY_OPTIONS } from "@/api/config.js";
import { MemberActivity } from "@/components/member-activity.jsx";
import { AcceptedWork } from "@/components/accepted-work.jsx";
import { MemberReviews } from "@/components/member-reviews.jsx";
import PageContainer from "@/components/layout/page-container.jsx";

export default function Profile() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // A member's own record, straight from MTVWUSERMASTER. Admins signed in via
  // /cpanel/login have no registration number and so no member row.
  const { regNo, loading: resolving } = useMyRegNo(user);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (!hasId(regNo)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getUserByRegNo(regNo)
      .then(setRecord)
      .catch((err) => setError(err.message || "Could not load your profile."))
      .finally(() => setLoading(false));
  }, [regNo]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = record || user;
  const isOfferer = (record?.type || "").toUpperCase() === "OFFERER" || user.role === "offerer";

  return (
    <PageContainer>
      <PageHeader
        title="My profile"
        actions={
          hasId(regNo) ? (
            <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="h-9">
              <Pencil className="size-4" /> Edit profile
            </Button>
          ) : null
        }
      />

      {!resolving && !hasId(regNo) && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            You're signed in as an administrator, which isn't a member record — there's
            nothing here to edit. Sign in as a Seeker or Offerer to manage a profile.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-xs break-words">{error}</p>
            <Button variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={load}>
              Try again
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-1">
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <UserAvatar
                user={{ ...user, name: shown.displayName || shown.name, avatar: record?.avatar }}
                className="size-20"
                showStatus
              />

              {loading ? (
                <>
                  <div className="shimmer mt-3 h-5 w-32 rounded" />
                  <div className="shimmer mt-2 h-4 w-40 rounded" />
                </>
              ) : (
                <>
                  <h2 className="mt-3 text-lg font-bold">{shown.displayName || shown.name}</h2>
                  {shown.displayName && shown.displayName !== shown.name && (
                    <p className="text-xs text-muted-foreground">{shown.name}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                    <RoleBadge role={isOfferer ? "offerer" : user.role} />
                    {record?.privacyLevel && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {record.privacyLevel} ·{" "}
                        {PRIVACY_OPTIONS.find((o) => o.value === record.privacyLevel)?.title ||
                          "Custom"}
                      </span>
                    )}
                  </div>
                  {shown.email && (
                    <p className="mt-3 inline-flex items-center gap-1.5 break-all text-xs text-muted-foreground">
                      <Mail className="size-3.5 shrink-0" /> {shown.email}
                    </p>
                  )}
                  {(shown.city || shown.country) && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {[shown.city, shown.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {record?.registeredAt && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="size-3" /> Registered{" "}
                      {new Date(record.registeredAt).toLocaleDateString()}
                    </p>
                  )}
                  {record && (
                    <MemberActivity regNo={record.id} type={record.type} className="mt-4" />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Visibility summary (client feedback, 2026-10-06). The full chart
              lives on /how-it-works; rows in src/data/visibility.js. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" /> Who can see your details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">Other members:</span> your
                name, city, bio and topics.
              </p>
              <p>
                <span className="font-semibold text-foreground">Only you and the EH team:</span>{" "}
                your email and date of birth.
              </p>
              <Link
                to="/how-it-works#privacy"
                className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline md:min-h-0"
              >
                See the full chart
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isOfferer ? "What I help people with" : "What I'm looking for"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="shimmer h-4 w-3/4 rounded" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {record?.info || "Nothing added yet."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Backed by views 1703/1704 and SPs 1702/1705 — the real record. */}
          {isOfferer && hasId(regNo) && <AcceptedWork offererId={regNo} />}

          {record && <MemberReviews regNo={record.id} type={record.type} own />}

          <InterestsManager userId={regNo} />
        </div>
      </div>

      {hasId(regNo) && (
        <MemberProfileEditor
          open={open}
          onOpenChange={setOpen}
          regNo={regNo}
          onSaved={load}
        />
      )}
    </PageContainer>
  );
}
