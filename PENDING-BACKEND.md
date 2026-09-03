# Pending backend objects

What is **not** implemented in this frontend, and exactly what is needed to
finish it. Everything else in the app runs on live `devapi.tech23.net` objects.

Last verified against dev: **2026-09-04**.

---

## 1. Seek Assistance — fully wired; three attachment defects open

**Screen:** `/seek-assistance` (`src/pages/SeekAssistance.jsx`)

**Wired and working** as of 2026-09-02. Submit runs the whole sequence,
verified live end-to-end: files upload → view 1819 reserves the number →
SP 1821 writes the header → SP 1822 the detail → SP 1826/1827 link each
attachment → views 1818 / 1820 / 1824 read it all back with the exact values sent.

| Object | Role | Notes |
|---|---|---|
| 1818 `MTVWSEEKASSISTANCEHEADER` | read seeks | filter `OT_SEEKER_ID`, sort `OT_SEEK_ASSISTANCE_ID` |
| 1819 `MTVWNEWSEEKASSISTANCENO` | next ticket no | `{"NEWNO":n}`, read positionally |
| 1820 view seek details | read detail | columns: `OT_SEEK_ASSISTANCE_ID`, `OT_SEEK_ASSISTANCE_PROBLEM_REPORTED` |
| 1821 `MT_INSERT_SEEKER_HEADER` | save header | NEW + EXISTING both verified |
| 1822 `MT_INSERT_SEEKER_DETAILS` | save detail | **upsert**, see below |
| 1823 `MT_DELETE_SEEKER_DETAILS` | delete detail | **ignores the text**, see below |
| 1824 / 1825 documents / images | read attachments | `{OT_SEEK_ASSISTANCE_ID, OT_SEEK_DOCUMENT, OT_SEEK_CREATED_DATE}` — **1825 never populated**, see defects |
| 1826 `MT_INSERT_SEEKER_DOCUMENT_ATTACHMENT` | link a document | ✅ appends, many per seek |
| 1827 `MT_INSERT_SEEKER_IMAGE_ATTACHMENT` | link an image | ⚠️ 201 but writes into 1824 |
| 1828 `MT_DELETE_SEEKER_DOCUMENT_ATTACHMENT` | delete a document | ❌ 501 on every shape tried |
| 1829 `MT_DELETE_SEEKER_IMAGE_ATTACHMENT` | delete an image | ⚠️ 201 but a no-op |

### Traps, all confirmed by experiment

**SP 1821** differs from 1692/1695/1698/1701 in four ways:

| Trap | Detail |
|---|---|
| Parameter names | Carry the `OT_` prefix, exactly as declared. The unprefixed style **501s** |
| Return value | `{"message":"Document Saved"}` — **not** the new id. Read 1819 *before* saving |
| Foreign keys | **Not checked.** `OT_SEEKER_ID: 99999` saved with 201 |
| Empty DATETIME | `""` is accepted but stores **1900-01-01, not NULL**. `dateOrNull` treats the epoch as unset |

BIT round-trips correctly on 1821/1822 — no repeat of the 1701 `USERACTIVE` defect.

**SP 1822 upserts on the seek id — a seek has exactly ONE detail row.** Saving
twice against seek 3 with different text left one row holding the second value;
it did not append. So there is no row-per-topic: the whole selection has to be
composed into the single `VARCHAR(MAX)`. `composeProblems` / `parseProblems` in
the page do that, and are a **stopgap to be deleted** if a real detail table with
a topic id and an offerer id ever lands.

**SP 1823 ignores `@OT_SEEK_PROBLEMS_REPORTED`.** It must be sent or the call
501s, but it takes no part in matching — deleting seek 3 while passing text that
did not match its row still removed that row. Deletion is by seek id alone.

**Naming mismatch:** the SP parameter is `OT_SEEK_PROBLEMS_REPORTED` (plural
"PROBLEMS"), the view column is `OT_SEEK_ASSISTANCE_PROBLEM_REPORTED` (singular,
with ASSISTANCE). Same field.


### Attachments — upload and link both work; deletes do not

`uploadFile` (`src/api/http.js`) → `saveSeekAttachment` (`src/api/p2p.js`).

```
POST https://api.tech23.net/fileupload/uploadImage
multipart, file in a field named exactly `imageValue`
header: session-token       (verified OPTIONAL — an anonymous POST also 201s)
→ 201, body is the S3 URL as a PLAIN STRING, not JSON
```

Then link it — 1826 and 1827 take the identical parameter set, and **append**
(many attachments per seek, unlike the single detail row):

```jsonc
{"OT_SEEK_ASSISTANCE_ID":6,"OT_SEEK_DOCUMENT":"https://…","SUCCESS_STATUS":"","ERROR_STATUS":""}
```

