# Pending backend objects

What is **not** implemented in this frontend, and exactly what is needed to
finish it. Everything else in the app runs on live `devapi.tech23.net` objects.

Last verified against dev: **2026-07-30**.

---

## 1. Seek Assistance — no ticket object

**Screen:** `/seek-assistance` (`src/pages/SeekAssistance.jsx`)

The form is complete and validates, but **Submit is deliberately held** — it
reports that no endpoint exists rather than faking a save.

Working today: the audience selector, the seeker's topics prefilled from view
1704, urgency, contact preference, and file selection in the browser.

Needed:

| Need | Detail |
|---|---|
| Save SP | Object ID + full parameter list for creating a ticket |
| Fields to persist | seeker reg no, audience (single offerer / category / topic set), issue text, urgency, contact method + value, created date |
| Topic set | A ticket can target many topics — either a repeating param or a child SP called per topic |
| File upload | No upload endpoint exists. Multipart target, or a document SP plus a storage URL |
| Read-back view | To list a seeker's own tickets and their status |

## 2. My Chats — no thread or message objects

**Screen:** `/my-chats` (`src/pages/MyChats.jsx`)

⚠️ **Runs entirely on placeholder data** in `src/data/chats-placeholder.js`.
Delete that file once the real objects land — nothing else imports it.

The interface implements the spec: the ticket on top, one thread per offerer who
responded, and separate conversations with each against the same ticket. Replies
typed in stay in local state.

Needed:

| Need | Detail |
|---|---|
| Threads view | Offerers who responded to a ticket, with their profile and reply count |
| Messages view | Messages in a thread — sender, body, timestamp, read state |
| Send message SP | Ticket/thread id, sender reg no, body |
| Presence | Online/offline per user. Currently a placeholder dot |
| Email notification | Spec says an offline recipient is emailed. No trigger or endpoint exists |

## 3. Offerer profile extras — no source columns

**Screen:** `/offerers` (`src/pages/Offerers.jsx`)

The directory itself is live: view 1699 filtered to `OFFERER`, joined against
views 1703/1704 so each card shows the areas and topics that offerer covers.

Three items from the spec are **omitted rather than invented**, with a visible
note on the page:

- **Experience** — no column on any view
- **Testimonials** — no view
- **Cases handled per area** — needs ticket data, which doesn't exist yet

## 4. Undocumented objects found while probing

Discovered by sweeping object IDs. `501` means the object is deployed but the
posted parameters don't match; `403` means no such object (`spname=1800` → 403).

| Object | Finding |
|---|---|
| **SP 1706** | Deployed, undocumented — 501 on an empty body |
| **SP 1707** | Deployed, undocumented — 501 on an empty body |
| **SP 1708** | Deployed, undocumented — 501 on an empty body |
| SP 1709–1720 | 403 — do not exist |
| **View 1700** | A stale duplicate of `MTVWUSERMASTER`: same 14 rows as 1699 but missing `OM_USER_DOB`. Worth dropping so nobody wires the wrong one |

**1706 / 1707 / 1708 may be the ticket and chat SPs.** Their parameter names are
needed — a 501 gives no hint, and guessing would write bad rows.

## 5. Still-open defect

**SP 1701 `@USERACTIVE` is not persisted.** Creating or updating with `0` (or
`false`) stores `true`; `OM_USER_ACTIVE` never reflects what was sent. In the
same session `MT_INSERT_P2P_CATEGORIES` with `CATEGORYACTIVE:0` correctly stores
`false`, so this is specific to the user SP. The member form carries a note
saying the checkbox is ignored.

*(Fixed earlier and confirmed working: `USERDOB` and `USERREGISTRATIONDATE` now
save and read back. Note the 1701 parameter set changed — the old 12-param body
now 501s.)*

## 6. Security items to close before any public deploy

Both are consequences of what the API currently offers, not oversights:

- **Service tokens ship in the client bundle** (`src/api/config.js` →
  `SERVICE_TOKENS`), readable by anyone who opens the site. Override per
  environment with `VITE_AUTH_TOKEN` / `VITE_SESSION_TOKEN`.
- **Member passwords travel in a query string.** Seeker/offerer sign-in matches
  `OM_USER_EMAIL` + `OM_USER_PASSWORD` as filters on view 1699, because that is
  the only credential-matching facility exposed. A real member-login SP would
  fix both this and the point above. Isolated in `loginMemberRequest`
  (`src/api/auth.js`) for an easy swap.
- CORS: the browser calls `devapi.tech23.net` directly, so the deployed origin
  must be allowed.
