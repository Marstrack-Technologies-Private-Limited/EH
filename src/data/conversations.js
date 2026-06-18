const now = Date.now();
const mins = (m) => now - m * 60000;

// Seed 1:1 conversations. `participants` holds two user ids.
export const CONVERSATIONS = [
  {
    id: "c_aisha_carlos",
    participants: ["u_aisha", "u_carlos"],
    messages: [
      { id: "m1", senderId: "u_aisha", text: "Hi Carlos! Saw you specialize in DevOps & databases — I'm stuck scaling my Postgres setup.", ts: mins(58) },
      { id: "m2", senderId: "u_carlos", text: "Hey Aisha 👋 Happy to help. What's the current bottleneck — reads, writes, or connections?", ts: mins(55) },
      { id: "m3", senderId: "u_aisha", text: "Connection pooling I think. It falls over around 200 concurrent users.", ts: mins(53) },
      { id: "m4", senderId: "u_carlos", text: "Classic. Let's get a pgBouncer in front of it. Want to hop on a quick call?", ts: mins(50) },
      { id: "m5", senderId: "u_aisha", text: "That would be amazing. Are you free this afternoon?", ts: mins(2) },
    ],
  },
  {
    id: "c_aisha_priya",
    participants: ["u_aisha", "u_priya"],
    messages: [
      { id: "m1", senderId: "u_priya", text: "Thanks for the review earlier! Let me know if you want a follow-up on the ML roadmap.", ts: mins(220) },
      { id: "m2", senderId: "u_aisha", text: "Will do — working through the first module now 🙏", ts: mins(210) },
    ],
  },
];
