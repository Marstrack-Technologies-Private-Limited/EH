import { LOGIN_MODE, MODULE_NAME, SERVICE_ACCOUNT, VIEWS } from "./config.js";
import { getAuthTokens, getView, request, setAuthTokens } from "./http.js";
import { normalizeUser } from "./p2p.js";

/**
 * Admin / control-panel login. Returns the two tokens every other call needs:
 * `authenticationToken` → auth-token header, `sclientSecret` → session-token.
 */
export async function loginRequest({ email, password, moduleName = MODULE_NAME }) {
  const body = await request("/cpanel/login", {
    method: "POST",
    body: { email, password, MODULENAME: moduleName },
  });

  if (!body?.authenticationToken) {
    throw new Error("Login failed — no token returned.");
  }

  return {
    authToken: body.authenticationToken,
    sessionToken: body.sclientSecret ?? null,
    user: {
      userCode: body.user?.userCode ?? "",
      email: body.user?.emailId ?? email,
      userType: body.user?.userType ?? false,
      module: body.user?.traineeOrTrainer ?? moduleName,
      mode: LOGIN_MODE.ADMIN,
      role: "admin",
    },
  };
}

/**
 * Seeker / offerer login.
 *
 * These accounts are rows in MTVWUSERMASTER, not /cpanel/login users, so:
 *   1. bootstrap a session with the module service account (reading any view
 *      requires tokens), then
 *   2. let the server match email + password + user type — the row only comes
 *      back when the password is correct, so the check is server-side.
 *
 * NOTE: the filter travels in the query string, which is the only matching
 * facility this API exposes. Move it to a dedicated login SP when the backend
 * provides one.
 */
export async function loginMemberRequest({ email, password, mode }) {
  const bootstrap = await loginRequest(SERVICE_ACCOUNT);

  // getView reads tokens from the module-level holder, so seed it before use.
  const previous = getAuthTokens();
  setAuthTokens(bootstrap);

  let rows;
  try {
    const res = await getView(VIEWS.USERS, {
      page: 1,
      pagesize: 2,
      filters: {
        OM_USER_EMAIL: String(email).trim(),
        OM_USER_PASSWORD: password,
      },
    });
    rows = res.data;
  } catch (err) {
    setAuthTokens(previous);
    throw err;
  }

  if (!rows.length) {
    setAuthTokens(previous);
    throw new Error("Incorrect email or password.");
  }

  const member = normalizeUser(rows[0]);

  // A user registered as ALL may sign in through either door.
  if (member.type !== mode && member.type !== "ALL") {
    setAuthTokens(previous);
    throw new Error(
      `This account is registered as ${member.type || "another type"}. Switch the sign-in mode and try again.`,
    );
  }

  return {
    authToken: bootstrap.authToken,
    sessionToken: bootstrap.sessionToken,
    user: {
      userCode: member.name,
      email: member.email,
      regNo: member.id,
      userType: member.type,
      module: MODULE_NAME,
      mode,
      role: mode === LOGIN_MODE.OFFERER ? "offerer" : "seeker",
      country: member.country,
      city: member.city,
      info: member.info,
    },
  };
}

/** Dispatches to the right flow for the selected sign-in mode. */
export function loginByMode({ email, password, mode }) {
  if (mode === LOGIN_MODE.ADMIN) return loginRequest({ email, password });
  return loginMemberRequest({ email, password, mode });
}
