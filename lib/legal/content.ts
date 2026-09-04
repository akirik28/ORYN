import type { Locale } from "@/lib/i18n/config";

/**
 * Every word of Proxola's legal surface — the three policy documents, the site footer, the
 * signup consent block, and the data-processor inventory — in ONE module.
 *
 * WHY ONE FILE: this is the translation unit. `legalCopyEn`/`legalCopyTr` are two objects
 * of the same `LegalCopy` shape, selected by `getLegalCopy(locale)`. No page, footer, or
 * form branches on language itself — every component takes a `locale: Locale` prop and
 * calls `getLegalCopy`/`getDataProcessors`, the same shape `lib/i18n/date.ts`'s
 * `formatRelativeTime(date, locale)` already uses ("Server Components can pass the value
 * from `resolveLocale()` and Client Components can pass the one from `useLocale()`,
 * without two near-identical implementations" — that file's words, not just this one's
 * convention). Nothing below is JSX, and no string is assembled from fragments at a call
 * site, because both make a string untranslatable (word order is not portable across
 * languages). Structure lives in the components; text lives here.
 *
 * REGISTER: all three documents use formal "siz" in Turkish, not the informal "sen" the
 * rest of the product may eventually use for onboarding/UI copy. This is a deliberate,
 * product-level (not legal) decision: a real KVKK aydınlatma metni is formal register by
 * near-universal convention regardless of the audience's age, and Privacy/Terms sit right
 * next to it in the same footer — switching register between sibling legal documents would
 * read as more inconsistent than holding all three formal. Reversible; flag to the founder
 * if this should instead match a casual house style once one exists.
 *
 * VOCABULARY: the Turkish text uses KVKK's own statutory terms where the English maps onto
 * a settled one — veri sorumlusu (data controller), veri işleyen (data processor), açık
 * rıza (explicit consent), aydınlatma yükümlülüğü (Art. 10 disclosure obligation), ilgili
 * kişi (data subject, used where the law's own Article 11 list is being paraphrased).
 * Where a clause's legal mapping is itself unresolved in English too (the Article 9
 * transfer mechanism, the Article 5 legal-basis-per-purpose question), the Turkish
 * translates the descriptive sentence around it but does not invent a Turkish name for a
 * mechanism the English text also declines to name — seeLAWYER_FLAGS, unchanged by
 * translation, which is where that decision actually gets made.
 *
 * WHAT THIS IS NOT: legal advice, and not reviewed by a lawyer, in either language. Every
 * document below is a DRAFT. `LEGAL_REVIEW_STATUS.approved` is `false` and the layout
 * renders a standing banner off it — see the note on that constant before changing it.
 */

// ---------------------------------------------------------------------------
// Review status
// ---------------------------------------------------------------------------

/**
 * The single switch that decides whether these documents present themselves as drafts.
 *
 * Flipping `approved` to `true` removes the "awaiting legal review" banner from all three
 * documents, in both languages, at once. It is a legal assertion, not a styling preference:
 * do not flip it to clean up the UI. It belongs to whoever receives the lawyer's sign-off,
 * and the sign-off date and reviewing counsel should be recorded here in the same commit.
 */
export const LEGAL_REVIEW_STATUS = {
  approved: false,
  /** Date this draft text was last edited by engineering. NOT an approval date. */
  draftedOn: "2026-08-31",
  reviewedBy: null as string | null,
  reviewedOn: null as string | null,
};

/**
 * A value that is deliberately not filled in, because inventing it would be worse than
 * leaving it blank. Rendered by `<Unconfirmed>` as a visibly unresolved chip rather than
 * as prose, so a reader can never mistake a placeholder for a settled fact — the same
 * reason the rest of this product shows "Data temporarily unavailable" instead of a
 * plausible number.
 */
export interface Unresolved {
  readonly __unresolved: true;
  /**
   * A key into `LegalCopy.common`'s `companyXxx` labels, not a literal string — the label
   * is reader-facing text and must translate with everything else. Resolved against the
   * current locale's copy at render time by `<Unconfirmed>`/`<CompanyDetails>`, so a
   * placeholder chip is never stuck in English on a Turkish page.
   */
  readonly labelKey: CompanyDetailLabelKey;
  /** Who has to supply it. Shown to the lawyer, not to students. */
  readonly owner: "founder" | "counsel";
}

export type CompanyDetailLabelKey =
  | "companyLegalName"
  | "companyRegistration"
  | "companyAddress"
  | "companyVerbis"
  | "companyEmail"
  | "companyPrivacyEmail"
  | "companyDpo"
  | "companyGoverningLaw";

export function unresolved(labelKey: CompanyDetailLabelKey, owner: Unresolved["owner"] = "founder"): Unresolved {
  return { __unresolved: true, labelKey, owner };
}

export function isUnresolved(value: unknown): value is Unresolved {
  return typeof value === "object" && value !== null && "__unresolved" in value;
}

// ---------------------------------------------------------------------------
// Company identity
// ---------------------------------------------------------------------------

/**
 * Proxola has no registered legal entity on file in this repository, and a privacy notice
 * naming the wrong controller is worse than one that names none. Every field here is
 * therefore unresolved until the founder supplies the real registration details. Locale-
 * invariant: which fields are missing doesn't change with language, only their rendered
 * label does (via `labelKey`, resolved from `LegalCopy.common`).
 */
export const COMPANY = {
  productName: "Proxola",
  legalName: unresolved("companyLegalName"),
  registrationNumber: unresolved("companyRegistration"),
  registeredAddress: unresolved("companyAddress"),
  /** KVKK: whether the controller must enrol in VERBİS depends on the entity and its size. */
  verbisRegistration: unresolved("companyVerbis", "counsel"),
  /**
   * Live, verified 2026-09-03 — all six proxola.com addresses (hello/help/info/bilgi/ada/
   * destek) forward to one inbox today. `hello@` chosen for general enquiries as the plainest
   * of the six; no significance to picking it over the other five.
   */
  contactEmail: "hello@proxola.com",
  /**
   * NOT filled, on purpose: this is the address printed in the Privacy Notice for a
   * data-subject request, a parent's deletion demand, or a regulator's letter — the one email
   * with a legal clock on it — and privacy@proxola.com does not exist yet as of this commit.
   * CEO is asking the founder to add it as one routing rule; fill this in a later commit once
   * that's confirmed, not before. A printed address that bounces is worse than a stated gap.
   */
  privacyContactEmail: unresolved("companyPrivacyEmail"),
  /** GDPR Art. 37 — only required for some controllers; counsel decides whether it applies. */
  dataProtectionOfficer: unresolved("companyDpo", "counsel"),
  governingLaw: unresolved("companyGoverningLaw", "counsel"),
};

// ---------------------------------------------------------------------------
// Data processor inventory
// ---------------------------------------------------------------------------

export interface DataProcessor {
  /** Stable key — also the anchor id in the rendered table. Locale-invariant. */
  id: string;
  name: string;
  /** What the service does for Proxola, in one line. */
  role: string;
  /** Exactly what leaves Proxola for this service. Verified against the code, not assumed. */
  dataSent: string;
  /** Where the processing happens. */
  location: string;
  /** How long the data stays there. */
  retention: string;
  /** True when the data reaching this processor can identify a specific student. */
  personalData: boolean;
  /** Where in this repository the claim above can be checked. */
  verifiedIn: string;
}

/**
 * Every external service that receives data, and precisely what reaches it — in English
 * and Turkish. `id`, `personalData`, and `verifiedIn` are facts about the system, not text,
 * so they're identical across both arrays by construction; a test asserts that rather than
 * trusting eyeballing two 5-row arrays.
 *
 * Each `dataSent` line was read out of the code on 2026-08-31 rather than assumed from the
 * service's general purpose, because the two differ in ways that matter here: the advisor
 * prompt sends a display name but NOT the student's school name, and Tavily — despite
 * being the "search the live web" integration — never receives student data at all,
 * because discovery builds one shared global catalogue instead of searching per student.
 * `verifiedIn` names the file to re-read when checking whether a line is still true.
 *
 * If you add a provider, add it to BOTH arrays in the same commit. This table is the
 * answer to the first question outside counsel will ask.
 */
export const DATA_PROCESSORS_EN: DataProcessor[] = [
  {
    id: "supabase",
    name: "Supabase",
    role: "Database, authentication, and file storage — the system of record for everything in your account.",
    dataSent:
      "Everything you enter or upload: email and password credentials, profile details, achievements, grades and test scores, goals, target universities, uploaded CVs and evidence files, advisor conversations, and product usage events.",
    location: "Amazon Web Services eu-central-1 (Frankfurt, Germany).",
    retention:
      "Held until you delete the item or your account. No automatic time limit is currently enforced.",
    personalData: true,
    verifiedIn: "lib/supabase/, supabase/migrations/0015_storage_buckets.sql",
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude API)",
    role: "The model behind profile analysis, the advisor, weekly plans, and CV import.",
    dataSent:
      "A compact profile summary — your display name, graduation year, curriculum, country, weekly time budget, dimension scores, and the titles of your activities, projects, research, awards and goals — plus the message you send the advisor. Your school name is not included. When you import a CV, the entire document is sent for extraction.",
    location: "Anthropic's infrastructure, outside the EU/EEA.",
    retention: "Governed by Anthropic's API terms — to be confirmed by counsel against the current data processing addendum.",
    personalData: true,
    verifiedIn: "lib/ai/student-context.ts, lib/ai/cv-extraction.ts, lib/ai/anthropic-provider.ts",
  },
  {
    id: "tavily",
    name: "Tavily",
    role: "Web search used to find and refresh opportunity and university pages.",
    dataSent:
      "Search terms only, and they never describe a student — they are catalogue queries such as a competition category or a university's name. Discovery builds one shared library for everyone rather than searching on any individual's behalf.",
    location: "Tavily's infrastructure, outside the EU/EEA.",
    retention: "No personal data is sent, so nothing about you is retained.",
    personalData: false,
    verifiedIn: "lib/providers/tavily.ts, lib/opportunities/discover.ts, lib/requirements/discover.ts",
  },
  {
    id: "openalex",
    name: "OpenAlex",
    role: "Open academic database used to ground research project suggestions in real current literature.",
    dataSent:
      "Subject keywords taken from the field and interests you selected — for example \"economics youth employment\". No name, email, or account identifier is attached to the query.",
    location: "OpenAlex (OurResearch), outside the EU/EEA.",
    retention: "No account identifiers are sent, so no record is linked to you.",
    personalData: false,
    verifiedIn: "lib/providers/openalex.ts, lib/ai/research-generator.ts",
  },
  {
    id: "college-scorecard",
    name: "U.S. College Scorecard",
    role: "Official U.S. Department of Education dataset used for university statistics.",
    dataSent: "University identifiers only. No student data is sent.",
    location: "U.S. Department of Education.",
    retention: "No personal data is sent.",
    personalData: false,
    verifiedIn: "lib/providers/college-scorecard.ts",
  },
];

