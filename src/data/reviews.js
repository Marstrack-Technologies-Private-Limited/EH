const now = Date.now();
const days = (d) => now - d * 86400000;

// Feedback left by seekers on offerers after a session.
export const REVIEWS = [
  {
    id: "r1",
    offererId: "u_carlos",
    seekerId: "u_aisha",
    seekerName: "Aisha Khan",
    rating: 5,
    comment:
      "Carlos walked me through my entire AWS setup in one session. Costs dropped 40% and I finally understand my pipeline.",
    topicId: "t_devops",
    createdAt: days(4),
  },
  {
    id: "r2",
    offererId: "u_carlos",
    seekerId: "u_tom",
    seekerName: "Tom Becker",
    rating: 5,
    comment: "Incredibly patient. Explained database indexing like I was five. Worth every minute.",
    topicId: "t_db",
    createdAt: days(11),
  },
  {
    id: "r3",
    offererId: "u_carlos",
    seekerId: "u_nadia",
    seekerName: "Nadia Petrova",
    rating: 4,
    comment: "Great advice on API structure. Ran a little over time but super helpful.",
    topicId: "t_api",
    createdAt: days(25),
  },
  {
    id: "r4",
    offererId: "u_mei",
    seekerId: "u_tom",
    seekerName: "Tom Becker",
    rating: 5,
    comment: "Mei rewrote my resume strategy and I got 3 callbacks the next week. Unreal.",
    topicId: "t_resume",
    createdAt: days(6),
  },
  {
    id: "r5",
    offererId: "u_priya",
    seekerId: "u_aisha",
    seekerName: "Aisha Khan",
    rating: 5,
    comment: "Made ML actually approachable. Gave me a concrete learning path.",
    topicId: "t_ml",
    createdAt: days(9),
  },
  {
    id: "r6",
    offererId: "u_sofia",
    seekerId: "u_nadia",
    seekerName: "Nadia Petrova",
    rating: 5,
    comment: "Sofia's design crit was brutal in the best way. My flows are 10x cleaner now.",
    topicId: "t_uiux",
    createdAt: days(3),
  },
];
