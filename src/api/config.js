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
};

/** Stored procedures — write via globalSpHandler?spname=<id> */
export const SPS = {
  SAVE_CATEGORY: 1692, // MT_INSERT_P2P_CATEGORIES
  SAVE_TOPIC: 1695, // MT_INSERT_P2P_TOPIC
  SAVE_SERVICE: 1698, // MT_INSERT_P2P_SERVICE
  SAVE_USER: 1701, // MT_INSERT_USER_MASTER
};

/** @NEWEXISTING discriminator — "NEW" creates (id 0), "EXISTING" updates. */
export const NEW = "NEW";
export const EXISTING = "EXISTING";

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
 * them up. This bootstraps one.
 */
export const SERVICE_ACCOUNT = {
  email: import.meta.env.VITE_SERVICE_EMAIL || "siddique@gbsafrica.net",
  password: import.meta.env.VITE_SERVICE_PASSWORD || "siddique",
};

export const DEFAULT_PAGE_SIZE = 100;
