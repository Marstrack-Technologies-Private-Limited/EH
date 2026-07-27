# EH — Peer-to-Peer Help Platform (MVP frontend)

EH connects **Seekers** (people who need help solving a problem) with **Offerers**
(people who offer their expertise). It matches them by topic, proficiency and
location, lets them chat one-on-one in real time, and supports ratings & feedback.
An admin panel manages the category/topic taxonomy.

> This repo is the **frontend only**. All data is mocked in-memory and persisted to
> `localStorage`, behind a thin hook layer (`useAuth`, `useApp`, `useMatches`) that is
> ready to be swapped for the real backend without touching the components.

## Tech stack

- **Vite** + **React 18** — **JSX only, no TypeScript**
- **Tailwind CSS v4** (`@tailwindcss/vite`) with an OKLCH design-token theme
- **shadcn-style** UI primitives (hand-written in JSX, Radix-backed)
- `react-router-dom`, `lucide-react`, `sonner` (toasts)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

## Demo logins (shown on the sign-in screen — click a card to autofill)

| Role    | Email              | Password  |
|---------|--------------------|-----------|
| Seeker  | `seeker@eh.app` | `demo123` |
| Offerer | `offerer@eh.app`| `demo123` |
| Admin   | `admin@eh.app`  | `admin123`|

Other accounts (`priya@`, `sofia@`, `mei@`, … all `demo123`) populate search & matching.

## Features → where they live

| Feature | Pages / files |
|---|---|
| Login with click-to-fill demo accounts | `src/pages/Login.jsx` |
| 2-step registration (details → specializations + ratings) | `src/pages/Register.jsx`, `src/components/topic-picker.jsx` |
| Role-aware dashboard (seeker / offerer / admin) | `src/pages/Dashboard.jsx` |
| Search / discover offerers + filters | `src/pages/Search.jsx`, `src/hooks/use-matches.js` |
| Matching algorithm + transparent breakdown | `src/lib/matching.js`, `src/pages/Matches.jsx` |
| Profile (view + edit) | `src/pages/Profile.jsx`, `src/pages/UserProfile.jsx` |
| 1:1 chat with online/offline status | `src/pages/Chat.jsx` |
| Ratings & feedback | `src/components/review-dialog.jsx`, `src/pages/Reviews.jsx` |
| Admin panel (categories & topics, members) | `src/pages/Admin.jsx` |

## The matching algorithm (`src/lib/matching.js`)

Each offerer is scored 0–100 against a seeker:

- **Topic overlap — 50%**: share of the seeker's topics the offerer covers
- **Proficiency — 20%**: offerer's average self-rated star level on shared topics
- **Reputation — 20%**: offerer's average review rating
- **Location — 10%**: same city > same country > remote
- **+ online bonus**: small boost if the offerer is online now

`matchScore()` returns a full breakdown so the UI can explain *why* it matched.

## Full file tree (everything created)

```
EH/
├── index.html                              # Vite entry + Google Fonts
├── package.json                            # deps + scripts
├── vite.config.js                          # React + Tailwind plugins, @ alias
├── jsconfig.json                           # @/* path alias for editors
├── README.md                               # this file
└── src/
    ├── main.jsx                            # React root
    ├── App.jsx                             # router + providers + Toaster
    ├── index.css                           # Tailwind v4 theme (OKLCH tokens, light/dark)
    │
    ├── lib/
    │   ├── utils.js                        # cn(), initials(), timeAgo()
    │   └── matching.js                     # peer-matching algorithm
    │
    ├── data/                               # mock data (replace with API later)
    │   ├── categories.js                   # category→topic taxonomy + proficiency labels
    │   ├── users.js                        # seekers, offerers, admin + DEMO_LOGINS
    │   ├── reviews.js                      # seeded feedback
    │   └── conversations.js                # seeded 1:1 chats
    │
    ├── store/
    │   └── app-store.jsx                   # AppProvider + reducer + localStorage persistence
    │
    ├── hooks/
    │   ├── use-auth.js                     # login / logout / register / updateProfile
    │   ├── use-matches.js                  # ranked + filtered offerers for a seeker
    │   ├── use-debounce.js                 # debounced value
    │   └── use-media-query.js              # useMediaQuery / useIsMobile
    │
    ├── components/
    │   ├── icon-map.js                     # category name → lucide icon
    │   ├── online-dot.jsx                  # green/grey presence dot
    │   ├── user-avatar.jsx                 # avatar + presence
    │   ├── role-badge.jsx                  # Seeker / Offerer / Admin badge
    │   ├── kpi-card.jsx                    # dashboard stat card
    │   ├── match-ring.jsx                  # circular match-score gauge
    │   ├── offerer-card.jsx                # search/match result card
    │   ├── topic-picker.jsx                # reusable category→topic selector (+ratings)
    │   ├── topic-list.jsx                  # grouped topic display (+proficiency)
    │   ├── review-dialog.jsx               # leave-feedback dialog
    │   │
    │   ├── layout/
    │   │   ├── app-layout.jsx              # auth-gated shell (sidebar + outlet + bottom nav)
    │   │   ├── sidebar-nav.jsx             # desktop sidebar
    │   │   ├── bottom-nav.jsx              # mobile bottom nav
    │   │   ├── nav-config.js               # role-based nav items
    │   │   └── page-header.jsx             # page title/description/actions
    │   │
    │   └── ui/                             # shadcn-style primitives (JSX)
    │       ├── button.jsx        ├── card.jsx          ├── input.jsx
    │       ├── textarea.jsx      ├── label.jsx         ├── badge.jsx
    │       ├── avatar.jsx        ├── select.jsx        ├── dialog.jsx
    │       ├── checkbox.jsx      ├── slider.jsx        ├── tabs.jsx
    │       ├── separator.jsx     ├── progress.jsx      ├── skeleton.jsx
    │       ├── dropdown-menu.jsx ├── star-rating.jsx   └── empty-state.jsx
    │
    └── pages/
        ├── Login.jsx                       # sign-in + demo accounts
        ├── Register.jsx                    # 2-step wizard
        ├── Dashboard.jsx                   # seeker/offerer/admin variants
        ├── Search.jsx                      # discover + filters
        ├── Matches.jsx                     # ranked matches + breakdown
        ├── Profile.jsx                     # own profile (editable)
        ├── UserProfile.jsx                 # public profile + reviews + match
        ├── Chat.jsx                        # 1:1 messaging
        ├── Reviews.jsx                     # offerer's received feedback
        ├── Admin.jsx                       # taxonomy + members
        └── NotFound.jsx                    # 404
```

## Wiring the backend later

Every data touchpoint goes through the store/hooks, so you only change those:

- **Auth** → `src/hooks/use-auth.js` (`login`, `register`, `logout`, `updateProfile`)
- **Reads / writes** → `src/store/app-store.jsx` reducer actions (`ADD_REVIEW`,
  `SEND_MESSAGE`, `ADD_CATEGORY`, …). Replace the reducer with API calls / a query client.
- **Matching** can stay client-side (`src/lib/matching.js`) or move server-side — the
  result shape (`{ offerer, score, breakdown, sharedTopicIds }`) is what the UI expects.

Components, pages and the design system stay untouched.
