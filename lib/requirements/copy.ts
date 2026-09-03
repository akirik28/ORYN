import type { Locale } from "@/lib/i18n/config";
import type { CourseLevel, CurriculumType } from "@/types/database";
import type { EvaluationGate, RecencyRule, ScoreProvenance } from "./types";

/**
 * Locale-aware reasoning text for lib/requirements/evaluate.ts — the requirement-check
 * sentences a student reads for every one of the 111 universities with requirement data
 * (higher-traffic than the admission-outlook panel, which needs a saved target).
 *
 * Same discipline as every other i18n pass this build: restructured per sentence, not
 * translated word-for-word; every English branch is untouched (this module only adds a
 * Turkish path, selected by `locale`); real official terminology where a real term exists
 * (ETS/IELTS product names like "One Skill Retake" and "MyBest Scores" are proper names of
 * specific test-report features, not translated, the same way "OBP" and "numerus fixus"
 * weren't invented paraphrases elsewhere in this build) — see the label maps below before
 * the sentence builders.
 *
 * This is the densest, most technically precise content translated so far — TOEFL's 2026
 * rescale, TR-YÖS's scale ambiguity, GPA-scale mismatches, provenance exclusions. A wrong
 * translation here doesn't just read awkwardly, it can misstate whether a student's own
 * recorded evidence actually clears a real requirement — so every quantity (a score, a
 * scale, a date) is carried through as an interpolated value, never re-stated in prose,
 * and every sentence was checked against what the English original actually asserts, not
 * just for fluency.
 */

// ---------------------------------------------------------------------------
// Closed-set labels — the interpolated values that are themselves enums, not free text.
// English keeps its existing `.replace(/_/g, " ")` behaviour exactly (byte-identical to
// before this file existed); only the Turkish branch uses a real label.
// ---------------------------------------------------------------------------

const CURRICULUM_LABEL_TR: Record<CurriculumType, string> = {
  ap: "AP",
  ib: "IB",
  a_level: "A-Level",
  turkish_curriculum: "Türk müfredatı",
  national_curriculum: "ulusal müfredat",
  other: "diğer",
};

export function curriculumLabel(value: CurriculumType, locale: Locale): string {
  return locale === "tr" ? CURRICULUM_LABEL_TR[value] : value.replace(/_/g, " ");
}

const COURSE_LEVEL_LABEL_TR: Record<CourseLevel, string> = {
  regular: "normal",
  honors: "onur (honors)",
  dual_enrollment: "çift kayıt (dual enrollment)",
  ap: "AP",
  a_level: "A-Level",
  ib_sl: "IB SL",
  ib_hl: "IB HL",
  other: "diğer",
};

export function courseLevelLabel(value: CourseLevel, locale: Locale): string {
  return locale === "tr" ? COURSE_LEVEL_LABEL_TR[value] : value.replace(/_/g, " ");
}

/** ETS/IELTS's own product names for non-standard score types — proper names of specific
 *  test-report features (what actually prints on the score report), not translated, the
 *  same way "OBP" and "numerus fixus" stayed in their real form elsewhere in this build. */
const SCORE_PROVENANCE_LABEL_TR: Record<ScoreProvenance, string> = {
  one_skill_retake: "One Skill Retake",
  mybest: "MyBest Scores",
  superscore: "farklı oturumlardan birleştirilmiş bir superscore",
  home_edition: "ev sürümü (at-home edition)",
  indicator: "Indicator testi",
  online_edition: "çevrimiçi sürüm",
  multi_sitting_combination: "farklı test tarihlerinden birleştirilmiş sonuçlar",
};

export function scoreProvenanceLabel(value: ScoreProvenance, locale: Locale): string {
  return locale === "tr" ? SCORE_PROVENANCE_LABEL_TR[value] : SCORE_PROVENANCE_LABEL_EN[value];
}

// Re-declared rather than imported from ./types — that file's SCORE_PROVENANCE_LABELS is a
// UI-facing shared dependency with its own callers; this keeps evaluate.ts's own sentences
// independently correct, same reasoning as lib/counselor/copy.ts originally gave for
// dimension labels before a second caller justified sharing those.
const SCORE_PROVENANCE_LABEL_EN: Record<ScoreProvenance, string> = {
  one_skill_retake: "One Skill Retake",
  mybest: "MyBest Scores",
  superscore: "a superscore combined across sittings",
  home_edition: "the at-home edition",
  indicator: "the Indicator test",
  online_edition: "the online edition",
  multi_sitting_combination: "results combined from different test dates",
};

