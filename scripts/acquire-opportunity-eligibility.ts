#!/usr/bin/env node
/**
 * Opportunity eligibility acquisition — country, citizenship, age, and grade-level facts,
 * sourced from each organizer's own official page.
 *
 * Of 275 active opportunities (measured 2026-08-31 against `lib/counselor/eligibility.ts`'s
 * own gating predicate, not a guess): 172 carry no country/citizenship eligibility signal at
 * all — no `eligible_countries`, no `eligible_citizenships`, no `citizenship_restrictions`/
 * `residency_restrictions` prose, and `country_eligibility_confirmed_open` still at its honest
 * default of `false` — and 138 have neither `minimum_age`/`maximum_age` nor `eligible_grades`.
 * For most of the catalogue the engine cannot answer "can I actually apply?" and the card says
 * "Country eligibility hasn't been verified for this opportunity yet" instead of yes or no.
 *
 * THE RULE THIS SCRIPT EXISTS TO ENFORCE: sourced or absent. A field is written only when the
 * organizer's own page states it, and every write is grounded against the REAL fetched text —
 * never against a model's unverified claim that it quoted something. This directly implements
 * the two costliest lessons from the 2026-08-23 opportunity-corpus audit (kept here rather than
 * only in memory, since this is the code they now govern):
 *
 *   - "A label our own pipeline wrote is not evidence. Quotation marks our own pipeline wrote
 *     are not evidence of quotation." So every field the model returns must carry a `quote` —
 *     and this script re-checks, in code, that the quote is an actual substring of the text
 *     that was actually fetched, before writing anything. A quote that doesn't verify is
 *     dropped, not trusted. See verifyGrounding() below.
 *   - "Copy the clause, not the sentence — especially when the claim restricts. If a
 *     restrictive quote contains 'either', go find the 'or'." A truncated eligibility clause
 *     silently flips from permissive to restrictive (or the reverse) and would hide the
 *     opportunity from exactly the students it should reach. See checkEitherOrTruncation().
 *
 * "OPEN TO INTERNATIONAL STUDENTS" IS NOT A COUNTRY LIST, AND SILENCE IS NOT "OPEN WORLDWIDE".
 * Three-way classification per field (restricted / confirmed_open / not stated), matching
 * migration 0060's own tri-state design: an explicit, unambiguous no-country-gate statement
 * sets `country_eligibility_confirmed_open = true` (the column built for exactly this so the
 * counselor renders silence rather than a confusing "restriction on file: none"); an explicit
 * list sets `eligible_countries`/`eligible_citizenships`; anything short of an explicit
 * statement — marketing copy, a hero banner, an FAQ aside next to a country-silent formal
 * eligibility section — writes nothing at all. The DB's own check constraint
 * (opportunities_confirmed_open_no_structured_restriction) forbids asserting both at once;
 * this script enforces the same rule before ever attempting the write.
 *
 * SCOPE: only rows where the target field is currently empty/null. This pass fills gaps: it
 * never overwrites a prior research pass's existing value, populated or not, in either
 * direction — not because a prior value is assumed correct, but because auditing existing
 * values is a different task than this one. It does not touch image_* (a separate, already-
 * complete lane) or `description` (a separate lane's territory, per direct instruction).
 *
 * Usage:
 *   npx tsx scripts/acquire-opportunity-eligibility.ts                    # dry run
 *   npx tsx scripts/acquire-opportunity-eligibility.ts --limit 20
 *   npx tsx scripts/acquire-opportunity-eligibility.ts --only "HMMT"
 *   npx tsx scripts/acquire-opportunity-eligibility.ts --category competition
 *   npx tsx scripts/acquire-opportunity-eligibility.ts --apply             # + write
 *   npx tsx scripts/acquire-opportunity-eligibility.ts --verbose           # + per-row detail
 *   npx tsx scripts/acquire-opportunity-eligibility.ts --report            # DB-only coverage
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

// Same guard as both opportunity-images and university-images: this run fetches a couple
// hundred arbitrary, unvetted organizer hosts, and one malformed TLS response throws below the
// fetch Promise where no per-call try/catch can see it. One bad server should cost one row.
process.on("uncaughtException", (error) => {
  console.error(`  [uncaughtException, continuing] ${error instanceof Error ? error.message : error}`);
});
process.on("unhandledRejection", (reason) => {
  console.error(`  [unhandledRejection, continuing] ${reason instanceof Error ? reason.message : reason}`);
});

import { z } from "zod";
import { Anthropic } from "@anthropic-ai/sdk";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";
import { domainOf, sourceAuthority } from "../lib/acquisition/source-authority";

const FETCH_TIMEOUT_MS = 20_000;
const CONCURRENCY = 4;
const MAX_PAGE_CHARS = 9_000;
/** Total across every page fed to one extraction call — keeps a single row's cost bounded
 * even when the primary page plus two eligibility-shaped sub-pages are all substantial. */
const MAX_TOTAL_SOURCE_CHARS = 22_000;

// ---------------------------------------------------------------------------------------------
// Fetch plumbing — same small helpers as the sibling acquisition scripts, not imported from
// them (no shared module between standalone `tsx` scripts in this codebase; see the image
// scripts' own identical duplication of timedFetch/withRetry/withUserAgent).
// ---------------------------------------------------------------------------------------------

function timedFetch(ms: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}

function withRetry(fetchFn: typeof fetch, retries = 1): typeof fetch {
  return async (input, init) => {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetchFn(input, init);
        if (response.ok || attempt >= retries) return response;
      } catch (error) {
        if (attempt >= retries) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  };
}

function withUserAgent(fetchFn: typeof fetch, userAgent: string): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("User-Agent", userAgent);
    if (!headers.has("Accept")) headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    return fetchFn(input, { ...init, headers });
  };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fetchText(url: string, fetchImpl: typeof fetch): Promise<{ html: string; status: number } | null> {
  try {
    const response = await fetchImpl(url);
    if (!response.ok) return { html: "", status: response.status };
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.toLowerCase().includes("html") && !contentType.toLowerCase().includes("text")) {
      return { html: "", status: response.status };
    }
    return { html: await response.text(), status: response.status };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// HTML -> lightly-structured text. Not a DOM parser (same tradeoff opengraph.ts makes) — but
// unlike a single meta-tag extraction, eligibility prose needs SOME structural signal to judge
// "is this inside a formal eligibility section" (memory rule 2: placement decides weight), so
// headings are kept and marked rather than discarded into the same stream as body text.
// ---------------------------------------------------------------------------------------------

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&(?:amp|AMP);/g, "&")
    .replace(/&(?:quot|QUOT);/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&(?:lt|LT);/g, "<")
    .replace(/&(?:gt|GT);/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function htmlToStructuredText(html: string, maxChars: number): string {
  let body = html.replace(/<head[\s\S]*?<\/head>/gi, "");
  body = body.replace(/<(script|style|noscript|svg|nav|footer)[\s\S]*?<\/\1>/gi, " ");
  // Headings get a visible marker so "## Eligibility" reads distinctly from body prose —
  // this is the whole structural signal the extraction prompt has to judge placement with.
  body = body.replace(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi, (_, inner) => `\n\n## ${inner.replace(/<[^>]+>/g, " ")} ##\n`);
  body = body.replace(/<li[^>]*>/gi, "\n- ");
  body = body.replace(/<\/(p|div|tr|br)>/gi, "\n");
  body = body.replace(/<br\s*\/?>/gi, "\n");
  body = body.replace(/<[^>]+>/g, " ");
  body = decodeHtmlEntities(body);
  body = body.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return body.slice(0, maxChars);
}

/** Anchor hrefs + visible text, for finding an eligibility-shaped sub-page from the primary
 * page's own nav/body rather than guessing a fixed subpath list — a page's own links are a
 * better predictor of where "Eligibility"/"Who Can Apply" actually lives than a guessed slug. */
function extractLinks(html: string, baseUrl: string): { url: string; text: string }[] {
  const links: { url: string; text: string }[] = [];
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const text = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    try {
      const absolute = new URL(match[1], baseUrl).toString();
      links.push({ url: absolute, text });
    } catch {
      // Unparseable href (mailto:, javascript:, malformed) — skip.
    }
  }
  return links;
}

const ELIGIBILITY_LINK_PATTERN = /eligib|who.?can.?apply|requirement|admission|apply|rules?\b|criteria|faq/i;
const ELIGIBILITY_KEYWORD_DENSITY_PATTERN = /eligib|who can (apply|compete|participate)|must be \d|age[sd]?\s*\d|grade[sd]?\s*\d|citizen|residen|nationality/gi;

// ---------------------------------------------------------------------------------------------
// Candidate page resolution
// ---------------------------------------------------------------------------------------------

