import type { Locale } from "@/lib/i18n/config";

/** Allow-list of achievement tables evidence can attach to — evidence_files.linked_table
 * has no DB-level FK (it's polymorphic, see the migration's comment), so this app-level
 * check is the only thing stopping an arbitrary table name from reaching a dynamic
 * `.from()` call. */
export const EVIDENCE_LINKABLE_TABLES = [
  "activities",
  "awards",
  "certifications",
  "projects",
  "research_experiences",
  "volunteering_experiences",
  "work_experiences",
  "education_records",
  "test_scores",
] as const;

export type EvidenceLinkableTable = (typeof EVIDENCE_LINKABLE_TABLES)[number];

export function isEvidenceLinkableTable(value: string): value is EvidenceLinkableTable {
  return (EVIDENCE_LINKABLE_TABLES as readonly string[]).includes(value);
}

export const EVIDENCE_LINKABLE_LABELS: Record<EvidenceLinkableTable, string> = {
  activities: "Activity",
  awards: "Award",
  certifications: "Certification",
  projects: "Project",
  research_experiences: "Research",
  volunteering_experiences: "Volunteering",
  work_experiences: "Work experience",
  education_records: "Education",
  test_scores: "Test score",
};

const EVIDENCE_LINKABLE_LABELS_TR: Record<EvidenceLinkableTable, string> = {
  activities: "Etkinlik",
  awards: "Ödül",
  certifications: "Sertifika",
  projects: "Proje",
  research_experiences: "Araştırma",
  volunteering_experiences: "Gönüllülük",
  work_experiences: "İş deneyimi",
  education_records: "Eğitim",
  test_scores: "Sınav puanı",
};

/**
 * Locale-aware lookup, same shape as lib/scoring/labels.ts's dimensionLabel — added
 * alongside EVIDENCE_LINKABLE_LABELS rather than replacing it, so the English map stays
 * byte-identical for any caller that hasn't been made locale-aware.
 */
export function evidenceLinkableLabel(table: EvidenceLinkableTable, locale: Locale): string {
  return locale === "tr" ? EVIDENCE_LINKABLE_LABELS_TR[table] : EVIDENCE_LINKABLE_LABELS[table];
}