function recencyUnitLabel(unit: "years" | "months", locale: Locale): string {
  if (locale !== "tr") return unit;
  return unit === "years" ? "yıl" : "ay";
}

// ---------------------------------------------------------------------------
// NO_RULE_RESULT / unreadable qualifiers / category gates
// ---------------------------------------------------------------------------

export function noStructuredRuleReason(locale: Locale): string {
  return locale === "tr"
    ? "Bu gereklilik için henüz yapılandırılmış bir kural kaydedilmedi — kaynak bağlantısını doğrudan kontrol et."
    : "No structured rule has been recorded for this requirement yet — check the source link directly.";
}

export function unreadableQualifiersReason(locale: Locale): string {
  return locale === "tr"
    ? "Proxola bu gerekliliğe bağlı koşulları okuyamadı, bu yüzden bir sonuç konusunda tahmin yürütmeyecek — kaynak bağlantısını doğrudan kontrol et."
    : "Proxola couldn't read the conditions attached to this requirement, so it won't guess at a verdict — check the source link directly.";
}

export function submittedMaterialReason(locale: Locale): string {
  return locale === "tr"
    ? "Bu gereklilik, Proxola'nın otomatik olarak değerlendirmediği gönderilen materyale bağlı — bunu kendin incele."
    : "This requirement depends on submitted material Proxola doesn't evaluate automatically — review it yourself.";
}

export function informationalReason(locale: Locale): string {
  return locale === "tr"
    ? "Bilgilendirme amaçlı — karşılanması gereken bir şey değil, listelenen tarihe bak."
    : "Informational — see the listed date, not something to satisfy.";
}

export function unstatedScaleGateReason(locale: Locale): string {
  return locale === "tr"
    ? "Bu gerekliliğin sayısının hangi ölçekte ölçüldüğü kaynaktan tam olarak belirlenemedi, bu yüzden sonucunu bununla karşılaştırmanın bir anlamı olmaz. Kaynak sayfayı kontrol et."
    : "The scale this requirement's number is measured on couldn't be pinned down from the source, so comparing your result to it wouldn't mean anything. Check the source page.";
}

// ---------------------------------------------------------------------------
// GATE_COPY — migration 0056 §4's ten evaluation gates.
// ---------------------------------------------------------------------------

const GATE_COPY_TR: Record<EvaluationGate, string> = {
  inverted_recency:
    "Bu üniversite, bir kesim tarihinden ÖNCE değil, o tarihten SONRA alınan sertifikaları kabul etmiyor — alışılan \"yeterince güncel olmalı\" okuması burada tam tersi. Kaynak sayfadaki tam tarihleri kendi sertifikanla karşılaştır.",
  recency_window:
    "Bu belgenin bir geçerlilik penceresi var ve Proxola, gerçekten başvuracağın noktada seninkinin hâlâ bu pencerenin içinde olup olmadığını söyleyemez. Pencereyi kaynak sayfadaki sertifika tarihinle karşılaştır.",
  unstated_scale:
    "Yayımlanan eşik, ölçeği belirtilmemiş çıplak bir sayı — bu yüzden puanını güvenle karşılaştırabileceğin bir şey yok. Bu sayının kaç üzerinden olduğunu kaynak sayfada kontrol et.",
  incomparable_scale:
    "Bu eşik, Proxola'nın bir puan olarak ifade edemeyeceği bir sıralama veya kesim noktası — bu yüzden senin sayın ile bu gereklilik aynı türden bir büyüklük değil. Bunları kaynak sayfada kendin karşılaştır.",
  named_exclusion:
    "Bu üniversite, sayının kendisi yeterli olsa bile bir puanı elde etmenin bazı yollarını kabul etmiyor. Sonucuna güvenmeden önce hangi varyantları kabul ettiğini kaynak sayfada kontrol et.",
  eligibility_restriction:
    "Bu, aşılması gereken bir eşik değil, kimin uygun olduğuna dair bir kısıtlama — bu yüzden Proxola bunu hiçbir yönde puanlamaz. Kaynak sayfada oku.",
  age_bar:
    "Bu, tam doğum tarihine bağlı ve Proxola yalnızca doğum yılını saklıyor — bilerek, senin hakkında elinde tuttuğu bilgiyi mümkün olduğunca az tutmak için. Yılın ikinci yarısında doğduysan, yalnızca yıl bunu belirlemeye yetmez: kesim tarihini kendi doğum gününle karşılaştır.",
  source_conflict:
    "İki resmi sayfa bunu farklı şekilde belirtiyor ve hiçbiri doğru olarak belirlenmedi — bu yüzden Proxola birini seçmez. Kaynağı doğrudan kontrol et.",
  historical:
    "Bu bilgi, artık kapanmış bir başvuru dönemi için doğruydu — bu yüzden senin başvuracağın dönemi tarif etmiyor olabilir. Güncel sayfayı kontrol et.",
  binding_commitment:
    "Bu bir taahhüttür, işaretlenecek bir kutu değil. Bu tur kapsamında başvurmak seni bağlar: kabul edilirsen kayıt yaptırman ve diğer başvurularını geri çekmen beklenir. Proxola bunu asla karşılanmış olarak işaretlemez. Başvurmadan önce anlaşmayı okulunun rehber öğretmeni ve ailenle birlikte eksiksiz oku.",
};