interface SourcedPage {
  url: string;
  text: string;
}

async function resolvePages(officialUrl: string, applicationUrl: string | null, fetchImpl: typeof fetch): Promise<{ pages: SourcedPage[]; anyReachable: boolean }> {
  const organizerDomain = domainOf(officialUrl);
  if (!organizerDomain) return { pages: [], anyReachable: false };
  const officialDomains = new Set([organizerDomain]);
  const isAuthorized = (url: string) => Boolean(sourceAuthority("opportunities", url, officialDomains));

  const pages: SourcedPage[] = [];
  let anyReachable = false;
  const visited = new Set<string>();

  const primary = await fetchText(officialUrl, fetchImpl);
  if (primary && primary.html) {
    anyReachable = true;
    visited.add(officialUrl);
    const text = htmlToStructuredText(primary.html, MAX_PAGE_CHARS);
    pages.push({ url: officialUrl, text });

    const keywordHits = (text.match(ELIGIBILITY_KEYWORD_DENSITY_PATTERN) ?? []).length;
    // Thin on eligibility language -> the real content likely lives on a dedicated page.
    // Score the primary page's own links and follow the best same-domain matches.
    if (keywordHits < 3) {
      const links = extractLinks(primary.html, officialUrl)
        .filter((l) => isAuthorized(l.url) && !visited.has(l.url) && ELIGIBILITY_LINK_PATTERN.test(l.text + " " + l.url))
        .slice(0, 8);
      const seenUrls = new Set<string>();
      for (const link of links) {
        if (pages.length >= 3) break;
        if (seenUrls.has(link.url)) continue;
        seenUrls.add(link.url);
        visited.add(link.url);
        const sub = await fetchText(link.url, fetchImpl);
        if (sub && sub.html) {
          anyReachable = true;
          pages.push({ url: link.url, text: htmlToStructuredText(sub.html, MAX_PAGE_CHARS) });
        }
      }
    }
  } else if (primary) {
    anyReachable = false; // reached the server, got a non-ok/non-html response
  }

  if (applicationUrl && applicationUrl !== officialUrl && !visited.has(applicationUrl) && isAuthorized(applicationUrl) && pages.length < 2) {
    const appPage = await fetchText(applicationUrl, fetchImpl);
    if (appPage && appPage.html) {
      anyReachable = true;
      pages.push({ url: applicationUrl, text: htmlToStructuredText(appPage.html, MAX_PAGE_CHARS) });
    }
  }

  // Total-budget trim, applied last so the primary page is never the one cut short.
  let budget = MAX_TOTAL_SOURCE_CHARS;
  const trimmed: SourcedPage[] = [];
  for (const page of pages) {
    if (budget <= 0) break;
    const slice = page.text.slice(0, budget);
    trimmed.push({ url: page.url, text: slice });
    budget -= slice.length;
  }

  return { pages: trimmed, anyReachable };
}

// ---------------------------------------------------------------------------------------------
// Extraction contract. Every claimed fact carries a verbatim `quote` + the `quoteSourceUrl` it
// came from; a category with nothing found simply omits its fields. `status` is the tri-state
// from migration 0060: "restricted" needs a list, "confirmed_open" needs an explicit
// no-restriction statement, "not_stated" means don't write anything for this category.
// ---------------------------------------------------------------------------------------------

const ELIGIBILITY_TOOL_NAME = "record_opportunity_eligibility";

const CountryFieldSchema = z.object({
  status: z.enum(["restricted", "confirmed_open", "not_stated"]),
  countries: z.array(z.string()).nullable().optional(),
  quote: z.string().nullable().optional(),
});

const AgeFieldSchema = z.object({
  minimum: z.number().int().nullable().optional(),
  maximum: z.number().int().nullable().optional(),
  quote: z.string().nullable().optional(),
});

const GradeFieldSchema = z.object({
  grades: z.array(z.string()).nullable().optional(),
  quote: z.string().nullable().optional(),
});

const FreeTextNoteSchema = z.object({
  /** An explicit decision, not inferred from whether note/quote happen to be filled in — the
   * structured signal that replaced trying to detect, after the fact, whether prose the model
   * wrote was itself describing the ABSENCE of a fact ("no formal rule is stated", "does not
   * specify", "isn't explicit about"...). Three real, differently-worded misses of that kind
   * survived two rounds of regex tightening in the audit that led here — the model kept finding
   * new phrasings for "nothing found" faster than a blocklist could enumerate them, and the
   * evasive phrasing often still contains "residency"/"citizenship" literally, so it also
   * passed the topic-relevance check. Forcing the decision into its own boolean removes the
   * need to guess at prose intent altogether. */
  hasRelevantFact: z.boolean(),
  note: z.string().nullable().optional(),
  quote: z.string().nullable().optional(),
});

const ExtractionSchema = z.object({
  country: CountryFieldSchema,
  citizenship: CountryFieldSchema,
  /** Structural/nuanced restrictions that don't fit a clean country/citizenship list —
   * membership gates, coach/supervisor requirements, financial-aid-only distinctions. Kept
   * separate from country/citizenship per schema-gap item 18: a financial-aid-only restriction
   * is not a participation bar and must never be written where it would read as one. */
  citizenshipNote: FreeTextNoteSchema,
  residencyNote: FreeTextNoteSchema,
  age: AgeFieldSchema,
  grade: GradeFieldSchema,
});
type Extraction = z.infer<typeof ExtractionSchema>;

