import { callSp, getView, getViewAll } from "./http.js";
import {
  CREATE,
  DELETE,
  EXISTING,
  NEW,
  RATING_MAX,
  RATING_MIN,
  RESPONSE_DECISION,
  SPS,
  USER_TYPE,
  VIEWS,
} from "./config.js";
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

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Read a SQL DATETIME back as the wall-clock time that was stored.
 *
 * The API serialises DATETIME as `2026-09-02T17:00:00.000Z`. That trailing `Z`
 * is a lie — these columns hold plain wall-clock values with no zone attached —
 * but `new Date()` believes it and re-renders the value shifted by the viewer's
 * offset, so a seek saved at 17:00 displayed as 22:30 in UTC+5:30.
 *
 * So take the literal Y-M-D H:M:S out of the string and build a local Date from
 * the parts. 17:00 in, 17:00 out, on every machine.
 */
const SQL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;

function fromSql(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const m = SQL_DATETIME.exec(String(value));
  if (!m) {
    const loose = new Date(value);
    return Number.isNaN(loose.getTime()) ? null : loose;
  }
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
}

/**
 * Dates go to SQL DATETIME; send yyyy-mm-dd and let the driver widen it.
 *
 * Built from local parts rather than toISOString(), which converts to UTC and
 * can land the write on the wrong calendar day either side of midnight.
 */
function sqlDate(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : fromSql(value);
  if (!d) return str(value);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Same, but keeping the clock — "yyyy-mm-dd hh:mm:ss".
 *
 * The seek SP has three DATETIME parameters where the time part is the point
 * (_TIME, and the preferred contact time), so sqlDate would flatten them to
 * midnight. Verified accepted by SP 1821 and read back intact from view 1818.
 */
function sqlDateTime(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : fromSql(value);
  if (!d) return str(value);
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

/* -------------------------------------------------------------- categories */

export function normalizeCategory(row) {
  return {
    id: num(row.OM_CATEGORY_NO),
    name: str(row.OM_CATEGORY_NAME),
    active: row.OM_CATEGORY_ACTIVE !== false,
    createdBy: str(row.OM_CATEGORY_CREATED_BY),
    createdAt: fromSql(row.OM_CATEGORY_CREATED_DATE),
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
    createdAt: fromSql(row.OM_SERVICE_CREATED_DATE),
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
    dob: fromSql(row.OM_USER_DOB),
    registeredAt: fromSql(row.OM_USER_REGISTRATION_DATE),
    expiresAt: fromSql(row.OM_USER_EXPIRY_DATE),
    active: row.OM_USER_ACTIVE !== false,
    // Added 2026-10-30; saved by SP 1701 (OM_-prefixed parameters).
    displayName: str(row.OM_USER_DISPLAY_NAME),
    photo: str(row.OM_USER_PHOTO),
    // `avatar` is what UserAvatar reads — a stored photo shows up everywhere.
    avatar: str(row.OM_USER_PHOTO) || undefined,
    privacyLevel: str(row.OM_USER_PRIVACY_LEVEL),
    emailVerified: isTrue(row.OM_USER_EMAIL_VERIFIED),
    phoneVerified: isTrue(row.OM_USER_PHONE_VERIFIED),
    raw: row,
  };
}

/** BIT columns arrive as true/false, but tolerate 1/"1" in case the type changes. */
const isTrue = (v) => v === true || v === 1 || v === "1";

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
 *
 * 2026-10-30: five profile fields were added, and these parameters are
 * OM_-prefixed unlike the rest. The old 15-key set now 501s. Round-trip
 * verified on reg no 13: all five store and read back on view 1699.
 *
 * An update overwrites every column, so a caller that does not pass one of the
 * new fields (left `undefined`) keeps the stored value — otherwise every
 * profile edit would wipe the photo and reset the verified flags.
 */
const PROFILE_EXTRAS = ["displayName", "photo", "privacyLevel", "emailVerified", "phoneVerified"];

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
  ...extras
}) {
  let current = null;
  if (num(regNo) > 0 && PROFILE_EXTRAS.some((k) => extras[k] === undefined)) {
    current = await getUserByRegNo(regNo);
  }
  const pick = (k, fallback) => (extras[k] !== undefined ? extras[k] : (current?.[k] ?? fallback));

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
      OM_USER_DISPLAY_NAME: str(pick("displayName", "")).slice(0, 100),
      OM_USER_PHOTO: str(pick("photo", "")),
      OM_USER_PRIVACY_LEVEL: str(pick("privacyLevel", "")).slice(0, 100),
      OM_USER_EMAIL_VERIFIED: bit(pick("emailVerified", false)),
      OM_USER_PHONE_VERIFIED: bit(pick("phoneVerified", false)),
      NEWEXISTING: mode(regNo),
      SUCCESS_STATUS: "",
      ERROR_STATUS: "",
    }),
  );
}

