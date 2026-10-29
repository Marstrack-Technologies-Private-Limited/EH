import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider } from "@/store/app-store.jsx";
import AppLayout from "@/components/layout/app-layout.jsx";
import Login from "@/pages/Login.jsx";
import Register from "@/pages/Register.jsx";
import Dashboard from "@/pages/Dashboard.jsx";
import Search from "@/pages/Search.jsx";
import Profile from "@/pages/Profile.jsx";
import Interests from "@/pages/Interests.jsx";
import Offerers from "@/pages/Offerers.jsx";
import SeekAssistance from "@/pages/SeekAssistance.jsx";
import Requests from "@/pages/Requests.jsx";
import MyChats from "@/pages/MyChats.jsx";
import UserProfile from "@/pages/UserProfile.jsx";
import MemberProfile from "@/pages/MemberProfile.jsx";
import Chat from "@/pages/Chat.jsx";
import Reviews from "@/pages/Reviews.jsx";
import Admin from "@/pages/Admin.jsx";
import NotFound from "@/pages/NotFound.jsx";
import Landing from "@/pages/Landing.jsx";
import { useAuth } from "@/hooks/use-auth.js";

/**
 * Seekers have one search page now (Find Offerers). Offerer discovery is future
 * scope, so offerers land on their requests instead. Only admins keep Discover.
 */
function DiscoverRoute() {
  const { user } = useAuth();
  if (user?.role === "seeker") return <Navigate to="/offerers" replace />;
  if (user?.role === "offerer") return <Navigate to="/requests" replace />;
  return <Search />;
}

/** Seekers get one Messages area — their request threads (My Chats). */
function MessagesRoute() {
  const { user } = useAuth();
  return user?.role === "seeker" ? <MyChats /> : <Chat />;
}

function Home() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Public: landing for signed-out visitors, dashboard for members. */}
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<Landing />} />

          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/search" element={<DiscoverRoute />} />
            <Route path="/matches" element={<Navigate to="/offerers?sort=match" replace />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/interests" element={<Interests />} />
            <Route path="/offerers" element={<Offerers />} />
            <Route path="/seek-assistance" element={<SeekAssistance />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/my-chats" element={<Navigate to="/chat" replace />} />
            <Route path="/u/:id" element={<UserProfile />} />
            <Route path="/member/:regNo" element={<MemberProfile />} />
            <Route path="/chat" element={<MessagesRoute />} />
            <Route path="/chat/:userId" element={<MessagesRoute />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/admin" element={<Admin />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </AppProvider>
  );
}
