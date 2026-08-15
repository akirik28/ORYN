"use client";

import { motion } from "motion/react";
import { TrendingUp } from "lucide-react";
import { transition } from "@/lib/motion";

const SIZE = 176;
const STROKE = 11;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({ score, trend }: { score: number | null; trend?: number | null }) {
  const value = score ?? 0;
  const offset = CIRCUMFERENCE - (value / 100) * CIRCUMFERENCE;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-muted)" strokeWidth={STROKE} />
        {score !== null ? (
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-brand-primary)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={transition("slow")}
          />
        ) : null}
      </svg>
      <div className="absolute flex flex-col items-center">
        {score !== null ? (
          <>
            <span className="font-heading text-5xl leading-none font-medium tracking-tight">{score}</span>
            {typeof trend === "number" && trend !== 0 ? (
              <span
                className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${trend > 0 ? "text-success" : "text-muted-foreground"}`}
              >
                {trend > 0 ? <TrendingUp className="size-3.5" /> : null}
                {trend > 0 ? "+" : ""}
                {trend} this month
              </span>
            ) : (
              <span className="mt-2 text-xs text-muted-foreground">Career Profile</span>
            )}
          </>
        ) : (
          <span className="max-w-24 text-center text-xs text-muted-foreground">Not scored yet</span>
        )}
      </div>
    </div>
  );
}