const GATE_COPY_EN: Record<EvaluationGate, string> = {
  inverted_recency:
    "This university refuses certificates taken AFTER a cut-off date, not before one — the usual \"must be recent enough\" reading is backwards here. Check the exact dates on the source page against your own certificate.",
  recency_window:
    "This qualification has a validity window, and Proxola can't tell whether yours still falls inside it at the point you'd actually apply. Check the window against your certificate date on the source page.",
  unstated_scale:
    "The published threshold is a bare number with no scale stated, so there is nothing safe to compare your score to. Check the source page for the maximum this number is out of.",
  incomparable_scale:
    "This threshold is a rank or a cut-off Proxola can't express as a score, so your number and the requirement aren't the same kind of quantity. Compare them yourself on the source page.",
  named_exclusion:
    "This university refuses some ways of obtaining a score even when the number itself qualifies. Check the source page for which variants it accepts before relying on your result.",
  eligibility_restriction:
    "This is a restriction on who is eligible rather than a threshold to clear, so Proxola won't score it either way. Read it on the source page.",
  age_bar:
    "This depends on your exact date of birth, and Proxola stores only your birth year — deliberately, so it holds as little about you as it can. If you were born in the second half of the year, the year alone can't settle it: check the cut-off date against your own birthday.",
  source_conflict:
    "Two official pages state this differently and neither has been established as correct, so Proxola won't pick one. Check the source directly.",
  historical:
    "This was correct for an application cycle that has already closed, so it may not describe the cycle you're applying in. Check the current page.",
  binding_commitment:
    "This is a commitment, not a box to tick. Applying under this round binds you: if you're admitted you're expected to enrol and to withdraw your other applications. Proxola will never mark it satisfied. Read the agreement in full, with your school counsellor and your family, before you apply.",
};

export function gateCopy(gate: EvaluationGate, locale: Locale): string {
  return locale === "tr" ? GATE_COPY_TR[gate] : GATE_COPY_EN[gate];
}

// ---------------------------------------------------------------------------
// curriculum
// ---------------------------------------------------------------------------

export const curriculumCopy = {
  noneOnFile: (locale: Locale) => (locale === "tr" ? "Henüz kayıtlı bir müfredat yok — eğitim kaydını ekle." : "No curriculum is on file yet — add your education record."),
  matches: (matchLabel: string, locale: Locale) => (locale === "tr" ? `${matchLabel} müfredatın eşleşiyor.` : `Your ${matchLabel} curriculum matches.`),
  // Takes the raw enum array rather than a pre-joined string: the English branch must join
  // the raw values exactly as `facts.curricula.join(", ")` always did (no space-replacement,
  // unlike the single-match `matches` case above) — byte-identical to before this file
  // existed. Only the Turkish branch maps each value through curriculumLabel first.
  notInList: (recorded: CurriculumType[], locale: Locale) => {
    const joined = locale === "tr" ? recorded.map((c) => curriculumLabel(c, "tr")).join(", ") : recorded.join(", ");
    return locale === "tr" ? `Kayıtlı müfredatın (${joined}) kabul edilen listede değil.` : `Your recorded curriculum (${joined}) isn't in the accepted list.`;
  },
};

// ---------------------------------------------------------------------------
// coursework
// ---------------------------------------------------------------------------

