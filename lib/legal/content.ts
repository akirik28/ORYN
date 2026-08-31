/**
 * Every word of ORYN's legal surface — the three policy documents, the site footer, the
 * signup consent block, and the data-processor inventory — in ONE module.
 *
 * WHY ONE FILE: this is the translation unit. When the i18n layer lands, a locale is added
 * by producing a second object of type `LegalCopy` and selecting between them at the page
 * boundary — no page, footer, or form needs to change. Nothing below is JSX, and no string
 * is assembled from fragments at a call site, because both make a string untranslatable
 * (word order is not portable across languages). Structure lives in the components; text
 * lives here. `lib/i18n/format.ts` is the sibling convention for numbers/dates.
 *
 * WHY THE SOURCE LANGUAGE IS ENGLISH: every existing string in this product is English, so
 * English is the source and translations are derived. Documented assumption, and a real
 * caveat for the KVKK notice specifically — see `LAWYER_FLAGS.kvkkLanguage`. A Turkish-law
 * disclosure notice addressed to Turkish data subjects should be published in Turkish
 * before Turkey launch; that is a translation task, not a rewrite, which is precisely why
 * the text is shaped this way.
 *
 * WHAT THIS IS NOT: legal advice, and not reviewed by a lawyer. Every document below is a
 * DRAFT. `LEGAL_REVIEW_STATUS.approved` is `false` and the layout renders a standing
 * banner off it — see the note on that constant before changing it.
 */

// ---------------------------------------------------------------------------
// Review status
// ---------------------------------------------------------------------------

/**
 * The single switch that decides whether these documents present themselves as drafts.
 *
 * Flipping `approved` to `true` removes the "awaiting legal review" banner from all three
 * documents at once. It is a legal assertion, not a styling preference: do not flip it to
 * clean up the UI. It belongs to whoever receives the lawyer's sign-off, and the sign-off
 * date and reviewing counsel should be recorded here in the same commit.
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
  /** What is missing, in the reader's language. */
  readonly label: string;
  /** Who has to supply it. Shown to the lawyer, not to students. */
  readonly owner: "founder" | "counsel";
}

export function unresolved(label: string, owner: Unresolved["owner"] = "founder"): Unresolved {
  return { __unresolved: true, label, owner };
}

export function isUnresolved(value: unknown): value is Unresolved {
  return typeof value === "object" && value !== null && "__unresolved" in value;
}

// ---------------------------------------------------------------------------
// Company identity
// ---------------------------------------------------------------------------

/**
 * ORYN has no registered legal entity on file in this repository, and a privacy notice
 * naming the wrong controller is worse than one that names none. Every field here is
 * therefore unresolved until the founder supplies the real registration details.
 */
export const COMPANY = {
  productName: "Oryn",
  legalName: unresolved("Registered company name"),
  registrationNumber: unresolved("Trade registry / company number"),
  registeredAddress: unresolved("Registered address"),
  /** KVKK: whether the controller must enrol in VERBİS depends on the entity and its size. */
  verbisRegistration: unresolved("VERBİS registration number (if required)", "counsel"),
  contactEmail: unresolved("Contact email address"),
  privacyContactEmail: unresolved("Privacy/data-protection contact address"),
  /** GDPR Art. 37 — only required for some controllers; counsel decides whether it applies. */
  dataProtectionOfficer: unresolved("Data Protection Officer, if one is required", "counsel"),
  governingLaw: unresolved("Governing law and competent courts", "counsel"),
};

// ---------------------------------------------------------------------------
// Data processor inventory
// ---------------------------------------------------------------------------

