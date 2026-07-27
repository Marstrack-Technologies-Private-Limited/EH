import { BASE_URL } from "./config.js";

/**
 * Token holder. The redux auth slice pushes tokens in here (see store/index.js)
 * so the fetch layer can read them without importing the store — that would
 * create a cycle, since thunks in the store import this module.
 */
let tokens = { authToken: null, sessionToken: null };
let onUnauthorized = null;

export function setAuthTokens(next) {
  tokens = {
    authToken: next?.authToken ?? null,
    sessionToken: next?.sessionToken ?? null,
  };
}

export function getAuthTokens() {
  return tokens;
}

/** Registered by the app so a 401/403 anywhere can force a logout. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  constructor(message, { status, objectId, body } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.objectId = objectId;
    this.body = body;
  }
}

function authHeaders() {
  const h = {};
  if (tokens.authToken) h["auth-token"] = tokens.authToken;
  if (tokens.sessionToken) h["session-token"] = tokens.sessionToken;
  return h;
}

async function parse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Pull the most useful message out of the backend's error envelope, which
 * looks like { message, error, err } and is often the same string three times.
 */
function messageFrom(body, fallback) {
  if (!body) return fallback;
  if (typeof body === "string") return body.trim() || fallback;
  const msg = body.ERROR_STATUS || body.error || body.message || body.err;
  return (typeof msg === "string" && msg.trim()) || fallback;
}

async function request(path, { method = "GET", body, objectId, kind } = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        accept: "application/json, text/plain, */*",
        ...(body ? { "content-type": "application/json" } : {}),
        ...authHeaders(),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(
      "Network error — could not reach the server. Check your connection.",
      { objectId },
    );
  }

  const parsed = await parse(res);

  if (res.status === 401 || res.status === 403) {
    onUnauthorized?.();
    throw new ApiError("Your session has expired. Please sign in again.", {
      status: res.status,
      objectId,
      body: parsed,
    });
  }

  if (!res.ok) {
    // 501 has two distinct causes, both worth naming precisely:
    //  - on an SP, the posted keys don't match the declared parameters exactly
    //    (one extra or one missing key is enough)
    //  - on a view, a filter names a column that view doesn't have
    let detail = objectId ? ` (object ${objectId})` : "";
    if (res.status === 501 && objectId) {
      detail =
        kind === "view"
          ? ` (view ${objectId} — a filter is naming a column this view does not have)`
          : ` (SP ${objectId} — send exactly the declared parameters, no more and no fewer, including SUCCESS_STATUS and ERROR_STATUS)`;
    }
    throw new ApiError(
      messageFrom(parsed, `Request failed with status ${res.status}`) + detail,
      { status: res.status, objectId, body: parsed },
    );
  }

  return parsed;
}

/**
 * Paginated read of a database view.
 *
 * @param {number} viewname  object ID of the view
 * @param {object} opts      page, pagesize, and any column=value filters
 * @returns {Promise<{data: object[], page, pagesize, totalRecords, totalPages, dataCount}>}
 */
export async function getView(
  viewname,
  {
    page = 1,
    pagesize = 100,
    filters = {},
    orderBy,
    sortDir = "ASC",
    searchAny,
    distinctColumns,
  } = {},
) {
  const qs = new URLSearchParams({
    page: String(page),
    pagesize: String(pagesize),
    viewname: String(viewname),
  });

  // Sorting: `orderby` names the column, `sortby` gives the direction. Both are
  // server-side — `sortby` is NOT a column, which is easy to misread.
  if (orderBy) {
    qs.append("orderby", orderBy);
    qs.append("sortby", String(sortDir).toUpperCase() === "ASC" ? "ASC" : "DESC");
  }

  // Contains-search across several columns. `searchcolumnN`/`searchtextN` would
  // AND the columns together, which is wrong for "match any of these" — an OR
  // group gives ([A] LIKE %q% OR [B] LIKE %q%). Max 4 groups × 6 members.
  if (searchAny?.text && searchAny.columns?.length) {
    searchAny.columns.slice(0, 6).forEach((col, i) => {
      const m = i + 1;
      qs.append(`orgroup1col${m}`, col);
      qs.append(`orgroup1op${m}`, "like");
      qs.append(`orgroup1val${m}`, searchAny.text);
    });
  }

  // Unique values for filter dropdowns, returned in THIS response (max 8) and
  // narrowed by whatever filters are active.
  if (distinctColumns?.length) {
    distinctColumns.slice(0, 8).forEach((col, i) => {
      qs.append(`distinctColumn${i + 1}`, col);
    });
  }

  // Column filters are plain query params, e.g. &OM_CATEGORY_NO=1
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
  }

  const body = await request(`/global/globalViewHandlerPagination?${qs}`, {
    objectId: viewname,
    kind: "view",
  });

  return {
    data: Array.isArray(body?.data) ? body.data : [],
    page: body?.page ?? page,
    pagesize: body?.pagesize ?? pagesize,
    totalRecords: body?.totalRecords ?? 0,
    totalPages: body?.totalPages ?? 0,
    dataCount: body?.dataCount ?? 0,
    distinctValues: body?.distinctValues ?? null,
  };
}

/** Read every page of a view and return the flattened rows. */
export async function getViewAll(viewname, opts = {}) {
  const { pagesize = 100 } = opts;
  const first = await getView(viewname, { ...opts, page: 1, pagesize });
  if (first.totalPages <= 1) return { rows: first.data, meta: first };

  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, i) =>
      getView(viewname, { ...opts, page: i + 2, pagesize }),
    ),
  );
  return {
    rows: rest.reduce((acc, r) => acc.concat(r.data), first.data),
    meta: first,
  };
}

/**
 * Execute a stored procedure.
 *
 * The handler matches the posted keys against the SP's declared parameters —
 * a missing OR extra key returns 501, so callers must send the exact set.
 */
export async function callSp(spname, params) {
  return request(`/global/globalSpHandler?spname=${spname}`, {
    method: "POST",
    body: params,
    objectId: spname,
    kind: "sp",
  });
}

export { request };