const SYSTEM_PROMPT = `You are a careful eligibility-fact extractor for Oryn, a college-planning product for students aged 14-18. You are given the text of one or more pages from a student opportunity's own official organizer site. Your ONLY job is to find and quote what the page ITSELF explicitly states about who may apply — never to infer, estimate, or fill a gap with a reasonable guess.

THE CENTRAL RULE: sourced or absent. A guessed eligibility fact is worse than an unknown one, because a student either wastes an application on something they didn't qualify for, or skips something they actually could have entered. If the page does not explicitly state a fact, leave the corresponding field empty/null. Do not reason "the page doesn't mention citizenship, so it's probably open to everyone" — that is exactly the mistake this task exists to prevent. Silence is not a statement.

EVERY CLAIMED FACT NEEDS A VERBATIM QUOTE. For every field where you report a status other than "not stated" / a note / an age / a grade, you MUST provide a "quote" that is copied character-for-character from the provided text — not paraphrased, not summarized, not reconstructed from memory. If you cannot find literal text to copy, you don't have the fact; report "not_stated" / omit the field instead. Your quotes will be programmatically checked against the actual source text, and any quote that doesn't match exactly will be discarded — so do not approximate.

COPY THE WHOLE CLAUSE, NOT JUST THE FIRST PART. If the sentence you're quoting contains "either", find and include the matching "or" and the rest of that clause — a truncated quote can flip a permissive rule into a restrictive-looking one or vice versa. If it's one item in a list of conditions, quote the whole list, not one bullet.

COUNTRY / CITIZENSHIP — three distinct answers, choose exactly one status per field:
- "restricted": the page names specific eligible countries/citizenships/regions (e.g. "open to residents of the United States, Canada, and Mexico", "US citizens and permanent residents only"). List them in "countries" using standard English country names (e.g. "United States", "United Kingdom", "Turkey") — never a region name like "Europe" or "international" as if it were a country.
- "confirmed_open": the page makes an EXPLICIT, unambiguous statement that there is no country or citizenship restriction — e.g. "open to students from any country", "no citizenship or residency requirement", "international applicants are welcome and receive financial aid on the same basis as domestic applicants". This must be a COMPLETE SENTENCE making an affirmative eligibility claim — never a tagline, slogan, or hero-banner headline (e.g. "Any Idea, Any Team, Any Country" is marketing copy, not an eligibility statement, even though it implies the same thing). Not silence, and not a vague marketing line like "students from 50+ countries" sitting in a hero banner with no formal eligibility section nearby.
- "not_stated": the page says nothing usable either way. This is the default — most opportunities will genuinely be "not_stated" for at least one of country/citizenship, and that is a correct, honest answer, not a failure.

PLACEMENT MATTERS. A sentence under a heading like "Eligibility", "Who Can Apply", "Requirements", or "Rules" carries real weight. A marketing claim in a hero section or an FAQ aside, especially one sitting next to a formal eligibility section that itself says nothing about country, should generally be treated as NOT sufficient for "confirmed_open" — prefer "not_stated" unless the statement is genuinely explicit and unambiguous on its own terms.

CITIZENSHIP/RESIDENCY NOTES (citizenshipNote, residencyNote): narrow fields, for genuine nationality/citizenship/residency-status caveats ONLY that don't fit a clean country list — e.g. "financial aid differs for international applicants but participation itself is open to all", "citizens and permanent residents only; visa holders of type X also eligible", "in-person round requires a visa; denial allows a one-year deferment". The text must be substantively ABOUT the applicant's country, citizenship, nationality, residency, or immigration/visa status.

Do NOT use citizenshipNote/residencyNote for anything else, even if it is a real, verifiable restriction on the page. In particular, never put these kinds of facts there — they are not citizenship/residency facts and mislabeling them is worse than omitting them, because a future reader will trust the column name:
 - team size/composition rules ("teams of up to 5 students from any class or school")
 - application requirements (needing a referee, recommendation letter, coach, or advisor)
 - age or parental-consent rules (those belong in the age field, not here)
 - a requirement to be nominated by, or enrolled at, a specific school or organization
 - generic "who this is for" marketing copy ("compete against teams from around the world", "join students from 50+ countries")
If a real restriction exists but doesn't fit this narrow citizenship/residency definition, leave both note fields empty — Oryn has no correct field for it yet, and there is no acceptable field to force it into.

Each note field starts with hasRelevantFact: a plain boolean. Set it to false — and leave note/quote empty — whenever there is nothing genuinely citizenship/residency-specific to report; this is the correct, expected answer most of the time. Set it to true ONLY when you have a real citizenship/residency-specific fact to report, and in that case note/quote must both be filled in. NEVER set hasRelevantFact: true and then write a note whose own content is about the ABSENCE of a rule ("no citizenship rule is stated", "not specified on the page", "no formal rule is stated") — that is exactly the false case, not the true one, no matter how the sentence is worded.

Keep the note itself SHORT and factual (under 200 characters) but the "quote" field must still be the full verbatim source sentence(s) it's drawn from. Do not use these fields to restate a clean country list you already put in country/citizenship.

AGE: the age fields are about the STUDENT APPLICANT, never anyone else. Some competitions separately require an adult supervisor/coach/chaperone to be a minimum age (e.g. "teams must have an adult supervisor at least 21 years old") — that is a fact about the chaperone, not the student, and must NOT be extracted into age.minimum/age.maximum even though it is a real, quotable number on the page.

COUNTRY NAMES MUST BE STATED, NOT INFERRED FROM CONTEXT. Only put a country in "countries" if that country's name (or a standard abbreviation like "U.S."/"USA"/"UK") is actually present in your quote. A program's About page saying it "serves students throughout New York City" does NOT mean you may write "United States" — that is inferring a country from a city name and a general sense of where the organization is based, not reading a stated eligibility rule. If you can't quote the actual country name, leave the field not_stated.

GRADE LEVELS FROM NON-US CURRICULA: if a page describes eligibility using another country's school-year system (e.g. "second year of high school" in a 5-year Italian liceo, "Terminale", "Abitur year", "Lise 3") and you are not confident of the exact US grade-9-12 equivalent, leave grade empty rather than guessing a range — do not default to the full 9-12 range just because the program is clearly high-school-level.

EXCLUSIVE VS INCLUSIVE AGE BOUNDS — get this exactly right, since a one-year error in the wrong direction tells a student they're eligible when they aren't (or the reverse). This product's maximum_age is INCLUSIVE: a student whose age EQUALS maximum_age is still eligible; only older is excluded. Same for minimum_age: equal is eligible, only younger is excluded.
 - "under 20", "younger than 20", "below 20", "less than 20" is EXCLUSIVE — age 20 itself is NOT eligible, so the correct maximum to report is 19, not 20.
 - "not exceed 20", "20 or younger", "up to 20", "no more than 20", "at most 20", "20 and under" is INCLUSIVE — age 20 IS eligible, so report maximum = 20 as stated.
 - "over 15", "older than 15", "above 15", "more than 15" is EXCLUSIVE — age 15 itself is NOT eligible, so the correct minimum to report is 16, not 15.
 - "at least 15", "15 or older", "15 and up", "minimum age 15" is INCLUSIVE — age 15 IS eligible, so report minimum = 15 as stated.
Always report the already-adjusted, correct inclusive number — never the bare number that appeared next to an exclusive word like "under"/"over".

AGE (continued): only extract "minimum"/"maximum" when the page states a literal age in years AS AN ACTUAL RULE (e.g. "ages 14-18", "must be at least 15 years old"). Do NOT convert a birth-year or birth-date window into an age yourself — that conversion needs a reference date you don't have and produces off-by-one errors. If the page only gives birth years, leave age empty. Watch for the difference between a RULE and a DESCRIPTION OF TYPICAL PARTICIPANTS: "there is no bottom cut-off, though most participants are at least 10" is explicitly saying there is NO minimum-age rule — extracting minimum=10 from that sentence would directly contradict what the sentence itself says. If a sentence uses words like "most", "typically", "on average", or explicitly denies having a cutoff/limit, do not extract a number from it.

GRADE: only extract "grades" (as numeric strings like "9","10","11","12") when the page states a literal grade number (e.g. "grades 9-12", "rising 10th graders", "9th through 11th grade"). Do NOT map words like "freshman/sophomore/junior/senior" to numbers yourself, and do not infer a grade range from an age range — leave it empty unless a literal grade number is stated. This product only ever serves grades 9 through 12, so an OPEN-ENDED statement like "grade 12 or below" or "10th grade and under" means the full range ["9","10","11","12"] is welcome (advanced younger students included) — return all four grades in that case, not just the single number named, since returning only "12" would incorrectly imply grade 9-11 students are NOT eligible when the source says the opposite.

If a page provides genuinely nothing on a topic, that is the correct and expected answer for most opportunities. Do not strain to find something to report.`;

function buildUserPrompt(title: string, organization: string | null, pages: SourcedPage[]): string {
  const pageBlocks = pages
    .map((p, i) => `--- PAGE ${i + 1} (source: ${p.url}) ---\n${p.text}`)
    .join("\n\n");
  return `Opportunity: "${title}"${organization ? ` (organizer: ${organization})` : ""}\n\n${pageBlocks}\n\n--- END OF PAGES ---\n\nExtract eligibility facts per the rules above. Every quote must be copied verbatim from one of the PAGE blocks above and must include the source page number.`;
}

function toToolInputSchema(schema: z.ZodType<unknown>) {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema as Anthropic.Tool.InputSchema;
}

async function extractEligibility(
  client: Anthropic,
  model: string,
  title: string,
  organization: string | null,
  pages: SourcedPage[]
): Promise<{ data: Extraction; usage: { inputTokens: number; outputTokens: number } } | null> {
  const tool: Anthropic.Tool = {
    name: ELIGIBILITY_TOOL_NAME,
    description: "Record the eligibility facts explicitly stated on the provided official pages, each with a verbatim source quote.",
    input_schema: toToolInputSchema(ExtractionSchema),
  };
  let lastError: string | null = null;
  const basePrompt = buildUserPrompt(title, organization, pages);

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = lastError
      ? `${basePrompt}\n\nYour previous response did not match the required schema: ${lastError}\nPlease call ${ELIGIBILITY_TOOL_NAME} again with corrected input.`
      : basePrompt;
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
        tools: [tool],
        tool_choice: { type: "tool", name: ELIGIBILITY_TOOL_NAME },
      });
      const usage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
      const toolUse = message.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        lastError = "Model did not call the required tool.";
        continue;
      }
      const parsed = ExtractionSchema.safeParse(toolUse.input);
      if (parsed.success) return { data: parsed.data, usage };
      lastError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (error) {
      // Never retried, never swallowed into the generic error bucket — see
      // isBillingExhaustedError's own comment for why this specific condition is fatal.
      if (isBillingExhaustedError(error)) throw error;
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  console.error(`  extraction failed after retry: ${lastError}`);
  return null;
}

// ---------------------------------------------------------------------------------------------
// Grounding verification — the anti-hallucination gate. A quote is trusted only after it is
// confirmed to be a real substring of text this script itself fetched.
// ---------------------------------------------------------------------------------------------

function normalizeForMatch(text: string): string {
  return text.replace(/\s+/g, " ").replace(/[""]/g, '"').replace(/['']/g, "'").trim().toLowerCase();
}

/** True if `quote` appears, whitespace/smart-quote-normalized, inside any of `pages`. Returns
 * the matching page's URL so callers can record which specific page grounded the claim. */
function verifyGrounding(quote: string | null | undefined, pages: SourcedPage[]): { ok: boolean; sourceUrl: string | null } {
  if (!quote || quote.trim().length < 8) return { ok: false, sourceUrl: null };
  const needle = normalizeForMatch(quote);
  for (const page of pages) {
    if (normalizeForMatch(page.text).includes(needle)) return { ok: true, sourceUrl: page.url };
  }
  return { ok: false, sourceUrl: null };
}