/* ------------------------------------------------------- seek assistance */

/**
 * SQL Server's DATETIME epoch, which is what an empty string becomes.
 *
 * SP 1821 accepts "" for its DATETIME parameters and answers 201, but stores
 * 1900-01-01 rather than NULL — so an unanswered "preferred time" reads back as
 * a real date and would render as one. Treat the epoch as "not set".
 */
const SQL_EPOCH = "1900-01-01";

function dateOrNull(value) {
  if (!value) return null;
  if (String(value).startsWith(SQL_EPOCH)) return null;
  // fromSql, not the raw string: these render as wall-clock, never shifted.
  return fromSql(value);
}

/**
 * View 1818 — VIEW SEEKS CARRIED OUT BY SEEKER.
 *
 * Two columns exist that SP 1821 has no parameter for, so they are always null
 * on a row this app wrote:
 *
 *  - OT_SEEK_ASSISTANCE_SEEKER_ID — distinct from OT_SEEKER_ID, purpose unknown
 *  - OT_SEEKER_ASSISTANCE_SUCCESS_FAILURE / _CLOSED / _CLOSED_DATE — these need
 *    a close/resolve SP that has not been issued
 *
 * OT_SEEKER_ID is the seeker's account-holder id (their OM_USER_REG_NO).
 */
export function normalizeSeek(row) {
  return {
    id: num(row.OT_SEEK_ASSISTANCE_ID),
    seekerId: num(row.OT_SEEKER_ID),
    categoryId: num(row.OT_SEEKER_CATEGORY_ID),
    narration: str(row.OT_SEEKER_NARRATION),
    urgency: str(row.OT_SEEKER_URGENCY_OF_HELP),
    raisedOn: dateOrNull(row.OT_SEEK_ASSISTANCE_DATE),
    raisedAt: dateOrNull(row.OT_SEEK_ASSISTANCE_TIME),
    byEmail: row.OT_SEEKER_REQUIRED_TO_BE_CONTACTED_ON_EMAIL === true,
    byWhatsapp: row.OT_SEEKER_REQUIRED_TO_BE_CONTACTED_ON_WHATSAPP === true,
    callOn: str(row.OT_SEEKER_REQUIRED_TO_BE_CONTACTED_ON_CALL),
    preferredTime: dateOrNull(row.OT_SEEKER_REQUIRED_TO_BE_CONTACTED_PREFERRED_TIME),
    preferredWeekDay: str(row.OT_SEEKER_REQUIRED_TO_BE_CONTACTED_PREFERRED_WEEK_DAY),
    // Set by a closing SP that does not exist yet — null on everything we write.
    outcome: str(row.OT_SEEKER_ASSISTANCE_SUCCESS_FAILURE),
    closed: str(row.OT_SEEKER_ASSISTANCE_CLOSED),
    closedAt: dateOrNull(row.OT_SEEKER_ASSISTANCE_CLOSED_DATE),
    raw: row,
  };
}

/** View 1818, optionally narrowed to one seeker's own seeks. */
export async function listSeeks({ seekerId, page, pagesize, filters, ...opts } = {}) {
  const f = { ...filters };
  if (hasId(seekerId)) f.OT_SEEKER_ID = seekerId;

  if (page) {
    const res = await getView(VIEWS.SEEKS, { ...opts, page, pagesize, filters: f });
    return { ...res, data: res.data.map(normalizeSeek) };
  }
  const { rows, meta } = await getViewAll(VIEWS.SEEKS, { ...opts, pagesize, filters: f });
  return { ...meta, data: rows.map(normalizeSeek), totalRecords: rows.length };
}

