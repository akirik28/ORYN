import type { SkillCategory } from "@/types/database";

/**
 * ORYN's canonical skill taxonomy.
 *
 * Replaces a 46-entry list that was heavily weighted toward programming languages and
 * musical instruments — a student whose strengths were in economics, debating, community
 * work or design found essentially nothing to pick and typed free text instead, which
 * meant the same skill arrived spelled six ways and nothing downstream could group it.
 *
 * Three deliberate constraints:
 *
 * 1. **Curated, not exhaustive.** Around 200 entries covering what a 14-18 year old
 *    plausibly has, not several thousand near-duplicates. "Machine Learning" is here;
 *    "Supervised Machine Learning", "ML Engineering" and "Applied ML" are aliases of it,
 *    not separate rows. A picker full of near-synonyms is worse than a short one, because
 *    it splits the same skill across many spellings.
 * 2. **Built for this product, not copied.** These are grouped around how students
 *    actually describe themselves and how Oryn's own dimensions read a profile, rather
 *    than lifted from a professional network's proprietary taxonomy.
 * 3. **Free text still wins.** `SuggestInput` never rejects a typed value, and that stays
 *    true — this is a convergence aid, not a whitelist. A student with a skill Oryn has
 *    never heard of must always be able to record it.
 *
 * `category` maps to the existing six-value `skills.category` column, which is unchanged;
 * `group` is the finer-grained label used for organising the picker. Adding a group costs
 * nothing, adding a category would be a migration.
 */

export type SkillGroup =
  | "Business & economics"
  | "Entrepreneurship"
  | "Leadership & teamwork"
  | "Communication & debate"
  | "Writing"
  | "Research & analysis"
  | "Data & statistics"
  | "Programming"
  | "AI & machine learning"
  | "Engineering & making"
  | "Mathematics"
  | "Sciences"
  | "Design & visual"
  | "Media & content"
  | "Project management"
  | "Languages"
  | "Community & social impact"
  | "Arts & performance"
  | "Sport & wellbeing";

export interface SkillDefinition {
  /** The canonical spelling stored on the profile. */
  name: string;
  group: SkillGroup;
  /** Maps onto the existing `skills.category` enum. */
  category: SkillCategory;
  /** Alternate spellings a student might type. Matched on search, never stored. */
  aliases?: string[];
}

