"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { INTEREST_SUGGESTIONS } from "@/lib/validation/onboarding";

export function InterestsStep({
  interests,
  setInterests,
}: {
  interests: string[];
  setInterests: (value: string[]) => void;
}) {
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
        placeholder="Search or type your own interest and press Enter"
      />

      {interests.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <Badge key={interest} className="gap-1 py-1.5 pl-3 pr-2 text-sm">
              {interest}
              <button type="button" onClick={() => remove(interest)} aria-label={`Remove ${interest}`}>
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