export const DATA_PROCESSORS_TR: DataProcessor[] = [
  {
    id: "supabase",
    name: "Supabase",
    role: "Veritabanı, kimlik doğrulama ve dosya depolama — hesabınızdaki her şeyin tutulduğu ana sistem.",
    dataSent:
      "Girdiğiniz veya yüklediğiniz her şey: e-posta ve şifre bilgileri, profil bilgileri, başarılar, notlar ve sınav sonuçları, hedefler, hedef üniversiteler, yüklenen özgeçmişler ve kanıt dosyaları, danışman ile yazışmalar ve ürün kullanım kayıtları.",
    location: "Amazon Web Services eu-central-1 (Frankfurt, Almanya).",
    retention:
      "Siz silene ya da hesabınızı kapatana kadar saklanır. Şu an için otomatik bir saklama süresi sınırı uygulanmamaktadır.",
    personalData: true,
    verifiedIn: "lib/supabase/, supabase/migrations/0015_storage_buckets.sql",
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude API)",
    role: "Profil analizinin, danışmanın, haftalık planların ve özgeçmiş aktarımının arkasındaki model.",
    dataSent:
      "Kaydınızın tamamı değil, özet bir profil: görünen adınız, mezuniyet yılınız, müfredatınız, ülkeniz, haftalık zaman bütçeniz, boyut puanlarınız ve etkinlik, proje, araştırma, ödül ve hedeflerinizin başlıkları — buna danışmana gönderdiğiniz mesaj da dahildir. Okul adınız bu özete dahil edilmez. Bir özgeçmiş yüklediğinizde, içeriğinin çıkarılabilmesi için belgenin tamamı gönderilir.",
    location: "Anthropic altyapısı, AB/AEA dışında.",
    retention: "Anthropic'in API şartlarına tabidir — güncel veri işleme ekiyle (data processing addendum) karşılaştırılarak hukuk danışmanınca teyit edilecektir.",
    personalData: true,
    verifiedIn: "lib/ai/student-context.ts, lib/ai/cv-extraction.ts, lib/ai/anthropic-provider.ts",
  },
  {
    id: "tavily",
    name: "Tavily",
    role: "Fırsat ve üniversite sayfalarını bulmak ve güncel tutmak için kullanılan web arama servisi.",
    dataSent:
      "Yalnızca arama terimleri, ve bunlar hiçbir zaman bir öğrenciyi tanımlamaz — bir yarışma kategorisi veya bir üniversitenin adı gibi katalog sorgularıdır. Keşif süreci, kimse adına ayrı ayrı arama yapmak yerine herkes için tek bir ortak kütüphane oluşturur.",
    location: "Tavily altyapısı, AB/AEA dışında.",
    retention: "Hiçbir kişisel veri gönderilmediği için, hakkınızda saklanan hiçbir şey yoktur.",
    personalData: false,
    verifiedIn: "lib/providers/tavily.ts, lib/opportunities/discover.ts, lib/requirements/discover.ts",
  },
  {
    id: "openalex",
    name: "OpenAlex",
    role: "Araştırma proje önerilerini gerçek ve güncel literatüre dayandırmak için kullanılan açık akademik veritabanı.",
    dataSent:
      "Seçtiğiniz alan ve ilgi alanlarından türetilen konu anahtar kelimeleri — örneğin \"ekonomi genç işsizliği\". Sorguya isim, e-posta veya hesap kimliği eklenmez.",
    location: "OpenAlex (OurResearch), AB/AEA dışında.",
    retention: "Hesap kimliği gönderilmediği için size bağlı hiçbir kayıt oluşmaz.",
    personalData: false,
    verifiedIn: "lib/providers/openalex.ts, lib/ai/research-generator.ts",
  },
  {
    id: "college-scorecard",
    name: "U.S. College Scorecard",
    role: "Üniversite istatistikleri için kullanılan, ABD Eğitim Bakanlığı'nın resmî veri kümesi.",
    dataSent: "Yalnızca üniversite kimlikleri. Hiçbir öğrenci verisi gönderilmez.",
    location: "ABD Eğitim Bakanlığı (U.S. Department of Education).",
    retention: "Hiçbir kişisel veri gönderilmez.",
    personalData: false,
    verifiedIn: "lib/providers/college-scorecard.ts",
  },
];

export function getDataProcessors(locale: Locale): DataProcessor[] {
  return locale === "tr" ? DATA_PROCESSORS_TR : DATA_PROCESSORS_EN;
}

// ---------------------------------------------------------------------------
// Open questions for counsel
// ---------------------------------------------------------------------------

export interface LawyerFlag {
  id: string;
  question: string;
  /** What the code does today, so counsel is advising on reality rather than intent. */
  currentState: string;
}

/**
 * The decisions engineering deliberately did not make. English only, deliberately: these
 * are rendered nowhere in the product (never shown to a student in either language) — they
 * exist so the review packet (LEGAL_REVIEW.md) and this module cannot drift apart, and so
 * nobody mistakes an unanswered question for an answered one. Translating an internal
 * engineering-to-counsel note would cost effort with no reader who needs it in Turkish;
 * the documents those readers actually see are the ones translated above.
 */
export const LAWYER_FLAGS: LawyerFlag[] = [
  {
    id: "kvkkLanguage",
    question:
      "Must the KVKK notice be published in Turkish before Turkey launch, and does an English-only version satisfy the Article 10 disclosure obligation in the meantime?",
    currentState:
      "RESOLVED for text (this pass): the KVKK notice, along with Privacy and Terms, now has a complete Turkish translation (legalCopyTr in lib/legal/content.ts), selected automatically from the student's resolved locale — no manual step, no separate deploy. Still open: whether counsel wants the Turkish version reviewed independently of the English one, since a translation error is its own kind of error even when the source was approved.",
  },
  {
    id: "legalBasis",
    question:
      "Which KVKK Article 5 / GDPR Article 6 basis covers each processing purpose — and specifically whether AI profile analysis rests on contract necessity or requires separate explicit consent.",
    currentState:
      "Signup captures one combined acceptance of the Terms and acknowledgement of the Privacy Notice. Processing purposes are not separately consented.",
  },
  {
    id: "internationalTransfer",
    question:
      "What instrument covers the transfer of student data to Anthropic outside the EU/EEA, and what KVKK Article 9 mechanism (as amended in 2024) applies for Turkish users?",
    currentState:
      "The database is in Frankfurt, but advisor context and uploaded CVs are sent to Anthropic outside the EU/EEA. No transfer instrument is recorded in the repository. The Turkish KVKK text describes the same transfer factually (who, what, where) without naming a mechanism, matching the English rather than translating a claim that isn't made.",
  },
  {
    id: "minorConsent",
    question:
      "At what age can a student consent for themselves in each launch market, what parental consent mechanism is required below it, and is a verifiable method needed or is notice sufficient?",
    currentState:
      "Birth year is collected during onboarding, after signup. No parental consent mechanism is built. The signup form reserves the place for it and states the requirement, in the student's resolved language.",
  },
  {
    id: "retention",
    question: "What retention period should apply to each data category, and to accounts abandoned before deletion?",
    currentState:
      "No automated retention limit exists. Data persists until the student deletes the item or the account. Deletion and full export are both implemented and working.",
  },
  {
    id: "aiUsageAnonymization",
    question:
      "On account deletion, is anonymizing an ai_usage row (nulling user_id, keeping feature/provider/model/token counts/cost) sufficient to satisfy an erasure right, or must the row be deleted outright?",
    currentState:
      "ai_usage.user_id is `on delete set null` (migration 0013_ops.sql), not cascade — the one exception among the 42 live tables referencing profiles(id), all of which cascade. logAIUsage() (lib/ai/usage.ts) never writes prompt or response text to this table, only those seven columns, so what survives is aggregate usage metering with no remaining identifier and no qualitative content. DATA_RIGHTS_AUDIT.md's read: this is a recognized way to satisfy erasure (anonymization), not a retained personal-data record — but that is engineering's non-lawyer reasoning, not a decision, and the alternative (cascade-delete the row like every other table) would lose the ability to reconstruct aggregate historical AI cost/usage once accounts are deleted." +
      " 2026-09-02: the copy was corrected to match this mechanism rather than overclaiming past it — Terms' 'ending', Privacy's 'your-rights', and the KVKK notice's 'exercising' sections now each note that a small number of anonymised, no-longer-linkable usage records may be retained, in both languages (docs/legal-copy-vs-product-gap-2026-09-02.md found the mismatch; this flag's own admission that the question was unresolved is what showed the published copy had gotten ahead of it). The KVKK notice's 'rights' section (Article 11) was deliberately left untouched — it states the general statutory right to request erasure 'where the grounds for processing no longer apply,' already conditional, not an unqualified operational promise, so it wasn't making the overclaim the other three were. This is a wording fix only: it stops the copy from asserting more than is settled, it does not settle whether anonymizing (rather than deleting) the row actually satisfies an erasure right — that question stays exactly as open as it was.",
  },
  {
    id: "aiModelDegradationDisclosure",
    question:
      "The Terms of Use and Privacy Notice say nothing about AI response quality varying with a student's usage this month — is the in-product notice already sufficient disclosure, or does a Terms/Privacy sentence need to name the mechanism generally (without necessarily publishing the dollar thresholds)?",
    currentState:
      "selectModelForUser() (lib/ai/limits/budget.ts) silently switches every AI feature from the configured ceiling model to a cheaper one (Haiku 4.5 by default) once a student's month-to-date AI spend reaches a $0.50 soft target — deliberately never a hard wall, per that file's own header. The product does disclose this in-app: MonthlyUsageMeter shows \"Replies are using a lighter model this month\" before a student sends anything, and each degraded advisor reply carries its own \"Lighter model\" note (messages/en.json, the degradeNote and usageMeter.degraded keys). Neither the Terms' ai-output section nor the Privacy Notice's ai section mentions the mechanism at all, in either language — not a false statement to correct (nothing currently claims uniform model quality), just a silence about a real, recurring behavior. This doesn't map cleanly onto Task 1's research (docs/research/resit-olmayan-odeme-hukuku-2026-09-02.md): DSA Art. 3(r) and Turkey's new Art. 25/A both key off paid/targeted advertising, and this isn't advertising — no specific clause found requires this particular disclosure, which is exactly why it's recorded here rather than resolved one way or the other.",
  },
  {
    id: "liability",
    question:
      "Liability limitations, disclaimers, governing law, and forum — none of which engineering should draft.",
    currentState: "The Terms draft states the product's limits in plain language, in both languages, but contains no liability clause in either.",
  },
  {
    id: "turkishLegalReview",
    question:
      "The Turkish translation (legalCopyTr) was produced by engineering using standard KVKK statutory vocabulary (veri sorumlusu, veri işleyen, açık rıza, aydınlatma yükümlülüğü, ilgili kişi), not by a Turkish-qualified lawyer or a professional legal translator. Does it need independent review before publication, separately from the English source review?",
    currentState:
      "Structurally mirrors the English exactly — same sections, same ids, same bullet counts, same unresolved placeholders, same hedges (e.g. Article 9's transfer mechanism is left unnamed in Turkish exactly as in English, not translated into a guessed term). A test (__tests__/legal/consent.test.ts) enforces structural parity between legalCopyEn and legalCopyTr so the two can't silently diverge. The Article 11 rights list is translated from the standard, widely-published paraphrase of the statutory list, not quoted from the law verbatim.",
  },
  {
    id: "opportunityImageLicensing",
    question:
      "Is an organizer publishing an og:image meta tag on their own official page a sufficient basis to download, re-encode, and re-host that image on Proxola's own infrastructure — or does the product need explicit organizer permission, an editorial-use argument, or to stop re-hosting third-party images altogether?",
    currentState:
      "scripts/acquire-opportunity-images.ts has re-hosted 65 opportunity images this way (full analysis in docs/opportunity-image-licensing.md). No organizer has granted an explicit licence; the claim rests on inferring intent from the meta tag, not on a stated permission. Every re-hosted image records the exact source page and retrieval date, and states plainly that no licence is declared and the depiction is not independently verified — that documents provenance, it does not clear rights. No takedown mechanism exists yet; removal today is a manual database query and a storage-object delete.",
  },
  {
    id: "feedbackReportRetention",
    question:
      "On account deletion, does anonymizing a feedback_reports row (nulling user_id, keeping the free-text message) satisfy an erasure right, or must the row be deleted outright — and does a student have any way to review or remove a report they already sent, short of deleting their whole account?",
    currentState:
      "feedback_reports.user_id is on delete set null (migration 0113, proposed, not yet applied), the same mechanism as ai_usage (aiUsageAnonymization above) — but the content is not comparable: ai_usage retains seven metering columns and no prose, while message is free text a student wrote in their own words, which can incidentally name people, schools, or situations that stay identifiable even once user_id is null. No UI lets a student view, edit, or delete a report after sending it — a select-own RLS policy exists (added so the report can be included in the account data export, lib/export/tables.ts), but nothing today reads through it for the student's own benefit. LEGAL_REVIEW.md §7 lays out three options (keep the current anonymize-in-place behavior, cascade-delete the row outright, or scrub the message text while keeping row metadata) with their costs, and notes that changing the on-delete behavior is a one-line, no-backfill edit for as long as migration 0113 stays unapplied — it is currently staged in the founder's own pending-migration package (data/morning/07-migrations-bekleyen-2026-09-03.sql) and becomes a real migration decision the moment that package runs.",
  },
];

