import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Handshake } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { useAuth } from "@/hooks/use-auth.js";
import { navForRole } from "./nav-config.js";
import { UserAvatar } from "@/components/user-avatar.jsx";
import { RoleBadge } from "@/components/role-badge.jsx";

export default function SidebarNav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const items = navForRole(user?.role);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary">
          <Handshake className="size-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="font-extrabold leading-tight tracking-tight">Belop</p>
          <p className="text-[11px] text-sidebar-foreground/50 leading-tight">
            Peer-to-peer help
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
        {items.map((item) => {
          const isActive =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + "/");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4.5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <UserAvatar user={user} className="size-9" showStatus />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <div className="mt-0.5">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-destructive/20 hover:text-destructive cursor-pointer"
          >
            <LogOut className="size-4.5" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </aside>
  );
}
