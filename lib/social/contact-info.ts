import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactInfo, Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { canViewContactField } from "./contact-visibility";

/** A contact_info row that doesn't exist yet means "nothing set, everything at its
 * column default" (migration 0033's own comment) — returned instead of null so callers
 * (the edit form, the completeness scorer) always have a full row to bind to. */
export function emptyContactInfo(userId: string): ContactInfo {
  return {
    user_id: userId,
    phone: null,
    phone_visibility: "private",
    email: null,
    email_visibility: "connections",
    linkedin_url: null,
    linkedin_visibility: "private",
    instagram_handle: null,
    instagram_visibility: "private",
    github_url: null,
    github_visibility: "private",
    website_url: null,
    website_visibility: "private",
    twitter_handle: null,
    twitter_visibility: "private",
    discord_handle: null,
    discord_visibility: "private",
    open_to_visibility: "private",
    updated_at: new Date(0).toISOString(),
  };
}

/** Owner's own row, via the RLS-scoped request client (contact_info's "owner full
 * access" policy already covers this — no admin client needed for a self-read). */
export async function getOwnContactInfo(supabase: SupabaseClient<Database>, userId: string): Promise<ContactInfo> {
  const { data } = await supabase.from("contact_info").select("*").eq("user_id", userId).maybeSingle();
  return data ?? emptyContactInfo(userId);
}

export interface FilteredContact {
  phone: string | null;
  email: string | null;
  linkedinUrl: string | null;
  instagramHandle: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  twitterHandle: string | null;
  discordHandle: string | null;
  /** profiles.open_to, filtered by contact_info.open_to_visibility — empty when hidden
   * from this viewer, not merely omitted, so a caller can't accidentally fall back to an
   * unfiltered value. */
  openTo: string[];
}

/**
 * Cross-user read. contact_info's RLS is owner-only for every access path by design
 * (migration 0033 — per-field visibility can't be expressed as a row-level predicate),
 * so this always goes through the admin client and re-derives visibility here, field by
 * field, against the viewer's actual relationship to `targetUserId`. Mirrors
 * lib/social/public-profile.ts's admin-client + gate pattern.
 */
export async function getFilteredContactInfo(
  targetUserId: string,
  viewer: { isSelf: boolean; hasAcceptedConnection: boolean }
): Promise<FilteredContact> {
  const admin = createAdminClient();
  const [{ data: contact }, { data: profile }] = await Promise.all([
    admin.from("contact_info").select("*").eq("user_id", targetUserId).maybeSingle(),
    admin.from("profiles").select("open_to").eq("id", targetUserId).maybeSingle(),
  ]);

  if (!contact) {
    return {
      phone: null,
      email: null,
      linkedinUrl: null,
      instagramHandle: null,
      githubUrl: null,
      websiteUrl: null,
      twitterHandle: null,
      discordHandle: null,
      openTo: [],
    };
  }

  const pick = (value: string | null, visibility: ContactInfo["phone_visibility"]) =>
    value && canViewContactField(visibility, viewer.isSelf, viewer.hasAcceptedConnection) ? value : null;

  const openToVisible = canViewContactField(contact.open_to_visibility, viewer.isSelf, viewer.hasAcceptedConnection);

  return {
    phone: pick(contact.phone, contact.phone_visibility),
    email: pick(contact.email, contact.email_visibility),
    linkedinUrl: pick(contact.linkedin_url, contact.linkedin_visibility),
    instagramHandle: pick(contact.instagram_handle, contact.instagram_visibility),
    githubUrl: pick(contact.github_url, contact.github_visibility),
    websiteUrl: pick(contact.website_url, contact.website_visibility),
    twitterHandle: pick(contact.twitter_handle, contact.twitter_visibility),
    discordHandle: pick(contact.discord_handle, contact.discord_visibility),
    openTo: openToVisible ? (profile?.open_to ?? []) : [],
  };
}

/** True when any contact field has a non-null value — feeds
 * lib/scoring/completeness.ts's `hasContactInfo` (Profile Strength), and duplicates that
 * module's own inline check so a second caller doesn't have to re-list every column. */
export function hasAnyContactValue(contact: ContactInfo): boolean {
  return Boolean(
    contact.phone ||
      contact.email ||
      contact.linkedin_url ||
      contact.instagram_handle ||
      contact.github_url ||
      contact.website_url ||
      contact.twitter_handle ||
      contact.discord_handle
  );
}