Verified end-to-end 2026-09-02: upload → 1819 → 1821 → 1822 → 1826 + 1827 →
read back, with the URLs still serving the right bytes and content-types.

Upload endpoint facts:

- It is on **api.tech23.net, not devapi** — there is no dev equivalent.
- **Despite the name it takes any file type.** `.txt` and `.pdf` both verified.
- The returned URL is **publicly readable with no token**. Anything uploaded is
  effectively public — worth knowing before seekers attach private documents.
- `uploadFile` / `uploadDocument` / `uploadDoc` / `upload` all **404**.
- Do **not** set `content-type`; the browser must add the multipart boundary.

### Three attachment defects to fix

**Re-tested 2026-09-02 after the sheet said the attachment SPs and views were
updated: all three behave exactly as before.** Nothing in the app needs to
change when they are fixed — see the merge note below.

| # | Object | Problem |
|---|---|---|
| 1 | **SP 1827** `MT_INSERT_SEEKER_IMAGE_ATTACHMENT` | Answers 201 but writes into the **documents** table behind view 1824. **View 1825 is never populated** — confirmed with two distinct images, 1825 stayed at 0 rows |
| 2 | **SP 1828** `MT_DELETE_SEEKER_DOCUMENT_ATTACHMENT` | **501 on every parameter set tried**, including the exact shape its insert twin 1826 accepts. Also tried: id only, document only, + `OT_SEEK_CREATED_DATE`, `OT_SEEK_DOCUMENT_ID`, + `NEWEXISTING`, and without the status params. **Its declared parameters have not been published** |
| 3 | **SP 1829** `MT_DELETE_SEEKER_IMAGE_ATTACHMENT` | Answers 201 but **removes nothing** — a consequence of #1, since it targets the empty images table |

Because of #2 and #3 the app's attachment list is **add-only**: nothing calls
either delete. `listSeekAttachments` reads **both** views and merges, so it is
correct today (everything arrives via 1824) and stays correct with no code
change once 1827 is repointed.

`OT_SEEK_CREATED_DATE` is returned on the row but **cannot be filtered on** —
it 501s as a query param. Select-only.

### Still needed

| Need | Detail |
|---|---|
| Close / resolve SP | `OT_SEEKER_ASSISTANCE_SUCCESS_FAILURE`, `_CLOSED`, `_CLOSED_DATE` are on 1818 but have no parameter on 1821, so they are always null |
| `OT_SEEK_ASSISTANCE_SEEKER_ID` | On 1818, no parameter on 1821, always null. Distinct from `OT_SEEKER_ID` — dead column, or is 1821 incomplete? |
| Proper detail table | One row per topic plus an offerer id, so the compose/parse stopgap can go |
| Seeker filter on 1820 | 1820 has no seeker column, so a seeker's details cannot be filtered server-side — the app reads the view whole and indexes by seek id |

> Dev rows 1–6 in view 1818 are probe artifacts, narration prefixed
> `[dev test row`, with attachment rows against seeks 4–6 in view 1824. There is
> no header-delete SP (1830+ answer 403) and no working attachment delete, so
> those can only be cleared in SQL. Detail rows *can* be removed with SP 1823.
## 2. Offerer responses — no response object

**Screen:** `/requests` (`src/pages/Requests.jsx`)

The offerer inbox is **live and working**: view 1703 gives the categories the
offerer signed up for, view 1818 gives the open seeks raised against those
categories, view 1820 the topics and views 1824/1825 the attachments.

Category gating verified live 2026-09-02 — offerer 2 (categories 1, 2, 3) sees
seek #7 in category 2 and **not** the six category-4 seeks; offerer 12
(category 1 only) sees none. Up to six categories filter server-side through one
OR group (`orgroup2*`); beyond six the view is read whole and narrowed in the
client, because a group holds only six members and groups AND rather than OR.

**Responding is built but held.** The compose box validates and previews, then
reports that no endpoint exists rather than faking a save.

| Need | Detail |
|---|---|
| **Response SP** | Object id + full parameter list. Presumably seek id, offerer reg no, response text, date/time |
| **Response view** | So a seeker sees replies in their own login, and the offerer sees what they already sent |
| **Close status vocabulary** | `OT_SEEKER_ASSISTANCE_CLOSED` is VARCHAR(100) with no defined values, and **SP 1821 has no parameter for it** — so nothing can close a seek and every row reads null. `isSeekOpen` in `p2p.js` is deliberately lenient (absent or an obvious negative = open) and is the single line to change once the values are published |
| Close / resolve SP | Needed alongside the vocabulary, to write `_CLOSED`, `_CLOSED_DATE` and `_SUCCESS_FAILURE` |
| WhatsApp + email delivery | The seek stores the seeker's preference (`..._ON_EMAIL`, `..._ON_WHATSAPP`, `..._ON_CALL`) and the screen shows it, but sending is the backend's to trigger. No endpoint exists |

