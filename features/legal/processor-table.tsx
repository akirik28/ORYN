import { DATA_PROCESSORS, legalCopy } from "@/lib/legal/content";

/**
 * The data-processor inventory: every external service that receives data, and precisely
 * what reaches it. Rendered from `DATA_PROCESSORS` in both the Privacy Notice and the KVKK
 * notice, so the two can never disagree about where student data goes.
 *
 * A real `<table>` rather than a stack of divs — it is tabular data, and outside counsel
 * will read it as a table. It scrolls inside its own container on narrow screens instead
 * of forcing the page to scroll sideways, and collapses to stacked cards below `sm`, where
 * five columns of prose is unreadable on a phone.
 */
export function ProcessorTable() {
  const t = legalCopy.processorTable;

  return (
    <div className="mt-5">
      {/* Phone: one card per service. */}
      <ul className="space-y-3 sm:hidden">
        {DATA_PROCESSORS.map((p) => (
          <li key={p.id} id={`processor-${p.id}`} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-ink-1">{p.name}</h3>
              <PersonalDataTag personalData={p.personalData} />
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{p.role}</p>
            <dl className="mt-3 space-y-2 text-[13px]">
              <Field label={t.columnData} value={p.dataSent} />
              <Field label={t.columnLocation} value={p.location} />
              <Field label={t.columnRetention} value={p.retention} />
            </dl>
          </li>
        ))}
      </ul>

      {/* Tablet and up: the real table. */}
      <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
        <table className="w-full min-w-[46rem] border-collapse text-left text-[13px]">
          <caption className="sr-only">{t.caption}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-tint">
              <th scope="col" className="px-4 py-3 font-semibold text-ink-2">{t.columnService}</th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink-2">{t.columnData}</th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink-2">{t.columnLocation}</th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink-2">{t.columnRetention}</th>
            </tr>
          </thead>
          <tbody>
            {DATA_PROCESSORS.map((p) => (
              <tr key={p.id} id={`processor-${p.id}`} className="border-b border-border last:border-0 align-top">
                <th scope="row" className="px-4 py-4 font-normal">
                  <span className="block font-semibold text-ink-1">{p.name}</span>
                  <span className="mt-1 block leading-relaxed text-ink-4">{p.role}</span>
                  <span className="mt-2 inline-block"><PersonalDataTag personalData={p.personalData} /></span>
                </th>
                <td className="px-4 py-4 leading-relaxed text-ink-3">{p.dataSent}</td>
                <td className="px-4 py-4 leading-relaxed text-ink-3">{p.location}</td>
                <td className="px-4 py-4 leading-relaxed text-ink-3">{p.retention}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-ink-2">{label}</dt>
      <dd className="leading-relaxed text-ink-3">{value}</dd>
    </div>
  );
}

function PersonalDataTag({ personalData }: { personalData: boolean }) {
  const t = legalCopy.processorTable;
  return (
    <span
      className={
        personalData
          ? "inline-block rounded-full bg-brand-primary-subtle px-2 py-0.5 text-[11px] font-semibold text-brand-primary-strong"
          : "inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-ink-4"
      }
    >
      {personalData ? t.personalDataYes : t.personalDataNo}
    </span>
  );
}
