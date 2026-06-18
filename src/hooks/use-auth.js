import { useCallback } from "react";
import { useApp } from "@/store/app-store.jsx";

let idCounter = 0;
function makeId(prefix) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter}`;
}

/**
 * Auth surface backed by the in-memory store. Swap the bodies for real API
 * calls when the backend is wired up — the component API stays the same.
 */
export function useAuth() {
  const { state, dispatch, currentUser } = useApp();

  const login = useCallback(
    (email, password) => {
      const user = state.users.find(
        (u) => u.email.toLowerCase() === String(email).toLowerCase().trim(),
      );
      if (!user) return { ok: false, error: "No account found for that email." };
      if (password && user.password !== password)
        return { ok: false, error: "Incorrect password." };
      dispatch({ type: "LOGIN", userId: user.id });
      return { ok: true, user };
    },
    [state.users, dispatch],
  );

  const logout = useCallback(() => dispatch({ type: "LOGOUT" }), [dispatch]);

  const register = useCallback(
    (data) => {
      const email = String(data.email).toLowerCase().trim();
      if (state.users.some((u) => u.email.toLowerCase() === email))
        return { ok: false, error: "An account with that email already exists." };
      const user = {
        id: makeId("u"),
        avatar: null,
        online: true,
        lastActive: Date.now(),
        rating: 0,
        reviewsCount: 0,
        joinedAt: Date.now(),
        topics: [],
        ...data,
        email,
      };
      dispatch({ type: "REGISTER", user });
      return { ok: true, user };
    },
    [state.users, dispatch],
  );

  const updateProfile = useCallback(
    (patch) => {
      if (!currentUser) return;
      dispatch({ type: "UPDATE_PROFILE", userId: currentUser.id, patch });
    },
    [currentUser, dispatch],
  );

  return {
    user: currentUser,
    isAuthenticated: !!currentUser,
    login,
    logout,
    register,
    updateProfile,
  };
}