// ---------------------------------------------------------------------------
// Document shape
// ---------------------------------------------------------------------------

export interface LegalSection {
  /** Anchor id — stable across translations, so deep links survive a locale switch. */
  id: string;
  heading: string;
  /** Body paragraphs. Plain strings: no markup, no interpolation. */
  body: string[];
  /** Optional bullet list rendered after the body. */
  bullets?: string[];
  /** Renders the shared processor table inside this section. */
  includesProcessorTable?: boolean;
  /**
   * Renders a block of company details from `COMPANY`, most of which are `Unresolved`.
   * A block rather than words interpolated into a sentence: an unresolved value spliced
   * mid-sentence is both untranslatable (word order moves) and easy to skim past, and
   * these are exactly the values a reader must not skim past.
   */
  companyDetails?: "identity" | "contact" | "law";
}

export interface LegalDocument {
  slug: "privacy" | "terms" | "kvkk";
  /** Browser tab and page heading. */
  title: string;
  /** One line under the heading. */
  intro: string;
  sections: LegalSection[];
}

export interface LegalCopy {
  draftBanner: {
    label: string;
    body: string;
  };
  processorTable: {
    caption: string;
    columnService: string;
    columnData: string;
    columnLocation: string;
    columnRetention: string;
    personalDataYes: string;
    personalDataNo: string;
  };
  footer: {
    tagline: string;
    productHeading: string;
    legalHeading: string;
    contactHeading: string;
    signIn: string;
    createAccount: string;
    privacy: string;
    terms: string;
    kvkk: string;
    contactLabel: string;
    companyLabel: string;
    /** Shown instead of `companyLabel`'s value when `COMPANY.legalName` is unresolved --
     *  see site-footer.tsx's own comment for why this reads as a plain statement ("registration
     *  pending") rather than the bracketed placeholder used before 2026-09-04. */
    companyPending: string;
    /** Same idea as `companyPending`, for `contactLabel`'s value when `COMPANY.contactEmail`
     *  is unresolved -- not currently reachable (contactEmail is a resolved string today) but
     *  kept consistent with companyPending rather than left on the old bracket treatment. */
    contactPending: string;
    draftNotice: string;
    copyright: (year: number) => string;
    ageNotice: string;
    /** The founder's own quiet entrance to /kumanda from the public footer -- a convenience
     * link, not a security boundary (requireAdmin/profiles.is_admin still gate the route
     * itself). Deliberately not styled or worded as a feature; see site-footer.tsx's own
     * placement comment for why it sits below the copyright line, on its own. */
    adminSignIn: string;
  };
  signupConsent: {
    checkboxLabel: string;
    checkboxLinkTerms: string;
    /** Glue word between the two document links — " & " in English, " ve " in Turkish.
     * A separate key rather than hardcoded punctuation in the component, because it's
     * still language-specific text, not layout. */
    checkboxLinkSeparator: string;
    checkboxLinkPrivacy: string;
    checkboxRequiredError: string;
    minorHeading: string;
    minorBody: string;
    minorPlaceholderNote: string;
    dataSummaryHeading: string;
    dataSummary: string[];
    reviewLink: string;
  };
  documents: {
    privacy: LegalDocument;
    terms: LegalDocument;
    kvkk: LegalDocument;
  };
  common: {
    backToHome: string;
    lastDrafted: string;
    notApproved: string;
    onThisPage: string;
    relatedDocuments: string;
    companyIdentityHeading: string;
    companyContactHeading: string;
    companyLawHeading: string;
    companyLegalName: string;
    companyRegistration: string;
    companyAddress: string;
    companyVerbis: string;
    companyEmail: string;
    companyPrivacyEmail: string;
    companyDpo: string;
    companyGoverningLaw: string;
    /** `<Unconfirmed>`'s bracket text: "[<label> — <notSupplied>, <pendingX>]". */
    unresolvedNotSupplied: string;
    unresolvedPendingFounder: string;
    unresolvedPendingCounsel: string;
  };
}

// ---------------------------------------------------------------------------
// English source copy
// ---------------------------------------------------------------------------

