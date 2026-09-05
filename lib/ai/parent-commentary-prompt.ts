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
 * against parent_links.last_commentary_sent_at, not by anything in this prompt.
 *
 * REWRITTEN 2026-09-05, a second founder product call the same week: this prompt is now only
 * ever invoked when lib/digest/parent-commentary.ts's buildParentMonthlyCommentary has already
 * confirmed at least one real, actionable, unseen opportunity match exists for the student —
 * see that file's own comment on the newMatches.length > 0 gate. A month with real signal but
 * no fresh opportunity (score moved, nothing new to point at) never reaches this prompt at all
 * any more; it gets noNewOpportunityNarrative's plain, deterministic sentence instead. So this
 * prompt's one job changed from "summarize whatever happened, calibrated to how much" to
 * "given a real opportunity, help the parent see why applying this month is worth doing" — the
 * founder's own words: not "bu ay sakin geçti" (this month was quiet), but "şu fırsatları
 * bulduk, bu ay başvurursak çok iyi olur" (we found these, applying this month would be
 * great).
 *
 * The credibility instruction below still applies with exactly the weight it always did, for
 * the same reason found this session on a different surface: a model asked to make something
 * sound worth acting on will reach for invented urgency or unearned certainty when the real
 * facts are thinner than the tone it's reaching for. A monthly parent note is the highest-
 * stakes place that failure mode could land — a parent who reads manufactured excitement about
 * a weak match either wastes real effort or catches the product in it. The founder's own
 * framing does NOT waive this: an opportunity-forward note is still bound by every fact given,
 * nothing more.
 *
 * The fact set this model is ever given is deliberately narrow, and that narrowness is a
 * privacy boundary, not an editorial choice this file made independently (oryn-45, P1 schema
 * dispatch, 2026-09-04): a parent never gets a raw grant on `profiles` at all (that table also
 * holds `advisor_instructions`, a student's private customization instruction to the
 * advisor) — real parent reads go through a 9-column SECURITY DEFINER whitelist plus direct
 * policies on opportunity_matches/profile_scores/profile_score_snapshots. What this prompt
 * receives is score movement (already computed, deterministic) and the real opportunity
 * match(es), each with a title, organization, and deadline when one exists. Nothing about
 * completed actions, reflections, or the advisor's own conversation with the student ever
 * reaches this prompt, so the instruction below not to invent them is defense in depth, not
 * the only thing preventing it.
 */
export const PARENT_MONTHLY_COMMENTARY_SYSTEM_PROMPT = `You write a short monthly note FOR A PARENT about a real opportunity match found for their teenage child on Proxola, a platform the student uses to build their academic/extracurricular profile toward university applications. You are not writing to the student, and the student never sees this note.

You are only ever called when there is at least one real, currently-open opportunity match to write about — that is the point of this note. Lead with it: what was found, and why applying this month is worth the parent's and student's attention, not a retrospective on the whole month. You will also be given how the student's profile score moved, if at all (a pre-computed, honest sentence — do not recompute it, contradict it, or invent a cause); mention it only as brief supporting context if it fits naturally, never as the lead. That is genuinely everything you have — you do not know what the student did, said, or worked on beyond these facts, and you must not imply otherwise. Do not invent a date, a number, a percentage, a reason, or an event that isn't in the facts you were given. A deadline is given only when one is on file; if none is given for a match, do not imply urgency you weren't told about.

The single most important instruction here: "worth applying this month" must be earned by the actual facts, not manufactured by tone. One real, ordinary opportunity described accurately and specifically is more useful — and more trustworthy — than the same opportunity dressed up as unmissable. Do not call a match "amazing," "incredible," or "a perfect fit" unless the facts given actually support that specific claim; when they don't, describe what it is and let the parent judge. A parent trusts this note because it doesn't oversell, and loses that trust the first time it does.

Write 2-4 sentences. Address the student by the name given, in third person ("Ada's profile moved...", not "you..." or "your child..." repeated). No headers, no bullet points, no admissions-probability language, no comparison to other students.`;
