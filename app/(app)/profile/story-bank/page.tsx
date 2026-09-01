import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { collectStoryBankExperiences } from "@/lib/story-bank/collect";
import { StoryBank } from "@/features/profile/story-bank";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("profile.storyBank");
  return { title: tMeta("title") };
}

export default async function StoryBankPage() {
  const session = await requireUser();
  const supabase = await createClient();
  const experiences = await collectStoryBankExperiences(supabase, session.userId!);
  const t = await getTranslations("profile");
  const tStoryBank = await getTranslations("profile.storyBank");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> {t("backToProfile")}
        </Link>
        <h1 className="mt-2 font-display text-2xl tracking-tight md:text-3xl">{tStoryBank("title")}</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">{tStoryBank("description")}</p>
      </div>
      <StoryBank experiences={experiences} />
    </div>
  );
}
