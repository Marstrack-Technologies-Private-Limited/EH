// tech23 backend configuration for the PEER TO PEER module.
//
// Every read goes through one endpoint (globalViewHandlerPagination) and every
// write through one endpoint (globalSpHandler) — the object ID below selects
// which view / stored procedure runs.

export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://devapi.tech23.net";

export const MODULE_NAME = "PEER TO PEER";

/** Views — read via globalViewHandlerPagination?viewname=<id> */
export const VIEWS = {
  CATEGORIES: 1690, // MTVWP2PCATEGORIES
  NEW_CATEGORY_ID: 1691, // MTVWNEWP2PCATEGORYID
  TOPICS: 1693, // MTVWP2PTOPICS
  NEW_TOPIC_ID: 1694, // MTVWNEWP2PTOPICID
  SERVICES: 1696, // MTVWP2PSERVICES
  NEW_SERVICE_ID: 1697, // MTVWNEWP2PSERVICEID
  USERS: 1699, // MTVWUSERMASTER — seekers + offerers
  USER_CATEGORIES: 1703, // MTVWP2PUSERAREASOFINTERESTS
  USER_TOPICS: 1704, // MTVWP2PUSERTOPICSOFINTERESTS
};

/** Stored procedures — write via globalSpHandler?spname=<id> */
export const SPS = {
  SAVE_CATEGORY: 1692, // MT_INSERT_P2P_CATEGORIES
  SAVE_TOPIC: 1695, // MT_INSERT_P2P_TOPIC
  SAVE_SERVICE: 1698, // MT_INSERT_P2P_SERVICE
  SAVE_USER: 1701, // MT_INSERT_USER_MASTER
  USER_CATEGORY: 1702, // MT_INSERT_DELETE_USER_CATEGORIES
  USER_TOPIC: 1705, // MT_INSERT_DELETE_USER_TOPICS
};

/** @NEWEXISTING discriminator — "NEW" creates (id 0), "EXISTING" updates. */
export const NEW = "NEW";
export const EXISTING = "EXISTING";

/** @CREATEDELETE discriminator on SPs 1702 / 1705 — one endpoint does both. */
export const CREATE = "CREATE";
export const DELETE = "DELETE";

/** OM_USER_SEEKER_GUIDANCE_ALL values (note: singular "SEEKER" in the column). */
export const USER_TYPE = {
  SEEKER: "SEEKER",
  OFFERER: "OFFERER",
  ALL: "ALL",
};

/** The three sign-in modes offered on the login screen. */
export const LOGIN_MODE = {
  SEEKER: "SEEKER",
  OFFERER: "OFFERER",
  ADMIN: "ADMIN",
};

/**
 * Module service account. Seekers and offerers are not /cpanel/login users —
 * they live in MTVWUSERMASTER — so the app needs a session before it can look
 * them up.
 *
 * Only used as a fallback now: SERVICE_TOKENS below is the normal path.
 */
export const SERVICE_ACCOUNT = {
  email: import.meta.env.VITE_SERVICE_EMAIL || "siddique@gbsafrica.net",
  password: import.meta.env.VITE_SERVICE_PASSWORD || "siddique",
};

/**
 * Pre-issued module tokens.
 *
 * These are long-lived on dev and don't rotate, so a seeker or offerer signing
 * in uses them directly instead of calling /cpanel/login first — that removes
 * one network round-trip from every member sign-in and every public page that
 * needs to read the taxonomy.
 *
 * If the backend ever does rotate them, a 401/403 makes the app fall back to a
 * real /cpanel/login once and carry on (see ensureServiceSession in auth.js),
 * so a stale value here degrades rather than breaks.
 *
 * Override per environment with VITE_AUTH_TOKEN / VITE_SESSION_TOKEN.
 */
export const SERVICE_TOKENS = {
  authToken:
    import.meta.env.VITE_AUTH_TOKEN ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImVtYWlsIjoic2lkZGlxdWVAZ2JzYWZyaWNhLm5ldCJ9LCJpYXQiOjE3ODUyNzA2Njh9.g2kHwIwfNWJeApEDwqAkRdzAgVzsCXNd95l0z_167Ro",
  sessionToken:
    import.meta.env.VITE_SESSION_TOKEN ||
    "NDRiYmI4OTQzZWJkOGIzYmQxNjFkMjBiZWEwNTM2MWU6Yzk1MzAxMDVjYmI0MjliZTRkNGE0ZDNkYjk2ZWY0OGEvNDRiYmI4OTQzZWJkOGIzYmQxNjFkMjBiZWEwNTM2MWU6NjRjMjRmYzgyNGM4NmE2YzExMzhiODNjZGYxNWE0OTcvNDRiYmI4OTQzZWJkOGIzYmQxNjFkMjBiZWEwNTM2MWU6ZThhNzFlMzVhMjZiYWFjOTQzZGY0ZTNlNzI2MGRjYjIvNDRiYmI4OTQzZWJkOGIzYmQxNjFkMjBiZWEwNTM2MWU6ZDc5Y2ViNDY4ZDdlMDRiNzI4OGEzOGQzOGZjZGY2MDI=",
};

export const DEFAULT_PAGE_SIZE = 100;
