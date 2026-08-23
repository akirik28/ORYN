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
        {/* Founder-locked light system: a restrained brand-tinted gradient (the same
            `brand-primary-subtle` token the Profile page's score card already uses), not
            a solid dark-purple hero slab — this was the one large hardcoded-dark surface
            still left on the landing page. */}
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-brand-primary-subtle via-background to-background">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--brand-primary-soft),transparent_60%)]"
          />
          {/* No opacity in the entrance animation (Y-offset only) — found live-testing
              this pass that this motion.div's `animate` can get stuck at its `initial`
              state well past its 400ms transition (not a prefers-reduced-motion skip;
              reproduced with that media query confirmed false), which on the new
              near-black background left the hero's headline and body copy essentially
              invisible: a legibility failure on the single most important above-the-fold
              text in the product. Root cause not fully isolated (other `motion.div`
              entrances on this same page, e.g. the four loop-step cards below, resolved
              normally) and disproportionate to chase further under a focused visual
              pass — critical content simply shouldn't depend on an animation completing
              to be readable, regardless of cause. */}
          <motion.div
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            transition={transition("slow")}
            className="relative mx-auto w-full max-w-4xl px-4 py-24 text-center md:px-8 md:py-32"
          >
            <p className="mb-4 text-sm font-medium tracking-wide text-brand-primary-strong">A Personal Career Operating System</p>
            <h1 className="font-display text-balance text-4xl leading-tight tracking-tight md:text-6xl">
              What should I do next to improve my future opportunities?
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
              Oryn is where ambitious students capture what they&apos;ve done, understand where they
              genuinely stand, and get told — clearly — what&apos;s worth their time next.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink size="lg" href="/signup">
                Start building your profile <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink size="lg" variant="outline" href="/login">
                I already have an account
              </ButtonLink>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20 md:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            {LOOP_STEPS.map((step, index) => (
              // Same opacity-safety fix as the hero above: verified live that these four
              // `whileInView` cards can sit at their `initial` state (opacity 0) with
              // `viewport={{ once: true }}` never firing, even scrolled fully into view —
              // Y-offset only, so a stalled trigger is invisible-harmless rather than
              // blanking these cards' text entirely.
              <motion.div
                key={step.title}
                initial={{ y: 10 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ ...transition("base"), delay: index * 0.06 }}
                className="space-y-3"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary-strong">
                  <step.icon className="size-5" />
                </span>
                <h3 className="text-lg font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-4xl px-4 py-20 text-center md:px-8">
            <h2 className="font-display text-2xl tracking-tight md:text-3xl">
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
