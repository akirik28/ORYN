import type { Locale } from "@/lib/i18n/config";

/** The DB default (migration 0002, `not null default 'UTC'`) — no onboarding or settings
 * flow anywhere in the product has ever written to this column (confirmed by grep, not
 * assumed), so a value of exactly "UTC" is indistinguishable from "nobody has ever told
 * Oryn where this student is." See greeting()'s own comment for what that means for trust. */
const UNCONFIRMED_DEFAULT_TIMEZONE = "UTC";

function hourInTimezone(timezone: string): number | null {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(new Date());
    const hour = Number(formatted);
    return Number.isFinite(hour) ? hour : null;
  } catch {
    // An invalid IANA identifier throws a RangeError — degrade to unknown rather than let a
    // malformed value (nothing in the product writes this column today, but a future direct
    // edit could) break the page.
    return null;
  }
}

/**
 * Time-of-day greeting, honest about what it doesn't know.
 *
 * Live data (2026-09-02): 7 of 11 profiles sit at the untouched "UTC" default; the other 4
 * (all QA/fixture accounts) show a real IANA zone that could only have been set directly in
 * the database — no product path exists that could have set it through real use. So "UTC"
 * cannot be trusted as a real answer, while any OTHER value was necessarily set deliberately
 * and is trusted without further guessing.
 *
 * Previously computed purely from the server's own local time (`new Date().getHours()`),
 * which could show "Good evening" to a student for whom it was actually morning, depending
 * on deployment region — a small, real wrongness a first-time student would notice before
 * reading a word of copy. The fix is not "trust the column blindly" — it's "use it exactly
 * when it represents a real answer, and say nothing time-specific otherwise." Silently
 * falling back to server time is what created the original bug; this avoids repeating that
 * mistake one layer down by silently falling back to an unconfirmed default instead.
 */
export function greeting(locale: Locale, timezone: string): string {
  const hour = timezone === UNCONFIRMED_DEFAULT_TIMEZONE ? null : hourInTimezone(timezone);
  if (hour === null) {
    return locale === "tr" ? "Merhaba" : "Hello";
  }
  if (locale === "tr") {
    if (hour < 12) return "Günaydın";
    if (hour < 18) return "İyi günler";
    return "İyi akşamlar";
  }
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
