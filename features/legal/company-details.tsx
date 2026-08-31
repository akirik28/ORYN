import { COMPANY, legalCopy, isUnresolved } from "@/lib/legal/content";
import { Unconfirmed } from "./unconfirmed";
import type { LegalSection, Unresolved } from "@/lib/legal/content";

type Kind = NonNullable<LegalSection["companyDetails"]>;

/**
 * The company's own particulars — the fields a privacy notice is legally required to name
 * and which ORYN does not have yet. Every one of them currently renders as an `Unconfirmed`
 * chip; the component handles resolved strings too, so filling `COMPANY` in later is the
 * only change needed here.
 */
export function CompanyDetails({ kind }: { kind: Kind }) {
  const t = legalCopy.common;

  const rows: { label: string; value: string | Unresolved }[] =
    kind === "identity"
      ? [
          { label: t.companyLegalName, value: COMPANY.legalName },
          { label: t.companyRegistration, value: COMPANY.registrationNumber },
          { label: t.companyAddress, value: COMPANY.registeredAddress },
          { label: t.companyVerbis, value: COMPANY.verbisRegistration },
        ]
      : kind === "contact"
        ? [
            { label: t.companyEmail, value: COMPANY.contactEmail },
            { label: t.companyPrivacyEmail, value: COMPANY.privacyContactEmail },
            { label: t.companyDpo, value: COMPANY.dataProtectionOfficer },
          ]
        : [{ label: t.companyGoverningLaw, value: COMPANY.governingLaw }];

  const heading =
    kind === "identity" ? t.companyIdentityHeading : kind === "contact" ? t.companyContactHeading : t.companyLawHeading;

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-tint p-4 sm:p-5">
      <h3 className="text-[13px] font-semibold tracking-wide text-ink-2 uppercase">{heading}</h3>
      <dl className="mt-3 space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="sm:flex sm:gap-4">
            <dt className="text-[13px] font-medium text-ink-2 sm:w-56 sm:shrink-0">{row.label}</dt>
            <dd className="text-[13px] leading-relaxed text-ink-3">
              {isUnresolved(row.value) ? <Unconfirmed value={row.value} /> : row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
