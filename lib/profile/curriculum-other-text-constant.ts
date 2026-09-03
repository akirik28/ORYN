/** 100 chars -- matches migration 0109's own comment: enough for a real qualification name
 *  ("Deutsche Schule Istanbul — Deutsches Internationales Abitur"), short enough to keep this
 *  a "what qualification" field rather than an open notes box. Split into its own,
 *  non-server-only file so client components (the onboarding wizard, the profile editor)
 *  can share this exact number with the two Zod schemas and lib/profile/curriculum-other-
 *  text.ts's server-only liveness checks, without pulling "server-only" into a client
 *  bundle. */
export const CURRICULUM_OTHER_TEXT_MAX_LENGTH = 100;