export const courseworkCopy = {
  noneOnFile: (locale: Locale) => (locale === "tr" ? "Henüz kayıtlı bir ders yok — derslerini ekle." : "No coursework is on file yet — add your courses."),
  noMatch: (subject: string, locale: Locale) => (locale === "tr" ? `"${subject}" ile eşleşen bir ders kayıtlı değil.` : `No course matching "${subject}" is on file.`),
  exactNoLevel: (subject: string, locale: Locale) => (locale === "tr" ? `${subject} alanında bir ders kayıtlı.` : `A course in ${subject} is on file.`),
  relatedNoLevel: (relatedSubject: string, subject: string, locale: Locale) =>
    locale === "tr" ? `İlgili bir ders ("${relatedSubject}") kayıtlı, "${subject}"'a yakın.` : `A related course ("${relatedSubject}") is on file, close to "${subject}".`,
  belowLevel: (subject: string, levelLabel: string, locale: Locale) =>
    locale === "tr" ? `${subject} alanındaki derslerin henüz gereken ${levelLabel} seviyesine ulaşmıyor.` : `Your ${subject} coursework doesn't yet reach the required ${levelLabel} level.`,
  exactMeetsLevel: (subject: string, locale: Locale) =>
    locale === "tr" ? `${subject} alanındaki derslerin gereken seviyeyi karşılıyor.` : `Your ${subject} coursework meets the required level.`,
  relatedMeetsLevel: (relatedSubject: string, locale: Locale) =>
    locale === "tr" ? `İlgili bir ders ("${relatedSubject}") gereken seviyeyi karşılıyor gibi görünüyor.` : `A related course ("${relatedSubject}") appears to meet the required level.`,
};

// ---------------------------------------------------------------------------
// minimum_grade
// ---------------------------------------------------------------------------

export const gpaCopy = {
  noneOnFile: (locale: Locale) => (locale === "tr" ? "Henüz kayıtlı bir not ortalaması yok — eğitim kaydını ekle." : "No GPA is on file yet — add your education record."),
  scaleMismatch: (ruleScale: number, locale: Locale) =>
    locale === "tr"
      ? `Not ortalaman, bu gerekliliğin ${ruleScale} puanlık ölçeğinden farklı bir ölçekte kayıtlı — otomatik bir dönüşüme güvenmek yerine bunu kendin karşılaştır.`
      : `Your GPA is recorded on a different scale than this requirement's ${ruleScale}-point scale — compare it yourself rather than trust an automatic conversion.`,
  meets: (best: number, ruleScale: number, minGpa: number, locale: Locale) =>
    locale === "tr" ? `Not ortalaman (${ruleScale} ölçeğinde ${best}) gereken ${minGpa} değerini karşılıyor.` : `Your GPA (${best} on a ${ruleScale} scale) meets the required ${minGpa}.`,
  below: (best: number, ruleScale: number, minGpa: number, locale: Locale) =>
    locale === "tr" ? `Not ortalaman (${ruleScale} ölçeğinde ${best}) gereken ${minGpa} değerinin altında.` : `Your GPA (${best} on a ${ruleScale} scale) is below the required ${minGpa}.`,
};

// ---------------------------------------------------------------------------
// language_proficiency (non-test-score branch)
// ---------------------------------------------------------------------------

export const languageCopy = {
  noEntry: (languageName: string, locale: Locale) => (locale === "tr" ? `${languageName} için kayıtlı bir dil girişi yok.` : `No ${languageName} language entry is on file.`),
  missingProficiency: (languageName: string, locale: Locale) =>
    locale === "tr"
      ? `${languageName} bir yeterlilik seviyesi olmadan kayıtlı — bunu otomatik değerlendirebilmek için bir seviye ekle.`
      : `${languageName} is on file without a proficiency level — add one to evaluate this automatically.`,
  meets: (languageName: string, proficiency: string, locale: Locale) =>
    locale === "tr" ? `Kayıtlı ${languageName} yeterliliğin ("${proficiency}") bunu karşılıyor.` : `Your recorded ${languageName} proficiency ("${proficiency}") meets this.`,
  mayNotMeet: (languageName: string, proficiency: string, locale: Locale) =>
    locale === "tr"
      ? `Kayıtlı ${languageName} yeterliliğin ("${proficiency}") bunu karşılamayabilir — elle incele.`
      : `Your recorded ${languageName} proficiency ("${proficiency}") may not meet this — review manually.`,
  underspecified: (locale: Locale) =>
    locale === "tr" ? "Bu gereklilik, otomatik değerlendirme için yeterli ayrıntı belirtmiyor." : "This requirement doesn't specify enough detail to evaluate automatically.",
};

