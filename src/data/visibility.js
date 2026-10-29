// Who can see each piece of member data, as the app behaves TODAY.
//
// Keep this honest: it is shown to members on /how-it-works and /profile, so
// change a row the moment the behaviour changes (e.g. when per-field privacy
// settings, photo or phone land — see PENDING-BACKEND.md). "public" means
// someone who is not signed in; every screen with member data needs sign-in.
//
// Values: "yes" | "no" | a short string for a partial answer.
export const VISIBILITY_ROWS = [
  { info: "Name", members: "yes", team: "yes", public: "no" },
  { info: "City and country", members: "yes", team: "yes", public: "no" },
  { info: "About you / bio", members: "yes", team: "yes", public: "no" },
  { info: "Topics you help with or need help in", members: "yes", team: "yes", public: "no" },
  {
    info: "Your requests for help",
    members: "Only offerers in that category",
    team: "yes",
    public: "no",
  },
  { info: "Email address", members: "no", team: "yes", public: "no" },
  { info: "Date of birth", members: "no", team: "yes", public: "no" },
  { info: "Password", members: "no", team: "Stored on the server", public: "no" },
  { info: "Phone number", members: "Not collected", team: "Not collected", public: "Not collected" },
  { info: "Exact address", members: "Not collected", team: "Not collected", public: "Not collected" },
];

export const VISIBILITY_COLUMNS = [
  { key: "members", label: "Other members" },
  { key: "team", label: "EH team" },
  { key: "public", label: "Public (not signed in)" },
];
