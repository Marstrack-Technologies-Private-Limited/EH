import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Label } from "@/components/ui/label.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import { saveRating } from "@/api/p2p.js";
import { RATING_MAX, SPS } from "@/api/config.js";

/**
 * Seeker rates an offerer for one seek — SP 1907. Opened only for a completed
 * seek; the caller enforces that (see `isSeekComplete`).
 */
export function RateOffererDialog({ open, onOpenChange, offerer, seekerId, seekId, onSaved }) {
  const [stars, setStars] = useState(0);
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStars(0);
    setComments("");
  };

  const submit = async () => {
    const missing = [!stars && "a star rating", !comments.trim() && "a short review"].filter(
      Boolean,
    );
    if (missing.length) {
      toast.error("Rating incomplete", { description: `Add ${missing.join(" and ")}.` });
      return;
    }
    setSaving(true);
    try {
      await saveRating({
        offererId: offerer.id,
        seekerId,
        seekId,
        stars,
        comments: comments.trim(),
      });
      toast.success("Thanks for your rating", {
        description: `${stars}/${RATING_MAX} for ${offerer.name} on ticket #${seekId}.`,
      });
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(`Rating not saved (SP ${SPS.SAVE_RATING})`, { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rate {offerer?.name || "the offerer"}</DialogTitle>
          <DialogDescription>
            Ticket #{seekId} is complete. Your rating helps other seekers choose.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Stars</Label>
            <StarRating value={stars} size="lg" onChange={setStars} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rating-comments">Review</Label>
            <Textarea
              id="rating-comments"
              className="text-base md:text-sm"
              value={comments}
              maxLength={1000}
              onChange={(e) => setComments(e.target.value)}
              placeholder="How did they help? Would you recommend them?"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="h-11 md:h-9" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="h-11 md:h-9" disabled={saving} onClick={submit}>
            {saving ? "Saving…" : "Submit rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
