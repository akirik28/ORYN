"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateContactInfo, type ContactInfoFormInput } from "@/app/(app)/profile/professional-actions";
import type { ContactInfo, ContactVisibility } from "@/types/database";

const VISIBILITY_OPTIONS: { value: ContactVisibility; label: string }[] = [
  { value: "private", label: "Only me" },
  { value: "connections", label: "Connections" },
  { value: "public", label: "Anyone" },
];

function adultVisibilityOptions(isAdult: boolean) {
  return isAdult ? VISIBILITY_OPTIONS : VISIBILITY_OPTIONS.filter((o) => o.value !== "public");
}

interface FieldState {
  value: string;
  visibility: ContactVisibility;
}

type FieldKey = "phone" | "email" | "linkedin" | "instagram" | "github" | "website" | "twitter" | "discord";

const FIELD_META: Record<FieldKey, { label: string; placeholder: string; type?: string; minorSafe?: boolean }> = {
  phone: { label: "Phone", placeholder: "+1 555 000 0000", type: "tel", minorSafe: true },
  email: { label: "Email", placeholder: "you@example.com", type: "email" },
  linkedin: { label: "LinkedIn", placeholder: "https://linkedin.com/in/..." },
  instagram: { label: "Instagram", placeholder: "@yourhandle" },
  github: { label: "GitHub", placeholder: "https://github.com/..." },
  website: { label: "Website / portfolio", placeholder: "https://..." },
  twitter: { label: "X / Twitter", placeholder: "@yourhandle" },
  discord: { label: "Discord", placeholder: "username" },
};

function initialState(contact: ContactInfo): Record<FieldKey, FieldState> {
  return {
    phone: { value: contact.phone ?? "", visibility: contact.phone_visibility },
    email: { value: contact.email ?? "", visibility: contact.email_visibility },
    linkedin: { value: contact.linkedin_url ?? "", visibility: contact.linkedin_visibility },
    instagram: { value: contact.instagram_handle ?? "", visibility: contact.instagram_visibility },
    github: { value: contact.github_url ?? "", visibility: contact.github_visibility },
    website: { value: contact.website_url ?? "", visibility: contact.website_visibility },
    twitter: { value: contact.twitter_handle ?? "", visibility: contact.twitter_visibility },
    discord: { value: contact.discord_handle ?? "", visibility: contact.discord_visibility },
  };
}

/** Every field independently optional and independently visible (spec: Contact
 * Information). Phone's visibility options are narrowed client-side for a minor purely
 * as a UI hint — `updateContactInfo` re-derives adulthood from `profiles.birth_year`
 * server-side and rejects a public phone regardless of what this form ever offered
 * (lib/social/contact-visibility.ts's `isPhoneVisibilityAllowed`). */
export function ContactInfoForm({ initialContact, isAdult }: { initialContact: ContactInfo; isAdult: boolean }) {
  const [fields, setFields] = useState<Record<FieldKey, FieldState>>(initialState(initialContact));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initial = initialState(initialContact);
  const dirty = (Object.keys(fields) as FieldKey[]).some(
    (key) => fields[key].value !== initial[key].value || fields[key].visibility !== initial[key].visibility
  );

  function update(key: FieldKey, patch: Partial<FieldState>) {
    setFields((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      const payload: ContactInfoFormInput = {
        phone: fields.phone.value,
        phoneVisibility: fields.phone.visibility,
        email: fields.email.value,
        emailVisibility: fields.email.visibility,
        linkedinUrl: fields.linkedin.value,
        linkedinVisibility: fields.linkedin.visibility,
        instagramHandle: fields.instagram.value,
        instagramVisibility: fields.instagram.visibility,
        githubUrl: fields.github.value,
        githubVisibility: fields.github.visibility,
        websiteUrl: fields.website.value,
        websiteVisibility: fields.website.visibility,
        twitterHandle: fields.twitter.value,
        twitterVisibility: fields.twitter.visibility,
        discordHandle: fields.discord.value,
        discordVisibility: fields.discord.visibility,
      };
      const result = await updateContactInfo(payload);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      {(Object.keys(FIELD_META) as FieldKey[]).map((key) => {
        const meta = FIELD_META[key];
        const options = meta.minorSafe ? adultVisibilityOptions(isAdult) : VISIBILITY_OPTIONS;
        return (
          <div key={key} className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`contact-${key}`}>{meta.label}</Label>
              <Input
                id={`contact-${key}`}
                type={meta.type ?? "text"}
                value={fields[key].value}
                placeholder={meta.placeholder}
                onChange={(e) => update(key, { value: e.target.value })}
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-36">
              <Label htmlFor={`contact-${key}-visibility`} className="sm:sr-only">
                Visibility
              </Label>
              <Select value={fields[key].visibility} onValueChange={(v) => v && update(key, { visibility: v as ContactVisibility })}>
                <SelectTrigger id={`contact-${key}-visibility`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}

      {!isAdult ? (
        <p className="text-xs text-muted-foreground">
          Because you&apos;re under 18, your phone number can only be shared privately or with connections — never publicly.
        </p>
      ) : null}

      <Button variant="outline" size="sm" disabled={isPending || !dirty} onClick={save}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? "Saved" : "Save"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
