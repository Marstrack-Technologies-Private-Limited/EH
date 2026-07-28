---
name: eh-api
description: Hit the tech23 devapi for this EH / PEER TO PEER app. Holds the login credentials, the live auth-token + session-token, every object ID (views 1690-1699, SPs 1692/1695/1698/1701) with its exact verified parameter set and real column names, the robust pagination/filter rules for globalViewHandlerPagination, and the MANDATORY mobile-first UI rule. ALWAYS run this before writing or changing any API call or any screen in this repo — never wire an endpoint without hitting it live first.
---

# EH / PEER TO PEER — API + UI rules

Base URL: `https://devapi.tech23.net`

## Two non-negotiable rules

1. **Hit the endpoint live before wiring it.** Never assume a view's column
   names or an SP's parameter set — probe with curl, read the response, then
   write the code. The spec sheet has already been wrong twice (see 1701 and
   `OM_USER_SEEKER_GUIDANCE_ALL` below).
2. **Mobile-first, always.** See [Mobile-first is mandatory](#mobile-first-is-mandatory).

## Tokens

Long-lived on dev — reuse them. On 401/403, re-run the login to refresh.

```
AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImVtYWlsIjoic2lkZGlxdWVAZ2JzYWZyaWNhLm5ldCJ9LCJpYXQiOjE3ODUxODQ3OTh9.I0smiV1C1k5rpc20MWROl5oMZbgl7Nt9Mwb09FSEOBQ

SESSION_TOKEN=NDRiYmI4OTQzZWJkOGIzYmQxNjFkMjBiZWEwNTM2MWU6Yzk1MzAxMDVjYmI0MjliZTRkNGE0ZDNkYjk2ZWY0OGEvNDRiYmI4OTQzZWJkOGIzYmQxNjFkMjBiZWEwNTM2MWU6NjRjMjRmYzgyNGM4NmE2YzExMzhiODNjZGYxNWE0OTcvNDRiYmI4OTQzZWJkOGIzYmQxNjFkMjBiZWEwNTM2MWU6ZThhNzFlMzVhMjZiYWFjOTQzZGY0ZTNlNzI2MGRjYjIvNDRiYmI4OTQzZWJkOGIzYmQxNjFkMjBiZWEwNTM2MWU6ZDc5Y2ViNDY4ZDdlMDRiNzI4OGEzOGQzOGZjZGY2MDI=
```

### Refresh (verified HTTP 201)

```bash
L=$(curl -s 'https://devapi.tech23.net/cpanel/login' -H 'content-type: application/json' \
  --data-raw '{"email":"siddique@gbsafrica.net","password":"siddique","MODULENAME":"PEER TO PEER"}')
export AT=$(printf '%s' "$L" | sed -n 's/.*"authenticationToken":"\([^"]*\)".*/\1/p')
export ST=$(printf '%s' "$L" | sed -n 's/.*"sclientSecret":"\([^"]*\)".*/\1/p')
```

`authenticationToken` → `auth-token` header. `sclientSecret` → `session-token` header.

## READ — `globalViewHandlerPagination`

```bash
curl -s "https://devapi.tech23.net/global/globalViewHandlerPagination?page=1&pagesize=100&viewname=1690" \
  -H "auth-token: $AT" -H "session-token: $ST"
```

Envelope: `{page, pagesize, totalRecords, totalPages, dataCount, data: [...]}`

### Pagination + filtering — use it properly

All verified live against view 1699:

| Behaviour | Result |
|---|---|
| `&COLUMN=value` | Filters. **Exact match only** — `OM_USER_NAME=Zed` returns 0 rows, `OM_USER_NAME=Zed%20Beta` returns 1 |
| Multiple `&COL=v` params | Combine with **AND** |
| Filter on a column the view doesn't have | **501 Internal server error** — kills the whole request |
| Filter value that matches nothing | Clean `totalRecords: 0, data: []` (not an error) |
| `page` past the end | `dataCount: 0, data: []`, no error |
| `pagesize` | Honoured; `totalPages` recomputed from it |

### This endpoint does far more than paginate

`globalViewHandlerPagination.md` in the repo root is the authoritative reference —
**read it before hand-rolling anything client-side.** It documents sorting,
projection, date/amount ranges, LIKE search, every SQL operator, OR groups,
distinct-value dropdowns, GROUP BY, aggregates and HAVING. Anything in that list
belongs on the server, not in JavaScript.

### Sorting — `orderby` (column) + `sortby` (direction)

> ⚠️ `sortby` is the **direction**, not a column. Passing it a column name looks
> like it is being ignored and invites the wrong conclusion that the API is
> DESC-only. It isn't.

| Param | Value | Notes |
|---|---|---|
| `orderby` | bare column name | required for sorting |
| `sortby` | `ASC` or `DESC` | defaults to `DESC` |
| `orderby1..6` + `sortby1..6` | multi-column sort | applied left to right |

Verified on view 1690: `orderby=OM_CATEGORY_NO&sortby=ASC` → 1 2 3 4;
`&sortby=DESC` → 4 3 2 1. IDs collate correctly (0 1 2 3 4 on view 1699), so no
client-side numeric re-sort is needed.

These **501** (they are parsed as column filters, so the name must be a real column):
`sort=`, `order=`, `sortcolumn=`, `sortfield=`, `sortorder=`, `dir=`, `desc=`,
`orderby=COL%20ASC`. A bad `orderby` column also 501s (the doc says 400; live it
returns the generic 501 envelope).

### Search — use OR groups for "match any column"

`searchcolumn1..10` + `searchtext1..10` are **AND-ed**, so they cannot express
"name OR description contains X". Use an OR group instead (max 4 groups × 6 members):

```
&orgroup1col1=OM_SERVICE_NAME&orgroup1op1=like&orgroup1val1=code
&orgroup1col2=OM_SERVICE_DESCRIPTION&orgroup1op2=like&orgroup1val2=code
```

Verified: matches a row on either column, and composes with `orderby`/`sortby`.
`getView({ searchAny: { columns, text } })` builds exactly this.

### Distinct values — dropdowns without pulling rows

`distinctColumn1..8` returns unique values under `distinctValues` **in the same
response**, narrowed by the active filters. Verified on 1699:
`{"OM_USER_SEEKER_GUIDANCE_ALL":["OFFERER","SEEKER"],"OM_USER_COUNTRY":[…]}`.

Sort columns verified live: 1690 `OM_CATEGORY_NO|_NAME|_CREATED_BY|_ACTIVE`;
1693 `TOPICID|TOPICNAME|CATEGORYNAME`; 1696 `OM_SERVICE_ID|_NAME|_DESCRIPTION|_ACTIVE`,
`OM_CATEGORY_NAME`; 1699 `OM_USER_REG_NO|_NAME|_EMAIL|_CITY|_SEEKER_GUIDANCE_ALL`.

Rules to follow in code:

- **URL-encode every filter value** (`new URLSearchParams`) — spaces and `&` in
  names/emails otherwise corrupt the query.
- **Never pass an unvalidated column name into a filter.** A typo is a 501, not
  an empty list. Filter only on columns confirmed in the tables below.
- **Drop empty filters** (`""`, `null`, `undefined`) before building the query —
  sending `&OM_USER_CITY=` filters on the empty string and returns nothing.
- **Exact match only** means client-side contains-search needs the full page set;
  use `getViewAll` (below) then filter in JS, or filter server-side on an exact
  value like a category id.
- **Paginate for real.** Default `pagesize=100`. For a complete list, read page 1,
  then fetch pages `2..totalPages` in parallel — `getViewAll` in
  `src/api/http.js` already does this. Don't loop serially; don't assume one page.
- **Guard against stale responses.** Filter changes fire overlapping requests —
  keep a request-id ref and ignore all but the newest (`useResource` does this).

## WRITE — `globalSpHandler`

```bash
curl -s -X POST "https://devapi.tech23.net/global/globalSpHandler?spname=1692" \
  -H "auth-token: $AT" -H "session-token: $ST" -H 'content-type: application/json' \
  --data-raw '{"CATEGORYID":0,"CATEGORYNAME":"Tech Solutions CAT1","CATEGORYACTIVE":1,"CATEGORYCREATEDBY":"test78@techsolutions.com","NEWEXISTING":"NEW","SUCCESS_STATUS":"","ERROR_STATUS":""}'
```

- **HTTP 201 + `{"message":"2"}` = SAVED.** The message string is the saved row's
  id — show it in the toast (`Saved (#2)`).
- **HTTP 501 = parameter-set mismatch.** Proven by experiment: one *extra* key
  501s, one *missing* key 501s. Send the SP's declared keys exactly.
- **`SUCCESS_STATUS` and `ERROR_STATUS` are BOTH required on all four SPs**, as
  empty strings. Tested per SP — sending only `SUCCESS_STATUS`, or neither,
  returns 501 on 1692, 1695, 1698 and 1701 alike. Do not drop them.
- New → id `0` + `NEWEXISTING: "NEW"`. Edit → real id + `NEWEXISTING: "EXISTING"`.

## Object IDs — all verified live

| Object | ID | Type | Status |
|---|---|---|---|
| MTVWP2PCATEGORIES | 1690 | view | ✅ 200 |
| MTVWNEWP2PCATEGORYID | 1691 | view | ✅ `{"NEWCAT":"2"}` |
| MT_INSERT_P2P_CATEGORIES | 1692 | sp | ✅ 201 — NEW + EXISTING both verified |
| MTVWP2PTOPICS | 1693 | view | ✅ 200 |
| MTVWNEWP2PTOPICID | 1694 | view | ✅ `{"NEWTOPIC":"1"}` |
| MT_INSERT_P2P_TOPIC | 1695 | sp | ✅ 201 |
| MTVWP2PSERVICES | 1696 | view | ✅ 200 |
| MTVWNEWP2PSERVICEID | 1697 | view | ✅ `{"NEWSERVICEID":1}` |
| MT_INSERT_P2P_SERVICE | 1698 | sp | ✅ 201 |
| MTVWUSERMASTER | 1699 | view | ✅ 200 — seekers + offerers |
| MT_INSERT_USER_MASTER | 1701 | sp | ✅ 201 — **only with `NEWEXISTING:"NEW"`**, see trap below |
| MT_INSERT_DELETE_USER_CATEGORIES | 1702 | sp | ✅ 201 — CREATE + DELETE both verified |
| MTVWP2PUSERAREASOFINTERESTS | 1703 | view | ✅ 200 — filter by `USERID` |
| MTVWP2PUSERTOPICSOFINTERESTS | 1704 | view | ✅ 200 — filter by `USERID` |
| MT_INSERT_DELETE_USER_TOPICS | 1705 | sp | ✅ 201 — CREATE + DELETE both verified |

Each "new id" view returns one row with a *differently named* single column
(`NEWCAT`, `NEWTOPIC`, `NEWSERVICEID`) — read it **positionally**
(`Object.values(row)[0]`), never by name.

## Verified column names

- **1690 categories**: `OM_CATEGORY_NO`, `OM_CATEGORY_NAME`, `OM_CATEGORY_ACTIVE`,
  `OM_CATEGORY_CREATED_BY`, `OM_CATEGORY_CREATED_DATE`
- **1693 topics**: `TOPICID`, `TOPICNAME`, `CATEGORYNAME`, `CATEGORYNO`
  (filter by category with `&CATEGORYNO=1`)
- **1696 services**: `OM_SERVICE_ID`, `OM_SERVICE_CATEGORY_ID`, `OM_SERVICE_NAME`,
  `OM_SERVICE_DESCRIPTION`, `OM_SERVICE_ACTIVE`, `OM_SERVICE_CREATED_DATE`,
  `OM_SERVICE_CREATED_BY`, + joined `OM_CATEGORY_*`
- **1699 users**: `OM_USER_REG_NO`, `OM_USER_NAME`, `OM_USER_EMAIL`,
  `OM_USER_PASSWORD`, `OM_USER_SEEKER_GUIDANCE_ALL`, `OM_USER_COUNTRY`,
  `OM_USER_CITY`, `OM_USER_PERSONAL_INFORMATION`, `OM_USER_REGISTRATION_DATE`,
  `OM_USER_ACTIVE`, `OM_USER_EXPIRY_DATE`

> ⚠️ **Trap:** the filter column is `OM_USER_SEEKER_GUIDANCE_ALL` — *singular*
> "SEEKER". The spec sheet writes `OM_USER_SEEKERS_GUIDANCE_ALL` (plural), which
> **501s**. Values: `SEEKER` / `OFFERER` / `ALL`.

## SP parameter sets (all confirmed saving)

```jsonc
// 1692 — category
{"CATEGORYID":0,"CATEGORYNAME":"","CATEGORYACTIVE":1,"CATEGORYCREATEDBY":"","NEWEXISTING":"NEW","SUCCESS_STATUS":"","ERROR_STATUS":""}

// 1695 — topic
{"TOPICID":0,"CATEGORYID":1,"TOPICNAME":"","TOPICCREATEDBY":"","TOPICACTIVE":1,"NEWEXISTING":"NEW","SUCCESS_STATUS":"","ERROR_STATUS":""}

// 1698 — service
{"SERVICEID":0,"CATEGORYID":1,"SERVICENAME":"","SERVICEDESCRIPTION":"","SERVICECREATEDBY":"","SERVICEACTIVE":1,"NEWEXISTING":"NEW","SUCCESS_STATUS":"","ERROR_STATUS":""}

// 1701 — user. USERREGISTRATIONDATE was added 2026-07-28; the old 12-param set now 501s.
{"USERREGNO":0,"USERNAME":"","USEREMAIL":"","USERPASSWORD":"","USERSEEKERGUIDANCEALL":"SEEKER","USERCOUNTRY":"","USERCITY":"","USERPERSONALINFORMATION":"","USERREGISTRATIONDATE":"2026-07-28","USERDOB":"1995-04-12","USERACTIVE":1,"NEWEXISTING":"NEW","SUCCESS_STATUS":"","ERROR_STATUS":""}
```

### User interests — SPs 1702 / 1705, views 1703 / 1704

One endpoint does both directions via `@CREATEDELETE`:

```jsonc
// 1702 — a user's area of interest (category)
{"USERID":13,"CATEGORYID":1,"CREATEDELETE":"CREATE","SUCCESS_STATUS":"","ERROR_STATUS":""}
// 1705 — a user's topic of interest
{"USERID":13,"TOPICID":1,"CREATEDELETE":"CREATE","SUCCESS_STATUS":"","ERROR_STATUS":""}
```

- Both answer `{"message":"Document Saved"}` — **not** a row id, unlike the other SPs.
- `"DELETE"` in the same field removes the pair.
- ⚠️ **CREATE does not de-duplicate.** Sending the same (user, category) pair twice
  inserts two rows. Filter already-chosen items out of the picker. One DELETE
  does clear all duplicates of a pair.
- Columns — 1703: `USERID`, `USERNAME`, `OM_USER_SEEKER_GUIDANCE_ALL`,
  `AREAOFINTERESTID`, `OM_CATEGORY_NAME`. 1704: same plus `TOPICNAME`,
  `CATEGORYNO`, `CATEGORYNAME`.
- ⚠️ `AREAOFINTERESTID` means **category id on 1703** and **topic id on 1704** —
  same column name, different entity.
- Filter both by `USERID`.

### Member (seeker / offerer) sign-in

There is no member login endpoint. The app bootstraps a session with the module
service account, then matches credentials server-side on view 1699:

```
&OM_USER_EMAIL=<email>&OM_USER_PASSWORD=<password>
```

The row only returns when the password matches (verified: right password → 1 row,
wrong → 0). See `loginMemberRequest` in `src/api/auth.js`. Move this to a proper
login SP when the backend provides one — the password currently travels in a
query string.

### SP 1701 round-trip status (re-verified 2026-07-28 after the backend fix)

| Field | Stored? |
|---|---|
| name, email, password, type, country, city, personal info | ✅ |
| `USERDOB` → `OM_USER_DOB` | ✅ fixed — column added to view 1699 |
| `USERREGISTRATIONDATE` → `OM_USER_REGISTRATION_DATE` | ✅ fixed |
| `USERACTIVE` → `OM_USER_ACTIVE` | ❌ **still ignored** — `0` and `false` both store `true`, on insert and update |

The ACTIVE bug is specific to this SP: `MT_INSERT_P2P_CATEGORIES` with
`CATEGORYACTIVE:0` correctly stores `OM_CATEGORY_ACTIVE:false`.

The SP returns only `{"message":"<id>"}` — the declared `SUCCESS_STATUS` /
`ERROR_STATUS` outputs never come back, so confirm a write by re-reading the row
(`getUserByRegNo` + `diffSavedUser` in `p2p.js`).

> ⚠️ **Trap:** the spec declares `@NEWEXISTING BIT` on 1701, but the deployed SP
> wants the **strings** like the other three. Sending `1` or `0` returns a
> misleading **201 with `{"message":"0"}` and silently upserts reg no 0 over and
> over** instead of inserting. `"NEW"` inserts and returns the new id. Verified
> live: `"NEW"` → `{"message":"3"}` + a real new row; `"EXISTING"` with a real
> reg no → updates that row.

## Mobile-first is MANDATORY

This app is being converted to a mobile app. Every screen, dialog, table and
grid must be built mobile-first and validated at mobile size **before** desktop.

- **Design at 360×640 first**, then scale up with `sm:` / `md:` / `lg:`.
  Unprefixed Tailwind classes are the *mobile* case — never the desktop one.
- **No horizontal page scroll at 360px, ever.** Wide content (tables, long rows)
  goes in its own `overflow-x-auto` container, or collapses to stacked cards on
  mobile — the page body itself must not scroll sideways.
- **Tap targets ≥ 44×44px** (`min-h-11`), with real spacing between them.
  Icon-only buttons need `size-11` touch area even if the glyph is `size-4`.
- **Data grids become cards under `md:`.** Do not ship a desktop table that a
  phone user has to pinch-zoom.
- **Dialogs/sheets:** full-width with margin on mobile (`w-[calc(100%-2rem)]`),
  constrained (`sm:max-w-lg`) above. Long dialog bodies scroll internally.
- **Forms stack on mobile** (`grid gap-4 sm:grid-cols-2`), inputs full-width,
  `text-base` (16px) minimum so iOS doesn't zoom on focus.
- **Bottom nav is the mobile primary**; sidebar is `hidden md:flex`. Keep content
  padded clear of it (`pb-20 md:pb-0`) — see `app-layout.jsx`.
- **Respect safe areas** on notched devices (`env(safe-area-inset-*)`).
- **Never rely on hover** to reveal an action — there is no hover on touch.
  Anything hover-only must also be visible or tappable on mobile.

### Validate before calling it done

1. Check the layout at **360px, 414px, 768px, 1024px**.
2. Confirm zero horizontal overflow at 360px.
3. Confirm every button/link is comfortably tappable.
4. Confirm dialogs, dropdowns and pickers open fully on-screen at 360px.
5. Run `npm run build` — it must pass.

## Where this lives in the app

- `src/api/config.js` — base URL + all object IDs
- `src/api/http.js` — token injection, `getView` / `getViewAll` / `callSp`, 501 + 401 handling
- `src/api/p2p.js` — one function per object, with row normalizers
- `src/api/auth.js` — `/cpanel/login`
- `src/store/auth-slice.js` + `src/store/index.js` — tokens in redux, persisted, pushed into `http.js`
- `src/hooks/use-p2p.js` — `useCategories` / `useTopics` / `useServices` / `useUsers`
