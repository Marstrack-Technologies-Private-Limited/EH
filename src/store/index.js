import { configureStore } from "@reduxjs/toolkit";
import authReducer, { logout, restoreSession } from "./auth-slice.js";
import { setAuthTokens, setUnauthorizedHandler } from "@/api/http.js";

const AUTH_STORAGE_KEY = "eh_auth_v1";

function loadPersistedAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const store = configureStore({
  reducer: { auth: authReducer },
});

// Boot: rehydrate a previous session before anything renders.
const persisted = loadPersistedAuth();
if (persisted?.authToken) store.dispatch(restoreSession(persisted));

/**
 * Keep the fetch layer's token holder and localStorage in sync with the store.
 * The api module can't read the store directly (thunks import the api), so the
 * tokens are pushed out to it here.
 */
let lastAuth = {};
function syncAuth() {
  const { authToken, sessionToken, user } = store.getState().auth;
  if (authToken === lastAuth.authToken && sessionToken === lastAuth.sessionToken) return;
  lastAuth = { authToken, sessionToken };

  setAuthTokens({ authToken, sessionToken });
  try {
    if (authToken) {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ authToken, sessionToken, user }),
      );
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    /* ignore quota / private-mode errors */
  }
}

syncAuth();
store.subscribe(syncAuth);

// Any 401/403 from the API drops the session so the app falls back to login.
setUnauthorizedHandler(() => store.dispatch(logout()));
