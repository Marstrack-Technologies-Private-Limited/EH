import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { LocationSelect } from "@/components/location-select.jsx";
import { getUserByRegNo, saveUser, verifyUserPassword } from "@/api/p2p.js";

/**
 * Lets a seeker or offerer edit their OWN record, and nobody else's.
 *
 * The whole form is keyed on the signed-in member's registration number, so
 * there is no field through which another member's row could be addressed.
 *
 * Email is deliberately read-only: it is the credential the member signs in
 * with, so changing it here would lock them out.
 *
 * SP 1701 rewrites every column on save, so the current row is loaded first and
 * untouched fields are sent back as they are — otherwise saving the name would
 * blank the date of birth.
 */
export function MemberProfileEditor({ open, onOpenChange, regNo, onSaved }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Password change is opt-in and needs the current password to go through.
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open || !regNo) return;
    let cancelled = false;

    setLoading(true);
    setLoadError(null);
    setPw({ current: "", next: "", confirm: "" });

    getUserByRegNo(regNo)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setLoadError(`No member found for registration number ${regNo}.`);
          return;
        }
        setForm({
          regNo: row.id,
          name: row.name,
          email: row.email,
          password: row.raw?.OM_USER_PASSWORD || "",
          userType: row.type,
          country: row.country,
          city: row.city,
          personalInformation: row.info,
          dob: row.dob ? String(row.dob).slice(0, 10) : "",
          registrationDate: row.registeredAt
            ? String(row.registeredAt).slice(0, 10)
            : "",
          active: row.active,
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "Could not load your profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, regNo]);

  const submit = useCallback(async () => {
    const missing = [
      [!form.name.trim(), "Name"],
      [!form.country, "Country"],
      [!form.city, "City"],
      [!form.dob, "Date of birth"],
    ]
      .filter(([bad]) => bad)
      .map(([, label]) => label);

    if (missing.length) {
      toast.error(`Missing ${missing.length} required field${missing.length > 1 ? "s" : ""}`, {
        description: missing.join(", "),
      });
      return;
    }

    const wantsNewPassword = Boolean(pw.next || pw.confirm || pw.current);
    let password = form.password;

    if (wantsNewPassword) {
      if (!pw.current) {
        toast.error("Enter your current password to change it.");
        return;
      }
      if (pw.next.length < 6) {
        toast.error("The new password must be at least 6 characters.");
        return;
      }
      if (pw.next !== pw.confirm) {
        toast.error("The new passwords don't match.");
        return;
      }

      setBusy(true);
      try {
        const ok = await verifyUserPassword(form.email, pw.current);
        if (!ok) {
          toast.error("That current password is incorrect.");
          return;
        }
      } catch (err) {
        toast.error(err.message || "Could not check your current password.");
        return;
      } finally {
        setBusy(false);
      }

      password = pw.next;
    }

    setBusy(true);
    try {
      // regNo comes from the loaded row, and email is never edited, so this can
      // only ever update the signed-in member.
      await saveUser({ ...form, name: form.name.trim(), password });
      toast.success(
        wantsNewPassword ? "Profile and password updated" : "Profile updated",
      );
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }, [form, pw, onSaved, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] overflow-y-auto p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Edit my profile</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-2">
            <div className="shimmer h-9 rounded-lg" />
            <div className="shimmer h-9 rounded-lg" />
            <div className="shimmer h-16 rounded-lg" />
          </div>
        )}

        {loadError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-xs break-words">{loadError}</p>
          </div>
        )}

        {form && !loading && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label htmlFor="me-name">Full name</Label>
              <Input
                id="me-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="me-email">Email</Label>
              <Input id="me-email" value={form.email} readOnly disabled />
              <p className="text-[10px] text-muted-foreground">
                You sign in with this address, so it can't be changed here.
              </p>
            </div>

            <LocationSelect
              country={form.country}
              city={form.city}
              onCountry={(v) => set("country", v)}
              onCity={(v) => set("city", v)}
            />

            <div className="space-y-1">
              <Label htmlFor="me-dob">Date of birth</Label>
              <Input
                id="me-dob"
                type="date"
                value={form.dob}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set("dob", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="me-info">
                {form.userType === "OFFERER"
                  ? "What you help people with"
                  : "What you're looking for"}
              </Label>
              <Textarea
                id="me-info"
                rows={3}
                className="min-h-16"
                value={form.personalInformation}
                onChange={(e) => set("personalInformation", e.target.value)}
              />
            </div>

            {/* Password change — leave blank to keep the current one */}
            <div className="space-y-2 rounded-lg border p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <Lock className="size-3.5" /> Change password
              </p>
              <p className="text-[10px] text-muted-foreground">
                Leave these blank to keep your current password.
              </p>

              <div className="space-y-1">
                <Label htmlFor="pw-current">Current password</Label>
                <div className="relative">
                  <Input
                    id="pw-current"
                    type={showPw ? "text" : "password"}
                    className="pr-9"
                    value={pw.current}
                    onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide passwords" : "Show passwords"}
                    className="absolute right-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pw-next">New password</Label>
                <Input
                  id="pw-next"
                  type={showPw ? "text" : "password"}
                  value={pw.next}
                  onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pw-confirm">Confirm new password</Label>
                <Input
                  id="pw-confirm"
                  type={showPw ? "text" : "password"}
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-9" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default MemberProfileEditor;