export interface DataProcessor {
  /** Stable key — also the anchor id in the rendered table. */
  id: string;
  name: string;
  /** What the service does for ORYN, in one line. */
  role: string;
  /** Exactly what leaves ORYN for this service. Verified against the code, not assumed. */
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
 * Every external service that receives data, and precisely what reaches it.
 *
 * Each `dataSent` line was read out of the code on 2026-08-31 rather than assumed from the
 * service's general purpose, because the two differ in ways that matter here: the advisor
 * prompt sends a display name but NOT the student's school name, and Tavily — despite
 * being the "search the live web" integration — never receives student data at all,
 * because discovery builds one shared global catalogue instead of searching per student.
 * `verifiedIn` names the file to re-read when checking whether a line is still true.
 *
 * If you add a provider, add it here in the same commit. This table is the answer to the
 * first question outside counsel will ask.
 */
export const DATA_PROCESSORS: DataProcessor[] = [
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
 * The decisions engineering deliberately did not make. These are rendered nowhere in the
 * product — they exist so the review packet (LEGAL_REVIEW.md) and this module cannot drift
 * apart, and so nobody mistakes an unanswered question for an answered one.
 */
export const LAWYER_FLAGS: LawyerFlag[] = [
  {
    id: "kvkkLanguage",
    question:
      "Must the KVKK notice be published in Turkish before Turkey launch, and does an English-only version satisfy the Article 10 disclosure obligation in the meantime?",
    currentState:
      "All three documents are drafted in English, structured for translation (lib/legal/content.ts is a single translation unit).",
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
      "The database is in Frankfurt, but advisor context and uploaded CVs are sent to Anthropic outside the EU/EEA. No transfer instrument is recorded in the repository.",
  },
  {
    id: "minorConsent",
    question:
      "At what age can a student consent for themselves in each launch market, what parental consent mechanism is required below it, and is a verifiable method needed or is notice sufficient?",
    currentState:
      "Birth year is collected during onboarding, after signup. No parental consent mechanism is built. The signup form reserves the place for it and states the requirement.",
  },
  {
    id: "retention",
    question: "What retention period should apply to each data category, and to accounts abandoned before deletion?",
    currentState:
      "No automated retention limit exists. Data persists until the student deletes the item or the account. Deletion and full export are both implemented and working.",
  },
  {
    id: "liability",
    question:
      "Liability limitations, disclaimers, governing law, and forum — none of which engineering should draft.",
    currentState: "The Terms draft states the product's limits in plain language but contains no liability clause.",
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
    draftNotice: string;
    copyright: (year: number) => string;
    ageNotice: string;
  };
  signupConsent: {
    checkboxLabel: string;
    checkboxLinkTerms: string;
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
  };
}

// ---------------------------------------------------------------------------
// English source copy
// ---------------------------------------------------------------------------

export const legalCopyEn: LegalCopy = {
  draftBanner: {
    label: "Draft — awaiting legal review",
    body:
      "This document has not been reviewed or approved by a lawyer. It is written so that outside counsel has something concrete to correct, and so you can see what Oryn actually does with your information today. Treat it as a description of the product, not as a finished legal agreement.",
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
    draftNotice: "Our policies are drafts awaiting legal review.",
    copyright: (year: number) => `© ${year} Oryn`,
    ageNotice: "Built for students aged 14–18. If you are under 18, a parent or guardian should read these documents with you.",
  },

  signupConsent: {
    checkboxLabel: "I have read and accept the",
    checkboxLinkTerms: "Terms of Use",
    checkboxLinkPrivacy: "Privacy Notice",
    checkboxRequiredError: "Please accept the Terms of Use and Privacy Notice to continue.",
    minorHeading: "If you are under 18",
    minorBody:
      "Oryn is built for students aged 14–18, so most people reading this are minors. A parent or guardian should read the Terms of Use and Privacy Notice with you before you continue.",
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
    backToHome: "Back to Oryn",
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
  },

  documents: {
    // -------------------------------------------------------------------
    privacy: {
      slug: "privacy",
      title: "Privacy Notice",
      intro:
        "What Oryn collects, why, where it goes, and what you can do about it. Written to describe what the product actually does today.",
      sections: [
        {
          id: "who-we-are",
          companyDetails: "identity",
          heading: "Who is responsible for your data",
          body: [
            "Oryn is a career and profile planning product for students. The company operating it is the data controller for the information described here.",
            "The registered entity, address, and contact details are not yet settled and are shown as unresolved throughout this draft rather than guessed at. They must be filled in before this notice is published.",
          ],
        },
        {
          id: "what-we-collect",
          heading: "What we collect",
          body: [
            "Only what you give us, plus a record of how you use the product. Oryn has no advertising trackers and no third-party analytics; usage events are recorded in our own database.",
          ],
          bullets: [
            "Account details: your email address, display name, and a password managed by our authentication provider. We never see your password.",
            "Profile basics: first and last name, birth year, country, optional city, school name, graduation year, curriculum, preferred language, and timezone.",
            "Your record: activities, leadership roles, awards, certifications, projects, research, volunteering, work experience, internships, summer programmes, sports, skills, languages, interests, and goals.",
            "Academic information: education history, coursework, grades, and standardized test scores you choose to enter.",
            "Documents: CVs you upload for import, and any evidence files you attach to an achievement.",
            "Your plans: target universities, applications, deadlines, weekly actions, and what you reported back after completing them.",
            "Conversations: the messages you exchange with the Oryn advisor.",
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
            "Oryn's analysis, weekly plans, advisor answers, and CV import all run on Anthropic's Claude API. This is the part of the product that sends your information outside our own database, so it is worth being precise about.",
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
            "Oryn uses a small number of external services. This is all of them, and exactly what each one receives. Several of them never receive anything that identifies you, and the table says which.",
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
            "Oryn does not yet enforce an automatic retention limit — for example, for an account left unused for a long period. Stating a specific retention period here before one is actually implemented would be a promise the product does not keep, so this section records the real position instead. Setting those periods is one of the open questions for counsel.",
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
            "Delete your account: permanently remove your account and the data attached to it.",
            "Correct anything: edit or remove any item in your profile directly.",
            "Ask us: depending on where you live, you may also have the right to object to or restrict certain processing, or to lodge a complaint with your data protection authority. Contact details for making such a request are unresolved in this draft.",
          ],
        },
        {
          id: "minors",
          heading: "Students under 18",
          body: [
            "Oryn is designed for students aged 14–18, so we assume most of the people using it are minors, and the product is built accordingly: profiles are private by default, evidence is optional, we ask for a birth year rather than a full date of birth, we do not collect precise location, and there is no public student-to-student messaging.",
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
        "The agreement between you and Oryn — what the product does, what it does not do, and what we each owe the other.",
      sections: [
        {
          id: "what-oryn-is",
          heading: "What Oryn is",
          body: [
            "Oryn helps you record what you have done, understand your strengths and gaps, and decide what to do next. It gives you a profile analysis, weekly priorities, opportunity matches, university information, and an AI advisor that reasons over your own record.",
            "By creating an account you agree to these terms. If you do not agree with them, do not use Oryn.",
          ],
        },
        {
          id: "what-oryn-is-not",
          heading: "What Oryn is not",
          body: [
            "This section matters more than any other, so it comes early rather than buried at the end.",
          ],
          bullets: [
            "Oryn does not decide admissions and has no relationship with any university's admissions office. Nothing in the product is an application, a pre-assessment, or a signal to any institution.",
            "Your Career Profile score is Oryn's own development metric. It is not a university's assessment of you, and it is not a probability of admission. Those are different things and the product keeps them separate on purpose.",
            "An admission outlook — \"Reach\", \"Competitive\", and so on — is Oryn's classification based on the information available to it. It is not a prediction and not a guarantee. Where an estimated range is shown, it is labelled as an estimate and deliberately avoids false precision.",
            "Application readiness measures how much of a known checklist you have completed. It says nothing about your chances.",
            "Oryn is not a substitute for your school counsellor, a qualified admissions adviser, or your own judgement.",
          ],
        },
        {
          id: "ai-output",
          heading: "About the AI advice",
          body: [
            "Oryn's recommendations, explanations, and generated project ideas come from an AI model working with the information in your profile. The model can be wrong. It can misread something you entered, or reason from a gap in what it knows about you.",
            "Where Oryn states an external fact — a deadline, an entry requirement, an eligibility rule — it shows you the source and when that source was last checked. Check anything that matters against the official page before you act on it. Sources move and deadlines change.",
            "The advisor is built to distinguish what it verified from what it inferred, and to tell you when a recommendation is low-confidence. Take those signals seriously; they are there because the alternative is confident-sounding advice about your future that happens to be wrong.",
          ],
        },
        {
          id: "eligibility",
          heading: "Who can use Oryn",
          body: [
            "Oryn is built for students aged 14–18. If you are under 18, a parent or guardian should read these terms with you, and depending on where you live their approval may be required before you can use the product.",
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
          heading: "What you put into Oryn",
          body: [
            "Your record stays yours. You give us permission to store and process it only to run the product for you — to calculate your scores, generate your plans, match you to opportunities, and answer your questions. Nothing more.",
            "Only enter things that are true. Oryn labels an achievement as self-reported until evidence is attached, and attaching a file is not the same as independent verification — the product will not describe it as verified, and neither should you.",
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
            "Oryn is under active development. Features will change, and parts of the product depend on external services that can be slow or unavailable. When that happens the product is built to tell you the data is unavailable rather than show you something invented in its place.",
            "We may change or discontinue features. If a change materially affects you, we will say so.",
          ],
        },
        {
          id: "ending",
          heading: "Ending your account",
          body: [
            "You can delete your account at any time from Settings, and export your data first if you want a copy. Deletion is permanent.",
            "We may suspend an account that breaks these terms or puts other students at risk.",
          ],
        },
        {
          id: "liability",
          heading: "Liability",
          body: [
            "This section has deliberately been left for a lawyer to write. Drafting a liability limitation is not something engineering should do, and a placeholder that reads like a real clause would be worse than an honest gap.",
            "Decisions about your education are yours. Oryn is a tool that helps you think about them.",
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
        "For students in Türkiye — the disclosure required by Article 10 of Law No. 6698 on the Protection of Personal Data. Draft, and pending translation into Turkish before publication.",
      sections: [
        {
          id: "language",
          heading: "About this draft",
          body: [
            "This notice is written in English because every part of the product is currently in English and this text is structured for translation. A disclosure notice addressed to data subjects in Türkiye should be published in Turkish, and doing so is on the list of things to complete before launching there. It is a translation task, not a rewrite.",
            "Article references below follow Law No. 6698. Article 9, on transfers abroad, was amended in 2024 and the applicable mechanism is one of the open questions for counsel rather than something asserted here.",
          ],
        },
        {
          id: "controller",
          companyDetails: "identity",
          heading: "Data controller (Veri sorumlusu)",
          body: [
            "The company operating Oryn is the data controller. Its registered name, address, and — if the obligation applies — its VERBİS registration are not yet settled and are shown as unresolved rather than guessed at.",
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
            "The mapping of each purpose to a basis under Article 5 — in particular whether AI-driven profile analysis rests on the necessity of performing a contract or requires separate explicit consent — is a decision for counsel and is recorded as an open question rather than stated here.",
            "What the product does today: signup captures a single acceptance of the Terms of Use together with acknowledgement of the Privacy Notice. Individual processing purposes are not separately consented.",
          ],
        },
        {
          id: "collection",
          heading: "Method of collection",
          body: [
            "All personal data is collected electronically and directly from you: through the signup form, the onboarding flow, the profile pages, documents you upload, and your use of the product. Oryn does not buy personal data or obtain it from third parties.",
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
            "Two of these rights are built into the product and need no request: you can download a complete copy of your data, and permanently delete your account, from Settings. You can correct or remove any individual item directly.",
            "For anything else, a written application to the controller is the route the law provides, and the controller must respond within thirty days. The application address and the exact procedure are unresolved in this draft and must be set before publication.",
          ],
        },
        {
          id: "minors",
          heading: "Students under 18",
          body: [
            "Oryn is intended for students aged 14–18. The age at which a student can consent for themselves under Turkish law, and the form a guardian's approval must take, are being confirmed with counsel. The product collects a birth year during onboarding and reserves a place in the signup flow for guardian approval; the mechanism is not yet built, and this notice does not suggest otherwise.",
          ],
        },
      ],
    },
  },
};

/** The active copy. A locale selector replaces this line when i18n lands. */
export const legalCopy = legalCopyEn;

/** Route metadata for the footer and cross-links — one place, so a slug change is one edit. */
export const LEGAL_ROUTES = [
  { slug: "privacy", href: "/privacy" },
  { slug: "terms", href: "/terms" },
  { slug: "kvkk", href: "/kvkk" },
] as const;
