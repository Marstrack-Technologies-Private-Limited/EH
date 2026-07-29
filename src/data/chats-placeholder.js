/**
 * PLACEHOLDER DATA — not from the API.
 *
 * The My Chats screen has no backend objects yet: nothing in the spec covers
 * tickets, threads, messages, read state or presence. This file stands in so the
 * interface can be reviewed, and is the single thing to delete once the real
 * objects exist (see PENDING-BACKEND.md).
 *
 * Shape mirrors what the screen will need from the server:
 *   ticket  → the seeker's enquiry, one per Seek Assistance submission
 *   replies → one thread per offerer who responded, all against the same ticket
 */

export const PLACEHOLDER_TICKETS = [
  {
    id: "TCK-1042",
    topic: "Databases",
    category: "Software Engineering",
    issue:
      "Our orders table has grown past 40 million rows and the nightly report query now takes over an hour. I've added indexes on the date column but it barely helped. Looking for someone who has actually scaled this.",
    urgency: "IMMEDIATE",
    contactBy: "WHATSAPP",
    createdAt: "2026-07-28T09:14:00.000Z",
    attachments: ["query-plan.txt", "schema.png"],
    threads: [
      {
        offerer: {
          regNo: 2,
          name: "Offer Guy RENAMED",
          city: "Porto",
          country: "Portugal",
          headline: "Cloud architect — Kubernetes, CI/CD, taming AWS bills",
          online: true,
        },
        unread: 2,
        messages: [
          {
            id: "m1",
            from: "offerer",
            at: "2026-07-28T09:40:00.000Z",
            text: "Can you share the execution plan? If it's a full scan on a date range, a covering index usually fixes it before you need partitioning.",
          },
          {
            id: "m2",
            from: "seeker",
            at: "2026-07-28T09:52:00.000Z",
            text: "Attached the plan. It is doing a full scan even with the index.",
          },
          {
            id: "m3",
            from: "offerer",
            at: "2026-07-28T10:05:00.000Z",
            text: "Right — the predicate isn't sargable because of the CAST on the date. Drop the cast and it'll use the index. Happy to walk through it on a call.",
          },
        ],
      },
      {
        offerer: {
          regNo: 12,
          name: "App Payload EDITED",
          city: "Leeds",
          country: "United Kingdom",
          headline: "Staff engineer — prototype to production",
          online: false,
        },
        unread: 0,
        messages: [
          {
            id: "m4",
            from: "offerer",
            at: "2026-07-28T11:20:00.000Z",
            text: "Second what was said about the cast. Longer term, look at monthly partitioning — we did this on a 200M row table and reports dropped to seconds.",
          },
          {
            id: "m5",
            from: "seeker",
            at: "2026-07-28T11:35:00.000Z",
            text: "Thanks — is partitioning painful to retrofit?",
          },
        ],
      },
      {
        offerer: {
          regNo: 8,
          name: "Diag User",
          city: "Porto",
          country: "Portugal",
          headline: "Data analyst — SQL, dashboards, storytelling with data",
          online: false,
        },
        unread: 1,
        messages: [
          {
            id: "m6",
            from: "offerer",
            at: "2026-07-29T08:02:00.000Z",
            text: "If the report is read-only, a materialised view refreshed nightly might sidestep the problem entirely.",
          },
        ],
      },
    ],
  },
  {
    id: "TCK-1039",
    topic: "UI/UX Design",
    category: "Design",
    issue:
      "Need a second opinion on our onboarding flow — users drop off on step 3 and we can't work out why.",
    urgency: "24H",
    contactBy: "EMAIL",
    createdAt: "2026-07-26T14:02:00.000Z",
    attachments: [],
    threads: [
      {
        offerer: {
          regNo: 4,
          name: "Final Check",
          city: "Mombasa",
          country: "Kenya",
          headline: "Product designer — design crits and portfolio reviews",
          online: true,
        },
        unread: 0,
        messages: [
          {
            id: "m7",
            from: "offerer",
            at: "2026-07-26T15:10:00.000Z",
            text: "Step 3 is where you ask for the phone number, right? That's almost always the drop. Try making it optional and see what happens.",
          },
        ],
      },
    ],
  },
];

export const URGENCY_LABEL = {
  IMMEDIATE: "Immediate",
  "24H": "Within 24 hours",
  "3D": "Within 3 days",
  "1W": "Within a week",
  FLEXIBLE: "Flexible",
};
