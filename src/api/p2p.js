import { callSp, getView, getViewAll } from "./http.js";
import { CREATE, DELETE, EXISTING, NEW, SPS, USER_TYPE, VIEWS } from "./config.js";
import { hasId } from "@/lib/utils.js";

/* ------------------------------------------------------------------ helpers */

const bit = (v) => (v ? 1 : 0);
const str = (v) => (v === undefined || v === null ? "" : String(v));
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** "NEW" when creating (id 0), "EXISTING" when updating. */
const mode = (id) => (num(id) > 0 ? EXISTING : NEW);

/**
 * The "next id" views each return a single row with a single differently-named
 * column (NEWCAT / NEWTOPIC / NEWSERVICEID), so read the first value positionally.
 */
async function nextId(viewname) {
  const { data } = await getView(viewname, { page: 1, pagesize: 1 });
  const row = data[0];
  if (!row) return 1;
  const first = Object.values(row)[0];
  return num(first) || 1;
}

/**
 * A successful save answers `{ "message": "2" }` — the message IS the saved
 * row's id. Normalize it so callers can toast "saved (#2)".
 */
function saveResult(body) {
  const message = typeof body === "string" ? body : (body?.message ?? "");
  const id = Number(message);
  return {
    ok: true,
    id: Number.isFinite(id) && id > 0 ? id : null,
    message: String(message),
  };
}

/** Dates go to SQL DATETIME; send yyyy-mm-dd and let the driver widen it. */
function sqlDate(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return str(value);
  return d.toISOString().slice(0, 10);
}

/* -------------------------------------------------------------- categories */

export function normalizeCategory(row) {
  return {
    id: num(row.OM_CATEGORY_NO),
    name: str(row.OM_CATEGORY_NAME),
    active: row.OM_CATEGORY_ACTIVE !== false,
    createdBy: str(row.OM_CATEGORY_CREATED_BY),
    createdAt: row.OM_CATEGORY_CREATED_DATE || null,
  };
}

/** View 1690 — MTVWP2PCATEGORIES */
export async function listCategories({ page, pagesize, ...opts } = {}) {
  if (page) {
    const res = await getView(VIEWS.CATEGORIES, { ...opts, page, pagesize });
    return { ...res, data: res.data.map(normalizeCategory) };
  }
  const { rows, meta } = await getViewAll(VIEWS.CATEGORIES, { ...opts, pagesize });
  return { ...meta, data: rows.map(normalizeCategory), totalRecords: rows.length };
}

/** View 1691 — MTVWNEWP2PCATEGORYID */
export const nextCategoryId = () => nextId(VIEWS.NEW_CATEGORY_ID);

/**
 * SP 1692 — MT_INSERT_P2P_CATEGORIES.
 * Pass id 0 to create; pass the existing id to update.
 */
export async function saveCategory({ id = 0, name, active = true, createdBy }) {
  return saveResult(
    await callSp(SPS.SAVE_CATEGORY, {
      CATEGORYID: num(id),
      CATEGORYNAME: str(name),
      CATEGORYACTIVE: bit(active),
      CATEGORYCREATEDBY: str(createdBy),
      NEWEXISTING: mode(id),
      SUCCESS_STATUS: "",
      ERROR_STATUS: "",
    }),
  );
}

/* ------------------------------------------------------------------ topics */

export function normalizeTopic(row) {
  return {
    id: num(row.TOPICID),
    name: str(row.TOPICNAME),
    categoryId: num(row.CATEGORYNO),
    categoryName: str(row.CATEGORYNAME),
  };
}

/** View 1693 — MTVWP2PTOPICS. Filter by category with { CATEGORYNO: id }. */
export async function listTopics({ page, pagesize, filters, categoryId, ...opts } = {}) {
  const f = { ...filters };
  if (categoryId) f.CATEGORYNO = categoryId;

  if (page) {
    const res = await getView(VIEWS.TOPICS, { ...opts, page, pagesize, filters: f });
    return { ...res, data: res.data.map(normalizeTopic) };
  }
  const { rows, meta } = await getViewAll(VIEWS.TOPICS, { ...opts, pagesize, filters: f });
  return { ...meta, data: rows.map(normalizeTopic), totalRecords: rows.length };
}

