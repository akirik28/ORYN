/**
 * Canonical curriculum vocabularies (University Intelligence Spine — data/support layer only;
 * the reusable UI that consumes these, features/entities/suggest-input.tsx, is shared
 * infrastructure, but which product screens wire it in is a Claude-2/product decision).
 *
 * Every list here is a real, verified, current list from the curriculum's own official source
 * — not invented, not copied from a generic "AP courses" blog post. Kept as *suggestions*, not
 * a closed enum: `features/profile/field-config.ts`'s `"suggest"` field type never rejects a
 * typed value that isn't in the list, so a genuinely custom/regional course is always still
 * enterable. See `docs/handoffs/claude-a-university-spine.md` for the reconciliation-queue
 * design note on eventually mapping recurring custom values into these lists.
 */

/**
 * The complete official AP course list, College Board's own naming exactly (apstudents.
 * collegeboard.org/courses, verified live 2026-08-18 — 42 subjects across 8 categories).
 * Course names deliberately keep the "AP" prefix: unlike IB/A-Level, "AP Microeconomics" is
 * College Board's actual official course title, not a level-prefix + bare subject name — so
 * this list can be used directly for a `course_name`-shaped field without re-adding a prefix.
 */
export const AP_SUBJECTS = [
  // Arts
  "AP 2-D Art and Design",
  "AP 3-D Art and Design",
  "AP Drawing",
  "AP Art History",
  "AP Music Theory",
  // English
  "AP English Language and Composition",
  "AP English Literature and Composition",
  // History and Social Sciences
  "AP African American Studies",
  "AP Comparative Government and Politics",
  "AP European History",
  "AP Human Geography",
  "AP Macroeconomics",
  "AP Microeconomics",
  "AP Psychology",
  "AP United States Government and Politics",
  "AP United States History",
  "AP World History: Modern",
  // Math and Computer Science
  "AP Calculus AB",
  "AP Calculus BC",
  "AP Computer Science A",
  "AP Computer Science Principles",
  "AP Precalculus",
  "AP Statistics",
  // Sciences
  "AP Biology",
  "AP Chemistry",
  "AP Environmental Science",
  "AP Physics 1: Algebra-Based",
  "AP Physics 2: Algebra-Based",
  "AP Physics C: Electricity and Magnetism",
  "AP Physics C: Mechanics",
  // World Languages and Cultures
  "AP Chinese Language and Culture",
  "AP French Language and Culture",
  "AP German Language and Culture",
  "AP Italian Language and Culture",
  "AP Japanese Language and Culture",
  "AP Latin",
  "AP Spanish Language and Culture",
  "AP Spanish Literature and Culture",
  // AP Capstone Diploma Program
  "AP Research",
  "AP Seminar",
  // AP Career Kickstart
  "AP Business with Personal Finance",
  "AP Cybersecurity",
] as const;

/**
 * IB Diploma Programme subjects, bare course titles (no HL/SL suffix — that's the separate
 * `level` field, `COURSE_LEVEL_OPTIONS` in features/profile/field-config.ts; IB's own course
 * titles don't carry it as part of the name the way AP's do). Covers the widely-taken subject
 * in each of the 6 official groups (ibo.org/programmes/diploma-programme, cross-checked against
 * Wikipedia's IB Diploma Programme and IB Group 4/5/6 articles, 2026-08-18) — deliberately not
 * exhaustive: Group 1/2 (Language and Literature / Language Acquisition) genuinely span 80+
 * languages, which is exactly the long tail this list's custom-fallback exists for rather than
 * trying to enumerate.
 */
export const IB_SUBJECTS = [
  // Group 1 — Studies in Language and Literature (English shown as the common case for an
  // English-medium/international student population; any language is valid via custom entry)
  "English A: Literature",
  "English A: Language and Literature",
  // Group 2 — Language Acquisition
  "Language B",
  "Language ab initio",
  // Group 3 — Individuals and Societies
  "Economics",
  "Geography",
  "History",
  "Business Management",
  "Psychology",
  // Group 4 — Sciences
  "Biology",
  "Chemistry",
  "Physics",
  "Computer Science",
  "Environmental Systems and Societies",
  "Sports, Exercise and Health Science",
  // Group 5 — Mathematics
  "Mathematics: Analysis and Approaches",
  "Mathematics: Applications and Interpretation",
  // Group 6 — The Arts
  "Visual Arts",
  "Music",
  "Theatre",
  "Dance",
  "Film",
] as const;

/**
 * A-Level subjects, the most commonly taken ones by UK exam-board entry volume (Think Student /
 * FFT Education Datalab 2025 entry-count data, cross-checked, 2026-08-18) plus a few other
 * standard options every major board (AQA/Edexcel/OCR) offers. Not exhaustive — same
 * custom-fallback principle as AP/IB.
 */
export const A_LEVEL_SUBJECTS = [
  "Mathematics",
  "Further Mathematics",
  "Biology",
  "Chemistry",
  "Physics",
  "Psychology",
  "History",
  "Economics",
  "English Literature",
  "Geography",
  "Business Studies",
  "Computer Science",
  "Sociology",
  "Art and Design",
] as const;

/** Union suggestion list for a `course_name`-shaped field — students search across all three
 * curricula at once rather than needing `level` set first (that field-dependent-suggestion
 * behavior would need `DynamicFormFields` to pass sibling field values into suggestion
 * resolution, a real but larger change not made this pass — noted as a follow-up, not silently
 * skipped). Deduplicated defensively even though the three source lists don't currently
 * overlap, since AP names carry no prefix in IB/A-Level and vice versa. */
export const COURSE_NAME_SUGGESTIONS: string[] = [...new Set([...AP_SUBJECTS, ...IB_SUBJECTS, ...A_LEVEL_SUBJECTS])];