/**
 * View 1819 — the number the next seek will be given.
 *
 * Read it *before* saving: unlike the other four SPs, 1821 answers
 * `{"message":"Document Saved"}` rather than the new id, so this is the only
 * way to show the seeker their ticket number. Verified: 1819 reads 1, the
 * insert lands as id 1, and 1819 then reads 2.
 */
export const nextSeekNo = () => nextId(VIEWS.NEW_SEEK_NO);

/**
 * SP 1821 — saves the seek assistance *header*.
 *
 * Traps confirmed live, all of which differ from the other SPs in this module:
 *
 *  - Parameter names carry the `OT_` prefix, exactly as declared. The
 *    unprefixed style used by 1692/1695/1698/1701 returns 501 here.
 *  - The set is exact: one missing or one extra key is a 501. SUCCESS_STATUS
 *    and ERROR_STATUS are required, as empty strings, like the others.
 *  - There is no foreign-key check. A nonexistent OT_SEEKER_ID saves happily,
 *    so the caller must pass a registration number it has actually resolved.
 *
 * BIT round-trips correctly both ways here, unlike USERACTIVE on SP 1701.
 */
export async function saveSeek({
  id = 0,
  seekerId,
  categoryId,
  narration,
  urgency,
  raisedOn = "",
  raisedAt = "",
  byEmail = false,
  byWhatsapp = false,
  callOn = "",
  preferredTime = "",
  preferredWeekDay = "",
}) {
  const now = new Date();
  // The ticket number has to be read before the write, so a create knows what
  // to report back; an update already knows its own id.
  const seekNo = num(id) > 0 ? num(id) : await nextSeekNo();

  const res = saveResult(
    await callSp(SPS.SAVE_SEEK, {
      OT_SEEK_ASSISTANCE_ID: num(id),
      OT_SEEK_ASSISTANCE_DATE: sqlDate(raisedOn || now),
      OT_SEEK_ASSISTANCE_TIME: sqlDateTime(raisedAt || now),
      OT_SEEKER_ID: num(seekerId),
      OT_SEEKER_CATEGORY_ID: num(categoryId),
      OT_SEEKER_NARRATION: str(narration),
      OT_SEEKER_URGENCY_OF_HELP: str(urgency),
      OT_SEEKER_REQUIRED_TO_BE_CONTACTED_ON_EMAIL: bit(byEmail),
      OT_SEEKER_REQUIRED_TO_BE_CONTACTED_ON_WHATSAPP: bit(byWhatsapp),
      OT_SEEKER_REQUIRED_TO_BE_CONTACTED_ON_CALL: str(callOn),
      OT_SEEKER_REQUIRED_TO_BE_CONTACTED_PREFERRED_TIME: sqlDateTime(preferredTime),
      OT_SEEKER_REQUIRED_TO_BE_CONTACTED_PREFERRED_WEEK_DAY: str(preferredWeekDay),
      NEWEXISTING: mode(id),
      SUCCESS_STATUS: "",
      ERROR_STATUS: "",
    }),
  );

  // saveResult reads the id out of the message, which 1821 does not return.
  return { ...res, id: seekNo };
}

/* ------------------------------------------------ seek assistance details */

/**
 * View 1820 — the "problems reported" text attached to a seek.
 *
 * Watch the naming: the SP parameter is OT_SEEK_PROBLEMS_REPORTED (plural
 * "PROBLEMS"), the view column is OT_SEEK_ASSISTANCE_PROBLEM_REPORTED
 * (singular, and with ASSISTANCE in it). They are the same field.
 */
export function normalizeSeekDetail(row) {
  return {
    seekId: num(row.OT_SEEK_ASSISTANCE_ID),
    problems: str(row.OT_SEEK_ASSISTANCE_PROBLEM_REPORTED),
  };
}