export const SKILL_TAXONOMY: SkillDefinition[] = [
  // ── Business & economics ────────────────────────────────────────────────────
  { name: "Financial Literacy", group: "Business & economics", category: "analytical" },
  { name: "Financial Modelling", group: "Business & economics", category: "analytical", aliases: ["Financial Modeling", "Valuation Modelling"] },
  { name: "Accounting", group: "Business & economics", category: "analytical", aliases: ["Bookkeeping"] },
  { name: "Microeconomics", group: "Business & economics", category: "analytical" },
  { name: "Macroeconomics", group: "Business & economics", category: "analytical" },
  { name: "Econometrics", group: "Business & economics", category: "analytical" },
  { name: "Market Research", group: "Business & economics", category: "analytical" },
  { name: "Business Strategy", group: "Business & economics", category: "analytical", aliases: ["Strategy"] },
  { name: "Investing", group: "Business & economics", category: "analytical", aliases: ["Stock Market", "Portfolio Management"] },
  { name: "Budgeting", group: "Business & economics", category: "analytical" },
  { name: "Negotiation", group: "Business & economics", category: "communication" },
  { name: "Sales", group: "Business & economics", category: "communication" },
  { name: "Marketing", group: "Business & economics", category: "communication", aliases: ["Digital Marketing"] },
  { name: "Social Media Marketing", group: "Business & economics", category: "communication" },
  { name: "Customer Research", group: "Business & economics", category: "analytical", aliases: ["User Interviews"] },

  // ── Entrepreneurship ────────────────────────────────────────────────────────
  { name: "Entrepreneurship", group: "Entrepreneurship", category: "leadership", aliases: ["Startups", "Founding"] },
  { name: "Product Development", group: "Entrepreneurship", category: "technical", aliases: ["Product Management"] },
  { name: "Pitching", group: "Entrepreneurship", category: "communication", aliases: ["Pitch Decks", "Investor Pitching"] },
  { name: "Business Planning", group: "Entrepreneurship", category: "analytical", aliases: ["Business Plans"] },
  { name: "Fundraising", group: "Entrepreneurship", category: "communication" },
  { name: "E-commerce", group: "Entrepreneurship", category: "technical", aliases: ["Online Store", "Shopify"] },
  { name: "Growth", group: "Entrepreneurship", category: "analytical", aliases: ["Growth Hacking", "User Acquisition"] },

  // ── Leadership & teamwork ───────────────────────────────────────────────────
  { name: "Team Leadership", group: "Leadership & teamwork", category: "leadership", aliases: ["Leading Teams", "Leadership"] },
  { name: "Teamwork", group: "Leadership & teamwork", category: "leadership", aliases: ["Collaboration", "Team Player"] },
  { name: "Mentoring", group: "Leadership & teamwork", category: "leadership", aliases: ["Coaching", "Tutoring Peers"] },
  { name: "Delegation", group: "Leadership & teamwork", category: "leadership" },
  { name: "Conflict Resolution", group: "Leadership & teamwork", category: "leadership", aliases: ["Mediation"] },
  { name: "Decision Making", group: "Leadership & teamwork", category: "leadership" },
  { name: "Recruiting & Onboarding", group: "Leadership & teamwork", category: "leadership", aliases: ["Recruiting"] },
  { name: "Running Meetings", group: "Leadership & teamwork", category: "leadership", aliases: ["Facilitation", "Chairing"] },
  { name: "Volunteer Coordination", group: "Leadership & teamwork", category: "leadership" },

  // ── Communication & debate ──────────────────────────────────────────────────
  { name: "Public Speaking", group: "Communication & debate", category: "communication", aliases: ["Presenting", "Oratory"] },
  { name: "Debate", group: "Communication & debate", category: "communication", aliases: ["Debating", "Competitive Debate"] },
  { name: "Model United Nations", group: "Communication & debate", category: "communication", aliases: ["MUN"] },
  { name: "Persuasive Argument", group: "Communication & debate", category: "communication", aliases: ["Rhetoric", "Argumentation"] },
  { name: "Active Listening", group: "Communication & debate", category: "communication" },
  { name: "Interviewing", group: "Communication & debate", category: "communication" },
  { name: "Presentation Design", group: "Communication & debate", category: "creative", aliases: ["Slide Design", "Keynote", "PowerPoint"] },
  { name: "Cross-cultural Communication", group: "Communication & debate", category: "communication" },

  // ── Writing ─────────────────────────────────────────────────────────────────
  { name: "Essay Writing", group: "Writing", category: "communication", aliases: ["Academic Writing"] },
  { name: "Creative Writing", group: "Writing", category: "creative", aliases: ["Fiction Writing", "Poetry"] },
  { name: "Technical Writing", group: "Writing", category: "communication", aliases: ["Documentation"] },
  { name: "Journalism", group: "Writing", category: "communication", aliases: ["Reporting", "News Writing"] },
  { name: "Editing & Proofreading", group: "Writing", category: "communication", aliases: ["Editing", "Copy-editing", "Proofreading"] },
  { name: "Research Writing", group: "Writing", category: "analytical", aliases: ["Report Writing", "Paper Writing"] },
  { name: "Copywriting", group: "Writing", category: "creative" },
  { name: "Grant & Proposal Writing", group: "Writing", category: "communication", aliases: ["Grant Writing"] },

  // ── Research & analysis ─────────────────────────────────────────────────────
  { name: "Academic Research", group: "Research & analysis", category: "analytical", aliases: ["Research"] },
  { name: "Literature Review", group: "Research & analysis", category: "analytical" },
  { name: "Experimental Design", group: "Research & analysis", category: "analytical" },
  { name: "Qualitative Research", group: "Research & analysis", category: "analytical", aliases: ["Interviews & Coding"] },
  { name: "Quantitative Research", group: "Research & analysis", category: "analytical" },
  { name: "Survey Design", group: "Research & analysis", category: "analytical" },
  { name: "Critical Thinking", group: "Research & analysis", category: "analytical" },
  { name: "Citation & Referencing", group: "Research & analysis", category: "analytical", aliases: ["Referencing", "Bibliography"] },
  { name: "Fact-checking", group: "Research & analysis", category: "analytical" },

  // ── Data & statistics ───────────────────────────────────────────────────────
  { name: "Data Analysis", group: "Data & statistics", category: "analytical", aliases: ["Data Analytics"] },
  { name: "Statistics", group: "Data & statistics", category: "analytical", aliases: ["Statistical Analysis"] },
  { name: "Data Visualisation", group: "Data & statistics", category: "analytical", aliases: ["Data Visualization", "Charts & Graphs"] },
  { name: "Spreadsheets", group: "Data & statistics", category: "technical", aliases: ["Excel", "Google Sheets", "Microsoft Excel"] },
  { name: "SQL", group: "Data & statistics", category: "technical", aliases: ["Databases", "PostgreSQL", "MySQL"] },
  { name: "Pandas", group: "Data & statistics", category: "technical" },
  { name: "R", group: "Data & statistics", category: "technical", aliases: ["R Programming"] },
  { name: "Stata", group: "Data & statistics", category: "technical" },
  { name: "Tableau", group: "Data & statistics", category: "technical" },
  { name: "Power BI", group: "Data & statistics", category: "technical" },
  { name: "Data Cleaning", group: "Data & statistics", category: "analytical", aliases: ["Data Wrangling"] },

  // ── Programming ─────────────────────────────────────────────────────────────
  { name: "Python", group: "Programming", category: "technical" },
  { name: "JavaScript", group: "Programming", category: "technical", aliases: ["JS"] },
  { name: "TypeScript", group: "Programming", category: "technical", aliases: ["TS"] },
  { name: "Java", group: "Programming", category: "technical" },
  { name: "C++", group: "Programming", category: "technical", aliases: ["CPP"] },
  { name: "C", group: "Programming", category: "technical" },
  { name: "C#", group: "Programming", category: "technical", aliases: ["CSharp"] },
  { name: "Swift", group: "Programming", category: "technical" },
  { name: "Kotlin", group: "Programming", category: "technical" },
  { name: "Go", group: "Programming", category: "technical", aliases: ["Golang"] },
  { name: "Rust", group: "Programming", category: "technical" },
  { name: "MATLAB", group: "Programming", category: "technical" },
  { name: "HTML & CSS", group: "Programming", category: "technical", aliases: ["HTML/CSS", "HTML", "CSS"] },
  { name: "React", group: "Programming", category: "technical", aliases: ["React.js"] },
  { name: "Web Development", group: "Programming", category: "technical", aliases: ["Front-end Development", "Web Dev"] },
  { name: "Mobile App Development", group: "Programming", category: "technical", aliases: ["App Development", "iOS Development", "Android Development"] },
  { name: "Game Development", group: "Programming", category: "technical", aliases: ["Unity", "Godot"] },
  { name: "Git & Version Control", group: "Programming", category: "technical", aliases: ["Git", "GitHub", "Version Control"] },
  { name: "Algorithms & Data Structures", group: "Programming", category: "technical", aliases: ["Algorithms", "Competitive Programming"] },
  { name: "Automation & Scripting", group: "Programming", category: "technical", aliases: ["Scripting", "Bash"] },
  { name: "Cybersecurity", group: "Programming", category: "technical", aliases: ["Information Security", "InfoSec", "CTF"] },

  // ── AI & machine learning ───────────────────────────────────────────────────
  { name: "Machine Learning", group: "AI & machine learning", category: "technical", aliases: ["ML", "Applied Machine Learning", "Supervised Learning"] },
  { name: "Deep Learning", group: "AI & machine learning", category: "technical", aliases: ["Neural Networks"] },
  { name: "Natural Language Processing", group: "AI & machine learning", category: "technical", aliases: ["NLP"] },
  { name: "Computer Vision", group: "AI & machine learning", category: "technical" },
  { name: "Prompt Engineering", group: "AI & machine learning", category: "technical", aliases: ["Working with LLMs"] },
  { name: "AI Ethics", group: "AI & machine learning", category: "analytical", aliases: ["Responsible AI"] },
  { name: "PyTorch", group: "AI & machine learning", category: "technical" },
  { name: "TensorFlow", group: "AI & machine learning", category: "technical" },

  // ── Engineering & making ────────────────────────────────────────────────────
  { name: "Robotics", group: "Engineering & making", category: "technical", aliases: ["FRC", "FTC", "VEX"] },
  { name: "Electronics", group: "Engineering & making", category: "technical", aliases: ["Circuits", "Arduino", "Raspberry Pi"] },
  { name: "CAD", group: "Engineering & making", category: "technical", aliases: ["Computer-Aided Design", "SolidWorks", "Fusion 360", "AutoCAD"] },
  { name: "3D Printing", group: "Engineering & making", category: "technical", aliases: ["Additive Manufacturing"] },
  { name: "Mechanical Engineering", group: "Engineering & making", category: "technical" },
  { name: "Electrical Engineering", group: "Engineering & making", category: "technical" },
  { name: "Prototyping", group: "Engineering & making", category: "technical" },
  { name: "Soldering & Fabrication", group: "Engineering & making", category: "technical", aliases: ["Soldering", "Woodworking"] },

  // ── Mathematics ─────────────────────────────────────────────────────────────
  { name: "Calculus", group: "Mathematics", category: "analytical" },
  { name: "Linear Algebra", group: "Mathematics", category: "analytical" },
  { name: "Probability", group: "Mathematics", category: "analytical" },
  { name: "Discrete Mathematics", group: "Mathematics", category: "analytical", aliases: ["Combinatorics"] },
  { name: "Number Theory", group: "Mathematics", category: "analytical" },
  { name: "Geometry", group: "Mathematics", category: "analytical" },
  { name: "Mathematical Olympiad", group: "Mathematics", category: "analytical", aliases: ["Competition Maths", "Competition Math", "Olympiad Maths"] },
  { name: "Mathematical Modelling", group: "Mathematics", category: "analytical", aliases: ["Mathematical Modeling"] },

  // ── Sciences ────────────────────────────────────────────────────────────────
  { name: "Physics", group: "Sciences", category: "analytical" },
  { name: "Chemistry", group: "Sciences", category: "analytical" },
  { name: "Biology", group: "Sciences", category: "analytical" },
  { name: "Laboratory Technique", group: "Sciences", category: "technical", aliases: ["Lab Skills", "Wet Lab"] },
  { name: "Molecular Biology", group: "Sciences", category: "technical", aliases: ["PCR", "Genetics"] },
  { name: "Environmental Science", group: "Sciences", category: "analytical", aliases: ["Sustainability Science"] },
  { name: "Astronomy", group: "Sciences", category: "analytical", aliases: ["Astrophysics"] },
  { name: "Neuroscience", group: "Sciences", category: "analytical" },
  { name: "Psychology", group: "Sciences", category: "analytical" },
  { name: "Scientific Method", group: "Sciences", category: "analytical" },

  // ── Design & visual ─────────────────────────────────────────────────────────
  { name: "Graphic Design", group: "Design & visual", category: "creative" },
  { name: "UI/UX Design", group: "Design & visual", category: "creative", aliases: ["UX Design", "UI Design", "Product Design"] },
  { name: "Figma", group: "Design & visual", category: "creative" },
  { name: "Adobe Photoshop", group: "Design & visual", category: "creative", aliases: ["Photoshop"] },
  { name: "Adobe Illustrator", group: "Design & visual", category: "creative", aliases: ["Illustrator"] },
  { name: "Canva", group: "Design & visual", category: "creative" },
  { name: "Illustration", group: "Design & visual", category: "creative", aliases: ["Drawing", "Digital Art"] },
  { name: "Typography", group: "Design & visual", category: "creative" },
  { name: "Branding", group: "Design & visual", category: "creative", aliases: ["Visual Identity"] },

  // ── Media & content ─────────────────────────────────────────────────────────
  { name: "Video Editing", group: "Media & content", category: "creative", aliases: ["Premiere Pro", "Final Cut", "CapCut", "DaVinci Resolve"] },
  { name: "Photography", group: "Media & content", category: "creative" },
  { name: "Videography", group: "Media & content", category: "creative", aliases: ["Filmmaking"] },
  { name: "Podcasting", group: "Media & content", category: "creative" },
  { name: "Content Creation", group: "Media & content", category: "creative", aliases: ["Social Content"] },
  { name: "Animation", group: "Media & content", category: "creative", aliases: ["Motion Graphics", "After Effects"] },
  { name: "Audio Production", group: "Media & content", category: "creative", aliases: ["Sound Design", "Music Production"] },
  { name: "Community Management", group: "Media & content", category: "communication" },

  // ── Project management ──────────────────────────────────────────────────────
  { name: "Project Management", group: "Project management", category: "leadership" },
  { name: "Event Planning", group: "Project management", category: "leadership", aliases: ["Event Management", "Organising Events"] },
  { name: "Time Management", group: "Project management", category: "leadership", aliases: ["Prioritisation"] },
  { name: "Planning & Scheduling", group: "Project management", category: "leadership", aliases: ["Scheduling"] },
  { name: "Risk Assessment", group: "Project management", category: "analytical" },
  { name: "Notion", group: "Project management", category: "technical", aliases: ["Trello", "Asana"] },
  { name: "Fundraising Campaigns", group: "Project management", category: "leadership" },

  // ── Languages ───────────────────────────────────────────────────────────────
  { name: "Translation", group: "Languages", category: "communication" },
  { name: "Interpreting", group: "Languages", category: "communication" },
  { name: "Academic English", group: "Languages", category: "communication", aliases: ["EAP"] },
  { name: "Linguistics", group: "Languages", category: "analytical" },

  // ── Community & social impact ───────────────────────────────────────────────
  { name: "Volunteering", group: "Community & social impact", category: "leadership", aliases: ["Community Service"] },
  { name: "Advocacy", group: "Community & social impact", category: "communication", aliases: ["Campaigning", "Activism"] },
  { name: "Community Outreach", group: "Community & social impact", category: "communication", aliases: ["Outreach"] },
  { name: "Peer Support", group: "Community & social impact", category: "communication", aliases: ["Peer Counselling"] },
  { name: "Teaching & Tutoring", group: "Community & social impact", category: "communication", aliases: ["Tutoring", "Teaching"] },
  { name: "Sustainability", group: "Community & social impact", category: "analytical", aliases: ["Climate Action", "Environmental Advocacy"] },
  { name: "Accessibility Awareness", group: "Community & social impact", category: "analytical", aliases: ["Inclusive Design"] },
  { name: "Charity Organising", group: "Community & social impact", category: "leadership", aliases: ["Non-profit Work", "NGO Work"] },

  // ── Arts & performance ──────────────────────────────────────────────────────
  { name: "Piano", group: "Arts & performance", category: "creative" },
  { name: "Guitar", group: "Arts & performance", category: "creative" },
  { name: "Violin", group: "Arts & performance", category: "creative" },
  { name: "Singing", group: "Arts & performance", category: "creative", aliases: ["Vocals", "Choir"] },
  { name: "Orchestra & Ensemble", group: "Arts & performance", category: "creative", aliases: ["Orchestra", "Band"] },
  { name: "Music Theory", group: "Arts & performance", category: "creative" },
  { name: "Theatre", group: "Arts & performance", category: "creative", aliases: ["Drama", "Acting"] },
  { name: "Dance", group: "Arts & performance", category: "creative" },
  { name: "Painting", group: "Arts & performance", category: "creative" },
  { name: "Sculpture & Ceramics", group: "Arts & performance", category: "creative", aliases: ["Ceramics", "Pottery"] },

  // ── Sport & wellbeing ───────────────────────────────────────────────────────
  { name: "Team Sport", group: "Sport & wellbeing", category: "other", aliases: ["Football", "Basketball", "Volleyball"] },
  { name: "Athletics", group: "Sport & wellbeing", category: "other", aliases: ["Track and Field", "Running"] },
  { name: "Swimming", group: "Sport & wellbeing", category: "other" },
  { name: "Chess", group: "Sport & wellbeing", category: "analytical" },
  { name: "Coaching & Refereeing", group: "Sport & wellbeing", category: "leadership", aliases: ["Refereeing", "Sports Coaching"] },
  { name: "First Aid", group: "Sport & wellbeing", category: "other", aliases: ["CPR"] },
];

