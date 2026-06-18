import {
  LayoutDashboard,
  Compass,
  Sparkles,
  MessagesSquare,
  Star,
  Shield,
  User,
} from "lucide-react";

// Nav items by role. Seekers discover & match; offerers manage requests; admins
// get the admin panel. Everyone gets dashboard, chat, profile.
export function navForRole(role) {
  const common = [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }];
  const chat = { label: "Messages", to: "/chat", icon: MessagesSquare };
  const profile = { label: "Profile", to: "/profile", icon: User };

  if (role === "admin") {
    return [
      ...common,
      { label: "Admin Panel", to: "/admin", icon: Shield },
      { label: "Discover", to: "/search", icon: Compass },
      chat,
      profile,
    ];
  }

  if (role === "offerer") {
    return [
      ...common,
      { label: "My Reviews", to: "/reviews", icon: Star },
      { label: "Discover", to: "/search", icon: Compass },
      chat,
      profile,
    ];
  }

  // seeker (default)
  return [
    ...common,
    { label: "Discover", to: "/search", icon: Compass },
    { label: "Top Matches", to: "/matches", icon: Sparkles },
    chat,
    profile,
  ];
}
