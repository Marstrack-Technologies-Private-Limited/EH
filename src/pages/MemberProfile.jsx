import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Calendar, Inbox, MapPin, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { UserAvatar } from "@/components/user-avatar.jsx";
import { RoleBadge } from "@/components/role-badge.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import {
  useMyRegNo,
  useOffererRequests,
  useUserTopics,
} from "@/hooks/use-p2p.js";
import { parseSeekDetail } from "@/lib/seek-matching.js";
import { getMemberActivity, getUserByRegNo } from "@/api/p2p.js";
import { hasId } from "@/lib/utils.js";
import PageContainer from "@/components/layout/page-container.jsx";

const topicsOf = (detailText) => parseSeekDetail(detailText).topics;

/**
 * A member's public profile, read live from view 1699 (+ 1704 for topics).
 *
 * Opened from the offerer's dashboard and Seeker Requests so an offerer can
 * learn about a seeker before responding. Contact details are deliberately
 * left off — they belong to the seeker until a connection is accepted, which
 * needs the offerer-response SP (see PENDING-BACKEND.md §2).
 *
 * `/u/:id` is the older prototype profile and reads seed data only, so real
 * registration numbers would never resolve there.
 */
export default function MemberProfile() {
  const { regNo: param } = useParams();
  const regNo = Number(param);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (!Number.isFinite(regNo)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getUserByRegNo(regNo)
      .then(setMember)
      .catch((err) => setError(err.message || "Could not load this member."))
      .finally(() => setLoading(false));
  }, [regNo]);

  useEffect(() => {
    load();
  }, [load]);

  // Track record — counts that show whether this member is genuine.
  const [activity, setActivity] = useState(null);
  useEffect(() => {
    if (!member) return;
    let cancelled = false;
    getMemberActivity({ regNo: member.id, type: member.type })
      .then((a) => !cancelled && setActivity(a))
      .catch(() => !cancelled && setActivity(null));
    return () => {
      cancelled = true;
    };
  }, [member]);

  const topics = useUserTopics({ userId: Number.isFinite(regNo) ? regNo : null });

  // An offerer also sees this seeker's open requests — but only the ones that
  // ask for what the offerer offers, exactly as on Seeker Requests.
  const { regNo: myRegNo } = useMyRegNo(user);
  const isOffererViewer = user?.role === "offerer";
  const requests = useOffererRequests({
    offererId: myRegNo,
    offererName: user?.name,
    enabled: isOffererViewer,
  });
  const theirRequests = useMemo(
    () => requests.data.filter((s) => s.seekerId === regNo).sort((a, b) => b.id - a.id),
    [requests.data, regNo],
  );
  const categoryName = (id) =>
    requests.categories.find((c) => c.categoryId === id)?.categoryName || `Category ${id}`;

  // Topics grouped under their category, so the list reads as "Category: a, b".
  const topicGroups = useMemo(() => {
    const map = new Map();
    for (const t of topics.data) {
      const key = t.categoryName || `Category ${t.categoryId}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t.topicName);
    }
    return [...map.entries()];
  }, [topics.data]);

  const role = member?.type === "OFFERER" ? "offerer" : "seeker";
  const [requestsOpen, setRequestsOpen] = useState(false);

  return (
    <PageContainer className="space-y-3 md:space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2">
        <ArrowLeft className="size-4" /> Back
      </Button>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-xs break-words">{error}</p>
            <Button variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={load}>
              Try again
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && !member && (
        <p className="rounded-lg border p-4 text-center text-xs text-muted-foreground">
          This member could not be found.
        </p>
      )}

      {(loading || member) && (
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          <Card className="md:col-span-1">
            <CardContent className="flex flex-col items-center p-5 text-center">
              {loading ? (
                <>
                  <div className="shimmer size-20 rounded-full" />
                  <div className="shimmer mt-3 h-5 w-32 rounded" />
                  <div className="shimmer mt-2 h-4 w-24 rounded" />
                </>
              ) : (
                <>
                  <UserAvatar user={member} className="size-20" />
                  <h1 className="mt-3 text-lg font-bold">{member.name || "(no name)"}</h1>
                  <div className="mt-1.5">
                    <RoleBadge role={role} />
                  </div>
                  {(member.city || member.country) && (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {[member.city, member.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {member.registeredAt && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="size-3" /> Member since{" "}
                      {new Date(member.registeredAt).toLocaleDateString()}
                    </p>
                  )}
                  {activity && (
                    <dl className="mt-4 grid w-full grid-cols-3 gap-1.5">
                      {(role === "offerer"
                        ? [
                            ["Accepted", activity.accepted],
                            ["Ratings", activity.ratingsReceived],
                            [
                              "Avg stars",
                              activity.averageStars != null
                                ? activity.averageStars.toFixed(1)
                                : "—",
                            ],
                          ]
                        : [
                            ["Requests", activity.raised],
                            ["Accepted", activity.accepted],
                            ["Ratings given", activity.ratingsGiven],
                          ]
                      ).map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-muted/60 px-1 py-2">
                          <dd className="text-base font-bold">{value}</dd>
                          <dt className="text-[10px] text-muted-foreground">{label}</dt>
                        </div>
                      ))}
                    </dl>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3 md:col-span-2 md:space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base">About</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="shimmer h-4 w-3/4 rounded" />
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {member.info || "Nothing added yet."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base">
                  {role === "offerer" ? "Helps with" : "Interested in"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topics.loading ? (
                  <div className="shimmer h-4 w-2/3 rounded" />
                ) : topicGroups.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No topics added yet.</p>
                ) : (
                  topicGroups.map(([cat, names]) => (
                    <div key={cat}>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                        {cat}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {names.map((n) => (
                          <span
                            key={n}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Offerer viewing a seeker: their requests, but ONLY those for what
                this offerer serves (same rule as Seeker Requests). */}
            {isOffererViewer && hasId(myRegNo) && role === "seeker" && (
              <Button
                size="lg"
                className="h-12 w-full"
                disabled={requests.loading}
                onClick={() => setRequestsOpen(true)}
              >
                <Inbox className="size-4" />
                {requests.loading
                  ? "Loading requests…"
                  : `See their requests for your services (${theirRequests.length})`}
              </Button>
            )}
          </div>
        </div>
      )}
      <Dialog open={requestsOpen} onOpenChange={setRequestsOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{member?.name || "This seeker"}'s requests</DialogTitle>
            <DialogDescription>
              Only open requests for the services you offer.
            </DialogDescription>
          </DialogHeader>
          {theirRequests.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No open requests from this seeker for what you offer.
            </p>
          ) : (
            <ul className="space-y-2">
              {theirRequests.map((s) => {
                const t = topicsOf(requests.details.get(s.id));
                return (
                  <li key={s.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] font-semibold">#{s.id}</span>
                      <span className="text-xs font-medium">{categoryName(s.categoryId)}</span>
                      {s.raisedOn && (
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {s.raisedOn.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {t && <p className="mt-1 text-[11px] text-muted-foreground">Topics: {t}</p>}
                    {s.narration && (
                      <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs">{s.narration}</p>
                    )}
                    <Button size="sm" className="mt-2 h-11 md:h-8" asChild>
                      <Link to={`/requests?seek=${s.id}`}>
                        <Send className="size-3.5" /> View &amp; respond
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
