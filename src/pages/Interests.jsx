import { useMemo, useState } from "react";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { InterestsManager } from "@/components/interests-manager.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useMyRegNo, useUsers } from "@/hooks/use-p2p.js";
import { hasId } from "@/lib/utils.js";
import PageContainer from "@/components/layout/page-container.jsx";

/**
 * Areas of interest (SP 1702 / view 1703) and topics of interest
 * (SP 1705 / view 1704).
 *
 * A seeker or offerer manages their own, keyed on their registration number.
 * An admin has no member record of their own, so they pick a member first and
 * manage that member's interests — otherwise the screen has nothing to act on.
 */
export default function Interests() {
  const { user } = useAuth();

  // Reg no 0 is a real member, so resolve it properly rather than testing truthiness.
  const { regNo: ownRegNo, loading: resolving } = useMyRegNo(user);
  const isAdmin = !resolving && !hasId(ownRegNo);

  const [pickedId, setPickedId] = useState(null);
  const targetId = hasId(ownRegNo) ? ownRegNo : pickedId;

  return (
    <PageContainer>
      {isAdmin && <MemberPicker value={pickedId} onChange={setPickedId} />}

      <InterestsManager userId={targetId} />
    </PageContainer>
  );
}

/** Admin-only: choose whose interests to manage. */
function MemberPicker({ value, onChange }) {
  const [query, setQuery] = useState("");
  const { data, loading } = useUsers();

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? data.filter(
          (u) =>
            u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
        )
      : data;
    return rows.slice(0, 100);
  }, [data, query]);

  const picked = data.find((u) => u.id === value);

  return (
    <div className="mb-3 space-y-2 rounded-lg border bg-card p-3">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Users className="size-3.5 text-primary" /> Manage interests for
        </p>
        <p className="text-[11px] text-muted-foreground">
          Your admin sign-in has no member record, so choose the member to work on.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            Find a member
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or email…"
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            Member
          </Label>
          <Select
            value={hasId(value) ? String(value) : ""}
            onValueChange={(v) => onChange(Number(v))}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading members…" : "Select a member…"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name || "(no name)"} · {u.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {picked && (
        <p className="text-[11px] text-muted-foreground">
          Editing <span className="font-semibold text-foreground">{picked.name}</span>{" "}
          (#{picked.id}) · {picked.email}
        </p>
      )}
    </div>
  );
}
