import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth.js";
import SidebarNav from "./sidebar-nav.jsx";
import BottomNav from "./bottom-nav.jsx";

export default function AppLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarNav />
      <main className="flex-1 overflow-y-auto scrollbar-thin pb-20 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
