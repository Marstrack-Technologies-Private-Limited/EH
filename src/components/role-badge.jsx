import { Search, Sparkles, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge.jsx";

const CONFIG = {
  seeker: { label: "Seeker", variant: "seeker", icon: Search },
  offerer: { label: "Offerer", variant: "offerer", icon: Sparkles },
  admin: { label: "Admin", variant: "secondary", icon: Shield },
};

export function RoleBadge({ role, className }) {
  const c = CONFIG[role] || CONFIG.seeker;
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className={className}>
      <Icon className="size-3" />
      {c.label}
    </Badge>
  );
}
