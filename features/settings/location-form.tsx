"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuggestInput } from "@/features/entities/suggest-input";
import { COUNTRY_SUGGESTIONS } from "@/lib/vocabularies/countries";
import { updateLocation } from "@/app/(app)/settings/actions";

export function LocationForm({ initialCountry, initialCity }: { initialCountry: string; initialCity: string | null }) {
  const t = useTranslations("common");
  const tLocation = useTranslations("settings.location");
  const [country, setCountry] = useState(initialCountry);
  const [city, setCity] = useState(initialCity ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unchanged = country.trim() === initialCountry && city.trim() === (initialCity ?? "");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1 space-y-1.5">
          <Label htmlFor="location-country">{tLocation("countryLabel")}</Label>
          <SuggestInput
            id="location-country"
            value={country}
            onChange={(next) => {
              setCountry(next);
              setSaved(false);
            }}
            suggestions={COUNTRY_SUGGESTIONS}
          />
        </div>
        <div className="min-w-40 flex-1 space-y-1.5">
          <Label htmlFor="location-city">{tLocation("cityLabel")}</Label>
          <Input
            id="location-city"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <Button
          variant="outline"
          disabled={isPending || unchanged || !country.trim()}
          onClick={() =>
            startTransition(async () => {
              const result = await updateLocation(country, city || null);
              if (result.error) setError(result.error);
              else {
                setError(null);
                setSaved(true);
              }
            })
          }
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? tLocation("saved") : t("save")}
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
