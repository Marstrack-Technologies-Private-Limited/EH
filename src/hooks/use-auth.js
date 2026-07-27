import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useApp } from "@/store/app-store.jsx";
import {
  clearAuthError,
  login as apiLogin,
  logout as apiLogout,
  selectAuth,
} from "@/store/auth-slice.js";
import { saveUser } from "@/api/p2p.js";
import { LOGIN_MODE, USER_TYPE } from "@/api/config.js";

let idCounter = 0;
function makeId(prefix) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter}`;
}

/** Map the app's seeker/offerer role onto OM_USER_SEEKERS_GUIDANCE_ALL. */
function toUserType(role) {
  if (role === "offerer") return USER_TYPE.OFFERER;
  if (role === "admin") return USER_TYPE.ALL;
  return USER_TYPE.SEEKER;
}

/**
 * Auth surface. The demo accounts still resolve against the local store; real
 * credentials go to the tech23 /cpanel/login endpoint and the returned tokens
 * live in redux (see store/auth-slice.js).
 */
export function useAuth() {
  const { state, dispatch, currentUser } = useApp();
  const reduxDispatch = useDispatch();
  const api = useSelector(selectAuth);

  /**
   * Sign in through the backend in one of the three modes.
   *
   * - ADMIN   → POST /cpanel/login
   * - SEEKER  → matched against MTVWUSERMASTER as a SEEKER
   * - OFFERER → matched against MTVWUSERMASTER as an OFFERER
   *
   * Tokens land in redux; the identity is mirrored into the local store so the
   * app shell, nav and route guards have a user object to work with.
   */
  const login = useCallback(
    async (email, password, mode = LOGIN_MODE.SEEKER) => {
      const action = await reduxDispatch(
        apiLogin({ email: String(email).trim(), password, mode }),
      );
      if (apiLogin.rejected.match(action)) {
        return { ok: false, error: action.payload || "Login failed." };
      }

      const { user: apiUser } = action.payload;
      const localUser = {
        id: `api_${apiUser.email || apiUser.userCode}`,
        name: apiUser.userCode || apiUser.email,
        email: apiUser.email,
        regNo: apiUser.regNo ?? null,
        role: apiUser.role,
        avatar: null,
        country: apiUser.country || "",
        city: apiUser.city || "",
        bio: apiUser.role === "offerer" ? apiUser.info || "" : "",
        problem: apiUser.role === "seeker" ? apiUser.info || "" : "",
        online: true,
        lastActive: Date.now(),
        topics: [],
        rating: 0,
        reviewsCount: 0,
        joinedAt: Date.now(),
      };
      dispatch({ type: "API_LOGIN", user: localUser });
      return { ok: true, user: localUser, api: apiUser };
    },
    [reduxDispatch, dispatch],
  );

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    reduxDispatch(apiLogout());
  }, [dispatch, reduxDispatch]);

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

  /**
   * Register through MT_INSERT_USER_MASTER (SP 1701), then mirror the account
   * locally. Pass regNo 0 for a new user; an existing reg no updates it.
   */
  const registerWithApi = useCallback(
    async (data) => {
      let saved;
      try {
        saved = await saveUser({
          regNo: data.regNo ?? 0,
          name: data.name,
          email: data.email,
          password: data.password,
          userType: toUserType(data.role),
          country: data.country,
          city: data.city,
          personalInformation: data.role === "offerer" ? data.bio : data.problem,
          dob: data.dob || "",
          active: true,
        });
      } catch (err) {
        return { ok: false, error: err.message || "Could not create the account." };
      }
      const local = register({ ...data, regNo: saved.id });
      return local.ok ? { ...local, savedId: saved.id } : local;
    },
    [register],
  );

  const updateProfile = useCallback(
    (patch) => {
      if (!currentUser) return;
      dispatch({ type: "UPDATE_PROFILE", userId: currentUser.id, patch });
    },
    [currentUser, dispatch],
  );

  const clearApiError = useCallback(
    () => reduxDispatch(clearAuthError()),
    [reduxDispatch],
  );

  return {
    user: currentUser,
    isAuthenticated: !!currentUser,
    login,
    logout,
    register,
    registerWithApi,
    updateProfile,
    // API session
    apiUser: api.user,
    apiStatus: api.status,
    apiError: api.error,
    isApiAuthenticated: Boolean(api.authToken),
    clearApiError,
  };
}