export async function listSeekDetails({ seekId, page, pagesize, filters, ...opts } = {}) {
  const f = { ...filters };
  if (hasId(seekId)) f.OT_SEEK_ASSISTANCE_ID = seekId;

  if (page) {
    const res = await getView(VIEWS.SEEK_DETAILS, { ...opts, page, pagesize, filters: f });
    return { ...res, data: res.data.map(normalizeSeekDetail) };
  }
  const { rows, meta } = await getViewAll(VIEWS.SEEK_DETAILS, {
    ...opts,
    pagesize,
    filters: f,
  });
  return { ...meta, data: rows.map(normalizeSeekDetail), totalRecords: rows.length };
}

/**
 * SP 1822 — MT_INSERT_SEEKER_DETAILS.
 *
 * **This upserts on the seek id: a seek has exactly ONE detail row.** Verified
 * live — saving twice against seek 3 with different text left one row holding
 * the second value, it did not append. So there is no "one row per topic"; the
 * whole selection has to be composed into this single VARCHAR(MAX).
 */
export async function saveSeekDetail({ seekId, problems }) {
  return saveResult(
    await callSp(SPS.SAVE_SEEK_DETAIL, {
      OT_SEEK_ASSISTANCE_ID: num(seekId),
      OT_SEEK_PROBLEMS_REPORTED: str(problems),
      SUCCESS_STATUS: "",
      ERROR_STATUS: "",
    }),
  );
}

/**
 * SP 1823 — MT_DELETE_SEEKER_DETAILS.
 *
 * **The text is ignored.** It is a declared parameter and must be sent or the
 * call 501s, but it takes no part in matching: deleting seek 3 while passing
 * text that did not match its row still removed that row. Deletion is by seek
 * id alone, so `problems` defaults to "" and exists only to satisfy the
 * parameter set.
 */
export async function deleteSeekDetail({ seekId, problems = "" }) {
  return saveResult(
    await callSp(SPS.DELETE_SEEK_DETAIL, {
      OT_SEEK_ASSISTANCE_ID: num(seekId),
      OT_SEEK_PROBLEMS_REPORTED: str(problems),
      SUCCESS_STATUS: "",
      ERROR_STATUS: "",
    }),
  );
}


/* ------------------------------------------------------ seek attachments */

/**
 * Views 1824 (documents) and 1825 (images) share this shape.
 *
 * OT_SEEK_CREATED_DATE comes back on the row but cannot be filtered on — it
 * 501s as a query param, so treat it as select-only.
 */
export function normalizeSeekAttachment(row, kind) {
  return {
    seekId: num(row.OT_SEEK_ASSISTANCE_ID),
    url: str(row.OT_SEEK_DOCUMENT),
    createdAt: dateOrNull(row.OT_SEEK_CREATED_DATE),
    kind,
  };
}

async function listOneAttachmentView(viewname, kind, { seekId, pagesize, filters, ...opts }) {
  const f = { ...filters };
  if (hasId(seekId)) f.OT_SEEK_ASSISTANCE_ID = seekId;
  const { rows } = await getViewAll(viewname, { ...opts, pagesize, filters: f });
  return rows.map((r) => normalizeSeekAttachment(r, kind));
}

/**
 * Every attachment on a seek, from both views at once.
 *
 * Both are read because SP 1827 currently files images into the documents
 * table (see config.js): today everything arrives via 1824, and if the backend
 * repoints 1827 the images simply start arriving via 1825 instead. Merging
 * means neither case needs a code change.
 *
 * Duplicate URLs are collapsed — the same file landing in both views should
 * show once.
 */
