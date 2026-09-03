// Categories → topics taxonomy. The admin panel can extend this at runtime.
// Icons are lucide-react names resolved in components via the iconMap helper.

export const CATEGORIES = [
  {
    id: "cat_software",
    name: "Software Development",
    icon: "Code2",
    topics: [
      { id: "t_web", name: "Web Development" },
      { id: "t_mobile", name: "Mobile Apps" },
      { id: "t_devops", name: "DevOps & Cloud" },
      { id: "t_db", name: "Databases" },
      { id: "t_api", name: "API Design" },
      { id: "t_debug", name: "Debugging" },
    ],
  },
  {
    id: "cat_data",
    name: "Data & AI",
    icon: "BrainCircuit",
    topics: [
      { id: "t_ml", name: "Machine Learning" },
      { id: "t_analysis", name: "Data Analysis" },
      { id: "t_python", name: "Python" },
      { id: "t_sql", name: "SQL" },
      { id: "t_viz", name: "Data Visualization" },
      { id: "t_llm", name: "LLMs & Prompting" },
    ],
  },
  {
    id: "cat_design",
    name: "Design",
    icon: "Palette",
    topics: [
      { id: "t_uiux", name: "UI/UX Design" },
      { id: "t_graphic", name: "Graphic Design" },
      { id: "t_brand", name: "Branding" },
      { id: "t_figma", name: "Figma" },
      { id: "t_dsystem", name: "Design Systems" },
    ],
  },
  {
    id: "cat_business",
    name: "Business & Finance",
    icon: "Briefcase",
    topics: [
      { id: "t_startup", name: "Startups" },
      { id: "t_fundraising", name: "Fundraising" },
      { id: "t_accounting", name: "Accounting" },
      { id: "t_marketing", name: "Marketing Strategy" },
      { id: "t_sales", name: "Sales" },
    ],
  },
  {
    id: "cat_career",
    name: "Career & Coaching",
    icon: "Target",
    topics: [
      { id: "t_resume", name: "Resume Review" },
      { id: "t_interview", name: "Interview Prep" },
      { id: "t_speaking", name: "Public Speaking" },
      { id: "t_leadership", name: "Leadership" },
      { id: "t_negotiation", name: "Negotiation" },
    ],
  },
  {
    id: "cat_language",
    name: "Languages",
    icon: "Languages",
    topics: [
      { id: "t_english", name: "English" },
      { id: "t_spanish", name: "Spanish" },
      { id: "t_french", name: "French" },
      { id: "t_mandarin", name: "Mandarin" },
      { id: "t_german", name: "German" },
    ],
  },
  {
    id: "cat_wellness",
    name: "Health & Wellness",
    icon: "HeartPulse",
    topics: [
      { id: "t_nutrition", name: "Nutrition" },
      { id: "t_fitness", name: "Fitness" },
      { id: "t_mental", name: "Mental Health" },
      { id: "t_meditation", name: "Meditation" },
    ],
  },
];

// The five stops on the proficiency slider, in the order they appear under it.
export const PROFICIENCY = [
  { value: 1, label: "Novice" },
  { value: 2, label: "Beginner" },
  { value: 3, label: "Competent" },
  { value: 4, label: "Proficient" },
  { value: 5, label: "Expert" },
];

/** Where a topic starts when it is first picked — the middle of the scale. */
export const DEFAULT_PROFICIENCY = 3;

export function proficiencyLabel(rating) {
  return PROFICIENCY.find((p) => p.value === Math.round(rating))?.label ?? "—";
}

// Flat lookup helpers built from CATEGORIES (and any runtime additions passed in).
export function buildTopicIndex(categories = CATEGORIES) {
  const topics = {};
  const cats = {};
  for (const c of categories) {
    cats[c.id] = c;
    for (const t of c.topics) {
      topics[t.id] = { ...t, categoryId: c.id, categoryName: c.name };
    }
  }
  return { topics, cats };
}
