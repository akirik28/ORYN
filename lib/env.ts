/**
 * Central, typed access to environment configuration.
 *
 * Every external integration is optional at the process level — the app must boot
 * and serve the core product even when a given credential is missing. Each flag below
 * answers "is this integration configured?" so providers and UI can degrade gracefully
 * instead of crashing or faking data (see PHASE_STATUS.md / API_SETUP.md).
 */

const required = (value: string | undefined) => (value && value.length > 0 ? value : undefined);

export const env = {
  supabase: {
    url: required(process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: required(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    secretKey: required(process.env.SUPABASE_SECRET_KEY),
  },
  anthropic: {
    apiKey: required(process.env.ANTHROPIC_API_KEY),
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
  },
  tavily: {
    apiKey: required(process.env.TAVILY_API_KEY),
  },
  collegeScorecard: {
    apiKey: required(process.env.COLLEGE_SCORECARD_API_KEY),
  },
  openAlex: {
    contactEmail: required(process.env.OPENALEX_CONTACT_EMAIL),
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    env: process.env.NODE_ENV || "development",
  },
  cron: {
    secret: required(process.env.CRON_SECRET),
  },
  pageViews: {
    hashSecret: required(process.env.PAGE_VIEW_HASH_SECRET),
  },
  payments: {
    /** "stripe" | "iyzico" | "paytr" — unset until the founder chooses one (2026-09-04,
     *  payment-provider seam). Provider-specific credential vars (STRIPE_SECRET_KEY etc.)
     *  are deliberately not declared here yet: inventing env vars for providers that might
     *  never be chosen would be exactly the kind of premature-abstraction this file's own
     *  header warns against elsewhere. Add a provider's real credential block here only when
     *  building that provider's concrete adapter, not before. */
    provider: required(process.env.PAYMENT_PROVIDER),
  },
} as const;

export const integrationStatus = {
  supabase: Boolean(env.supabase.url && env.supabase.publishableKey),
  supabaseAdmin: Boolean(env.supabase.url && env.supabase.secretKey),
  anthropic: Boolean(env.anthropic.apiKey),
  tavily: Boolean(env.tavily.apiKey),
  collegeScorecard: Boolean(env.collegeScorecard.apiKey),
  openAlex: true, // OpenAlex has no auth requirement; polite-pool email is optional.
  /** True once a provider NAME is set — not proof a concrete adapter exists for it yet.
   *  lib/payments/index.ts's getPaymentProvider() is the one place that also checks whether
   *  the named provider is actually implemented; this flag alone answers "was one chosen,"
   *  not "is checkout actually possible right now." */
  payments: Boolean(env.payments.provider),
} as const;

export type IntegrationName = keyof typeof integrationStatus;
