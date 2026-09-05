import { describe, expect, test } from "vitest";
import {
  generateVerificationCode,
  hashVerificationCode,
  isVerificationCodeExpired,
  hasExceededVerificationAttempts,
  isWithinResendCooldown,
  buildVerificationEmail,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,
} from "@/lib/contact/email-verification";

describe("generateVerificationCode", () => {
  test("always exactly 6 digits, never a shorter number that would print as fewer", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashVerificationCode", () => {
  test("the same code always hashes identically, and never equals the raw code itself", () => {
    const a = hashVerificationCode("123456");
    const b = hashVerificationCode("123456");
    expect(a).toBe(b);
    expect(a).not.toBe("123456");
  });

  test("different codes hash differently", () => {
    expect(hashVerificationCode("123456")).not.toBe(hashVerificationCode("654321"));
  });
});

describe("isVerificationCodeExpired", () => {
  test("a future expiry is not expired", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isVerificationCodeExpired(future)).toBe(false);
  });

  test("a past expiry is expired", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isVerificationCodeExpired(past)).toBe(true);
  });

  test("exactly at the expiry instant counts as expired, not a one-tick grace window", () => {
    const now = new Date("2026-09-05T12:00:00.000Z");
    expect(isVerificationCodeExpired("2026-09-05T12:00:00.000Z", now)).toBe(true);
  });
});

describe("hasExceededVerificationAttempts", () => {
  test("below the cap is not exceeded", () => {
    expect(hasExceededVerificationAttempts(EMAIL_VERIFICATION_MAX_ATTEMPTS - 1)).toBe(false);
  });

  test("exactly at the cap counts as exceeded -- the cap is a ceiling, not a countdown to zero", () => {
    expect(hasExceededVerificationAttempts(EMAIL_VERIFICATION_MAX_ATTEMPTS)).toBe(true);
  });
});

describe("isWithinResendCooldown", () => {
  test("just sent is within cooldown", () => {
    expect(isWithinResendCooldown(new Date().toISOString())).toBe(true);
  });

  test("sent well before the cooldown window is not within cooldown", () => {
    const longAgo = new Date(Date.now() - EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - 1000).toISOString();
    expect(isWithinResendCooldown(longAgo)).toBe(false);
  });
});

describe("buildVerificationEmail", () => {
  test("the actual code appears verbatim in the body, in both locales", () => {
    const en = buildVerificationEmail({ locale: "en", code: "482913" });
    const tr = buildVerificationEmail({ locale: "tr", code: "482913" });
    expect(en.body).toContain("482913");
    expect(tr.body).toContain("482913");
  });

  test("subject and body differ by locale -- this isn't an English-only template with the code spliced in", () => {
    const en = buildVerificationEmail({ locale: "en", code: "111111" });
    const tr = buildVerificationEmail({ locale: "tr", code: "111111" });
    expect(en.subject).not.toBe(tr.subject);
    expect(en.body).not.toBe(tr.body);
  });

  test("pure -- the same inputs always produce the same content", () => {
    const first = buildVerificationEmail({ locale: "en", code: "999999" });
    const second = buildVerificationEmail({ locale: "en", code: "999999" });
    expect(first).toEqual(second);
  });
});