/** Defense against the two miscategorization failures a manual audit of the first dry run
 * actually found (not hypothetical): a real, grounded quote about team composition, a referee
 * requirement, or parental consent, written into citizenship_restrictions/residency_restrictions
 * as if it were a nationality fact; and a note whose own content describes the ABSENCE of a
 * rule ("no citizenship rule is stated") rather than being left null. Grounding alone cannot
 * catch either — both quotes were entirely real. This is a keyword-relevance floor, not a
 * guarantee of correctness, and deliberately excludes vague geographic words ("worldwide",
 * "around the world", "global") that memory rule 2 specifically warns read as solid evidence
 * in some records and marketing filler in others — those stay gated on the LLM's own judgment
 * plus the other checks, not auto-passed by keyword alone. */
// Broadened after the false-positive audit the CEO specifically asked for (checking whether
// the gates themselves commit narrowing errors): the original phrase-exact list rejected
// several genuinely relevant, correctly-grounded facts because their real wording didn't match
// the exact phrases required — "country of residence" (IBB), "Florida residents" (SSTP),
// "domestic and international participants" (Stanford Pre-Collegiate), "International
// applicants" (Notre Dame), "join via their country's designated national team" (FIRST Global)
// were all real citizenship/residency-adjacent facts, held back only because "resident of" and
// "international student" are narrower phrases than English actually uses. Stemmed/loosened to
// the underlying concepts (a residen* stem catches resident/residents/residency/residence; bare
// domestic/international; bare country/countries) — checked against every previously-confirmed
// BAD case (Earth Prize's team-composition note, JLI's referee requirement, JLI's parental
// consent) before widening, and none of those contain any of these words, so this broadening
// doesn't reopen the failure this gate exists to prevent.
const CITIZENSHIP_RELEVANCE_PATTERN = /citizen|citizenship|nationality|passport|visa|residen\w*|domestic|international|\bcountr(y|ies)\b/i;

/** Caught in a 30-row audit: Battle Code MIT's "US Qualifier" division text ("Teams must
 * consist entirely of US college students") was read as a citizenship fact for a row Oryn
 * shows to 14-18-year-olds — the real content is a COLLEGE-enrollment gate for what is likely
 * a different division of the same competition (the umbrella-row problem, memory item 15;
 * Battlecode's own separate High School Tournament is the actually-relevant track). A quote
 * describing college/university students, with no "high school" qualifier anywhere in it, is
 * describing a population this product doesn't serve — reject rather than apply that division's
 * rule to the row. */
const COLLEGE_POPULATION_PATTERN = /\b(college|university)\s+students?\b/i;
const HIGH_SCHOOL_QUALIFIER_PATTERN = /high.?school/i;

/** Caught in the same audit: World Scholar's Cup's own page says "there is no bottom cut-off,
 * though most participants are at least 10" — a demographic OBSERVATION, not a rule — and it
 * was written as minimum_age = 10, directly contradicting the source's own explicit "no
 * cut-off" statement. Grounding cannot catch this: the quote is entirely real. This is a
 * semantic-alignment check on top of grounding — a quote that itself denies having a cutoff,
 * or that reads as a typical-participant statistic rather than a stated requirement, must not
 * be accepted as the value it's attached to. */
const NO_CUTOFF_PATTERN = /\bno\b[^.]{0,30}\b(bottom|lower|minimum|upper|maximum|top)\b[^.]{0,20}\b(cut.?off|limit|requirement)\b/i;

/** Caught in the full-corpus widening-error audit the CEO specifically asked for: IEO's own
 * page says "under the age of 20" (EXCLUSIVE — a 20-year-old is not eligible) and it was
 * written as maximum_age = 20, which this product's own comparison (`age > maximumAge` is the
 * only exclusion, in lib/opportunities/matching.ts) reads as INCLUSIVE — silently admitting the
 * exact 20-year-olds the source excludes. Grounding and the prompt instruction above both
 * survive this error (the quote is real; the model was simply told to self-adjust and didn't),
 * so this is a numeric cross-check: if the quote's own exclusive wording ("under"/"younger
 * than"/"below"/"less than" N, or "over"/"older than"/"above"/"more than" N) names the SAME
 * number the field is reporting, the required -1/+1 adjustment evidently wasn't applied. */
function findExclusiveBoundMismatch(quote: string, reportedMax: number | null | undefined, reportedMin: number | null | undefined): string | null {
  const underMatch = quote.match(/\b(?:under|younger than|below|less than)\s+(\d{1,2})\b/i);
  if (underMatch && typeof reportedMax === "number" && Number(underMatch[1]) === reportedMax) {
    return `quote says "under/younger than/below ${underMatch[1]}" (exclusive — age ${underMatch[1]} itself is NOT eligible) but maximum_age was reported as ${reportedMax} unchanged, not ${reportedMax - 1}`;
  }
  const overMatch = quote.match(/\b(?:over|older than|above|more than)\s+(\d{1,2})\b/i);
  if (overMatch && typeof reportedMin === "number" && Number(overMatch[1]) === reportedMin) {
    return `quote says "over/older than/above ${overMatch[1]}" (exclusive — age ${overMatch[1]} itself is NOT eligible) but minimum_age was reported as ${reportedMin} unchanged, not ${Number(overMatch[1]) + 1}`;
  }
  return null;
}
const DESCRIPTIVE_NOT_A_RULE_PATTERN = /\b(most|typically|on average|usually|generally are|tend to be|approximately|about \d)\b/i;

/** Caught in the full-corpus audit: Purple Comet's own page requires "an adult supervisor (at
 * least 21 years old)" per TEAM — a chaperone requirement — and it was written as the STUDENT
 * participant's minimum_age. A quote whose subject is the accompanying adult, not the
 * applicant, must never set the applicant's own age field, no matter how real and grounded the
 * number is. */
const ADULT_SUPERVISOR_SUBJECT_PATTERN = /\b(supervisor|chaperone|coach|adult (leader|advisor|chaperone)|teacher advisor|parent\s*\/?\s*guardian|accompanying adult)\b/i;

/** Caught in the same audit: two rows had eligible_countries written as ["United States"] from
 * an ABOUT-US description sentence that never actually names the country — one said "throughout
 * New York City" (a city, not "United States"), the other never named a place at all beyond
 * "highly competitive summer program". The country/citizenship value must be traceable to text
 * that literally names it, not inferred from context the way a human reader might. */
function claimedNamesAppearInQuote(names: string[], quote: string): boolean {
  const normalizedQuote = quote.toLowerCase();
  return names.some((name) => {
    const n = name.toLowerCase();
    if (normalizedQuote.includes(n)) return true;
    if (n === "united states" && /\b(u\.?s\.?a?\.?)\b/i.test(quote)) return true;
    if (n === "united kingdom" && /\b(u\.?k\.?)\b/i.test(quote)) return true;
    return false;
  });
}

/** Caught in the same audit: Politecnico di Milano's "second year of high school" (an Italian
 * curriculum year with no clean 9-12 equivalent) was expanded to the FULL eligible_grades:
 * ["9","10","11","12"] anyway — the quote contains no US-recognizable grade marker at all, so
 * there was nothing to ground that specific range in. Require at least one real marker (a
 * literal grade number/ordinal or a class-year word) before trusting any returned array,
 * generically — this also covers French/German/Turkish/other systems without needing
 * curriculum-specific knowledge. */
const GRADE_MARKER_PATTERN = /\b(9|10|11|12)(th)?\b|\b(ninth|tenth|eleventh|twelfth)\b|freshman|sophomore|junior|senior/i;
/** A class-year WORD (not a digit) only safely means "high school" grade 9-12 when the source
 * text itself says so — "sophomores and juniors" could just as easily be a college's own class
 * years. Notre Dame's "Current sophomores and juniors" (no "high school" anywhere in that
 * quote) and Bentley's "rising high school juniors and seniors" (has it right there) are the
 * two real cases this distinguishes: the first is held back for being genuinely ambiguous on
 * its own text, the second is trusted because its own text resolves the ambiguity. */