export async function listSeekAttachments({ seekId, ...opts } = {}) {
  const [documents, images] = await Promise.all([
    listOneAttachmentView(VIEWS.SEEK_DOCUMENTS, "document", { seekId, ...opts }),
    listOneAttachmentView(VIEWS.SEEK_IMAGES, "image", { seekId, ...opts }),
  ]);

  const seen = new Set();
  const data = [...documents, ...images].filter((a) => {
    const key = `${a.seekId}|${a.url}`;
    if (!a.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { data, totalRecords: data.length };
}

/** Both insert SPs take the same parameter set. */
function attachmentParams(seekId, url) {
  return {
    OT_SEEK_ASSISTANCE_ID: num(seekId),
    OT_SEEK_DOCUMENT: str(url),
    SUCCESS_STATUS: "",
    ERROR_STATUS: "",
  };
}

/** SP 1826 — MT_INSERT_SEEKER_DOCUMENT_ATTACHMENT. Appends; many per seek. */
export async function saveSeekDocument({ seekId, url }) {
  return saveResult(await callSp(SPS.SAVE_SEEK_DOCUMENT, attachmentParams(seekId, url)));
}

/**
 * SP 1827 — MT_INSERT_SEEKER_IMAGE_ATTACHMENT.
 *
 * Verified 201, but the row currently lands in the documents table read by view
 * 1824 rather than in 1825. Called anyway because it is the correct object for
 * an image and the row is still readable through `listSeekAttachments`; when
 * the backend repoints it, images sort themselves out with no change here.
 */
export async function saveSeekImage({ seekId, url }) {
  return saveResult(await callSp(SPS.SAVE_SEEK_IMAGE, attachmentParams(seekId, url)));
}

/** Route by MIME type: images go to 1827, everything else to 1826. */
export function isImageFile(file) {
  return String(file?.type || "").toLowerCase().startsWith("image/");
}

export function saveSeekAttachment({ seekId, url, isImage }) {
  return isImage ? saveSeekImage({ seekId, url }) : saveSeekDocument({ seekId, url });
}

/* ------------------------------------------- seeks an offerer can act on */

/**
 * One OR group holds six members, and groups AND rather than OR with each
 * other — so six is the most category ids that can be pushed to the server.
 */
export const MAX_ANY_OF_VALUES = 6;

/**
 * Is this seek still open for an offerer to answer?
 *
 * `OT_SEEKER_ASSISTANCE_CLOSED` is a VARCHAR(100) whose vocabulary the backend
 * has not defined yet ("close status I will share later"), and nothing writes
 * it — SP 1821 has no parameter for it, so today every row reads null.
 *
 * Until the values are published this is deliberately lenient: absent or an
 * obvious negative means open, anything else means closed. That way a real
 * value like "CLOSED" or "YES" starts filtering correctly the moment it
 * appears, without hiding rows in the meantime. **This is the one line to
 * change when the vocabulary lands.**
 */
const OPEN_CLOSED_VALUES = new Set(["", "NO", "N", "0", "FALSE", "OPEN", "ACTIVE", "NULL"]);

export function isSeekOpen(seek) {
  return OPEN_CLOSED_VALUES.has(str(seek?.closed).trim().toUpperCase());
}

/**
 * Has the work on this seek been completed? Rating unlocks only then.
 *
 * Completion is the seek's closed status, so this follows `isSeekOpen` — and
 * like it, it waits on a close SP: until one exists every seek reads open and
 * no rating can be given. That is deliberate (client, 2026-10-30: "after
 * completion only").
 */
export const isSeekComplete = (seek) => Boolean(seek) && !isSeekOpen(seek);

/**
 * The seeks an offerer should see: those raised against a category they serve,
 * still open, newest first.
 *
 * The category set comes from the offerer's own areas of interest (view 1703),
 * which is what "attached when they register" means. With no categories the
 * answer is an empty list, never "everything" — an offerer must not see seeks
 * outside what they signed up for.
 *
 * Up to six categories filter server-side via an OR group; beyond that the view
 * is read whole and narrowed here, because a seventh value has nowhere to go.
 */
export async function listSeeksForCategories({
  categoryIds = [],
  seekIds = [],
  includeClosed = false,
  ...opts
} = {}) {
  const ids = [...new Set(categoryIds.map(num).filter((id) => id > 0))];
  // Seeks addressed to this offerer by name — fetched by id, because the seeker
  // may have filed them under a category the offerer does not otherwise serve.
  const direct = [...new Set(seekIds.map(num).filter((id) => id > 0))];
  if (!ids.length && !direct.length) return { data: [], totalRecords: 0 };

  const read = (column, values) =>
    getViewAll(VIEWS.SEEKS, {
      ...opts,
      orderBy: "OT_SEEK_ASSISTANCE_ID",
      sortDir: "DESC",
      ...(values.length <= MAX_ANY_OF_VALUES ? { anyOf: { column, values } } : {}),
    }).then(({ rows }) => rows.map(normalizeSeek));

  const [byCategory, byId] = await Promise.all([
    ids.length ? read("OT_SEEKER_CATEGORY_ID", ids) : [],
    direct.length ? read("OT_SEEK_ASSISTANCE_ID", direct) : [],
  ]);

  const allowedCats = new Set(ids);
  const allowedIds = new Set(direct);
  const seen = new Set();
  const data = [...byCategory, ...byId]
    .filter((s) => allowedCats.has(s.categoryId) || allowedIds.has(s.id))
    .filter((s) => !seen.has(s.id) && seen.add(s.id))
    .filter((s) => includeClosed || isSeekOpen(s));

  return { data, totalRecords: data.length };
}

/**
 * SP 1828 / 1829 — remove an attachment from a seek.
 *
 * **Neither works on the backend today**, so this verifies rather than trusts:
 *
 *  - 1828 answers 501 to every parameter set tried (31 shapes swept on
 *    2026-09-02: both status params, one, none; the document under ten
 *    different names; with and without the seek id).
 *  - 1829 answers 201 but removes nothing, because it targets the images table
 *    while SP 1827 files images into the documents one.
 *
 * A 201 therefore proves nothing here. The row is re-read afterwards and
 * `removed` reports what actually happened, so the UI can tell the truth. When
 * the backend fixes either SP this starts succeeding with no code change.
 */
export async function deleteSeekAttachment({ seekId, url, isImage = false }) {
  const spname = isImage ? SPS.DELETE_SEEK_IMAGE : SPS.DELETE_SEEK_DOCUMENT;
  let called = false;
  let error = null;

  try {
    await callSp(spname, attachmentParams(seekId, url));
    called = true;
  } catch (err) {
    error = err.message || "The delete procedure rejected the call.";
  }

  // Read it back: the only trustworthy signal.
  const { data } = await listSeekAttachments({ seekId });
  const removed = !data.some((a) => a.url === url);

  return { removed, called, error, spname };
}

/* ------------------------------------------------- offerer responses */

/**
 * View 1903 — responses offerers have sent on seeks. Fixed 2026-10-30.
 *
 * Column names differ from SP 1905's parameters — verified live:
 *
 *  - the id is OT_RESPONSE_BY_OFFERER_TRANSACTION (no `_ID`); the `_ID` form 501s
 *  - OT_RESPONSE_DATE carries the full date AND time; OT_RESPONSE_TIME is the
 *    clock on the 1900-01-01 epoch, so it is not used
 *  - OT_RESPONSE_READ_STATUS exists but nothing writes it yet (null)
 *
 * Filters verified: OT_RESPONSE_TO_SEEKER_ASSISTANCE_ID, OT_RESPONSE_BY_OFFERER_ID,
 * OT_RESPONSE_ACCEPT_REJECT_TO_OFFER, OT_RESPONSE_BY_OFFERER_TRANSACTION.
 */
export function normalizeOffererResponse(row) {
  return {
    id: num(row.OT_RESPONSE_BY_OFFERER_TRANSACTION),
    seekId: num(row.OT_RESPONSE_TO_SEEKER_ASSISTANCE_ID),
    offererId: num(row.OT_RESPONSE_BY_OFFERER_ID),
    respondedAt: dateOrNull(row.OT_RESPONSE_DATE),
    decision: str(row.OT_RESPONSE_ACCEPT_REJECT_TO_OFFER).trim().toUpperCase(),
    narration: str(row.OT_RESPONSE_NARRATION),
    readStatus: str(row.OT_RESPONSE_READ_STATUS),
    raw: row,
  };
}

/** View 1903, newest first, optionally narrowed server-side to a seek and/or offerer. */
export async function listOffererResponses({ seekId, offererId, ...opts } = {}) {
  const filters = {};
  if (hasId(seekId)) filters.OT_RESPONSE_TO_SEEKER_ASSISTANCE_ID = seekId;
  if (hasId(offererId)) filters.OT_RESPONSE_BY_OFFERER_ID = offererId;
  const { rows } = await getViewAll(VIEWS.OFFERER_RESPONSES, {
    ...opts,
    filters,
    orderBy: "OT_RESPONSE_BY_OFFERER_TRANSACTION",
    sortDir: "DESC",
  });
  const data = rows.map(normalizeOffererResponse);
  return { data, totalRecords: data.length };
}

/**
 * View 1904 — the next response transaction id. Fixed 2026-10-30: returns
 * `{"NEWREPONSEID": n}` (sic — read positionally) and advances after each 1905
 * save (verified 1 → 2). Falls back to 0, which 1905 also accepts, so a 1904
 * outage never blocks an offerer from answering.
 *
 * Read it before the write: 1905 answers `{"message":"Document Saved"}`, not
 * the new id.
 */
export async function nextResponseId() {
  try {
    const { data } = await getView(VIEWS.NEW_RESPONSE_ID, { page: 1, pagesize: 1 });
    return num(Object.values(data[0] || {})[0]);
  } catch {
    return 0;
  }
}

/**
 * SP 1905 — save an offerer's response to a seek. The backend emails the
 * seeker from SQL, so this is an outward-facing write.
 *
 * Exact parameter set, verified 201 on 2026-10-30. **No SUCCESS_STATUS /
 * ERROR_STATUS** — adding either one is a 501 here.
 */
export async function saveOffererResponse({ seekId, offererId, decision, narration }) {
  if (!hasId(seekId) || !hasId(offererId)) {
    throw new Error("A response needs both the ticket and the offerer.");
  }
  if (!Object.values(RESPONSE_DECISION).includes(decision)) {
    throw new Error("Choose Accept or Decline.");
  }
  const id = await nextResponseId();
  const res = saveResult(
    await callSp(SPS.SAVE_OFFERER_RESPONSE, {
      OT_RESPONSE_BY_OFFERER_TRANSACTION_ID: num(id),
      OT_RESPONSE_TO_SEEKER_ASSISTANCE_ID: num(seekId),
      OT_RESPONSE_BY_OFFERER_ID: num(offererId),
      OT_RESPONSE_ACCEPT_REJECT_TO_OFFER: decision,
      OT_RESPONSE_NARRATION: str(narration).slice(0, 1000),
    }),
  );
  return { ...res, id: res.id ?? (num(id) || null) };
}

/* ------------------------------------------------------------- ratings */

/**
 * View 1906 — ratings seekers gave offerers.
 *
 * Columns (verified 2026-10-30, after the backend added the star and request
 * id): OT_TO_OFFERER_ID, OT_FROM_SEEKER_ID, OT_RATING_DATE, OT_RATING_STAR,
 * OT_RATING_COMMENTS, OT_SEEKERS_REQUEST_ID. All but the date and comments
 * filter. Rows saved before the request id existed read `seekId: null`.
 */
export function normalizeRating(row) {
  const stars = row.OT_RATING_STAR == null ? null : num(row.OT_RATING_STAR);
  return {
    offererId: num(row.OT_TO_OFFERER_ID),
    seekerId: num(row.OT_FROM_SEEKER_ID),
    seekId: row.OT_SEEKERS_REQUEST_ID == null ? null : num(row.OT_SEEKERS_REQUEST_ID),
    ratedAt: dateOrNull(row.OT_RATING_DATE),
    stars: stars && stars >= RATING_MIN && stars <= RATING_MAX ? stars : null,
    comments: str(row.OT_RATING_COMMENTS),
    raw: row,
  };
}

export async function listRatings({ offererId, seekerId, seekId, ...opts } = {}) {
  const filters = {};
  if (hasId(seekId)) filters.OT_SEEKERS_REQUEST_ID = seekId;
  if (hasId(offererId)) filters.OT_TO_OFFERER_ID = offererId;
  if (hasId(seekerId)) filters.OT_FROM_SEEKER_ID = seekerId;
  const { rows } = await getViewAll(VIEWS.RATINGS, { ...opts, filters });
  const data = rows.map(normalizeRating);
  return { data, totalRecords: data.length };
}

/** Average of the ratings that carry stars; null when none do. */
export function averageStars(ratings) {
  const withStars = ratings.filter((r) => r.stars != null);
  if (!withStars.length) return null;
  return withStars.reduce((sum, r) => sum + r.stars, 0) / withStars.length;
}

/**
 * SP 1907 — a seeker rates an offerer for one seek. Exact 6-parameter set,
 * verified 201 on 2026-10-30 once OT_SEEKERS_REQUEST_ID was added; the old
 * 5-parameter set now 501s. Like 1905 it 501s if SUCCESS_STATUS / ERROR_STATUS
 * are sent, and answers `{"message":"Document Saved"}`.
 *
 * "Only after completion" is enforced by the caller via `isSeekComplete`.
 */
export async function saveRating({
  offererId,
  seekerId,
  seekId,
  stars,
  comments = "",
  ratedAt = new Date(),
}) {
  if (!hasId(offererId) || !hasId(seekerId) || !hasId(seekId)) {
    throw new Error("A rating needs the offerer, the seeker and the request.");
  }
  const n = Math.round(num(stars));
  if (n < RATING_MIN || n > RATING_MAX) {
    throw new Error(`Pick ${RATING_MIN} to ${RATING_MAX} stars.`);
  }
  return saveResult(
    await callSp(SPS.SAVE_RATING, {
      OT_TO_OFFERER_ID: num(offererId),
      OT_FROM_SEEKER_ID: num(seekerId),
      OT_RATING_DATE: sqlDateTime(ratedAt),
      OT_RATING_STAR: n,
      OT_RATING_COMMENTS: str(comments).slice(0, 1000),
      OT_SEEKERS_REQUEST_ID: num(seekId),
    }),
  );
}

/* ----------------------------------------------------- member track record */

/**
 * Public activity numbers for a member's profile, so the other side can judge
 * whether they are genuine (client, 2026-10-30).
 *
 *  - seeker:  requests raised (1818), how many an offerer accepted (1903),
 *             ratings they have given (1906)
 *  - offerer: requests they accepted (1903), ratings received + average (1906)
 *
 * Counts only — no request text or names leave this function.
 */
export async function getMemberActivity({ regNo, type }) {
  if (!hasId(regNo)) return null;

  if (str(type).toUpperCase() === USER_TYPE.OFFERER) {
    const [responses, ratings] = await Promise.all([
      listOffererResponses({ offererId: regNo }),
      listRatings({ offererId: regNo }),
    ]);
    const accepted = new Set(
      responses.data
        .filter((r) => r.decision === RESPONSE_DECISION.ACCEPT)
        .map((r) => r.seekId),
    );
    return {
      accepted: accepted.size,
      ratingsReceived: ratings.data.length,
      averageStars: averageStars(ratings.data),
    };
  }

  const [seeks, ratings] = await Promise.all([
    listSeeks({ seekerId: regNo }),
    listRatings({ seekerId: regNo }),
  ]);
  const seekIds = new Set(seeks.data.map((s) => s.id));
  // 1903 is filtered by seek id where it fits one OR group; past that it is
  // read whole and narrowed here.
  const ids = [...seekIds];
  const responses = ids.length
    ? ids.length <= MAX_ANY_OF_VALUES
      ? await getViewAll(VIEWS.OFFERER_RESPONSES, {
          anyOf: { column: "OT_RESPONSE_TO_SEEKER_ASSISTANCE_ID", values: ids },
        }).then(({ rows }) => rows.map(normalizeOffererResponse))
      : (await listOffererResponses()).data
    : [];
  const accepted = new Set(
    responses
      .filter((r) => seekIds.has(r.seekId) && r.decision === RESPONSE_DECISION.ACCEPT)
      .map((r) => r.seekId),
  );
  return {
    raised: seekIds.size,
    accepted: accepted.size,
    ratingsGiven: ratings.data.length,
  };
}
