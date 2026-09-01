import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { buildPortfolio } from "@/lib/portfolio/build";
import { CVBuilder } from "@/features/profile/cv-builder";

export const metadata = { title: "CV Generator" };

export default async function CVPage() {
  const session = await requireUser();
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const items = await buildPortfolio(supabase, session.userId!);
  const t = await getTranslations("profile");
  const tCv = await getTranslations("profile.cv");

  return (
    <div className="space-y-6">
      {/* No dark hero here, unlike Portfolio/Applications — the very next thing on this
          page is a document meant to look like a real, printable CV. A heavy decorative
          header directly above a plain white resume preview would read as a mismatch, so
          this stays a simple heading; the glass-card treatment below is scoped to the
          *controls* panel, never the print area itself. */}
      <div className="print:hidden">
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> {t("backToProfile")}
        </Link>
        <h1 className="mt-2 font-display text-2xl tracking-tight md:text-3xl">{tCv("title")}</h1>
        <p className="mt-1 text-muted-foreground">{tCv("description")}</p>
      </div>
      <CVBuilder
        studentName={profile?.display_name || "Student"}
        schoolName={profile?.school_name ?? null}
        country={profile?.country ?? null}
        graduationYear={profile?.graduation_year ?? null}
        items={items}
      />
    </div>
  );
}
