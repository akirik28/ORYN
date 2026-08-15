#!/usr/bin/env node
/**
 * Verifies every external integration actually works — not just "is an env var set".
 * Run with: npm run check:integrations
 *
 * Deliberately does NOT import anything under lib/ that has `import "server-only"` at
 * the top (lib/supabase/*, lib/ai/*, lib/providers/*) — that guard throws outside
 * Next.js's bundler, which this plain Node/tsx script is. Talks to the raw SDKs /
 * REST endpoints directly instead. Never prints a secret value, only status.
 */

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (e.g. CI, hosting platform).
}

type Status = "OK" | "Missing credential" | "Error";

interface CheckResult {
  name: string;
  status: Status;
  detail?: string;
}

function required(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

/** Accepts PromiseLike, not just Promise — Supabase's query builders are thenables that
 * only actually run the request once awaited, and don't structurally implement the full
 * Promise interface (.catch/.finally) until then. */
async function withTimeout<T>(promise: PromiseLike<T>, ms = 10000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Request timed out")), ms);
  });
  return Promise.race([promise, timeoutPromise]);
}

async function checkSupabase(): Promise<CheckResult> {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const key = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return { name: "Supabase", status: "Missing credential" };

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, key);
    const { error } = await withTimeout(supabase.from("universities").select("id").limit(1));
    if (error) return { name: "Supabase", status: "Error", detail: error.message };
    return { name: "Supabase", status: "OK" };
  } catch (error) {
    return { name: "Supabase", status: "Error", detail: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function checkSupabaseSecret(): Promise<CheckResult> {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const key = required("SUPABASE_SECRET_KEY");
  if (!url || !key) return { name: "Supabase (secret key)", status: "Missing credential" };

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await withTimeout(admin.from("provider_health").select("provider").limit(1));
    if (error) return { name: "Supabase (secret key)", status: "Error", detail: error.message };
    return { name: "Supabase (secret key)", status: "OK" };
  } catch (error) {
    return { name: "Supabase (secret key)", status: "Error", detail: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function checkAnthropic(): Promise<CheckResult> {
  const apiKey = required("ANTHROPIC_API_KEY");
  if (!apiKey) return { name: "Anthropic", status: "Missing credential" };

  try {
    const { Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    await withTimeout(
      client.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      })
    );
    return { name: "Anthropic", status: "OK" };
  } catch (error) {
    return { name: "Anthropic", status: "Error", detail: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function checkTavily(): Promise<CheckResult> {
  const apiKey = required("TAVILY_API_KEY");
  if (!apiKey) return { name: "Tavily", status: "Missing credential" };

  try {
    const response = await withTimeout(
      fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ query: "test", max_results: 1 }),
      })
    );
    if (!response.ok) return { name: "Tavily", status: "Error", detail: `HTTP ${response.status}` };
    return { name: "Tavily", status: "OK" };
  } catch (error) {
    return { name: "Tavily", status: "Error", detail: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function checkCollegeScorecard(): Promise<CheckResult> {
  const apiKey = required("COLLEGE_SCORECARD_API_KEY");
  if (!apiKey) return { name: "College Scorecard", status: "Missing credential" };

  try {
    const url = new URL("https://api.data.gov/ed/collegescorecard/v1/schools");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("school.name", "Harvard University");
    url.searchParams.set("fields", "id,school.name");
    url.searchParams.set("per_page", "1");
    const response = await withTimeout(fetch(url.toString()));
    if (!response.ok) return { name: "College Scorecard", status: "Error", detail: `HTTP ${response.status}` };
    return { name: "College Scorecard", status: "OK" };
  } catch (error) {
    return { name: "College Scorecard", status: "Error", detail: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function checkOpenAlex(): Promise<CheckResult> {
  try {
    const email = required("OPENALEX_CONTACT_EMAIL");
    const url = `https://api.openalex.org/works?per_page=1${email ? `&mailto=${encodeURIComponent(email)}` : ""}`;
    const response = await withTimeout(fetch(url));
    if (!response.ok) return { name: "OpenAlex", status: "Error", detail: `HTTP ${response.status}` };
    return { name: "OpenAlex", status: "OK" };
  } catch (error) {
    return { name: "OpenAlex", status: "Error", detail: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function main() {
  console.log("Checking integrations (this makes real, minimal API calls)...\n");

  const results = await Promise.all([
    checkSupabase(),
    checkSupabaseSecret(),
    checkAnthropic(),
    checkTavily(),
    checkCollegeScorecard(),
    checkOpenAlex(),
  ]);

  const nameWidth = Math.max(...results.map((r) => r.name.length)) + 2;
  for (const result of results) {
    const icon = result.status === "OK" ? "✓" : result.status === "Missing credential" ? "○" : "✗";
    const line = `${icon} ${result.name.padEnd(nameWidth)} ${result.status}`;
    console.log(result.detail ? `${line} — ${result.detail}` : line);
  }

  const hasErrors = results.some((r) => r.status === "Error");
  console.log("");
  if (hasErrors) {
    console.log("Some configured integrations failed. See API_SETUP.md for setup help.");
    process.exit(1);
  } else {
    console.log("Done. Integrations without a credential are expected to show 'Missing credential' — that's OK, the app degrades gracefully.");
  }
}

main();
