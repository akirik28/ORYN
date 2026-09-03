"use client";

import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EntityCombobox } from "@/features/entities/entity-combobox";
import { SuggestInput } from "@/features/entities/suggest-input";
import { localizeFields, type FieldConfig } from "./field-config";
import type { Locale } from "@/lib/i18n/config";

export type FormValues = Record<string, string | number | boolean | null>;

/**
 * The single rendering choke point for every FieldConfig array in features/profile/
 * field-config.ts — both AchievementSection's full Edit dialog and QuickAddEntry's short
 * form render through this component and nothing else, so localizing `fields` once here
 * (rather than at either call site) covers both without either caller needing to know
 * about it. 2026-09-01 first-run i18n pass — field-config.ts's own header comment has the
 * full reasoning for why translation is keyed by source text rather than field `name`.
 */
export function DynamicFormFields({
  fields,
  values,
  onChange,
}: {
  fields: FieldConfig[];
  values: FormValues;
  onChange: (name: string, value: string | number | boolean | null) => void;
}) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const localizedFields = localizeFields(fields, locale);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {localizedFields.map((field) => {
        // Added 2026-09-03 for curriculum_other_text — see field-config.ts's own comment on
        // FieldConfig for why this is a general mechanism rather than a special case. Unset
        // (every field before this one) always renders, unchanged.
        if (field.showWhen && !field.showWhen(values)) return null;

        const span = "span" in field && field.span === "half" ? "" : "sm:col-span-2";
        const value = values[field.name];

        if (field.type === "checkbox") {
          return (
            <div key={field.name} className={cn("flex items-center gap-2", span)}>
              <Checkbox
                id={field.name}
                checked={Boolean(value)}
                onCheckedChange={(checked) => onChange(field.name, checked === true)}
              />
              <Label htmlFor={field.name} className="font-normal">
                {field.label}
              </Label>
            </div>
          );
        }

        if (field.type === "textarea") {
          return (
            <div key={field.name} className={cn("space-y-1.5", span)}>
              <Label htmlFor={field.name}>{field.label}</Label>
              <Textarea
                id={field.name}
                value={(value as string) ?? ""}
                onChange={(e) => onChange(field.name, e.target.value || null)}
                placeholder={field.placeholder}
                rows={3}
              />
            </div>
          );
        }

        if (field.type === "select") {
          return (
            <div key={field.name} className={cn("space-y-1.5", span)}>
              <Label htmlFor={field.name}>{field.label}</Label>
              {/* Unset stays unset — never falls back to options[0]. A nullable column
                  (e.g. education_records.curriculum) has no correct "first" answer, and
                  silently pre-selecting one (previously AP) misrepresents an unset field
                  as a real, US-centric choice the student never made. */}
              <Select value={(value as string) ?? undefined} onValueChange={(v) => onChange(field.name, v)}>
                <SelectTrigger id={field.name} className="w-full">
                  <SelectValue placeholder={field.placeholder ?? t("selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        if (field.type === "date") {
          return (
            <div key={field.name} className={cn("space-y-1.5", span)}>
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                type="date"
                value={(value as string) ?? ""}
                onChange={(e) => onChange(field.name, e.target.value || null)}
              />
            </div>
          );
        }

        if (field.type === "number") {
          return (
            <div key={field.name} className={cn("space-y-1.5", span)}>
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                type="number"
                value={value === null || value === undefined ? "" : String(value)}
                onChange={(e) => onChange(field.name, e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
          );
        }

        if (field.type === "entity") {
          return (
            <div key={field.name} className={cn("space-y-1.5", span)}>
              <Label htmlFor={field.name}>{field.label}</Label>
              <EntityCombobox
                id={field.name}
                scope={field.scope}
                value={(value as string) ?? ""}
                entityId={(values[field.entityIdField] as string) ?? null}
                allowCustom={field.allowCustom}
                customLabel={field.customLabel}
                placeholder={field.placeholder}
                onChange={(next) => {
                  onChange(field.name, next.displayName || null);
                  onChange(field.entityIdField, next.id);
                }}
              />
            </div>
          );
        }

        if (field.type === "suggest") {
          return (
            <div key={field.name} className={cn("space-y-1.5", span)}>
              <Label htmlFor={field.name}>{field.label}</Label>
              <SuggestInput
                id={field.name}
                value={(value as string) ?? ""}
                onChange={(next) => onChange(field.name, next || null)}
                suggestions={field.suggestions}
                placeholder={field.placeholder}
              />
            </div>
          );
        }

        return (
          <div key={field.name} className={cn("space-y-1.5", span)}>
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              value={(value as string) ?? ""}
              onChange={(e) => onChange(field.name, e.target.value || null)}
              placeholder={field.placeholder}
            />
          </div>
        );
      })}
    </div>
  );
}
