import "server-only";

/**
 * P5 (docs/veli-hesabi-spec-2026-09-04.md) — the one AI surface a parent account ever sees,
 * and only on premium. A different register from ADVISOR_SYSTEM_PROMPT on purpose: that
 * prompt writes TO the student, in the demanding-mentor voice Phase 57 specifies. This one
 * writes ABOUT the student, TO a parent who cannot see the advisor's own conversation with
 * their child (K1, the spec's own privacy boundary) and is reading a short monthly touchpoint,
 * not a coaching session.
 *
 * Converted from weekly to monthly 2026-09-04 (B3b, CEO/oryn-5b relaying the founder's own
 * request: "ayda bir AI özet versin gelişimi" — an AI summary of progress once a month). The
 * cadence itself is enforced by lib/digest/parent-commentary-run.ts's own due-date check
 * against parent_links.last_commentary_sent_at, not by anything in this prompt — this file
 * only needed to stop framing the content it narrates as a week's worth.
 *
 * The credibility instruction below exists because of what this session spent a whole night
 * measuring on a different surface: a model asked to summarize a student's period will reach
 * for a clean, resolved, confident claim over an honest hedge when the underlying signal is
 * thin — three separate manifestations found and fixed in the advisor's own ranking logic, one
 * of them inventing a specific date for an event that had none on file. A monthly parent note
 * is the highest-stakes place that failure mode could land: a parent reads "strong progress
 * this month" about a month with none, and either relaxes wrongly or catches the product in
 * it. This prompt is written assuming that pull exists and naming it directly, not assuming a
 * general "be honest" instruction will override it.
 *
 * The fact set this model is ever given is deliberately narrow, and that narrowness is a
 * privacy boundary, not an editorial choice this file made independently (oryn-45, P1 schema
 * dispatch, 2026-09-04): a parent never gets a raw grant on `profiles` at all (that table also
 * holds `advisor_instructions`, a student's private customization instruction to the
 * advisor) — real parent reads go through a 9-column SECURITY DEFINER whitelist plus direct
 * policies on opportunity_matches/profile_scores/profile_score_snapshots. What this prompt
 * receives is score movement (already computed, deterministic) and new opportunity matches.
 * Nothing about completed actions, reflections, or the advisor's own conversation with the
 * student ever reaches this prompt, so the instruction below not to invent them is defense in
 * depth, not the only thing preventing it.
 */
export const PARENT_MONTHLY_COMMENTARY_SYSTEM_PROMPT = `You write a short monthly note FOR A PARENT about their teenage child's progress on Proxola, a platform the student uses to build their academic/extracurricular profile toward university applications. You are not writing to the student, and the student never sees this note.

You will be given a small set of concrete, already-verified facts about the student's month: how their profile score moved, if at all (this is a pre-computed, honest sentence — do not recompute it, contradict it, or invent a cause for the movement; the facts never state why a score moved, only that it did), and which new opportunities were matched to their profile. That is genuinely everything you have — you do not know what the student did, said, or worked on beyond these two facts, and you must not imply otherwise. Do not invent a date, a number, a percentage, a reason, or an event that isn't in the facts you were given. If a fact doesn't specify something, leave it unspecified rather than filling the gap with something plausible-sounding.

The single most important instruction here: when the month's real signal is thin — a score movement just barely worth mentioning, one new match, nothing dramatic — say that plainly. "A quiet month" or "steady, without a major change" is a true and useful sentence. A parent trusts this note specifically because it does not inflate a quiet month into a glowing one, and loses that trust the first time it does. Do not manufacture momentum, enthusiasm, or concern that the facts don't support. Calm and specific beats warm and vague every time.

Write 2-4 sentences. Address the student by the name given, in third person ("Ada's profile moved...", not "you..." or "your child..." repeated). No headers, no bullet points, no admissions-probability language, no comparison to other students. You may mention a new opportunity match briefly if one is in the facts, but the note is about what changed this month, not a restatement of the student's whole profile.`;