/** Canonical names only — what `SuggestInput` offers and what gets stored. */
export const SKILL_NAME_SUGGESTIONS: string[] = SKILL_TAXONOMY.map((s) => s.name);

export const SKILL_GROUPS: SkillGroup[] = [...new Set(SKILL_TAXONOMY.map((s) => s.group))];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[.\-_/&]/g, " ").replace(/\s+/g, " ");
}

const BY_NORMALIZED = new Map<string, SkillDefinition>();
for (const skill of SKILL_TAXONOMY) {
  BY_NORMALIZED.set(normalize(skill.name), skill);
  for (const alias of skill.aliases ?? []) BY_NORMALIZED.set(normalize(alias), skill);
}

/**
 * Resolves a typed skill to its canonical definition, matching aliases.
 *
 * Returns null rather than a guess for anything unrecognised — an unknown skill is stored
 * as the student typed it, which is the point of keeping free text.
 */
export function resolveSkill(input: string): SkillDefinition | null {
  return BY_NORMALIZED.get(normalize(input)) ?? null;
}

/** The canonical spelling for a typed skill, or the trimmed input when it isn't known. */
export function canonicalSkillName(input: string): string {
  return resolveSkill(input)?.name ?? input.trim();
}

/**
 * Autocomplete over canonical names *and* aliases, so typing "ML", "Photoshop" or
 * "Competition Math" finds the canonical entry rather than nothing. Prefix matches rank
 * above substring matches; each canonical skill appears at most once.
 */
export function searchSkills(query: string, limit = 12): SkillDefinition[] {
  const q = normalize(query);
  if (q.length === 0) return SKILL_TAXONOMY.slice(0, limit);

  const scored = new Map<string, { skill: SkillDefinition; score: number }>();
  for (const [key, skill] of BY_NORMALIZED) {
    if (!key.includes(q)) continue;
    // A prefix hit on the canonical name is the strongest signal; an alias hit still
    // counts but should not outrank a direct name match.
    const isCanonical = normalize(skill.name) === key;
    const score = (key.startsWith(q) ? 2 : 0) + (isCanonical ? 1 : 0);
    const existing = scored.get(skill.name);
    if (!existing || score > existing.score) scored.set(skill.name, { skill, score });
  }

  return [...scored.values()]
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .slice(0, limit)
    .map((entry) => entry.skill);
}