const CLASS_YEAR_WORD_PATTERN = /freshman|sophomore|junior|senior/i;
const HAS_DIGIT_GRADE_PATTERN = /\b(9|10|11|12)(th)?\b|\b(ninth|tenth|eleventh|twelfth)\b/i;
const HIGH_SCHOOL_CONTEXT_PATTERN = /high.?school/i;
// Broadened after a second real miss in the same audit: NYU HSLI's note read "...but this
// describes service area, not a stated residency requirement" — a different phrasing of the
// exact same self-referential problem (the note explains why the quote ISN'T evidence, instead
// of the field being left empty as instructed) that the original narrower pattern didn't cover.
// Rather than chase every future paraphrase individually, this matches on the general shape —
// "not a/the stated/actual/real/explicit X" or "describes Y, not Z" — which is how a model
// tends to hedge when it's including something it already suspects doesn't qualify.
const ABSENCE_DESCRIPTION_PATTERN =
  /\bno\b.{0,40}\b(rule|restriction|requirement)\b.{0,20}\b(stated|specified|mentioned|found)\b|\bnot\b.{0,20}\b(stated|specified|mentioned)\b.{0,20}\bpage\b|\bnot\s+(a|the)\s+(stated|actual|real|explicit|formal)\b|\bdescribes?\b[^.]{0,40},?\s*not\b|\bdoes(n't| not)\s+(state|specify|mention)\b|\bisn't\s+(stated|specified|explicit)\b/i;

function checkNoteRelevance(note: string, quote: string): { ok: boolean; reason?: string } {
  if (ABSENCE_DESCRIPTION_PATTERN.test(note)) return { ok: false, reason: "note describes the absence of a rule instead of being left empty" };
  if (!CITIZENSHIP_RELEVANCE_PATTERN.test(note) && !CITIZENSHIP_RELEVANCE_PATTERN.test(quote)) {
    return { ok: false, reason: "neither the note nor its quote mentions citizenship/nationality/residency/visa — likely miscategorized (team size, application requirement, consent rule, or marketing copy)" };
  }
  return { ok: true };
}

/** Memory rule 4b, operationalized: a quote containing a bare "either" without its matching
 * "or" is a live truncation risk — the clause was very likely cut before the alternative
 * condition that changes its meaning. Tries once to recover by extending the quote to the next
 * ~200 characters of the SAME source page and re-checking for "or"; if that still doesn't
 * produce one, the field is rejected rather than written half-true. */
function checkEitherOrTruncation(quote: string, sourcePage: SourcedPage): { ok: boolean; expandedQuote: string } {
  if (!/\beither\b/i.test(quote)) return { ok: true, expandedQuote: quote };
  if (/\bor\b/i.test(quote)) return { ok: true, expandedQuote: quote };

  const normalizedPage = normalizeForMatch(sourcePage.text);
  const normalizedQuote = normalizeForMatch(quote);
  const idx = normalizedPage.indexOf(normalizedQuote);
  if (idx === -1) return { ok: false, expandedQuote: quote };
  // Work on the ORIGINAL text (not normalized) so the expanded quote is still a real substring
  // for a subsequent grounding check — approximate the same offset via a proportional search
  // instead, since normalization can shift character offsets slightly.
  const rawIdx = sourcePage.text.toLowerCase().indexOf(quote.slice(0, 40).toLowerCase());
  if (rawIdx === -1) return { ok: false, expandedQuote: quote };
  const extended = sourcePage.text.slice(rawIdx, rawIdx + quote.length + 220);
  const nextPeriod = extended.indexOf(".", quote.length);
  const candidate = nextPeriod > -1 ? extended.slice(0, nextPeriod + 1) : extended;
  if (/\bor\b/i.test(candidate.slice(quote.length))) return { ok: true, expandedQuote: candidate };
  return { ok: false, expandedQuote: quote };
}

// ---------------------------------------------------------------------------------------------
// Row loading + the write plan
// ---------------------------------------------------------------------------------------------

interface OpportunityRow {
  id: string;
  title: string;
  organization: string | null;
  category: string;
  official_url: string | null;
  application_url: string | null;
  status: string;
  eligible_countries: string[];
  eligible_citizenships: string[] | null;
  citizenship_restrictions: string | null;
  residency_restrictions: string | null;
  country_eligibility_confirmed_open: boolean;
  minimum_age: number | null;
  maximum_age: number | null;
  eligible_grades: string[];
}

function countryResolved(o: Pick<OpportunityRow, "eligible_countries" | "eligible_citizenships" | "citizenship_restrictions" | "residency_restrictions" | "country_eligibility_confirmed_open">): boolean {
  return (
    o.eligible_countries.length > 0 ||
    (o.eligible_citizenships ?? []).length > 0 ||
    Boolean(o.citizenship_restrictions) ||
    Boolean(o.residency_restrictions) ||
    (o.country_eligibility_confirmed_open ?? false)
  );
}
function ageOrGradeResolved(o: Pick<OpportunityRow, "minimum_age" | "maximum_age" | "eligible_grades">): boolean {
  return o.minimum_age !== null || o.maximum_age !== null || o.eligible_grades.length > 0;
}

/** Sane-country-name sanity check — rejects a region/adjective the model returns as if it were
 * a country ("International", "Worldwide", "European", "Global"), which would otherwise write
 * junk into a column real code compares against a student's actual country string. */
const NOT_A_COUNTRY_PATTERN = /^(international|worldwide|global|europe|any|all|various|multiple)$/i;
function looksLikeCountryList(countries: string[] | null | undefined): countries is string[] {
  if (!countries || countries.length === 0) return false;
  return countries.every((c) => c.trim().length > 1 && c.trim().length < 60 && !/\d/.test(c) && !NOT_A_COUNTRY_PATTERN.test(c.trim()));
}

interface WritePlan {
  patch: Record<string, unknown>;
  fieldsWritten: string[];
  groundingLog: { field: string; sourceUrl: string; quote: string }[];
  /** `quote` is populated on every content-judgment rejection (not on a bare grounding
   * failure, where there's nothing meaningful to show) specifically so a human auditor can
   * verify a rejection was actually correct instead of trusting the reason string alone — a
   * real, repeated gap in the audit that led to this: several "held back" lines had no
   * visible content at all to check the call against. */
  rejections: { field: string; reason: string; quote?: string }[];
}

function buildWritePlan(row: OpportunityRow, extraction: Extraction, pages: SourcedPage[]): WritePlan {
  const patch: Record<string, unknown> = {};
  const fieldsWritten: string[] = [];
  const groundingLog: WritePlan["groundingLog"] = [];
  const rejections: WritePlan["rejections"] = [];

  let willSetCountryList = false;
  let willSetCitizenshipList = false;
  let confirmedOpenQuote: string | null = null;

  // --- country ---
  if (row.eligible_countries.length === 0 && extraction.country.status === "restricted") {
    const grounding = verifyGrounding(extraction.country.quote, pages);
    const q = extraction.country.quote ?? "";
    if (!grounding.ok) rejections.push({ field: "eligible_countries", reason: "quote did not verify against fetched text" });
    else if (!looksLikeCountryList(extraction.country.countries)) rejections.push({ field: "eligible_countries", reason: "returned value doesn't look like a country list", quote: q });
    else if (COLLEGE_POPULATION_PATTERN.test(q) && !HIGH_SCHOOL_QUALIFIER_PATTERN.test(q)) rejections.push({ field: "eligible_countries", reason: "quote describes college/university students, not high schoolers — likely the wrong division of a multi-track competition", quote: q });
    else if (!claimedNamesAppearInQuote(extraction.country.countries!, q)) rejections.push({ field: "eligible_countries", reason: `claimed countr(y/ies) (${extraction.country.countries!.join(", ")}) never literally appear in the quote — likely inferred from context (a city name, a description) rather than stated`, quote: q });
    else {
      patch.eligible_countries = extraction.country.countries;
      fieldsWritten.push("eligible_countries");
      willSetCountryList = true;
      groundingLog.push({ field: "eligible_countries", sourceUrl: grounding.sourceUrl!, quote: extraction.country.quote! });
    }
  }

  // --- citizenship (structured list) ---
  if ((row.eligible_citizenships ?? []).length === 0 && extraction.citizenship.status === "restricted") {
    const grounding = verifyGrounding(extraction.citizenship.quote, pages);
    const q = extraction.citizenship.quote ?? "";
    if (!grounding.ok) rejections.push({ field: "eligible_citizenships", reason: "quote did not verify against fetched text" });
    else if (!looksLikeCountryList(extraction.citizenship.countries)) rejections.push({ field: "eligible_citizenships", reason: "returned value doesn't look like a country list", quote: q });
    else if (COLLEGE_POPULATION_PATTERN.test(q) && !HIGH_SCHOOL_QUALIFIER_PATTERN.test(q)) rejections.push({ field: "eligible_citizenships", reason: "quote describes college/university students, not high schoolers — likely the wrong division of a multi-track competition", quote: q });
    else if (!claimedNamesAppearInQuote(extraction.citizenship.countries!, q)) rejections.push({ field: "eligible_citizenships", reason: `claimed countr(y/ies) (${extraction.citizenship.countries!.join(", ")}) never literally appear in the quote — likely inferred from context rather than stated`, quote: q });
    else {
      patch.eligible_citizenships = extraction.citizenship.countries;
      fieldsWritten.push("eligible_citizenships");
      willSetCitizenshipList = true;
      groundingLog.push({ field: "eligible_citizenships", sourceUrl: grounding.sourceUrl!, quote: extraction.citizenship.quote! });
    }
  }

  // --- confirmed_open: only from an explicit statement on EITHER field, and only when it
  // won't collide with the DB's own check constraint against a structured restriction. ---
  if (!row.country_eligibility_confirmed_open && !willSetCountryList && !willSetCitizenshipList && row.eligible_countries.length === 0 && (row.eligible_citizenships ?? []).length === 0) {
    const openField = extraction.country.status === "confirmed_open" ? extraction.country : extraction.citizenship.status === "confirmed_open" ? extraction.citizenship : null;
    if (openField) {
      const grounding = verifyGrounding(openField.quote, pages);
      const wordCount = (openField.quote ?? "").trim().split(/\s+/).filter(Boolean).length;
      if (!grounding.ok) rejections.push({ field: "country_eligibility_confirmed_open", reason: "quote did not verify against fetched text" });
      else if (wordCount < 8) rejections.push({ field: "country_eligibility_confirmed_open", reason: `quote is only ${wordCount} words — likely a tagline/slogan, not a real eligibility sentence`, quote: openField.quote ?? undefined });
      else {
        patch.country_eligibility_confirmed_open = true;
        fieldsWritten.push("country_eligibility_confirmed_open");
        groundingLog.push({ field: "country_eligibility_confirmed_open", sourceUrl: grounding.sourceUrl!, quote: openField.quote! });
        confirmedOpenQuote = openField.quote!;
      }
    }
  }

  // --- free-text notes, either/or-guarded ---
  const noteFields: [keyof OpportunityRow, "citizenshipNote" | "residencyNote", string][] = [
    ["citizenship_restrictions", "citizenshipNote", "citizenship_restrictions"],
    ["residency_restrictions", "residencyNote", "residency_restrictions"],
  ];
  for (const [rowField, extractionField, dbColumn] of noteFields) {
    if (row[rowField]) continue; // never overwrite an existing value
    const note = extraction[extractionField];
    // The structured decision, checked BEFORE any prose-content heuristic: a model that
    // correctly reports hasRelevantFact: false has already told us there's nothing here, and
    // that's the common, expected case — no need to inspect what it wrote in note/quote at all.
    if (!note.hasRelevantFact) continue;
    if (!note.note || !note.quote) {
      rejections.push({ field: dbColumn, reason: "hasRelevantFact was true but note/quote was missing — treated as no fact" });
      continue;
    }
    const grounding = verifyGrounding(note.quote, pages);
    if (!grounding.ok) {
      rejections.push({ field: dbColumn, reason: "quote did not verify against fetched text", quote: note.quote });
      continue;
    }
    if (confirmedOpenQuote) {
      const a = normalizeForMatch(confirmedOpenQuote);
      const b = normalizeForMatch(note.quote);
      if (a === b || a.includes(b) || b.includes(a)) {
        rejections.push({ field: dbColumn, reason: "same source sentence already written as country_eligibility_confirmed_open — skipped as redundant", quote: note.quote });
        continue;
      }
    }
    const relevance = checkNoteRelevance(note.note, note.quote);
    if (!relevance.ok) {
      rejections.push({ field: dbColumn, reason: relevance.reason!, quote: `note="${note.note}" / quote="${note.quote}"` });
      continue;
    }
    if (COLLEGE_POPULATION_PATTERN.test(note.quote) && !HIGH_SCHOOL_QUALIFIER_PATTERN.test(note.quote)) {
      rejections.push({ field: dbColumn, reason: "quote describes college/university students, not high schoolers — likely the wrong division of a multi-track competition", quote: note.quote });
      continue;
    }
    const sourcePage = pages.find((p) => p.url === grounding.sourceUrl)!;
    const eitherOr = checkEitherOrTruncation(note.quote, sourcePage);
    if (!eitherOr.ok) {
      rejections.push({ field: dbColumn, reason: "quote contains 'either' without a matching 'or' nearby — likely truncated clause, held back", quote: note.quote });
      continue;
    }
    patch[dbColumn] = note.note.slice(0, 500);
    fieldsWritten.push(dbColumn);
    groundingLog.push({ field: dbColumn, sourceUrl: grounding.sourceUrl!, quote: note.quote });
  }

  // --- age --- Both guarded by the same two semantic checks, since both minimum and maximum
  // usually come from one shared quote: (1) the quote must not itself deny having a cutoff
  // ("no bottom cut-off"), and (2) the quote must not read as a typical-participant statistic
  // ("most participants are at least 10") rather than a stated rule. Grounding alone passed
  // both of these in the audit that found them — the quotes were entirely real.
  const ageQuote = extraction.age.quote ?? "";
  const ageIsSelfContradicting = NO_CUTOFF_PATTERN.test(ageQuote);
  const ageIsDescriptiveNotARule = DESCRIPTIVE_NOT_A_RULE_PATTERN.test(ageQuote);
  if (row.minimum_age === null && typeof extraction.age.minimum === "number") {
    const grounding = verifyGrounding(extraction.age.quote, pages);
    if (!grounding.ok) rejections.push({ field: "minimum_age", reason: "quote did not verify against fetched text" });
    else if (extraction.age.minimum < 5 || extraction.age.minimum > 25) rejections.push({ field: "minimum_age", reason: `implausible value ${extraction.age.minimum}`, quote: ageQuote });
    else if (ageIsSelfContradicting) rejections.push({ field: "minimum_age", reason: "quote itself says there is no cut-off/limit — contradicts the value being written", quote: ageQuote });
    else if (ageIsDescriptiveNotARule) rejections.push({ field: "minimum_age", reason: "quote reads as a typical-participant statistic, not a stated age rule", quote: ageQuote });
    else if (COLLEGE_POPULATION_PATTERN.test(ageQuote) && !HIGH_SCHOOL_QUALIFIER_PATTERN.test(ageQuote)) rejections.push({ field: "minimum_age", reason: "quote describes college/university students, not high schoolers", quote: ageQuote });
    else if (ADULT_SUPERVISOR_SUBJECT_PATTERN.test(ageQuote)) rejections.push({ field: "minimum_age", reason: "quote's subject is an accompanying adult/supervisor/chaperone, not the student applicant", quote: ageQuote });
    else if (findExclusiveBoundMismatch(ageQuote, extraction.age.maximum, extraction.age.minimum)?.includes("minimum_age")) rejections.push({ field: "minimum_age", reason: findExclusiveBoundMismatch(ageQuote, extraction.age.maximum, extraction.age.minimum)!, quote: ageQuote });
    else {
      patch.minimum_age = extraction.age.minimum;
      fieldsWritten.push("minimum_age");
      groundingLog.push({ field: "minimum_age", sourceUrl: grounding.sourceUrl!, quote: extraction.age.quote! });
    }
  }
  if (row.maximum_age === null && typeof extraction.age.maximum === "number") {
    const grounding = verifyGrounding(extraction.age.quote, pages);
    if (!grounding.ok) rejections.push({ field: "maximum_age", reason: "quote did not verify against fetched text" });
    else if (extraction.age.maximum < 5 || extraction.age.maximum > 25) rejections.push({ field: "maximum_age", reason: `implausible value ${extraction.age.maximum}`, quote: ageQuote });
    else if (ageIsSelfContradicting) rejections.push({ field: "maximum_age", reason: "quote itself says there is no cut-off/limit — contradicts the value being written", quote: ageQuote });
    else if (ageIsDescriptiveNotARule) rejections.push({ field: "maximum_age", reason: "quote reads as a typical-participant statistic, not a stated age rule", quote: ageQuote });
    else if (COLLEGE_POPULATION_PATTERN.test(ageQuote) && !HIGH_SCHOOL_QUALIFIER_PATTERN.test(ageQuote)) rejections.push({ field: "maximum_age", reason: "quote describes college/university students, not high schoolers", quote: ageQuote });
    else if (ADULT_SUPERVISOR_SUBJECT_PATTERN.test(ageQuote)) rejections.push({ field: "maximum_age", reason: "quote's subject is an accompanying adult/supervisor/chaperone, not the student applicant", quote: ageQuote });
    else if (findExclusiveBoundMismatch(ageQuote, extraction.age.maximum, extraction.age.minimum)?.includes("maximum_age")) rejections.push({ field: "maximum_age", reason: findExclusiveBoundMismatch(ageQuote, extraction.age.maximum, extraction.age.minimum)!, quote: ageQuote });
    else {
      patch.maximum_age = extraction.age.maximum;
      fieldsWritten.push("maximum_age");
      groundingLog.push({ field: "maximum_age", sourceUrl: grounding.sourceUrl!, quote: extraction.age.quote! });
    }
  }

  // --- grade --- eligible_grades can only represent an exact set (gradeMatchesEligibility does
  // `Number(g) === grade`), never an open-ended range. BrUMO's own FAQ says "grade 12 or below,
  // so advanced middle schoolers are welcome" and was written as eligible_grades: ["12"] — which
  // the product would then read as "ONLY grade 12", wrongly excluding the 9th/10th/11th graders
  // the source explicitly welcomes. This product's grade band is 9-12 (currentGradeLevel never
  // returns outside it), so an open-ended "or below/or younger" statement must resolve to the
  // full 9-12 set, not a truncated one — reject anything short of that rather than writing a
  // narrower, over-restrictive set.
  const gradeQuote = extraction.grade.quote ?? "";
  const gradeIsOpenEnded = /\b(or (below|lower|younger|under)|and (below|under)|or less)\b/i.test(gradeQuote);
  if (row.eligible_grades.length === 0 && extraction.grade.grades && extraction.grade.grades.length > 0) {
    const grounding = verifyGrounding(extraction.grade.quote, pages);
    // Filtered to the representable 9-12 subset BEFORE the plausibility check, rather than
    // rejecting the whole array on any out-of-range value — a real, found case: Andover and
    // Oxbridge both state "rising 7-12th graders" / a grade-8-through-12 picker, and the whole
    // fact was being thrown away because grades 7-8 aren't representable, when the 9-12 portion
    // is real, grounded, and safe to keep. Narrowing to what the schema can express is honest;
    // discarding a correct partial fact because part of it doesn't fit is not the same caution
    // that guards against a fabricated value.
    const inRangeGrades = extraction.grade.grades.filter((g) => /^(9|10|11|12)$/.test(g.trim()));
    const hadOutOfRangeValues = inRangeGrades.length !== extraction.grade.grades.length;
    const FULL_HS_RANGE = ["9", "10", "11", "12"];
    const coversFullRange = FULL_HS_RANGE.every((g) => inRangeGrades.includes(g));
    const hasAnyGradeMarker = GRADE_MARKER_PATTERN.test(gradeQuote);
    const isWordDerived = CLASS_YEAR_WORD_PATTERN.test(gradeQuote) && !HAS_DIGIT_GRADE_PATTERN.test(gradeQuote);
    // A class-year word only needs "high school" nearby to disambiguate from a college class
    // year when the quote alone is ambiguous — but the row's own TITLE is itself an
    // already-established, reliable signal (present in every row processed here) that doesn't
    // need re-deriving from this one quote. Real case: Stanford's own quote is bare ("Be a
    // current sophomore, junior, or senior..."), but the row title is "Summer at Stanford
    // Program for High School Students" — trusting that is not an inference beyond the data,
    // it's reading a fact Oryn already has on file for this exact row.
    const titleConfirmsHighSchool = HIGH_SCHOOL_CONTEXT_PATTERN.test(row.title);
    if (!grounding.ok) rejections.push({ field: "eligible_grades", reason: "quote did not verify against fetched text" });
    else if (inRangeGrades.length === 0) rejections.push({ field: "eligible_grades", reason: `non-numeric or out-of-range grade value(s): ${extraction.grade.grades.join(",")}`, quote: gradeQuote });
    else if (!hasAnyGradeMarker) rejections.push({ field: "eligible_grades", reason: "quote contains no recognizable US-style grade marker (a 9-12 number or a class-year word) — likely a foreign-curriculum year with no safe mapping, held back rather than guessed", quote: gradeQuote });
    else if (isWordDerived && !HIGH_SCHOOL_CONTEXT_PATTERN.test(gradeQuote) && !titleConfirmsHighSchool) rejections.push({ field: "eligible_grades", reason: `quote uses a class-year word (sophomore/junior/senior) without "high school" nearby (in the quote or the row's own title) to disambiguate from a college class year — held back`, quote: gradeQuote });
    else if (gradeIsOpenEnded && !coversFullRange) rejections.push({ field: "eligible_grades", reason: `quote states an open-ended range ("or below"/"or younger") but only ${inRangeGrades.join(",")} was returned — would wrongly exclude eligible lower grades, held back`, quote: gradeQuote });
    else {
      if (hadOutOfRangeValues) rejections.push({ field: "eligible_grades", reason: `narrowed from ${extraction.grade.grades.join(",")} to the representable ${inRangeGrades.join(",")} — grades below 9 aren't expressible in this schema`, quote: gradeQuote });
      patch.eligible_grades = inRangeGrades;
      fieldsWritten.push("eligible_grades");
      groundingLog.push({ field: "eligible_grades", sourceUrl: grounding.sourceUrl!, quote: extraction.grade.quote! });
    }
  }

  return { patch, fieldsWritten, groundingLog, rejections };
}

// ---------------------------------------------------------------------------------------------
// Report mode — DB-only, fetches nothing external.
// ---------------------------------------------------------------------------------------------

async function loadRows(target: PostgrestTarget): Promise<OpportunityRow[]> {
  const { rows } = await fetchAllRowsVerified<OpportunityRow>(
    target,
    "opportunities",
    "id,title,organization,category,official_url,application_url,status,eligible_countries,eligible_citizenships,citizenship_restrictions,residency_restrictions,country_eligibility_confirmed_open,minimum_age,maximum_age,eligible_grades",
    "status=eq.active&order=id.asc"
  );
  return rows;
}

async function reportOnly(target: PostgrestTarget): Promise<void> {
  const rows = await loadRows(target);
  const noCountry = rows.filter((r) => !countryResolved(r));
  const noAgeGrade = rows.filter((r) => !ageOrGradeResolved(r));
  console.log(`Opportunity eligibility coverage — ${rows.length} active rows.\n`);
  console.log(`  Country/citizenship eligibility resolved: ${rows.length - noCountry.length} / ${rows.length}  (${(((rows.length - noCountry.length) / rows.length) * 100).toFixed(1)}%)`);
  console.log(`  Age or grade level resolved:               ${rows.length - noAgeGrade.length} / ${rows.length}  (${(((rows.length - noAgeGrade.length) / rows.length) * 100).toFixed(1)}%)`);
  const byCategory = new Map<string, { total: number; noCountry: number; noAgeGrade: number }>();
  for (const r of rows) {
    const b = byCategory.get(r.category) ?? { total: 0, noCountry: 0, noAgeGrade: 0 };
    b.total++;
    if (!countryResolved(r)) b.noCountry++;
    if (!ageOrGradeResolved(r)) b.noAgeGrade++;
    byCategory.set(r.category, b);
  }
  console.log("\n  By category (unresolved / total):");
  for (const [cat, b] of [...byCategory.entries()].sort((a, b) => b[1].total - a[1].total)) {
    console.log(`    ${cat.padEnd(18)} country ${String(b.noCountry).padStart(3)}/${String(b.total).padEnd(3)}   age/grade ${String(b.noAgeGrade).padStart(3)}/${String(b.total).padEnd(3)}`);
  }
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

type Outcome = { kind: "resolved"; fields: string[] } | { kind: "unresolved"; reason: string } | { kind: "unreachable" } | { kind: "error" } | { kind: "billing_halted" };

/**
 * A billing failure must never look like an ordinary extraction failure. Before this, a
 * depleted Anthropic account surfaced as "400 Your credit balance is too low..." on every
 * remaining row, and the run kept going — 94 of 198 rows in one real run silently counted as
 * generic `error` outcomes, indistinguishable in the summary from 94 rows that had a genuine
 * extraction problem. The run finished, printed a clean-looking summary, and only a human
 * reading the raw stderr noticed the actual cause. That's the same failure shape as a job that
 * 500s on every request but still reports "completed" — the fix is the same: detect the
 * specific condition and make it fatal, not swallow it into a generic bucket.
 *
 * Detected on the Anthropic SDK's own typed error (status 400, the nested error body's message
 * containing "credit balance") rather than a bare string match on the top-level Error#message,
 * which is a formatted `${status} ${json}` composite that could coincidentally contain similar
 * text from an unrelated cause. Retrying this error (the existing 2-attempt loop would have)
 * is worse than useless — it doubles the wasted request against an account that cannot pay for
 * either one.
 */
function isBillingExhaustedError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError && error.status === 400) {
    const nestedMessage = (error.error as { error?: { message?: string } } | undefined)?.error?.message;
    if (typeof nestedMessage === "string" && /credit balance is too low/i.test(nestedMessage)) return true;
  }
  // Fallback for a non-SDK-typed rejection (e.g. a network layer that wraps the response
  // differently) — still gated on the specific phrase, never a bare "400" or "error".
  return error instanceof Error && /credit balance is too low/i.test(error.message);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const verbose = argv.includes("--verbose");
  const reportMode = argv.includes("--report");
  const onlyIndex = argv.indexOf("--only");
  const only = onlyIndex >= 0 ? argv[onlyIndex + 1] : null;
  const categoryIndex = argv.indexOf("--category");
  const category = categoryIndex >= 0 ? argv[categoryIndex + 1] : null;
  const limitIndex = argv.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(argv[limitIndex + 1]) : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key: secretKey };

  if (reportMode) {
    await reportOnly(target);
    return;
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error("Missing ANTHROPIC_API_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const client = new Anthropic({ apiKey: anthropicKey });

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const allRows = await loadRows(target);

  // Priority order per the founder's 2026-08-23 direction (project_opportunity_engine_priorities):
  // Competition, Selective Summer Programs, Research first — the corpus's core 3 categories —
  // then everything else, so a budget/time cutoff loses the least valuable rows first.
  const PRIORITY: Record<string, number> = { competition: 0, summer_program: 1, research: 2 };
  const priorityOf = (c: string) => PRIORITY[c] ?? 99;

  let targetSet = allRows.filter((r) => !countryResolved(r) || !ageOrGradeResolved(r));
  if (only) targetSet = targetSet.filter((r) => r.title.toLowerCase().includes(only.toLowerCase()));
  if (category) targetSet = targetSet.filter((r) => r.category === category);
  targetSet = [...targetSet].sort((a, b) => priorityOf(a.category) - priorityOf(b.category));
  if (limit && Number.isFinite(limit)) targetSet = targetSet.slice(0, limit);

  console.log(
    `${allRows.length} active opportunities. ${allRows.filter((r) => !countryResolved(r)).length} lack country eligibility, ` +
      `${allRows.filter((r) => !ageOrGradeResolved(r)).length} lack age/grade. Processing ${targetSet.length} this run` +
      `${apply ? " (--apply, writing)" : " (dry run, nothing written)"} with model ${model}.\n`
  );

  const contactEmail = process.env.OPENALEX_CONTACT_EMAIL;
  const userAgent = `Oryn-EligibilityAcquisition/1.0 (https://oryn.app${contactEmail ? `; ${contactEmail}` : ""}) node`;
  const fetchImpl = withUserAgent(withRetry(timedFetch(FETCH_TIMEOUT_MS), 1), userAgent);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  // Set by the first worker that hits a billing failure; every worker (including ones already
  // mid-row) checks this before starting its NEXT row, so at most CONCURRENCY rows are ever
  // in flight past the actual point of exhaustion — not the full remaining target set.
  let billingHaltedReason: string | null = null;

  const outcomes = await mapWithConcurrency(targetSet, CONCURRENCY, async (row): Promise<Outcome> => {
    if (billingHaltedReason) return { kind: "billing_halted" };
    try {
      if (!row.official_url) return { kind: "unresolved", reason: "no official_url on file" };

      const { pages, anyReachable } = await resolvePages(row.official_url, row.application_url, fetchImpl);
      if (!anyReachable || pages.length === 0) return { kind: "unreachable" };

      let result: Awaited<ReturnType<typeof extractEligibility>>;
      try {
        result = await extractEligibility(client, model, row.title, row.organization, pages);
      } catch (error) {
        if (isBillingExhaustedError(error)) {
          billingHaltedReason = error instanceof Error ? error.message : String(error);
          return { kind: "billing_halted" };
        }
        throw error;
      }
      if (!result) return { kind: "error" };
      totalInputTokens += result.usage.inputTokens;
      totalOutputTokens += result.usage.outputTokens;

      const plan = buildWritePlan(row, result.data, pages);

      if (verbose) {
        for (const g of plan.groundingLog) {
          const value = plan.patch[g.field];
          const shown = typeof value === "string" ? value : JSON.stringify(value);
          console.log(`  found      ${g.field.padEnd(28)} ${row.title.slice(0, 36).padEnd(36)} = ${shown}`);
          console.log(`             quote: "${g.quote.slice(0, 160)}${g.quote.length > 160 ? "…" : ""}" <- ${g.sourceUrl}`);
        }
        for (const r of plan.rejections) {
          console.log(`  held back  ${r.field.padEnd(28)} ${row.title.slice(0, 36).padEnd(36)} (${r.reason})`);
          if (r.quote) console.log(`             rejected quote: "${r.quote.slice(0, 160)}${r.quote.length > 160 ? "…" : ""}"`);
        }
      }

      if (plan.fieldsWritten.length === 0) {
        // Logged even outside --verbose (this is the bucket a JS-rendering gap would hide
        // in — the raw HTML this script fetches has no client-rendered content, so a page
        // whose real eligibility text is injected by JavaScript looks identical to one that
        // genuinely states nothing). Printing the URL here is what makes that bucket sampleable
        // afterward instead of just a bare count.
        if (plan.rejections.length === 0) console.log(`  nothing usable  ${row.title.slice(0, 55).padEnd(55)} ${row.official_url}`);
        return { kind: "unresolved", reason: plan.rejections.length > 0 ? `all candidates held back: ${plan.rejections.map((r) => r.reason).join("; ")}` : "no eligibility facts stated on the fetched page(s)" };
      }

      if (apply) {
        const { error } = await admin.from("opportunities").update(plan.patch).eq("id", row.id);
        if (error) {
          console.error(`  WRITE FAILED ${row.title}: ${error.message}`);
          return { kind: "error" };
        }
      }
      console.log(`  ${apply ? "wrote" : "would write"}  ${row.title.slice(0, 55).padEnd(55)} ${plan.fieldsWritten.join(", ")}`);
      return { kind: "resolved", fields: plan.fieldsWritten };
    } catch (error) {
      console.error(`  FAILED ${row.title}: ${error instanceof Error ? error.message : error}`);
      return { kind: "error" };
    }
  });

  const resolved = outcomes.filter((o) => o.kind === "resolved");
  const unresolved = outcomes.filter((o) => o.kind === "unresolved");
  const unreachable = outcomes.filter((o) => o.kind === "unreachable");
  const errored = outcomes.filter((o) => o.kind === "error");
  const billingHalted = outcomes.filter((o) => o.kind === "billing_halted");

  console.log(`\n${"=".repeat(78)}`);

  if (billingHaltedReason) {
    // Deliberately the FIRST thing printed after the divider, and phrased as a stop, not a
    // summary line among others — this is the exact failure this whole change exists to make
    // impossible to miss. Every row not in resolved/unresolved/unreachable/errored above was
    // never attempted at all, not silently skipped as if it had been checked.
    const attempted = resolved.length + unresolved.length + unreachable.length + errored.length;
    console.log(`STOPPED: Anthropic account ran out of credits after ${attempted} of ${targetSet.length} rows.`);
    console.log(`  ${targetSet.length - attempted} rows were never attempted — not resolved, not unresolved, simply never reached.`);
    console.log(`  Error: ${billingHaltedReason}`);
    console.log(`  ${resolved.length} rows ${apply ? "were written" : "would have been written"} before the stop — those are real and safe to keep.`);
    console.log(`  Re-run this exact command once credits are restored: it only ever touches rows still missing the target field, so nothing here needs to be redone.`);
    process.exitCode = 1;
  }

  console.log(`\nLooked at ${targetSet.length} opportunities that had a gap.`);
  console.log(`  ${apply ? "Wrote" : "Would write"} at least one new field on: ${resolved.length}`);
  console.log(`  Fetched fine, but the source stated nothing usable:          ${unresolved.length}`);
  console.log(`  Could not fetch any page at all:                            ${unreachable.length}`);
  console.log(`  Errored (extraction/schema/write failure):                  ${errored.length}`);
  if (billingHalted.length > 0) console.log(`  Never attempted (billing stop):                             ${billingHalted.length}`);
  console.log(`  COULD NOT RESOLVE (unresolved + unreachable + errored):     ${unresolved.length + unreachable.length + errored.length}`);

  const fieldCounts = new Map<string, number>();
  for (const o of resolved) if (o.kind === "resolved") for (const f of o.fields) fieldCounts.set(f, (fieldCounts.get(f) ?? 0) + 1);
  console.log("\n  Fields written, by column:");
  for (const [field, count] of [...fieldCounts.entries()].sort((a, b) => b[1] - a[1])) console.log(`    ${String(count).padStart(4)}  ${field}`);

  const estCost = (totalInputTokens / 1_000_000) * 3 + (totalOutputTokens / 1_000_000) * 15;
  console.log(`\n  Tokens this run: ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out (rough est. $${estCost.toFixed(2)} at Sonnet-class pricing — not logged to ai_usage, no user_id applies to a background script).`);

  if (!apply) console.log("\nDry run — nothing written. Re-run with --apply.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
