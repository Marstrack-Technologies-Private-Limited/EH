import {
  LayoutDashboard,
  Compass,
  MessagesSquare,
  Star,
  Shield,
  UserSearch,
  LifeBuoy,
  Inbox,
  User,
  Info,
} from "lucide-react";

// Nav items by role. Seekers discover & match; offerers manage requests; admins
// get the admin panel. Everyone gets dashboard, chat, profile.
export function navForRole(role) {
  const common = [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }];
  const chat = { label: "Messages", to: "/chat", icon: MessagesSquare };
  const profile = { label: "Profile", to: "/profile", icon: User };
  // Kept last so the 5-slot mobile bottom bar is unchanged; on mobile it is
  // reached from the Profile card and the sign-in screen.
  const howItWorks = { label: "How it works", to: "/how-it-works", icon: Info };
  // "My Interests" is no longer in the menus — the same editor lives on
  // Profile (client, 2026-09-24). /interests stays routed for direct links.

  if (role === "admin") {
    return [
      ...common,
      { label: "Admin Panel", to: "/admin", icon: Shield },
      { label: "Discover", to: "/search", icon: Compass },
      chat,
      profile,
      howItWorks,
    ];
  }

  if (role === "offerer") {
    return [
      ...common,
      // Open seeks in the categories this offerer signed up for — views 1703 + 1818.
      { label: "Seeker Requests", to: "/requests", icon: Inbox },
      { label: "My Reviews", to: "/reviews", icon: Star },
      // Discover is seeker-side only for now — offerer discovery is future scope
      // (client, 2026-10-27). /search redirects offerers to /requests.
      chat,
      profile,
      howItWorks,
    ];
  }

  // seeker (default). One place to find offerers (Discover + Top Matches folded
  // into Find Offerers) and one Messages area (My Chats merged) — client
  // feedback 2026-10-15. /search, /matches and /my-chats redirect for seekers.
  return [
    ...common,
    { label: "Find Offerers", to: "/offerers", icon: UserSearch },
    { label: "Seek Assistance", to: "/seek-assistance", icon: LifeBuoy },
    chat,
    profile,
    howItWorks,
  ];
}