/** View 1694 — MTVWNEWP2PTOPICID */
export const nextTopicId = () => nextId(VIEWS.NEW_TOPIC_ID);

/** SP 1695 — MT_INSERT_P2P_TOPIC */
export async function saveTopic({ id = 0, categoryId, name, active = true, createdBy }) {
  return saveResult(
    await callSp(SPS.SAVE_TOPIC, {
      TOPICID: num(id),
      CATEGORYID: num(categoryId),
      TOPICNAME: str(name),
      TOPICCREATEDBY: str(createdBy),
      TOPICACTIVE: bit(active),
      NEWEXISTING: mode(id),
      SUCCESS_STATUS: "",
      ERROR_STATUS: "",
    }),
  );
}

/* ---------------------------------------------------------------- services */

export function normalizeService(row) {
  return {
    id: num(row.OM_SERVICE_ID),
    name: str(row.OM_SERVICE_NAME),
    description: str(row.OM_SERVICE_DESCRIPTION),
    categoryId: num(row.OM_SERVICE_CATEGORY_ID ?? row.OM_CATEGORY_NO),
    categoryName: str(row.OM_CATEGORY_NAME),
    active: row.OM_SERVICE_ACTIVE !== false,
    createdBy: str(row.OM_SERVICE_CREATED_BY),
    createdAt: row.OM_SERVICE_CREATED_DATE || null,
  };
}

/** View 1696 — MTVWP2PSERVICES */
export async function listServices({ page, pagesize, filters, categoryId, ...opts } = {}) {
  const f = { ...filters };
  if (categoryId) f.OM_SERVICE_CATEGORY_ID = categoryId;

  if (page) {
    const res = await getView(VIEWS.SERVICES, { ...opts, page, pagesize, filters: f });
    return { ...res, data: res.data.map(normalizeService) };
  }
  const { rows, meta } = await getViewAll(VIEWS.SERVICES, { ...opts, pagesize, filters: f });
  return { ...meta, data: rows.map(normalizeService), totalRecords: rows.length };
}

/** View 1697 — MTVWNEWP2PSERVICEID */
export const nextServiceId = () => nextId(VIEWS.NEW_SERVICE_ID);

/** SP 1698 — MT_INSERT_P2P_SERVICE */
export async function saveService({
  id = 0,
  categoryId,
  name,
  description = "",
  active = true,
  createdBy,
}) {
  return saveResult(
    await callSp(SPS.SAVE_SERVICE, {
      SERVICEID: num(id),
      CATEGORYID: num(categoryId),
      SERVICENAME: str(name),
      SERVICEDESCRIPTION: str(description),
      SERVICECREATEDBY: str(createdBy),
      SERVICEACTIVE: bit(active),
      NEWEXISTING: mode(id),
      SUCCESS_STATUS: "",
      ERROR_STATUS: "",
    }),
  );
}

/* ------------------------------------------------------------------- users */

/**
 * Column names verified against live rows on view 1699. Note the filter column
 * is OM_USER_SEEKER_GUIDANCE_ALL — *singular* "SEEKER", unlike the spec sheet
 * which writes OM_USER_SEEKERS_GUIDANCE_ALL. The plural spelling 501s.
 */
export function normalizeUser(row) {
  return {
    id: num(row.OM_USER_REG_NO),
    name: str(row.OM_USER_NAME),
    email: str(row.OM_USER_EMAIL),
    type: str(row.OM_USER_SEEKER_GUIDANCE_ALL).toUpperCase(),
    country: str(row.OM_USER_COUNTRY),
    city: str(row.OM_USER_CITY),
    info: str(row.OM_USER_PERSONAL_INFORMATION),
    // Added to the view by the backend on 2026-07-28.
    dob: row.OM_USER_DOB || null,
    registeredAt: row.OM_USER_REGISTRATION_DATE || null,
    expiresAt: row.OM_USER_EXPIRY_DATE || null,
    active: row.OM_USER_ACTIVE !== false,
    raw: row,
  };
}