export const legalCopyEn: LegalCopy = {
  draftBanner: {
    label: "Draft — awaiting legal review",
    body:
      "This document has not been reviewed or approved by a lawyer. It is written so that outside counsel has something concrete to correct, and so you can see what Proxola actually does with your information today. Treat it as a description of the product, not as a finished legal agreement.",
  },

  processorTable: {
    caption: "Services that receive data, and exactly what reaches each one.",
    columnService: "Service",
    columnData: "What is sent",
    columnLocation: "Where",
    columnRetention: "How long",
    personalDataYes: "Identifies you",
    personalDataNo: "No personal data",
  },

  footer: {
    tagline: "A personal career operating system for students.",
    productHeading: "Product",
    legalHeading: "Legal",
    contactHeading: "Contact",
    signIn: "Sign in",
    createAccount: "Create an account",
    privacy: "Privacy Notice",
    terms: "Terms of Use",
    kvkk: "KVKK Disclosure (Türkiye)",
    contactLabel: "Email",
    companyLabel: "Operated by",
    companyPending: "registration pending",
    contactPending: "not yet available",
    draftNotice: "Our policies are drafts awaiting legal review.",
    copyright: (year: number) => `© ${year} Proxola`,
    ageNotice: "Built for students aged 14–18. If you are under 18, a parent or guardian should read these documents with you.",
    adminSignIn: "Admin sign in",
  },

  signupConsent: {
    checkboxLabel: "I have read and accept the",
    checkboxLinkTerms: "Terms of Use",
    checkboxLinkSeparator: " & ",
    checkboxLinkPrivacy: "Privacy Notice",
    checkboxRequiredError: "Please accept the Terms of Use and Privacy Notice to continue.",
    minorHeading: "If you are under 18",
    minorBody:
      "Proxola is built for students aged 14–18, so most people reading this are minors. A parent or guardian should read the Terms of Use and Privacy Notice with you before you continue.",
    minorPlaceholderNote:
      "We ask for your birth year during setup, just after this step. Guardian approval is not yet collected in the product — this is where it will be asked for once the requirement is confirmed with legal counsel.",
    dataSummaryHeading: "What you are agreeing to, in short",
    dataSummary: [
      "Everything you enter is private to your account by default. Evidence files and CV uploads are never publicly addressable.",
      "Your profile summary and any CV you upload are sent to Anthropic's Claude API to generate your scores, plans, and advisor answers.",
      "Your account data is stored in Frankfurt, Germany.",
      "You can export everything or delete your account at any time from Settings.",
    ],
    reviewLink: "Read the full Privacy Notice",
  },

  common: {
    backToHome: "Back to Proxola",
    lastDrafted: "Drafted",
    notApproved: "Not yet approved by counsel",
    onThisPage: "On this page",
    relatedDocuments: "Related documents",
    companyIdentityHeading: "Controller details",
    companyContactHeading: "Contact details",
    companyLawHeading: "Jurisdiction",
    companyLegalName: "Registered name",
    companyRegistration: "Company number",
    companyAddress: "Registered address",
    companyVerbis: "VERBİS registration",
    companyEmail: "General enquiries",
    companyPrivacyEmail: "Privacy and data requests",
    companyDpo: "Data Protection Officer",
    companyGoverningLaw: "Governing law",
    unresolvedNotSupplied: "not yet supplied",
    unresolvedPendingFounder: "pending founder",
    unresolvedPendingCounsel: "pending counsel",
  },

  documents: {
    // -------------------------------------------------------------------
    privacy: {
      slug: "privacy",
      title: "Privacy Notice",
      intro:
        "What Proxola collects, why, where it goes, and what you can do about it. Written to describe what the product actually does today.",
      sections: [
        {
          id: "who-we-are",
          companyDetails: "identity",
          heading: "Who is responsible for your data",
          body: [
            "Proxola is a career and profile planning product for students. The company operating it is the data controller for the information described here.",
            "The registered entity, address, and contact details are not yet settled and are shown as unresolved throughout this draft rather than guessed at. They must be filled in before this notice is published.",
          ],
        },
        {
          id: "what-we-collect",
          heading: "What we collect",
          body: [
            "Only what you give us, plus a record of how you use the product. Proxola has no advertising trackers and no third-party analytics; usage events are recorded in our own database.",
          ],
          bullets: [
            "Account details: your email address, display name, and a password managed by our authentication provider. We never see your password.",
            "Profile basics: first and last name, birth year, country, optional city, school name, graduation year, curriculum, preferred language, and timezone.",
            "Your record: activities, leadership roles, awards, certifications, projects, research, volunteering, work experience, internships, summer programmes, sports, skills, languages, interests, and goals.",
            "Academic information: education history, coursework, grades, and standardized test scores you choose to enter.",
            "Documents: CVs you upload for import, and any evidence files you attach to an achievement.",
            "Your plans: target universities, applications, deadlines, weekly actions, and what you reported back after completing them.",
            "Conversations: the messages you exchange with the Proxola advisor.",
            "Usage: which product events occurred and when, and how many AI tokens a feature used. We do not store the content of your prompts in our usage log.",
          ],
        },
        {
          id: "why",
          heading: "Why we use it",
          body: [
            "Every use below serves the product you signed up for. We do not sell your data, and we do not use it to advertise to you.",
          ],
          bullets: [
            "To run your account and keep you signed in.",
            "To calculate your profile dimensions and completeness, and to show how they change over time.",
            "To generate your weekly priorities and explain the reasoning behind them.",
            "To match you to opportunities you are actually eligible for, and to stop showing you ones you said no to.",
            "To answer your questions in the advisor with your real profile as context.",
            "To keep the product safe, including moderating content in shared spaces.",
            "To understand which parts of the product are used, so we can improve them.",
          ],
        },
        {
          id: "ai",
          heading: "How your information reaches an AI model",
          body: [
            "Proxola's analysis, weekly plans, advisor answers, and CV import all run on Anthropic's Claude API. This is the part of the product that sends your information outside our own database, so it is worth being precise about.",
            "When you use the advisor or generate a plan, we send a compact summary rather than your whole record: your display name, graduation year, curriculum, country, weekly time budget, your dimension scores, and the titles of your activities, projects, research, awards and goals. Your school name is not included in this summary.",
            "When you import a CV, the whole document is sent to Anthropic so its contents can be extracted. Whatever is in that file — including anything we would not otherwise collect — is sent with it. Nothing extracted from it is saved to your profile until you review it and confirm.",
            "AI calls happen on our servers. Our API credentials are never exposed to your browser.",
            "Anthropic is outside the EU/EEA. The safeguards covering that transfer are still being confirmed by counsel and are listed as an open question in this draft rather than asserted.",
          ],
        },
        {
          id: "processors",
          heading: "Who else receives your data",
          body: [
            "Proxola uses a small number of external services. This is all of them, and exactly what each one receives. Several of them never receive anything that identifies you, and the table says which.",
          ],
          includesProcessorTable: true,
        },
        {
          id: "where",
          heading: "Where your data is stored",
          body: [
            "Your account, profile, documents, and conversations are stored in our database and file storage, hosted on Amazon Web Services in Frankfurt, Germany (eu-central-1).",
            "Uploaded CVs and evidence files live in private storage that is not publicly addressable. They are readable only through short-lived signed links generated for you, and our access rules scope every file to the account that uploaded it.",
          ],
        },
        {
          id: "retention",
          heading: "How long we keep it",
          body: [
            "Today, we keep your information until you delete it. Deleting an item removes it; deleting your account removes your data with it.",
            "Proxola does not yet enforce an automatic retention limit — for example, for an account left unused for a long period. Stating a specific retention period here before one is actually implemented would be a promise the product does not keep, so this section records the real position instead. Setting those periods is one of the open questions for counsel.",
          ],
        },
        {
          id: "your-rights",
          heading: "What you can do",
          body: [
            "Two of these work today, from the Settings page, without having to ask us:",
          ],
          bullets: [
            "Export everything: download a complete copy of your data in a machine-readable file.",
            "Delete your account: permanently remove your account and the data attached to it, aside from a small number of usage records that are kept in anonymised form and can no longer be linked to you.",
            "Correct anything: edit or remove any item in your profile directly.",
            "Ask us: depending on where you live, you may also have the right to object to or restrict certain processing, or to lodge a complaint with your data protection authority. Contact details for making such a request are unresolved in this draft.",
          ],
        },
        {
          id: "minors",
          heading: "Students under 18",
          body: [
            "Proxola is designed for students aged 14–18, so we assume most of the people using it are minors, and the product is built accordingly: profiles are private by default, evidence is optional, we ask for a birth year rather than a full date of birth, we do not collect precise location, and there is no public student-to-student messaging.",
            "A parent or guardian should read this notice with you. A guardian approval step is not yet built into the product; the signup form marks the place it will occupy, and the requirement is being confirmed with legal counsel for each country we launch in.",
          ],
        },
        {
          id: "security",
          heading: "How we protect it",
          body: [
            "Access to your rows in our database is enforced at the database level, not only in application code, so another account cannot read your profile even if a bug in the product tried to let it. Uploaded files are private by default and reachable only through short-lived signed links. All external API credentials stay on the server and are never sent to your browser.",
            "No system is perfectly secure, and we would rather say that than imply otherwise.",
          ],
        },
        {
          id: "changes",
          heading: "Changes to this notice",
          body: [
            "This document is a draft. When it is reviewed and approved, this section will record the effective date and how we will tell you about material changes.",
          ],
        },
        {
          id: "contact",
          companyDetails: "contact",
          heading: "Contact",
          body: [
            "Questions about this notice, or a request about your data, should go to the address below once it is set.",
          ],
        },
      ],
    },

    // -------------------------------------------------------------------
    terms: {
      slug: "terms",
      title: "Terms of Use",
      intro:
        "The agreement between you and Proxola — what the product does, what it does not do, and what we each owe the other.",
      sections: [
        {
          id: "what-oryn-is",
          heading: "What Proxola is",
          body: [
            "Proxola helps you record what you have done, understand your strengths and gaps, and decide what to do next. It gives you a profile analysis, weekly priorities, opportunity matches, university information, and an AI advisor that reasons over your own record.",
            "By creating an account you agree to these terms. If you do not agree with them, do not use Proxola.",
          ],
        },
        {
          id: "what-oryn-is-not",
          heading: "What Proxola is not",
          body: [
            "This section matters more than any other, so it comes early rather than buried at the end.",
          ],
          bullets: [
            "Proxola does not decide admissions and has no relationship with any university's admissions office. Nothing in the product is an application, a pre-assessment, or a signal to any institution.",
            "Your Career Profile score is Proxola's own development metric. It is not a university's assessment of you, and it is not a probability of admission. Those are different things and the product keeps them separate on purpose.",
            "An admission outlook — \"Reach\", \"Competitive\", and so on — is Proxola's classification based on the information available to it. It is not a prediction and not a guarantee. Where an estimated range is shown, it is labelled as an estimate and deliberately avoids false precision.",
            "Application readiness measures how much of a known checklist you have completed. It says nothing about your chances.",
            "Proxola is not a substitute for your school counsellor, a qualified admissions adviser, or your own judgement.",
          ],
        },
        {
          id: "ai-output",
          heading: "About the AI advice",
          body: [
            "Proxola's recommendations, explanations, and generated project ideas come from an AI model working with the information in your profile. The model can be wrong. It can misread something you entered, or reason from a gap in what it knows about you.",
            "Where Proxola states an external fact — a deadline, an entry requirement, an eligibility rule — it shows you the source and when that source was last checked. Check anything that matters against the official page before you act on it. Sources move and deadlines change.",
            "The advisor is built to distinguish what it verified from what it inferred, and to tell you when a recommendation is low-confidence. Take those signals seriously; they are there because the alternative is confident-sounding advice about your future that happens to be wrong.",
          ],
        },
        {
          id: "eligibility",
          heading: "Who can use Proxola",
          body: [
            "Proxola is built for students aged 14–18. If you are under 18, a parent or guardian should read these terms with you, and depending on where you live their approval may be required before you can use the product.",
            "The minimum age and the form guardian approval has to take differ by country and are being confirmed with legal counsel. Until then this section describes our intent rather than a settled rule.",
          ],
        },
        {
          id: "your-account",
          heading: "Your account",
          body: [
            "Keep your password to yourself and your email address current. You are responsible for what happens under your account. Tell us if you think someone else has access to it.",
            "One account per person. Do not create an account on someone else's behalf without their knowledge.",
          ],
        },
        {
          id: "your-content",
          heading: "What you put into Proxola",
          body: [
            "Your record stays yours. You give us permission to store and process it only to run the product for you — to calculate your scores, generate your plans, match you to opportunities, and answer your questions. Nothing more.",
            "Only enter things that are true. Proxola treats an achievement as self-reported until evidence is attached, and attaching a file is not the same as independent verification — the product will not describe it as verified, and neither should you.",
            "Do not upload anything you do not have the right to share, and do not upload other people's personal information.",
          ],
        },
        {
          id: "acceptable-use",
          heading: "Acceptable use",
          body: ["A short list, and all of it is the obvious kind:"],
          bullets: [
            "Do not try to access another student's data, or probe the product for ways to.",
            "Do not scrape the product or use it to build a competing dataset.",
            "Do not upload malicious files, or content that is illegal, harassing, or abusive.",
            "Do not misrepresent your identity or your achievements.",
            "Do not attempt to make the AI advisor produce harmful content or reveal other users' information.",
          ],
        },
        {
          id: "availability",
          heading: "Availability and changes",
          body: [
            "Proxola is under active development. Features will change, and parts of the product depend on external services that can be slow or unavailable. When that happens the product is built to tell you the data is unavailable rather than show you something invented in its place.",
            "We may change or discontinue features. If a change materially affects you, we will say so.",
          ],
        },
        {
          id: "ending",
          heading: "Ending your account",
          body: [
            "You can delete your account at any time from Settings, and export your data first if you want a copy. Deletion is permanent: your account and the data attached to it are removed, aside from a small number of usage records that are kept in anonymised form and can no longer be linked to you.",
            "We may suspend an account that breaks these terms or puts other students at risk.",
          ],
        },
        {
          id: "liability",
          heading: "Liability",
          body: [
            "This section has deliberately been left for a lawyer to write. Drafting a liability limitation is not something engineering should do, and a placeholder that reads like a real clause would be worse than an honest gap.",
            "Decisions about your education are yours. Proxola is a tool that helps you think about them.",
          ],
        },
        {
          id: "law",
          companyDetails: "law",
          heading: "Governing law",
          body: [
            "The governing law and the courts with jurisdiction depend on where the company is registered, which is not yet settled. Both are unresolved in this draft.",
          ],
        },
      ],
    },

    // -------------------------------------------------------------------
    kvkk: {
      slug: "kvkk",
      title: "KVKK Disclosure Notice",
      intro:
        "For students in Türkiye — the disclosure required by Article 10 of Law No. 6698 on the Protection of Personal Data. Draft, pending counsel review before publication.",
      sections: [
        {
          id: "language",
          heading: "About this draft",
          body: [
            "This notice is available in Turkish, the language a disclosure addressed to data subjects in Türkiye should be published in — see the language switcher. It was translated by engineering using KVKK's standard statutory vocabulary, not by a Turkish-qualified lawyer or professional legal translator, and that translation itself is an open item for counsel to review (see LEGAL_REVIEW.md) — independent of whether the underlying English text has been approved.",
            "Article references below follow Law No. 6698. Article 9, on transfers abroad, was amended in 2024 and the applicable mechanism is one of the open questions for counsel rather than something asserted here.",
          ],
        },
        {
          id: "controller",
          companyDetails: "identity",
          heading: "Data controller (Veri sorumlusu)",
          body: [
            "The company operating Proxola is the data controller. Its registered name, address, and — if the obligation applies — its VERBİS registration are not yet settled and are shown as unresolved rather than guessed at.",
          ],
        },
        {
          id: "categories",
          heading: "Categories of personal data processed",
          body: ["The same data described in the Privacy Notice, grouped as this law expects:"],
          bullets: [
            "Identity: first and last name, display name, birth year.",
            "Contact: email address.",
            "Education: school, curriculum, graduation year, coursework, grades, standardized test scores.",
            "Achievements and activity: activities, leadership, awards, projects, research, work, volunteering, sports, skills, languages, interests, goals.",
            "Documents: uploaded CVs and evidence files, which may contain further categories depending on what you upload.",
            "Transaction and usage: product events, session records, AI usage counts, advisor conversations.",
            "Location: country and, optionally, city. Precise location is not collected.",
          ],
        },
        {
          id: "purposes",
          heading: "Purposes of processing",
          body: [
            "To create and operate your account; to produce your profile analysis and completeness; to generate weekly priorities and recommendations; to match you to opportunities you are eligible for; to answer your questions through the AI advisor; to keep shared spaces safe; and to understand and improve how the product is used.",
          ],
        },
        {
          id: "legal-basis",
          heading: "Legal basis (Article 5)",
          body: [
            "The mapping of each purpose to a basis under Article 5 — in particular whether AI-driven profile analysis rests on the necessity of performing a contract or requires separate explicit consent (açık rıza) — is a decision for counsel and is recorded as an open question rather than stated here.",
            "What the product does today: signup captures a single acceptance of the Terms of Use together with acknowledgement of the Privacy Notice. Individual processing purposes are not separately consented.",
          ],
        },
        {
          id: "collection",
          heading: "Method of collection",
          body: [
            "All personal data is collected electronically and directly from you: through the signup form, the onboarding flow, the profile pages, documents you upload, and your use of the product. Proxola does not buy personal data or obtain it from third parties.",
          ],
        },
        {
          id: "transfers",
          heading: "Transfers, including abroad (Article 9)",
          body: [
            "Your data is stored in Frankfurt, Germany — outside Türkiye. Some of it is transferred further, to service providers outside the EU/EEA, principally Anthropic for AI processing. The table below lists every recipient and exactly what each receives.",
            "The Article 9 mechanism that legitimises these transfers following the 2024 amendments has not been determined and is an open question for counsel. This draft does not claim one is in place.",
          ],
          includesProcessorTable: true,
        },
        {
          id: "rights",
          heading: "Your rights (Article 11)",
          body: ["Under Article 11 of Law No. 6698 you have the right to:"],
          bullets: [
            "Learn whether your personal data is being processed.",
            "Request information about the processing, if it has taken place.",
            "Learn the purpose of the processing and whether the data is used in accordance with that purpose.",
            "Know the third parties to whom your data is transferred, in Türkiye or abroad.",
            "Request correction of incomplete or inaccurate data, and ask that any correction be communicated to those third parties.",
            "Request erasure or destruction of your data where the grounds for processing no longer apply, and ask that this be communicated to those third parties.",
            "Object to a result produced solely by automated analysis that works to your detriment.",
            "Claim compensation for damage arising from unlawful processing.",
          ],
        },
        {
          id: "exercising",
          companyDetails: "contact",
          heading: "How to exercise these rights",
          body: [
            "Two of these rights are built into the product and need no request: you can download a complete copy of your data, and permanently delete your account, from Settings — removing your account and the data attached to it, aside from a small number of usage records that are kept in anonymised form and can no longer be linked to you. You can correct or remove any individual item directly.",
            "For anything else, a written application to the controller is the route the law provides, and the controller must respond within thirty days. The application address and the exact procedure are unresolved in this draft and must be set before publication.",
          ],
        },
        {
          id: "minors",
          heading: "Students under 18",
          body: [
            "Proxola is intended for students aged 14–18. The age at which a student can consent for themselves under Turkish law, and the form a guardian's approval must take, are being confirmed with counsel. The product collects a birth year during onboarding and reserves a place in the signup flow for guardian approval; the mechanism is not yet built, and this notice does not suggest otherwise.",
          ],
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Turkish translation
// ---------------------------------------------------------------------------

export const legalCopyTr: LegalCopy = {
  draftBanner: {
    label: "Taslak — hukuki inceleme bekliyor",
    body:
      "Bu belge henüz bir avukat tarafından incelenip onaylanmamıştır. Dış hukuk danışmanının üzerinde somut bir düzeltme yapabileceği bir metin olması ve Proxola'nın bilgilerinizle bugün gerçekte ne yaptığını görebilmeniz için bu şekilde yazılmıştır. Bu metni tamamlanmış bir hukuki sözleşme değil, ürünün bir açıklaması olarak değerlendirin.",
  },

  processorTable: {
    caption: "Veri alan servisler ve her birine tam olarak neyin ulaştığı.",
    columnService: "Servis",
    columnData: "Ne gönderiliyor",
    columnLocation: "Nerede",
    columnRetention: "Ne kadar süreyle",
    personalDataYes: "Sizi tanımlar",
    personalDataNo: "Kişisel veri yok",
  },

  footer: {
    tagline: "Öğrenciler için kişisel bir kariyer işletim sistemi.",
    productHeading: "Ürün",
    legalHeading: "Yasal",
    contactHeading: "İletişim",
    signIn: "Giriş yap",
    createAccount: "Hesap oluştur",
    privacy: "Gizlilik Bildirimi",
    terms: "Kullanım Şartları",
    kvkk: "KVKK Aydınlatma Metni (Türkiye)",
    contactLabel: "E-posta",
    companyLabel: "İşleten",
    companyPending: "tescil bekleniyor",
    contactPending: "henüz mevcut değil",
    draftNotice: "Politikalarımız, hukuki incelemeyi bekleyen taslaklardır.",
    copyright: (year: number) => `© ${year} Proxola`,
    ageNotice: "14-18 yaş arası öğrenciler için tasarlanmıştır. 18 yaşından küçükseniz, bu belgeleri bir ebeveyn veya vasiyle birlikte okumalısınız.",
    adminSignIn: "Admin girişi",
  },

  signupConsent: {
    checkboxLabel: "Aşağıdakileri okudum ve kabul ediyorum:",
    checkboxLinkTerms: "Kullanım Şartları",
    checkboxLinkSeparator: " ve ",
    checkboxLinkPrivacy: "Gizlilik Bildirimi",
    checkboxRequiredError: "Devam etmek için lütfen Kullanım Şartları'nı ve Gizlilik Bildirimi'ni kabul edin.",
    minorHeading: "18 yaşından küçükseniz",
    minorBody:
      "Proxola, 14-18 yaş arası öğrenciler için tasarlanmıştır; bu nedenle bunu okuyanların çoğu reşit değildir. Devam etmeden önce Kullanım Şartları'nı ve Gizlilik Bildirimi'ni bir ebeveyn veya vasinizle birlikte okumalısınız.",
    minorPlaceholderNote:
      "Doğum yılınızı, bu adımdan hemen sonraki kurulum aşamasında soruyoruz. Veli onayı şu an ürün içinde toplanmamaktadır — bu, gereklilik hukuk danışmanıyla teyit edildiğinde sorulacağı yerdir.",
    dataSummaryHeading: "Kısaca neyi kabul ediyorsunuz",
    dataSummary: [
      "Girdiğiniz her şey, varsayılan olarak yalnızca hesabınıza özeldir. Kanıt dosyaları ve özgeçmiş yüklemeleri hiçbir zaman herkese açık bir adresten erişilebilir hale gelmez.",
      "Profil özetiniz ve yüklediğiniz herhangi bir özgeçmiş, puanlarınızı, planlarınızı ve danışman yanıtlarınızı oluşturmak üzere Anthropic'in Claude API'sine gönderilir.",
      "Hesap verileriniz Frankfurt, Almanya'da saklanır.",
      "İstediğiniz zaman Ayarlar bölümünden tüm verilerinizi dışa aktarabilir veya hesabınızı silebilirsiniz.",
    ],
    reviewLink: "Gizlilik Bildirimi'nin tamamını okuyun",
  },

  common: {
    backToHome: "Proxola'ya dön",
    lastDrafted: "Taslak tarihi",
    notApproved: "Henüz hukuk danışmanınca onaylanmadı",
    onThisPage: "Bu sayfada",
    relatedDocuments: "İlgili belgeler",
    companyIdentityHeading: "Veri sorumlusu bilgileri",
    companyContactHeading: "İletişim bilgileri",
    companyLawHeading: "Yetkili hukuk",
    companyLegalName: "Ticaret unvanı",
    companyRegistration: "Ticaret sicil numarası",
    companyAddress: "Kayıtlı adres",
    companyVerbis: "VERBİS kaydı",
    companyEmail: "Genel iletişim",
    companyPrivacyEmail: "Gizlilik ve veri talepleri",
    companyDpo: "Veri Sorumlusu Temsilcisi",
    companyGoverningLaw: "Yetkili hukuk ve mahkeme",
    unresolvedNotSupplied: "henüz sağlanmadı",
    unresolvedPendingFounder: "kurucudan bekleniyor",
    unresolvedPendingCounsel: "hukuk danışmanından bekleniyor",
  },

  documents: {
    // -------------------------------------------------------------------
    privacy: {
      slug: "privacy",
      title: "Gizlilik Bildirimi",
      intro:
        "Proxola'nın ne topladığı, neden topladığı, bu bilgilerin nereye gittiği ve bu konuda ne yapabileceğiniz. Ürünün bugün gerçekte ne yaptığını anlatmak üzere yazılmıştır.",
      sections: [
        {
          id: "who-we-are",
          companyDetails: "identity",
          heading: "Verilerinizden kim sorumlu",
          body: [
            "Proxola, öğrenciler için bir kariyer ve profil planlama ürünüdür. Ürünü işleten şirket, burada açıklanan bilgiler bakımından veri sorumlusudur.",
            "Kayıtlı tüzel kişilik, adres ve iletişim bilgileri henüz kesinleşmemiştir; tahmin yürütülmek yerine bu taslak boyunca çözülmemiş olarak gösterilmektedir. Bu bildirim yayımlanmadan önce doldurulmaları gerekir.",
          ],
        },
        {
          id: "what-we-collect",
          heading: "Neleri topluyoruz",
          body: [
            "Yalnızca bize verdikleriniz, buna ek olarak ürünü nasıl kullandığınıza dair bir kayıt. Proxola'da reklam takip araçları veya üçüncü taraf analitik yoktur; kullanım olayları kendi veritabanımızda kaydedilir.",
          ],
          bullets: [
            "Hesap bilgileri: e-posta adresiniz, görünen adınız ve kimlik doğrulama sağlayıcımız tarafından yönetilen bir şifre. Şifrenizi asla görmeyiz.",
            "Temel profil bilgileri: ad ve soyad, doğum yılı, ülke, isteğe bağlı şehir, okul adı, mezuniyet yılı, müfredat, tercih edilen dil ve zaman dilimi.",
            "Kaydınız: etkinlikler, liderlik rolleri, ödüller, sertifikalar, projeler, araştırma, gönüllülük, iş deneyimi, stajlar, yaz programları, spor, beceriler, diller, ilgi alanları ve hedefler.",
            "Akademik bilgiler: eğitim geçmişi, dersler, notlar ve girmeyi tercih ettiğiniz standart sınav sonuçları.",
            "Belgeler: aktarım için yüklediğiniz özgeçmişler ve bir başarıya eklediğiniz kanıt dosyaları.",
            "Planlarınız: hedef üniversiteler, başvurular, son tarihler, haftalık eylemler ve bunları tamamladıktan sonra bildirdikleriniz.",
            "Yazışmalar: Proxola danışmanıyla yaptığınız yazışmalar.",
            "Kullanım: hangi ürün olaylarının ne zaman gerçekleştiği ve bir özelliğin ne kadar yapay zekâ token'ı kullandığı. Kullanım kaydımızda isteklerinizin (prompt) içeriğini saklamayız.",
          ],
        },
        {
          id: "why",
          heading: "Neden kullanıyoruz",
          body: [
            "Aşağıdaki her kullanım, kaydolduğunuz ürüne hizmet eder. Verilerinizi satmayız ve size reklam göstermek için kullanmayız.",
          ],
          bullets: [
            "Hesabınızı çalıştırmak ve oturumunuzu açık tutmak için.",
            "Profil boyutlarınızı ve tamlığınızı hesaplamak, bunların zaman içinde nasıl değiştiğini göstermek için.",
            "Haftalık önceliklerinizi oluşturmak ve bunların arkasındaki gerekçeyi açıklamak için.",
            "Sizi gerçekten uygun olduğunuz fırsatlarla eşleştirmek ve istemediğinizi belirttiğiniz fırsatları bir daha göstermemek için.",
            "Danışmandaki sorularınızı gerçek profilinizi bağlam alarak yanıtlamak için.",
            "Paylaşılan alanlardaki içeriğin denetlenmesi dahil, ürünü güvenli tutmak için.",
            "Ürünün hangi bölümlerinin kullanıldığını anlayıp geliştirebilmek için.",
          ],
        },
        {
          id: "ai",
          heading: "Bilgileriniz bir yapay zekâ modeline nasıl ulaşır",
          body: [
            "Proxola'nın analizi, haftalık planları, danışman yanıtları ve özgeçmiş aktarımının tümü Anthropic'in Claude API'si üzerinde çalışır. Bu, ürünün bilgilerinizi kendi veritabanımızın dışına gönderdiği bölümdür; bu yüzden burada net olmakta fayda var.",
            "Danışmanı kullandığınızda veya bir plan oluşturduğunuzda, kaydınızın tamamını değil özet bir profil göndeririz: görünen adınız, mezuniyet yılınız, müfredatınız, ülkeniz, haftalık zaman bütçeniz, boyut puanlarınız ve etkinlik, proje, araştırma, ödül ve hedeflerinizin başlıkları. Okul adınız bu özete dahil edilmez.",
            "Bir özgeçmiş aktardığınızda, içeriğinin çıkarılabilmesi için belgenin tamamı Anthropic'e gönderilir. O dosyada ne varsa — normalde toplamayacağımız bilgiler de dahil — belgeyle birlikte gönderilir. Belgeden çıkarılan hiçbir bilgi, siz inceleyip onaylamadan profilinize kaydedilmez.",
            "Yapay zekâ çağrıları sunucularımızda gerçekleşir. API kimlik bilgilerimiz hiçbir zaman tarayıcınıza açılmaz.",
            "Anthropic, AB/AEA dışındadır. Bu aktarımı kapsayan güvenceler hâlâ hukuk danışmanınca teyit edilmekte olup, burada kesin bir iddia olarak değil bu taslaktaki çözülmemiş bir soru olarak listelenmiştir.",
          ],
        },
        {
          id: "processors",
          heading: "Verilerinizi başka kimler alıyor",
          body: [
            "Proxola az sayıda dış servis kullanır. Aşağıdaki liste bunların tamamıdır ve her birinin tam olarak ne aldığını gösterir. Bunlardan birkaçı sizi tanımlayan hiçbir şey almaz; tablo hangilerinin olduğunu belirtir.",
          ],
          includesProcessorTable: true,
        },
        {
          id: "where",
          heading: "Verileriniz nerede saklanıyor",
          body: [
            "Hesabınız, profiliniz, belgeleriniz ve yazışmalarınız, Amazon Web Services'in Frankfurt, Almanya'daki (eu-central-1) altyapısında barındırılan veritabanımızda ve dosya depolama alanımızda saklanır.",
            "Yüklenen özgeçmişler ve kanıt dosyaları, herkese açık bir adresten erişilemeyen özel bir depolama alanında bulunur. Yalnızca sizin için oluşturulan, kısa ömürlü imzalı bağlantılar üzerinden okunabilirler ve erişim kurallarımız her dosyayı onu yükleyen hesapla sınırlar.",
          ],
        },
        {
          id: "retention",
          heading: "Ne kadar süre sakladığımız",
          body: [
            "Bugün itibarıyla, bilgilerinizi siz silene kadar saklıyoruz. Bir öğeyi silmek onu kaldırır; hesabınızı silmek verilerinizi de beraberinde kaldırır.",
            "Proxola, örneğin uzun süre kullanılmayan bir hesap için, henüz otomatik bir saklama süresi sınırı uygulamamaktadır. Bu, fiilen uygulanmadan önce burada belirli bir saklama süresi belirtmek ürünün tutmadığı bir söz vermek anlamına gelir; bu nedenle bu bölüm gerçek durumu kaydeder. Bu sürelerin belirlenmesi, hukuk danışmanı için açık sorulardan biridir.",
          ],
        },
        {
          id: "your-rights",
          heading: "Neler yapabilirsiniz",
          body: [
            "Aşağıdakilerden ikisi bugün itibarıyla, bize sormanıza gerek kalmadan, Ayarlar sayfasından çalışır:",
          ],
          bullets: [
            "Her şeyi dışa aktarın: verilerinizin eksiksiz bir kopyasını makine tarafından okunabilir bir dosya olarak indirin.",
            "Hesabınızı silin: hesabınızı ve ona bağlı verileri kalıcı olarak kaldırın; yalnızca artık sizinle ilişkilendirilemeyen, anonim hale getirilmiş az sayıda kullanım kaydı saklanabilir.",
            "Herhangi bir şeyi düzeltin: profilinizdeki herhangi bir öğeyi doğrudan düzenleyin veya kaldırın.",
            "Bize başvurun: yaşadığınız yere bağlı olarak, belirli işleme faaliyetlerine itiraz etme veya bunları kısıtlama, ya da veri koruma otoritenize şikâyette bulunma hakkına da sahip olabilirsiniz. Bu tür bir talep için iletişim bilgileri bu taslakta henüz çözülmemiştir.",
          ],
        },
        {
          id: "minors",
          heading: "18 yaşından küçük öğrenciler",
          body: [
            "Proxola, 14-18 yaş arası öğrenciler için tasarlanmıştır; bu nedenle kullanıcılarının çoğunun reşit olmadığını varsayarız ve ürünü buna göre kurarız: profiller varsayılan olarak özeldir, kanıt sunmak isteğe bağlıdır, tam doğum tarihi yerine yalnızca doğum yılını sorarız, hassas konum bilgisi toplamayız ve öğrenciler arasında herkese açık bir mesajlaşma bulunmaz.",
            "Bu bildirimi bir ebeveyn veya vasinizle birlikte okumalısınız. Veli onayı adımı henüz ürüne dahil edilmemiştir; kayıt formu bu adımın yer alacağı noktayı işaretler ve gereklilik, lansman yapacağımız her ülke için hukuk danışmanıyla teyit edilmektedir.",
          ],
        },
        {
          id: "security",
          heading: "Verilerinizi nasıl koruyoruz",
          body: [
            "Veritabanımızdaki satırlarınıza erişim, yalnızca uygulama kodunda değil veritabanı düzeyinde de zorunlu kılınır; böylece üründeki bir hata başka bir hesabın izin vermeye çalışması hâlinde bile o hesap profilinizi okuyamaz. Yüklenen dosyalar varsayılan olarak özeldir ve yalnızca kısa ömürlü imzalı bağlantılarla erişilebilir. Tüm dış API kimlik bilgileri sunucuda kalır ve hiçbir zaman tarayıcınıza gönderilmez.",
            "Hiçbir sistem tam anlamıyla güvenli değildir; bunun aksini ima etmek yerine açıkça söylemeyi tercih ederiz.",
          ],
        },
        {
          id: "changes",
          heading: "Bu bildirimdeki değişiklikler",
          body: [
            "Bu belge bir taslaktır. İncelenip onaylandığında, bu bölüm yürürlük tarihini ve önemli değişiklikleri size nasıl bildireceğimizi kaydedecektir.",
          ],
        },
        {
          id: "contact",
          companyDetails: "contact",
          heading: "İletişim",
          body: [
            "Bu bildirimle ilgili sorularınız veya verilerinizle ilgili bir talebiniz, belirlendiğinde aşağıdaki adrese yönlendirilmelidir.",
          ],
        },
      ],
    },

    // -------------------------------------------------------------------
    terms: {
      slug: "terms",
      title: "Kullanım Şartları",
      intro:
        "Sizinle Proxola arasındaki anlaşma — ürünün ne yaptığı, ne yapmadığı ve birbirimize karşı sorumluluklarımız.",
      sections: [
        {
          id: "what-oryn-is",
          heading: "Proxola nedir",
          body: [
            "Proxola, yaptıklarınızı kaydetmenize, güçlü yönlerinizi ve eksiklerinizi anlamanıza ve sırada ne yapmanız gerektiğine karar vermenize yardımcı olur. Size bir profil analizi, haftalık öncelikler, fırsat eşleşmeleri, üniversite bilgileri ve kendi kaydınız üzerinden akıl yürüten bir yapay zekâ danışmanı sunar.",
            "Bir hesap oluşturarak bu şartları kabul etmiş olursunuz. Bu şartları kabul etmiyorsanız, Proxola'yı kullanmayın.",
          ],
        },
        {
          id: "what-oryn-is-not",
          heading: "Proxola ne değildir",
          body: [
            "Bu bölüm her şeyden daha önemlidir; bu yüzden sona saklanmak yerine en başa konmuştur.",
          ],
          bullets: [
            "Proxola kabul kararı vermez ve hiçbir üniversitenin kabul ofisiyle bir ilişkisi yoktur. Üründeki hiçbir şey bir başvuru, bir ön değerlendirme veya herhangi bir kuruma giden bir sinyal değildir.",
            "Kariyer Profili puanınız, Proxola'nın kendi gelişim ölçütüdür. Bir üniversitenin sizin hakkınızdaki değerlendirmesi değildir ve bir kabul olasılığı da değildir. Bunlar farklı şeylerdir ve ürün bu ikisini bilerek ayrı tutar.",
            "\"Zorlayıcı\", \"Rekabetçi\" gibi bir kabul görünümü, Proxola'nın erişebildiği bilgilere dayanan kendi sınıflandırmasıdır. Bir tahmin veya bir garanti değildir. Tahmini bir aralık gösterildiğinde, bu bir tahmin olarak etiketlenir ve yanıltıcı bir hassasiyetten bilerek kaçınılır.",
            "Başvuru hazırlığı, bilinen bir kontrol listesinin ne kadarını tamamladığınızı ölçer. Şansınız hakkında hiçbir şey söylemez.",
            "Proxola; okul danışmanınızın, nitelikli bir kabul danışmanının veya kendi değerlendirmenizin yerini tutmaz.",
          ],
        },
        {
          id: "ai-output",
          heading: "Yapay zekâ tavsiyesi hakkında",
          body: [
            "Proxola'nın önerileri, açıklamaları ve oluşturduğu proje fikirleri, profilinizdeki bilgilerle çalışan bir yapay zekâ modelinden gelir. Model yanılabilir. Girdiğiniz bir bilgiyi yanlış okuyabilir veya hakkınızda bilmediği bir boşluktan yola çıkarak akıl yürütebilir.",
            "Proxola dışsal bir gerçeği ifade ettiğinde — bir son tarih, bir başvuru şartı, bir uygunluk kuralı — size kaynağı ve bu kaynağın en son ne zaman kontrol edildiğini gösterir. Önemli olan her şeyi, üzerine hareket etmeden önce resmî sayfadan kontrol edin. Kaynaklar değişir, son tarihler kayar.",
            "Danışman, doğruladığı ile çıkarım yaptığı bilgiyi ayırt edecek ve bir önerinin düşük güvenilirlikte olduğunu size söyleyecek şekilde kurulmuştur. Bu sinyalleri ciddiye alın; bunlar, alternatifin geleceğiniz hakkında kendinden emin görünen ama yanlış çıkabilecek bir tavsiye olması yüzünden oradadır.",
          ],
        },
        {
          id: "eligibility",
          heading: "Proxola'yı kimler kullanabilir",
          body: [
            "Proxola, 14-18 yaş arası öğrenciler için tasarlanmıştır. 18 yaşından küçükseniz, bu şartları bir ebeveyn veya vasinizle birlikte okumalısınız; yaşadığınız yere bağlı olarak ürünü kullanabilmeniz için onlarının onayı gerekebilir.",
            "Asgari yaş ve veli onayının alması gereken şekil ülkeye göre değişir ve hukuk danışmanıyla teyit edilmektedir. Bu belirlenene kadar bu bölüm, yerleşik bir kuralı değil niyetimizi anlatmaktadır.",
          ],
        },
        {
          id: "your-account",
          heading: "Hesabınız",
          body: [
            "Şifrenizi kimseyle paylaşmayın ve e-posta adresinizi güncel tutun. Hesabınız altında olan her şeyden siz sorumlusunuz. Hesabınıza başka birinin eriştiğini düşünüyorsanız bize bildirin.",
            "Kişi başına bir hesap. Başka birinin bilgisi dışında, onun adına bir hesap oluşturmayın.",
          ],
        },
        {
          id: "your-content",
          heading: "Proxola'ya girdikleriniz",
          body: [
            "Kaydınız sizin kalır. Bize, yalnızca ürünü sizin için çalıştırmak amacıyla — puanlarınızı hesaplamak, planlarınızı oluşturmak, sizi fırsatlarla eşleştirmek ve sorularınızı yanıtlamak için — saklama ve işleme izni verirsiniz. Bundan fazlası değil.",
            "Yalnızca doğru olan bilgileri girin. Proxola, kanıt eklenene kadar bir başarıyı beyana dayalı olarak değerlendirir; bir dosya eklemek, bağımsız bir doğrulamayla aynı şey değildir — ürün bunu doğrulanmış olarak nitelendirmez, siz de nitelendirmemelisiniz.",
            "Paylaşma hakkınız olmayan hiçbir şeyi yüklemeyin ve başkalarının kişisel bilgilerini yüklemeyin.",
          ],
        },
        {
          id: "acceptable-use",
          heading: "Kabul edilebilir kullanım",
          body: ["Kısa bir liste; ve hepsi zaten aklınıza gelecek türden:"],
          bullets: [
            "Başka bir öğrencinin verilerine erişmeye çalışmayın veya ürünü bunun yollarını aramak için kullanmayın.",
            "Ürünü kazımayın (scrape) veya rakip bir veri kümesi oluşturmak için kullanmayın.",
            "Kötü amaçlı dosyalar veya yasa dışı, taciz edici ya da istismar edici içerik yüklemeyin.",
            "Kimliğinizi veya başarılarınızı yanlış tanıtmayın.",
            "Yapay zekâ danışmanına zararlı içerik ürettirmeye veya başka kullanıcıların bilgilerini açığa çıkarmaya çalışmayın.",
          ],
        },
        {
          id: "availability",
          heading: "Erişilebilirlik ve değişiklikler",
          body: [
            "Proxola aktif olarak geliştirilmektedir. Özellikler değişecektir ve ürünün bazı bölümleri yavaş kalabilecek veya erişilemez olabilecek dış servislere bağlıdır. Bu durumda ürün, yerine bir şey uydurmak yerine verinin şu an erişilemez olduğunu söyleyecek şekilde kurulmuştur.",
            "Özellikleri değiştirebilir veya kaldırabiliriz. Bir değişiklik sizi önemli ölçüde etkiliyorsa, bunu belirteceğiz.",
          ],
        },
        {
          id: "ending",
          heading: "Hesabınızı kapatmak",
          body: [
            "Hesabınızı istediğiniz zaman Ayarlar bölümünden silebilir, isterseniz önce verilerinizi dışa aktarabilirsiniz. Silme işlemi kalıcıdır: hesabınız ve ona bağlı veriler kaldırılır. Yalnızca artık sizinle ilişkilendirilemeyen, anonim hale getirilmiş az sayıda kullanım kaydı saklanabilir.",
            "Bu şartları ihlal eden veya başka öğrencileri riske atan bir hesabı askıya alabiliriz.",
          ],
        },
        {
          id: "liability",
          heading: "Sorumluluk",
          body: [
            "Bu bölüm, bilinçli olarak bir avukatın yazması için boş bırakılmıştır. Bir sorumluluk sınırlaması taslağı hazırlamak mühendisliğin yapması gereken bir iş değildir; gerçek bir madde gibi görünen ama öyle olmayan bir yer tutucu, dürüst bir boşluktan daha kötü olurdu.",
            "Eğitiminizle ilgili kararlar size aittir. Proxola, bu kararlar üzerine düşünmenize yardımcı olan bir araçtır.",
          ],
        },
        {
          id: "law",
          companyDetails: "law",
          heading: "Yetkili hukuk",
          body: [
            "Uygulanacak hukuk ve yetkili mahkemeler, şirketin nerede kayıtlı olduğuna bağlıdır ve bu henüz kesinleşmemiştir. Her ikisi de bu taslakta çözülmemiştir.",
          ],
        },
      ],
    },

    // -------------------------------------------------------------------
    kvkk: {
      slug: "kvkk",
      title: "KVKK Aydınlatma Metni",
      intro:
        "Türkiye'deki öğrenciler için — 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 10. maddesinde öngörülen aydınlatma yükümlülüğü kapsamında hazırlanmıştır. Taslaktır, yayımlanmadan önce hukuk danışmanı incelemesi beklemektedir.",
      sections: [
        {
          id: "language",
          heading: "Bu taslak hakkında",
          body: [
            "Bu metin, Türkiye'deki ilgili kişilere yönelik bir aydınlatma metninin yayımlanması gereken dil olan Türkçe olarak sunulmaktadır — bkz. dil seçici. Metin, Türkçe hukuk alanında yetkin bir avukat veya profesyonel bir hukuki çevirmen tarafından değil, KVKK'nın standart mevzuat terminolojisi kullanılarak mühendislik ekibi tarafından çevrilmiştir; bu çevirinin kendisi, İngilizce kaynak metnin onaylanıp onaylanmadığından bağımsız olarak, hukuk danışmanının inceleyeceği açık bir madde olarak kalmaktadır (bkz. LEGAL_REVIEW.md).",
            "Aşağıdaki madde atıfları 6698 sayılı Kanun'u esas alır. Yurt dışına aktarımı düzenleyen 9. madde 2024 yılında değiştirilmiştir ve uygulanacak mekanizma, burada iddia edilen bir husus değil, hukuk danışmanı için açık sorulardan biridir.",
          ],
        },
        {
          id: "controller",
          companyDetails: "identity",
          heading: "Veri sorumlusu",
          body: [
            "Proxola'yı işleten şirket, veri sorumlusudur. Ticaret unvanı, adresi ve — yükümlülük uygulanıyorsa — VERBİS kaydı henüz kesinleşmemiş olup, tahmin yürütülmek yerine çözülmemiş olarak gösterilmektedir.",
          ],
        },
        {
          id: "categories",
          heading: "İşlenen kişisel veri kategorileri",
          body: ["Gizlilik Bildirimi'nde açıklanan aynı veriler, bu kanunun beklediği şekilde gruplandırılmıştır:"],
          bullets: [
            "Kimlik: ad ve soyad, görünen ad, doğum yılı.",
            "İletişim: e-posta adresi.",
            "Eğitim: okul, müfredat, mezuniyet yılı, dersler, notlar, standart sınav sonuçları.",
            "Başarı ve etkinlik: etkinlikler, liderlik, ödüller, projeler, araştırma, iş, gönüllülük, spor, beceriler, diller, ilgi alanları, hedefler.",
            "Belgeler: yüklenen özgeçmişler ve kanıt dosyaları — bunlar, yüklediğiniz içeriğe bağlı olarak başka kategorileri de içerebilir.",
            "İşlem ve kullanım: ürün olayları, oturum kayıtları, yapay zekâ kullanım sayıları, danışman yazışmaları.",
            "Konum: ülke ve isteğe bağlı olarak şehir. Hassas konum bilgisi toplanmaz.",
          ],
        },
        {
          id: "purposes",
          heading: "İşleme amaçları",
          body: [
            "Hesabınızı oluşturmak ve işletmek; profil analizinizi ve tamlığınızı üretmek; haftalık öncelikler ve öneriler oluşturmak; sizi uygun olduğunuz fırsatlarla eşleştirmek; sorularınızı yapay zekâ danışmanı aracılığıyla yanıtlamak; paylaşılan alanları güvenli tutmak; ve ürünün nasıl kullanıldığını anlayıp geliştirmek amaçlarıyla işlenir.",
          ],
        },
        {
          id: "legal-basis",
          heading: "Hukuki sebep (5. madde)",
          body: [
            "Her bir amacın 5. madde kapsamındaki bir hukuki sebeple eşleştirilmesi — özellikle yapay zekâ destekli profil analizinin bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olma gerekçesine mi dayandığı, yoksa ayrı bir açık rıza mı gerektirdiği — hukuk danışmanının kararına bırakılmış olup burada belirtilmek yerine açık bir soru olarak kaydedilmiştir.",
            "Ürünün bugün yaptığı: kayıt sırasında Kullanım Şartları'nın kabulü ile Gizlilik Bildirimi'nin onaylanması tek bir adımda birlikte alınır. İşleme amaçları ayrı ayrı rıza konusu yapılmaz.",
          ],
        },
        {
          id: "collection",
          heading: "Toplama yöntemi",
          body: [
            "Tüm kişisel veriler elektronik ortamda ve doğrudan sizden toplanır: kayıt formu, katılım (onboarding) süreci, profil sayfaları, yüklediğiniz belgeler ve ürünü kullanımınız aracılığıyla. Proxola, kişisel veri satın almaz veya üçüncü taraflardan temin etmez.",
          ],
        },
        {
          id: "transfers",
          heading: "Yurt içi ve yurt dışına aktarımlar (9. madde)",
          body: [
            "Verileriniz, Türkiye dışında, Frankfurt, Almanya'da saklanır. Bir kısmı, başta yapay zekâ işleme için Anthropic olmak üzere, AB/AEA dışındaki hizmet sağlayıcılara ayrıca aktarılır. Aşağıdaki tablo her bir alıcıyı ve her birinin tam olarak ne aldığını listeler.",
            "2024 değişiklikleri sonrasında bu aktarımları hukuka uygun kılan 9. madde mekanizması henüz belirlenmemiş olup hukuk danışmanı için açık bir sorudur. Bu taslak, böyle bir mekanizmanın halihazırda uygulandığını iddia etmemektedir.",
          ],
          includesProcessorTable: true,
        },
        {
          id: "rights",
          heading: "Haklarınız (11. madde)",
          body: ["6698 sayılı Kanun'un 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:"],
          bullets: [
            "Kişisel verilerinizin işlenip işlenmediğini öğrenme.",
            "Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme.",
            "Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme.",
            "Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme.",
            "Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme ve bu kapsamda yapılan işlemin, kişisel verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme.",
            "İşlenmesini gerektiren sebeplerin ortadan kalkması hâlinde kişisel verilerinizin silinmesini veya yok edilmesini isteme ve bu kapsamda yapılan işlemin, kişisel verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme.",
            "İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme.",
            "Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme.",
          ],
        },
        {
          id: "exercising",
          companyDetails: "contact",
          heading: "Bu hakları nasıl kullanabilirsiniz",
          body: [
            "Bu haklardan ikisi ürüne dahildir ve herhangi bir talep gerektirmez: Ayarlar bölümünden verilerinizin eksiksiz bir kopyasını indirebilir ve hesabınızı kalıcı olarak silebilirsiniz; bu işlem hesabınızı ve ona bağlı verileri kaldırır, yalnızca artık sizinle ilişkilendirilemeyen, anonim hale getirilmiş az sayıda kullanım kaydı saklanabilir. Herhangi bir öğeyi doğrudan düzeltebilir veya kaldırabilirsiniz.",
            "Bunların dışındaki talepler için kanunun öngördüğü yol, veri sorumlusuna yazılı başvurudur; veri sorumlusu bu başvuruya otuz gün içinde yanıt vermek zorundadır. Başvuru adresi ve tam prosedür bu taslakta henüz çözülmemiş olup yayımlanmadan önce belirlenmelidir.",
          ],
        },
        {
          id: "minors",
          heading: "18 yaşından küçük öğrenciler",
          body: [
            "Proxola, 14-18 yaş arası öğrenciler için tasarlanmıştır. Türk hukukuna göre bir öğrencinin kendi adına rıza gösterebileceği yaş ve veli onayının alması gereken şekil, hukuk danışmanıyla teyit edilmektedir. Ürün, katılım (onboarding) sırasında doğum yılını toplar ve kayıt akışında veli onayına bir yer ayırır; mekanizma henüz kurulmamıştır ve bu bildirim aksini ima etmemektedir.",
          ],
        },
      ],
    },
  },
};

export function getLegalCopy(locale: Locale): LegalCopy {
  return locale === "tr" ? legalCopyTr : legalCopyEn;
}

/** Route metadata for the footer and cross-links — one place, so a slug change is one edit. */
export const LEGAL_ROUTES = [
  { slug: "privacy", href: "/privacy" },
  { slug: "terms", href: "/terms" },
  { slug: "kvkk", href: "/kvkk" },
] as const;
