import { Link, useLocation, useNavigate } from "react-router-dom";
import { Handshake, LogOut, ChevronDown, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { navForRole } from "./nav-config.js";
import { CONTAINER } from "./page-container.jsx";
import { initials } from "@/lib/utils.js";
import { cn } from "@/lib/utils.js";



export default function TopNav() {
  const { user, logout, apiUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const items = navForRole(user.role);

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  // Name of the section currently open, for the desktop title.
  const currentLabel = items.find((i) => isActive(i.to))?.label || "";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Same container as the page body, so the title and content share a left edge. */}
      <div className={cn(CONTAINER, "flex h-14 items-center gap-2")}>
        {/* Brand — mobile only; the sidebar carries it from md up */}
        <Link to="/dashboard" className="flex shrink-0 items-center gap-2 md:hidden">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
            <Handshake className="size-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-extrabold tracking-tight">EH</span>
        </Link>

        {/* Current section — desktop only, since the sidebar shows the menu */}
        <p className="hidden truncate text-sm font-semibold md:block">{currentLabel}</p>

        {/* User */}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-accent cursor-pointer">
              {/* Monogram from the first two characters of the name, with a
                  shield marker so an admin is identifiable at a glance — this is
                  the only role cue on mobile, where the name is hidden. */}
              <span className="relative">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold uppercase text-primary-foreground">
                  {initials(user.name)}
                </span>
                {user.role === "admin" && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-background"
                    title="Admin"
                  >
                    <Shield className="size-2.5 text-primary" fill="currentColor" />
                  </span>
                )}
              </span>
              <div className="hidden text-left leading-tight sm:block">
                <p className="max-w-[10rem] truncate text-[13px] font-medium">
                  {user.name}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {user.role}
                </p>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">
                  {apiUser?.email || user.email}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Signed in as {user.role}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {items.map((item) => (
                <DropdownMenuItem
                  key={item.to}
                  onSelect={() => navigate(item.to)}
                  className="md:hidden"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem
                onSelect={handleLogout}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
