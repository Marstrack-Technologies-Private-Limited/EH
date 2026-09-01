// tech23 backend configuration for the PEER TO PEER module.
//
// Every read goes through one endpoint (globalViewHandlerPagination) and every
// write through one endpoint (globalSpHandler) — the object ID below selects
// which view / stored procedure runs.

export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://devapi.tech23.net";

export const MODULE_NAME = "PEER TO PEER";

/**
 * File upload — the one endpoint the platform exposes for this.
 *
 * Note it lives on api.tech23.net, NOT devapi: there is no dev equivalent. The
 * same endpoint is used by the WORKSHOP module (BreakdownLogin, TruckInspection,
 * EmployeeMasterCreation), so the contract is well established:
 *
 *  - multipart POST, the file in a field named exactly `imageValue`
 *  - `session-token` header (verified optional, sent anyway to match the module)
 *  - do NOT set content-type — the browser must add the multipart boundary
 *  - answers 201 with the S3 URL as a **plain string**, not JSON
 *
 * Verified 2026-09-02: despite the name it accepts any file type, not just
 * images — .txt and .pdf both uploaded and read back byte-for-byte — and the
 * returned URL is publicly readable with no token.
 */
export const FILE_UPLOAD_URL =
  import.meta.env.VITE_FILE_UPLOAD_URL ||
  "https://api.tech23.net/fileupload/uploadImage";

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
  SEEKS: 1818, // VIEW SEEKS CARRIED OUT BY SEEKER
  NEW_SEEK_NO: 1819, // SEEK NUMBER AUTO GENERATED
  SEEK_DETAILS: 1820, // VIEW SEEK ASSISTANCE DETAILS
  SEEK_DOCUMENTS: 1824, // MTVWSEEKASSISTANCEDOCUMENTS
  SEEK_IMAGES: 1825, // MTVWSEEKASSISTANCEIMAGES
};

/**
 * Attachment views. Both carry
 * { OT_SEEK_ASSISTANCE_ID, OT_SEEK_DOCUMENT, OT_SEEK_CREATED_DATE }, where the
 * created date is select-only — filtering on it 501s.
 *
 * ⚠️ **1825 is never populated.** SP 1827 (the image insert) answers 201 but
 * writes its row into the documents table behind 1824; verified twice with
 * distinct images, 1825 stayed at 0 rows. Until that is fixed both views must
 * be read and merged, which `listSeekAttachments` does — that keeps working
 * either way once the backend points 1827 at the right table.
 */

/** Stored procedures — write via globalSpHandler?spname=<id> */
export const SPS = {
  SAVE_CATEGORY: 1692, // MT_INSERT_P2P_CATEGORIES
  SAVE_TOPIC: 1695, // MT_INSERT_P2P_TOPIC
  SAVE_SERVICE: 1698, // MT_INSERT_P2P_SERVICE
  SAVE_USER: 1701, // MT_INSERT_USER_MASTER
  USER_CATEGORY: 1702, // MT_INSERT_DELETE_USER_CATEGORIES
  USER_TOPIC: 1705, // MT_INSERT_DELETE_USER_TOPICS
  SAVE_SEEK: 1821, // MT_INSERT_SEEKER_HEADER
  SAVE_SEEK_DETAIL: 1822, // MT_INSERT_SEEKER_DETAILS
  DELETE_SEEK_DETAIL: 1823, // MT_DELETE_SEEKER_DETAILS
  SAVE_SEEK_DOCUMENT: 1826, // MT_INSERT_SEEKER_DOCUMENT_ATTACHMENT
  SAVE_SEEK_IMAGE: 1827, // MT_INSERT_SEEKER_IMAGE_ATTACHMENT
  DELETE_SEEK_DOCUMENT: 1828, // MT_DELETE_SEEKER_DOCUMENT_ATTACHMENT — see below
  DELETE_SEEK_IMAGE: 1829, // MT_DELETE_SEEKER_IMAGE_ATTACHMENT — see below
};

/**
 * Neither attachment delete is usable yet, so nothing calls them:
 *
 *  - **1828** 501s on every parameter set tried, including the shape its insert
 *    twin 1826 accepts. Its declared parameters have not been published.
 *  - **1829** answers 201 but removes nothing — it targets the images table,
 *    which is empty because 1827 writes to the documents one.
 *
 * They are declared so the ids stay in one place. Remove this note when the
 * backend confirms 1828's parameters and repoints 1827/1829.
 */

/**
 * @OT_SEEKER_URGENCY_OF_HELP — the four values the spec fixes for this dropdown.
 * The column is VARCHAR and stores the label verbatim, so send these strings.
 */
export const URGENCY_OPTIONS = ["Critical", "Semi urgent", "Moderate", "Can wait"];

/** @OT_SEEKER_REQUIRED_TO_BE_CONTACTED_PREFERRED_WEEK_DAY — days of the week. */
export const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

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
