import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Label } from "@/components/ui/label.jsx";
import { StarRating } from "@/components/ui/star-rating.jsx";
import { useApp } from "@/store/app-store.jsx";
import { useAuth } from "@/hooks/use-auth.js";

export function ReviewDialog({ offerer, trigger }) {
  const { dispatch } = useApp();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submit = () => {
    if (!comment.trim()) {
      toast.error("Add a short comment.");
      return;
    }
    dispatch({
      type: "ADD_REVIEW",
      review: {
        id: `r_${Date.now()}`,
        offererId: offerer.id,
        seekerId: user.id,
        seekerName: user.name,
        rating,
        comment: comment.trim(),
        createdAt: Date.now(),
      },
    });
    toast.success("Thanks for your feedback!");
    setOpen(false);
    setComment("");
    setRating(5);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Star className="size-4" /> Leave feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate your session with {offerer.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Your rating</Label>
            <StarRating value={rating} size="lg" onChange={setRating} />
          </div>
          <div className="space-y-1.5">
            <Label>Comment</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How did they help? Would you recommend them?"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Submit feedback</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
