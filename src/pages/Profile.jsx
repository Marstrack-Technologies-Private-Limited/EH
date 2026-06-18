import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Pencil, Star, Calendar, Tag } from "lucide-react";
import PageHeader from "@/components/layout/page-header.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { UserAvatar } from "@/components/user-avatar.jsx";
import { RoleBadge } from "@/components/role-badge.jsx";
import { TopicList } from "@/components/topic-list.jsx";
import { TopicPicker } from "@/components/topic-picker.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useApp } from "@/store/app-store.jsx";
import { timeAgo } from "@/lib/utils.js";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const isOfferer = user.role === "offerer";
  const myReviews = state.reviews.filter((r) => r.offererId === user.id);

  const [draft, setDraft] = useState(user);
  const openEdit = () => {
    setDraft(user);
    setOpen(true);
  };
  const save = () => {
    updateProfile({
      name: draft.name,
      bio: draft.bio,
      problem: draft.problem,
      country: draft.country,
      city: draft.city,
      topics: draft.topics,
    });
    setOpen(false);
    toast.success("Profile updated.");
  };
  const setD = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <PageHeader
        title="My profile"
        actions={
          <Button onClick={openEdit} variant="outline">
            <Pencil className="size-4" /> Edit profile
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <UserAvatar user={user} className="size-24" showStatus />
              <h2 className="mt-3 text-xl font-bold">{user.name}</h2>
              <div className="mt-1.5"><RoleBadge role={user.role} /></div>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4" /> {user.city}, {user.country}
              </p>
              {isOfferer && (
                <div className="mt-3 inline-flex items-center gap-2">
                  <StarRating value={user.rating} size="sm" />
                  <span className="text-sm font-medium">{user.rating ? user.rating.toFixed(1) : "New"}</span>
                  <span className="text-sm text-muted-foreground">({user.reviewsCount})</span>
                </div>
              )}
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3.5" /> Joined {timeAgo(user.joinedAt)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isOfferer ? "About" : "What I'm looking for"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {isOfferer ? user.bio || "No bio yet." : user.problem || "No description yet."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Tag className="size-4" />
                {isOfferer ? "Skills I offer" : "Topics I'm interested in"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopicList topics={user.topics} showRating={isOfferer} />
            </CardContent>
          </Card>

          {isOfferer && (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <Star className="size-4" /> Feedback ({myReviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {myReviews.length ? (
                  myReviews.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{r.seekerName}</span>
                        <StarRating value={r.rating} size="sm" />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No reviews yet.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={draft.name} onChange={(e) => setD("name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={draft.country} onChange={(e) => setD("country", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={draft.city} onChange={(e) => setD("city", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{isOfferer ? "About" : "What you're looking for"}</Label>
              <Textarea
                value={isOfferer ? draft.bio : draft.problem}
                onChange={(e) => setD(isOfferer ? "bio" : "problem", e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{isOfferer ? "Skills & proficiency" : "Topics of interest"}</Label>
              <TopicPicker
                categories={state.categories}
                value={draft.topics}
                onChange={(t) => setD("topics", t)}
                withRating={isOfferer}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
