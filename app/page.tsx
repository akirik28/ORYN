"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, Compass, Landmark, ListChecks, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { transition } from "@/lib/motion";

const LOOP_STEPS = [
  { icon: Sparkles, title: "Capture", body: "Grades, activities, projects, research, awards — your whole story, in one place." },
  { icon: Compass, title: "Analyze", body: "Oryn finds your real strengths and your biggest gap — not a generic checklist." },
  { icon: ListChecks, title: "Act", body: "Three highest-impact actions this week. Nothing else competing for your attention." },
  { icon: Landmark, title: "Repeat", body: "Your profile evolves, your priorities update, and the plan keeps pace with you." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <Image src="/brand/logo-full.png" alt="Oryn" width={92} height={31} priority className="h-7 w-auto" />
          <nav className="flex items-center gap-2">
            <ButtonLink variant="ghost" href="/login">
              Sign in
            </ButtonLink>
            <ButtonLink href="/signup">Get started</ButtonLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b bg-[oklch(0.13_0.02_272)] text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.32_0.14_272/0.6),transparent_60%)]"
          />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition("slow")}
            className="relative mx-auto w-full max-w-4xl px-4 py-24 text-center md:px-8 md:py-32"
          >
            <p className="mb-4 text-sm font-medium tracking-wide text-white/60">A Personal Career Operating System</p>
            <h1 className="font-heading text-balance text-4xl font-medium leading-tight tracking-tight md:text-6xl">
              What should I do next to improve my future opportunities?
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-white/70">
              Oryn is where ambitious students capture what they&apos;ve done, understand where they
              genuinely stand, and get told — clearly — what&apos;s worth their time next.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink size="lg" href="/signup">
                Start building your profile <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink
                size="lg"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
                href="/login"
              >
                I already have an account
              </ButtonLink>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20 md:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            {LOOP_STEPS.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ ...transition("base"), delay: index * 0.06 }}
                className="space-y-3"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary-strong">
                  <step.icon className="size-5" />
                </span>
                <h3 className="font-heading text-lg font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-4xl px-4 py-20 text-center md:px-8">
            <h2 className="font-heading text-2xl font-medium tracking-tight md:text-3xl">
              Not a CV builder. Not a ranking site. Not a chatbot.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Oryn combines your academic record, activities, research, and goals with real university and
              opportunity data — and an advisor that understands opportunity cost. Sometimes the right answer is
              &ldquo;don&apos;t do that.&rdquo;
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto w-full max-w-6xl px-4 text-sm text-muted-foreground md:px-8">
          © {new Date().getFullYear()} Oryn. Built for students planning what&apos;s next.
        </div>
      </footer>
    </div>
  );
}
