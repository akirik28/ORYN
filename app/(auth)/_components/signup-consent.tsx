"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import type { Locale } from "@/lib/i18n/config";
import { getLegalCopy } from "@/lib/legal/content";

/**
 * The consent surface on the signup form: a short plain-language summary of what is being
 * agreed to, the acceptance checkbox itself, and the reserved place for guardian approval.
 *
 * The summary sits ABOVE the checkbox on purpose. "I accept the Terms" over a link nobody
 * opens is not informed consent; four sentences naming the things a student would actually
 * care about — that their data goes to an AI model, that it lives in Frankfurt, that they
 * can delete it — is closer to it. The full documents are one click away for the detail.
 *
 * GUARDIAN APPROVAL IS A PLACE, NOT A MECHANISM. Nothing here collects or verifies a
 * guardian's approval, and the copy says so outright rather than implying a check that
 * does not happen. Two things have to be settled before a mechanism can be built: the age
 * of self-consent in each launch market, and whether notice or a verifiable method is
 * required (see `LAWYER_FLAGS.minorConsent`). Birth year is collected in onboarding, one
 * screen after this one, so the product cannot yet know at this point whether the person
 * signing up is a minor — which is exactly why this block addresses everyone rather than
 * pretending to branch.
 *
 * `locale` is resolved once by the Server Component signup page and threaded down through
 * the client `SignUpForm` — not `useLocale()` here — so the whole page's copy comes from a
 * single resolution, the same convention the rest of this feature uses.
 */
export function SignUpConsent({ error, locale }: { error?: string; locale: Locale }) {
  const t = getLegalCopy(locale).signupConsent;

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-[#E4E4EE] bg-[#F7F7FC] p-4">
        <h2 className="text-[13px] font-semibold text-[#3A3A4A]">{t.dataSummaryHeading}</h2>
        <ul className="mt-2.5 space-y-2">
          {t.dataSummary.map((item) => (
            <li key={item.slice(0, 40)} className="flex gap-2 text-[12.5px] leading-relaxed text-[#5A5A6E]">
              <span aria-hidden="true" className="mt-[7px] size-1 shrink-0 rounded-full bg-[#AAAABC]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/privacy"
          className="mt-3 inline-block text-[12.5px] font-semibold hover:underline"
          style={{ color: "#3D35E8" }}
        >
          {t.reviewLink} →
        </Link>
      </div>

      <div className="flex items-start gap-2.5">
        <Checkbox
          id="acceptedTerms"
          name="acceptedTerms"
          required
          aria-describedby={error ? "acceptedTerms-error" : undefined}
          aria-invalid={error ? true : undefined}
          className="mt-0.5"
        />
        <label htmlFor="acceptedTerms" className="text-[13px] leading-relaxed text-[#3A3A4A]">
          {t.checkboxLabel}{" "}
          <Link href="/terms" className="font-semibold hover:underline" style={{ color: "#3D35E8" }}>
            {t.checkboxLinkTerms}
          </Link>
          {t.checkboxLinkSeparator}
          <Link href="/privacy" className="font-semibold hover:underline" style={{ color: "#3D35E8" }}>
            {t.checkboxLinkPrivacy}
          </Link>
          .
        </label>
      </div>
      {error ? (
        <p id="acceptedTerms-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="rounded-[12px] border border-dashed border-[#D8D4F0] bg-[#FAFAFE] p-4">
        <h2 className="text-[13px] font-semibold text-[#3A3A4A]">{t.minorHeading}</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#5A5A6E]">{t.minorBody}</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-[#8A8A9E]">{t.minorPlaceholderNote}</p>
      </div>
    </div>
  );
}
