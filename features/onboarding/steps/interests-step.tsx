"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function InterestsStep({
  interests,
  setInterests,
}: {
  interests: string[];
  setInterests: (value: string[]) => void;
}) {
  const t = useTranslations("onboarding.interests");
  // Same reasoning as onboarding-wizard.tsx's GOAL_OPTIONS: `interests` is a free-text
  // string[] a student can also type into directly (no separate stored value), so these
  // suggestions are translated directly rather than given a value/label split.
  const INTEREST_SUGGESTIONS = [
    t("suggestions.economics"),
    t("suggestions.business"),
    t("suggestions.computerScience"),
    t("suggestions.engineering"),
    t("suggestions.medicine"),
    t("suggestions.law"),
    t("suggestions.psychology"),
    t("suggestions.politics"),
    t("suggestions.mathematics"),
    t("suggestions.physics"),
    t("suggestions.design"),
    t("suggestions.entrepreneurship"),
    t("suggestions.biology"),
    t("suggestions.environmentalScience"),
    t("suggestions.history"),
    t("suggestions.literature"),
  ];
  const [query, setQuery] = useState("");

  function add(label: string) {
    const trimmed = label.trim();
    if (!trimmed || interests.includes(trimmed)) return;
    setInterests([...interests, trimmed]);
    setQuery("");
  }

  function remove(label: string) {
    setInterests(interests.filter((i) => i !== label));
  }

  const filteredSuggestions = INTEREST_SUGGESTIONS.filter(
    (s) => !interests.includes(s) && s.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(query);
          }
        }}
        placeholder={t("placeholder")}
      />

      {interests.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <Badge key={interest} className="gap-1 py-1.5 pl-3 pr-2 text-sm">
              {interest}
              <button type="button" onClick={() => remove(interest)} aria-label={t("removeAriaLabel", { interest })}>
                <X className="size-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {filteredSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => add(suggestion)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            )}
          >
            + {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