> "Active and not closed": there is no active flag on a seek, and the only
> candidate — `OM_USER_ACTIVE` on the seeker — is the known-broken column that
> always reads true (section 6, the user SP defect). So the list filters on *not closed* alone.
> Say if "active" was meant to be something else.

## 3. My Chats — no thread or message objects

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

## 4. Offerer profile extras — no source columns

**Screen:** `/offerers` (`src/pages/Offerers.jsx`)

The directory itself is live: view 1699 filtered to `OFFERER`, joined against
views 1703/1704 so each card shows the areas and topics that offerer covers.

Three items from the spec are **omitted rather than invented**, with a visible
note on the page:

- **Experience** — no column on any view
- **Testimonials** — no view
- **Cases handled per area** — needs ticket data, which doesn't exist yet

## 5. Undocumented objects found while probing

Re-swept 2026-09-02. `501` means the object is registered but the request did
not match it; `403` means no such object.

| Object | Finding |
|---|---|
| **SP 1706 / 1707 / 1708** | Registered, undocumented — 501 on an empty body |
| SP 1709–1720, 1750, 1800 | 403 — do not exist |
| **1810–1817** | Registered, undocumented — 501 as a view *and* as an SP |
| 1818–1825 | Documented and in use — see section 1 |
| 1826–1829 | Attachment SPs — deployed and documented, see section 1 |
| **1830–1845** | 403 — do not exist. So there is still **no header-delete SP** and no offerer-response object |
| View 1700 | A stale duplicate of `MTVWUSERMASTER`: same rows as 1699 but missing `OM_USER_DOB`. Worth dropping so nobody wires the wrong one |
## 6. Still-open defect

**SP 1701 `@USERACTIVE` is not persisted.** Creating or updating with `0` (or
`false`) stores `true`; `OM_USER_ACTIVE` never reflects what was sent. In the
same session `MT_INSERT_P2P_CATEGORIES` with `CATEGORYACTIVE:0` correctly stores
`false`, so this is specific to the user SP. The member form carries a note
saying the checkbox is ignored.

*(Fixed earlier and confirmed working: `USERDOB` and `USERREGISTRATIONDATE` now
save and read back. Note the 1701 parameter set changed — the old 12-param body
now 501s.)*

## 7. Proficiency — captured in the UI, nowhere to store it

**Screens:** `/register` (offerer sign-up), `/interests`
(`src/components/interests-manager.jsx`)

An offerer now states how well they know each topic — the five-stop slider
Novice / Beginner / Competent / Proficient / Expert — and gives one overall
level at sign-up. **Nothing on the backend can hold it**, so the level is kept
in the browser (`src/lib/proficiency-store.js`) and every screen that shows it
says so on the page. It does not follow the member to another device, and no
other member can see it.

Probed live 2026-09-04:

| Probe | Result |
|---|---|
| Views 1703 / 1704 / 1699 | **No proficiency-like column.** 1704 returns `USERID`, `USERNAME`, `OM_USER_SEEKER_GUIDANCE_ALL`, `AREAOFINTERESTID`, `TOPICNAME`, `CATEGORYNO`, `CATEGORYNAME` and nothing else |
| SP 1705 + one extra key | **501 on every name tried** — `PROFICIENCY`, `PROFICIENCYLEVEL`, `TOPICPROFICIENCY`, `USERPROFICIENCY`, `RATING`, `KNOWLEDGELEVEL`, `LEVEL`, `EXPERTISE`. The identical body *without* the extra key returns 201, so the 501 is the parameter set, not the call |
| SPs 1706 / 1707 / 1708 | Registered but undocumented; 501 on every proficiency-shaped parameter set tried, and on an empty body |

### What is needed

| Need | Detail |
|---|---|
| `@PROFICIENCY` on SP 1705 | TINYINT/INT 1–5 alongside `USERID` / `TOPICID` / `CREATEDELETE`. A CREATE on a pair that already exists should **update** the level rather than insert a second row — today 1705 does not de-duplicate at all |
| A proficiency column on view 1704 | So a saved level reads back, and so an offerer's level can show on their card in the directory and on `/offerers` |
| A decision on the overall level | Sign-up captures one figure for the offerer as a whole, but the user master (SP 1701 / view 1699) has no column for it either. Either add one, or drop that field and keep per-topic only |

Once both land: delete `src/lib/proficiency-store.js` and
`src/hooks/use-proficiency.js` and read/write the real field. `ProficiencySlider`
and every screen using it stay exactly as they are.

## 8. Security items to close before any public deploy

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
