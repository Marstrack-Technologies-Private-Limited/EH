import {
  LayoutDashboard,
  Compass,
  Sparkles,
  MessagesSquare,
  Star,
  Shield,
  Heart,
  UserSearch,
  LifeBuoy,
  MessagesSquare as ChatsIcon,
  User,
} from "lucide-react";

// Nav items by role. Seekers discover & match; offerers manage requests; admins
// get the admin panel. Everyone gets dashboard, chat, profile.
export function navForRole(role) {
  const common = [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }];
  const chat = { label: "Messages", to: "/chat", icon: MessagesSquare };
  const profile = { label: "Profile", to: "/profile", icon: User };
  // Areas + topics of interest — SPs 1702/1705, views 1703/1704.
  const interests = { label: "My Interests", to: "/interests", icon: Heart };

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
      interests,
      { label: "My Reviews", to: "/reviews", icon: Star },
      { label: "Discover", to: "/search", icon: Compass },
      chat,
      profile,
    ];
  }

  // seeker (default)
  return [
    ...common,
    { label: "Find Offerers", to: "/offerers", icon: UserSearch },
    { label: "Seek Assistance", to: "/seek-assistance", icon: LifeBuoy },
    { label: "My Chats", to: "/my-chats", icon: ChatsIcon },
    interests,
    { label: "Discover", to: "/search", icon: Compass },
    { label: "Top Matches", to: "/matches", icon: Sparkles },
    chat,
    profile,
  ];
}