/** View 1699 — MTVWUSERMASTER, optionally narrowed to one user type. */
export async function listUsers({ type, page, pagesize, filters, ...opts } = {}) {
  const f = { ...filters };
  if (type) f.OM_USER_SEEKER_GUIDANCE_ALL = type;

  if (page) {
    const res = await getView(VIEWS.USERS, { ...opts, page, pagesize, filters: f });
    return { ...res, data: res.data.map(normalizeUser) };
  }
  const { rows, meta } = await getViewAll(VIEWS.USERS, { ...opts, pagesize, filters: f });
  return { ...meta, data: rows.map(normalizeUser), totalRecords: rows.length };
}

/**
 * Confirm a member's current password before letting them change it.
 *
 * Matched server-side: view 1699 only returns the row when the email and
 * password both match, the same mechanism the member sign-in uses.
 */
export async function verifyUserPassword(email, password) {
  if (!email || !password) return false;
  const res = await listUsers({
    page: 1,
    pagesize: 1,
    filters: {
      OM_USER_EMAIL: String(email).trim(),
      OM_USER_PASSWORD: password,
    },
  });
  return res.data.length > 0;
}

/** Read a single member back by registration number (used to verify a save). */
export async function getUserByRegNo(regNo) {
  const res = await listUsers({
    page: 1,
    pagesize: 1,
    filters: { OM_USER_REG_NO: regNo },
  });
  return res.data[0] || null;
}

/**
 * Fields that MT_INSERT_USER_MASTER accepts but which never come back.
 *
 * Re-verified after the backend's 2026-07-28 fix: date of birth and registration
 * date now both save and read back. USERACTIVE still does not — sending 0 or
 * false stores true, on insert and on update alike. MT_INSERT_P2P_CATEGORIES
 * stores CATEGORYACTIVE=0 correctly, so this is the user SP, not the platform.
 */
export const USER_FIELDS_NOT_STORED = [
  { field: "active", why: "OM_USER_ACTIVE always comes back true" },
];

/** Compare what was sent against what the view returns. */
export function diffSavedUser(sent, saved) {
  if (!saved) return { missing: [], notReadBack: [], noRow: true };
  const checks = [
    ["name", sent.name, saved.name],
    ["email", sent.email, saved.email],
    ["userType", String(sent.userType || "").toUpperCase(), saved.type],
    ["country", sent.country, saved.country],
    ["city", sent.city, saved.city],
    ["personalInformation", sent.personalInformation, saved.info],
  ];
  return {
    noRow: false,
    notReadBack: checks
      .filter(([, a, b]) => str(a).trim() !== str(b).trim())
      .map(([field]) => field),
  };
}

/* ------------------------------------------------- user areas of interest */

/**
 * View 1703 — MTVWP2PUSERAREASOFINTERESTS.
 *
 * NOTE: the id column is `AREAOFINTERESTID`, which holds the CATEGORY id here
 * (and the TOPIC id on view 1704 — same column name, different meaning).
 */
export function normalizeUserCategory(row) {
  return {
    userId: num(row.USERID),
    userName: str(row.USERNAME),
    userType: str(row.OM_USER_SEEKER_GUIDANCE_ALL).toUpperCase(),
    categoryId: num(row.AREAOFINTERESTID),
    categoryName: str(row.OM_CATEGORY_NAME),
  };
}

export async function listUserCategories({ userId, page, pagesize, filters, ...opts } = {}) {
  const f = { ...filters };
  if (hasId(userId)) f.USERID = userId;

  if (page) {
    const res = await getView(VIEWS.USER_CATEGORIES, { ...opts, page, pagesize, filters: f });
    return { ...res, data: res.data.map(normalizeUserCategory) };
  }
  const { rows, meta } = await getViewAll(VIEWS.USER_CATEGORIES, {
    ...opts,
    pagesize,
    filters: f,
  });
  return { ...meta, data: rows.map(normalizeUserCategory), totalRecords: rows.length };
}

/**
 * SP 1702 — MT_INSERT_DELETE_USER_CATEGORIES. One endpoint for both directions.
 *
 * WARNING: CREATE does not de-duplicate — sending the same (user, category)
 * pair twice inserts two rows. Check the current set before adding. A single
 * DELETE does clear all duplicates of a pair.
 */
