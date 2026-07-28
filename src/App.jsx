import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider } from "@/store/app-store.jsx";
import AppLayout from "@/components/layout/app-layout.jsx";
import Login from "@/pages/Login.jsx";
import Register from "@/pages/Register.jsx";
import Dashboard from "@/pages/Dashboard.jsx";
import Search from "@/pages/Search.jsx";
import Matches from "@/pages/Matches.jsx";
import Profile from "@/pages/Profile.jsx";
import Interests from "@/pages/Interests.jsx";
import UserProfile from "@/pages/UserProfile.jsx";
import Chat from "@/pages/Chat.jsx";
import Reviews from "@/pages/Reviews.jsx";
import Admin from "@/pages/Admin.jsx";
import NotFound from "@/pages/NotFound.jsx";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/search" element={<Search />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/interests" element={<Interests />} />
            <Route path="/u/:id" element={<UserProfile />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:userId" element={<Chat />} />
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