// ---------------------------------------------------------------------------
// evaluateRequirementGroup
// ---------------------------------------------------------------------------

export const groupCopy = {
  exclusionPresent: (locale: Locale) =>
    locale === "tr"
      ? "Bu gerekliliğe, Proxola'nın otomatik değerlendirmediği bir hariç tutma koşulu ekli — kaynağı doğrudan incele."
      : "This requirement has an exclusion condition attached that Proxola doesn't evaluate automatically — review the source directly.",
  qualifierPresent: (locale: Locale) =>
    locale === "tr"
      ? "Bu gerekliliğe, Proxola'nın otomatik değerlendirmediği ek bir koşul ekli (örneğin bir güncellik penceresi) — kaynağı doğrudan incele."
      : "This requirement has an additional condition attached (e.g. a recency window) that Proxola doesn't evaluate automatically — review the source directly.",
  noAlternatives: (locale: Locale) =>
    locale === "tr"
      ? "Bu gereklilik grubunda değerlendirilecek tanınan bir alternatif yok — kaynağı doğrudan incele."
      : "This requirement group has no recognized alternatives to evaluate — review the source directly.",
  defaultAlternativeLabel: (locale: Locale) => (locale === "tr" ? "kabul edilen alternatiflerden biri" : "one of the accepted alternatives"),
  metViaAlternative: (baseReasoning: string, label: string, count: number, locale: Locale) =>
    locale === "tr"
      ? `${baseReasoning} (${label} — kabul edilen ${count} alternatiften herhangi biri yeterli.)`
      : `${baseReasoning} (${label} — any one of ${count} accepted alternatives is enough.)`,
  noneMet: (count: number, locale: Locale) =>
    locale === "tr" ? `Kabul edilen ${count} alternatiften hiçbiri şu anda karşılanmıyor.` : `None of the ${count} accepted alternatives are currently met.`,
};

// ---------------------------------------------------------------------------
// recencyBlock / describeWindow
// ---------------------------------------------------------------------------

export function describeWindow(rule: RecencyRule, locale: Locale): string {
  if (rule.direction === "not_valid_on_or_after" && rule.boundaryDate) {
    return locale === "tr"
      ? `bu üniversite ${rule.boundaryDate} tarihinden itibaren alınan sonuçları kabul etmiyor`
      : `this university does not accept results from ${rule.boundaryDate} onwards`;
  }
  if (rule.direction === "not_valid_before" && rule.boundaryDate) {
    return locale === "tr"
      ? `bu eşik yalnızca ${rule.boundaryDate} tarihinden itibaren alınan sonuçlar için geçerli`
      : `this threshold only applies to results from ${rule.boundaryDate} onwards`;
  }
  if (locale === "tr") {
    const window = rule.value && rule.unit ? `${rule.value} ${recencyUnitLabel(rule.unit, "tr")}` : "sınırlı bir süre";
    return `sonuçlar yalnızca ${window} boyunca geçerli`;
  }
  const window = rule.value && rule.unit ? `${rule.value} ${rule.unit}` : "a limited period";
  return `results are only valid for ${window}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const recencyCopy = {
  violated: (rule: RecencyRule, dates: string, locale: Locale) =>
    locale === "tr"
      ? `${capitalize(describeWindow(rule, "tr"))} ve kayıtlı sonucun (${dates}) bunun dışında kalıyor.`
      : `${capitalize(describeWindow(rule, "en"))}, and the result you've recorded (${dates}) falls outside that.`,
  unresolved: (rule: RecencyRule, locale: Locale) =>
    locale === "tr"
      ? `Bu gerekliliğin bir geçerlilik penceresi var — ${describeWindow(rule, "tr")} — ve Proxola sonucunun bunun içinde kaldığını doğrulayamıyor, bu yüzden bunu karşılanmış olarak işaretlemeyecek. Kaynak sayfadaki tarihleri kontrol et.`
      : `This requirement has a validity window — ${describeWindow(rule, "en")} — and Proxola can't confirm your result falls inside it, so it won't call this met. Check the dates on the source page.`,
};

// ---------------------------------------------------------------------------
// provenanceBlock
// ---------------------------------------------------------------------------