export async function saveUserCategory({ userId, categoryId, action = CREATE }) {
  return saveResult(
    await callSp(SPS.USER_CATEGORY, {
      USERID: num(userId),
      CATEGORYID: num(categoryId),
      CREATEDELETE: action === DELETE ? DELETE : CREATE,
      SUCCESS_STATUS: "",
      ERROR_STATUS: "",
    }),
  );
}

export const addUserCategory = (userId, categoryId) =>
  saveUserCategory({ userId, categoryId, action: CREATE });
export const removeUserCategory = (userId, categoryId) =>
  saveUserCategory({ userId, categoryId, action: DELETE });

/* ------------------------------------------------ user topics of interest */

/** View 1704 — MTVWP2PUSERTOPICSOFINTERESTS. `AREAOFINTERESTID` is the topic id. */
export function normalizeUserTopic(row) {
  return {
    userId: num(row.USERID),
    userName: str(row.USERNAME),
    userType: str(row.OM_USER_SEEKER_GUIDANCE_ALL).toUpperCase(),
    topicId: num(row.AREAOFINTERESTID),
    topicName: str(row.TOPICNAME),
    categoryId: num(row.CATEGORYNO),
    categoryName: str(row.CATEGORYNAME),
  };
}

export async function listUserTopics({ userId, page, pagesize, filters, ...opts } = {}) {
  const f = { ...filters };
  if (hasId(userId)) f.USERID = userId;

  if (page) {
    const res = await getView(VIEWS.USER_TOPICS, { ...opts, page, pagesize, filters: f });
    return { ...res, data: res.data.map(normalizeUserTopic) };
  }
  const { rows, meta } = await getViewAll(VIEWS.USER_TOPICS, {
    ...opts,
    pagesize,
    filters: f,
  });
  return { ...meta, data: rows.map(normalizeUserTopic), totalRecords: rows.length };
}

/** SP 1705 — MT_INSERT_DELETE_USER_TOPICS. Same duplicate caveat as 1702. */
export async function saveUserTopic({ userId, topicId, action = CREATE }) {
  return saveResult(
    await callSp(SPS.USER_TOPIC, {
      USERID: num(userId),
      TOPICID: num(topicId),
      CREATEDELETE: action === DELETE ? DELETE : CREATE,
      SUCCESS_STATUS: "",
      ERROR_STATUS: "",
    }),
  );
}

export const addUserTopic = (userId, topicId) =>
  saveUserTopic({ userId, topicId, action: CREATE });
export const removeUserTopic = (userId, topicId) =>
  saveUserTopic({ userId, topicId, action: DELETE });

export const listSeekers = (opts) => listUsers({ ...opts, type: USER_TYPE.SEEKER });
export const listOfferers = (opts) => listUsers({ ...opts, type: USER_TYPE.OFFERER });

/**
 * SP 1701 — MT_INSERT_USER_MASTER.
 *
 * NOTE: the spec sheet declares @NEWEXISTING as BIT here, but the deployed SP
 * behaves like the other three and wants the "NEW" / "EXISTING" strings.
 * Verified live: sending 1 or 0 returns 201 but silently upserts reg no 0 over
 * and over; sending "NEW" inserts a fresh row and returns its new id.
 */
export async function saveUser({
  regNo = 0,
  name,
  email,
  password,
  userType = USER_TYPE.SEEKER,
  country = "",
  city = "",
  personalInformation = "",
  registrationDate = "",
  dob = "",
  active = true,
}) {
  return saveResult(
    await callSp(SPS.SAVE_USER, {
      USERREGNO: num(regNo),
      USERNAME: str(name),
      USEREMAIL: str(email),
      USERPASSWORD: str(password),
      USERSEEKERGUIDANCEALL: str(userType).toUpperCase(),
      USERCOUNTRY: str(country),
      USERCITY: str(city),
      USERPERSONALINFORMATION: str(personalInformation),
      // Added by the backend on 2026-07-28. Required — omitting it 501s.
      USERREGISTRATIONDATE: sqlDate(registrationDate || new Date()),
      USERDOB: sqlDate(dob),
      USERACTIVE: bit(active),
      NEWEXISTING: mode(regNo),
      SUCCESS_STATUS: "",
      ERROR_STATUS: "",
    }),
  );
}
