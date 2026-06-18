import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils.js";
import { useAuth } from "@/hooks/use-auth.js";
import { navForRole } from "./nav-config.js";

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const items = navForRole(user?.role).slice(0, 5);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex justify-around border-t bg-sidebar md:hidden">
      {items.map((item) => {
        const isActive =
          location.pathname === item.to ||
          location.pathname.startsWith(item.to + "/");
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isActive
                ? "text-sidebar-primary"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="size-5" />
            <span className="truncate max-w-full px-1">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
