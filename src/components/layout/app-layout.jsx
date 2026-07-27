import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth.js";
import SidebarNav from "./sidebar-nav.jsx";
import BottomNav from "./bottom-nav.jsx";
import TopNav from "./top-nav.jsx";

export default function AppLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Navigation by breakpoint:
  //   desktop — left sidebar carries brand + menus, top bar carries the user
  //   mobile  — top bar carries brand + user, bottom bar carries the menus
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <main className="flex-1 overflow-y-auto scrollbar-thin pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
