import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { collectStoryBankExperiences } from "@/lib/story-bank/collect";
import { StoryBank } from "@/features/profile/story-bank";

export const metadata = { title: "Essay Story Bank" };

export default async function StoryBankPage() {
  const session = await requireUser();
  const supabase = await createClient();
  const experiences = await collectStoryBankExperiences(supabase, session.userId!);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to profile
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-medium tracking-tight md:text-3xl">Essay Story Bank</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Find which of your real experiences carry an essay-worthy story, and how you might structure it. Oryn
          organizes what you&apos;ve recorded — it never invents an event and never writes the essay for you.
        </p>
      </div>
      <StoryBank experiences={experiences} />
    </div>
  );
}