export const provenanceCopy = {
  refused: (names: string, locale: Locale) =>
    locale === "tr"
      ? `Puanın sayısal olarak yeterli, ancak bu üniversite ${names} kabul etmiyor — burada seni eleyen, puanın nasıl elde edildiği, sonucun kendisi değil.`
      : `Your score qualifies on the number, but this university doesn't accept ${names} — how the score was obtained is what rules it out here, not the result.`,
  unknownProvenance: (names: string, locale: Locale) =>
    locale === "tr"
      ? `Bu üniversite, sayı yeterli olsa bile ${names} kabul etmiyor ve Proxola puanının nasıl elde edildiğini bilmiyor — buna güvenmeden önce seninkinin bunlardan biri olmadığını kontrol et.`
      : `This university doesn't accept ${names} even when the number qualifies, and Proxola doesn't know how your score was obtained — check that yours isn't one of these before relying on it.`,
};

// ---------------------------------------------------------------------------
// evaluateTestScore
// ---------------------------------------------------------------------------

export const testScoreCopy = {
  bareNumberNoScale: (qualifierLabel: string, locale: Locale) =>
    locale === "tr"
      ? `Bu ${qualifierLabel} eşiği, ölçek belirtilmemiş çıplak bir sayı olarak kayıtlı ve ${qualifierLabel} puanları ölçekler arasında karşılaştırılamaz — Proxola hangisini kastettiğini tahmin etmeyecek. Kaynak sayfayı kontrol et.`
      : `This ${qualifierLabel} threshold is recorded as a bare number with no scale attached, and ${qualifierLabel} scores aren't comparable across scales — Proxola won't guess which one it means. Check the source page.`,
  noScoreOnFile: (testName: string, locale: Locale) => (locale === "tr" ? `Henüz kayıtlı bir ${testName} puanı yok.` : `No ${testName} score is on file yet.`),
  unstatedStudentScale: (ruleScale: string, testName: string, locale: Locale) =>
    locale === "tr"
      ? `Bu eşik ${ruleScale} ölçeğinde belirtilmiş ve Proxola, ${testName} sonucunun hangi ölçekte olduğunu söyleyemiyor — puanının kaç üzerinden olduğunu kaydet ya da bunu kaynak sayfada kendin karşılaştır.`
      : `This threshold is stated on the ${ruleScale} scale, and Proxola can't tell which scale your ${testName} result is on — record the maximum your score was out of, or compare it yourself on the source page.`,
  incomparableStudentScale: (testName: string, studentFamily: string, ruleScale: string, locale: Locale) =>
    locale === "tr"
      ? `${testName} sonucun, bu eşikten (${ruleScale}) farklı bir ölçekte (${studentFamily}). İkisi birbirine dönüştürülemez, bu yüzden Proxola bunları karşılaştırmayacak.`
      : `Your ${testName} result is on a different scale (${studentFamily}) than this threshold (${ruleScale}). The two aren't convertible, so Proxola won't compare them.`,
  exactOnFileNoMinScore: (testName: string, locale: Locale) => (locale === "tr" ? `Kayıtlı bir ${testName} puanı var.` : `A ${testName} score is on file.`),
  similarOnFileNoMinScore: (similarTestName: string, locale: Locale) =>
    locale === "tr" ? `Benzer adlı bir testin ("${similarTestName}") puanı kayıtlı.` : `A score for a similarly-named test ("${similarTestName}") is on file.`,
  nonNumericScore: (testName: string, locale: Locale) =>
    locale === "tr"
      ? `Bir ${testName} puanı kayıtlı, ancak Proxola'nın karşılaştırabileceği düz bir sayı değil — elle incele.`
      : `A ${testName} score is on file but isn't a plain number Proxola can compare — review it manually.`,
  belowMinScore: (testName: string, best: number, minScore: number, locale: Locale) =>
    locale === "tr" ? `En iyi ${testName} puanın (${best}) gereken ${minScore} değerinin altında.` : `Your best ${testName} score (${best}) is below the required ${minScore}.`,
  exactMeetsMinScore: (testName: string, best: number, minScore: number, locale: Locale) =>
    locale === "tr" ? `En iyi ${testName} puanın (${best}) gereken ${minScore} değerini karşılıyor.` : `Your best ${testName} score (${best}) meets the required ${minScore}.`,
  similarMeetsMinScore: (best: number, minScore: number, locale: Locale) =>
    locale === "tr" ? `Benzer adlı bir testin puanı (${best}) gereken ${minScore} değerini karşılıyor.` : `A similarly-named test's score (${best}) meets the required ${minScore}.`,
};
