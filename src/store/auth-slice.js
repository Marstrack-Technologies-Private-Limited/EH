import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { loginByMode, loginRequest } from "@/api/auth.js";
import { LOGIN_MODE, SERVICE_ACCOUNT, SERVICE_TOKENS } from "@/api/config.js";

const initialState = {
  authToken: null,
  sessionToken: null,
  user: null,
  status: "idle", // idle | loading | succeeded | failed
  error: null,
};

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password, mode = LOGIN_MODE.ADMIN }, { rejectWithValue }) => {
    try {
      return await loginByMode({ email, password, mode });
    } catch (err) {
      return rejectWithValue(err.message || "Login failed.");
    }
  },
);

/**
 * Guarantees a usable session without signing anyone in.
 *
 * Public screens (registration) need to read the category/topic taxonomy, but
 * every view requires tokens. This mints a service-account session only when
 * there isn't one already, and never overwrites a real user's session.
 */
export const ensureSession = createAsyncThunk(
  "auth/ensureSession",
  async (_, { getState, rejectWithValue }) => {
    if (getState().auth.authToken) return null;

    // The module tokens are pre-issued and stable, so this costs no request.
    if (SERVICE_TOKENS.authToken) {
      return {
        authToken: SERVICE_TOKENS.authToken,
        sessionToken: SERVICE_TOKENS.sessionToken,
      };
    }

    try {
      const res = await loginRequest(SERVICE_ACCOUNT);
      return { authToken: res.authToken, sessionToken: res.sessionToken };
    } catch (err) {
      return rejectWithValue(err.message || "Could not reach the server.");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: () => ({ ...initialState }),
    clearAuthError: (state) => {
      state.error = null;
      if (state.status === "failed") state.status = "idle";
    },
    /** Rehydrate from persisted storage on boot. */
    restoreSession: (state, action) => {
      const { authToken, sessionToken, user } = action.payload || {};
      if (!authToken) return state;
      state.authToken = authToken;
      state.sessionToken = sessionToken ?? null;
      state.user = user ?? null;
      state.status = "succeeded";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.authToken = action.payload.authToken;
        state.sessionToken = action.payload.sessionToken;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error?.message || "Login failed.";
        state.authToken = null;
        state.sessionToken = null;
        state.user = null;
      })
      // Anonymous bootstrap: tokens only, no user — so `user` staying null is
      // what distinguishes it from a real sign-in.
      .addCase(ensureSession.fulfilled, (state, action) => {
        if (!action.payload || state.authToken) return;
        state.authToken = action.payload.authToken;
        state.sessionToken = action.payload.sessionToken;
      });
  },
});

export const { logout, clearAuthError, restoreSession } = authSlice.actions;

export const selectAuth = (s) => s.auth;
export const selectAuthToken = (s) => s.auth.authToken;
export const selectSessionToken = (s) => s.auth.sessionToken;
export const selectApiUser = (s) => s.auth.user;
export const selectIsApiAuthenticated = (s) => Boolean(s.auth.authToken);
/** Who to stamp on *_CREATED_BY columns. */
export const selectCreatedBy = (s) => s.auth.user?.userCode || s.auth.user?.email || "";

export default authSlice.reducer;
