"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { recomputeCareerProfile } from "@/lib/scoring/persist";
import { getOwnContactInfo } from "@/lib/social/contact-info";
import { isPhoneVisibilityAllowed } from "@/lib/social/contact-visibility";
import { isLikelyAdult } from "@/lib/social/age";
import { isValidOpenToOption } from "@/lib/social/open-to";
import type { ContactInfo, ContactVisibility } from "@/types/database";

const VISIBILITY_VALUES: readonly ContactVisibility[] = ["private", "connections", "public"];
function isVisibility(value: unknown): value is ContactVisibility {
  return typeof value === "string" && (VISIBILITY_VALUES as readonly string[]).includes(value);
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value);
}

async function afterProfessionalWrite(userId: string) {
  try {
    await recomputeCareerProfile(userId);
  } catch (error) {
    console.error("[profile] failed to recompute career profile after professional-identity edit", error);
  }
  revalidatePath("/profile");
  revalidatePath(`/u/${userId}`);
  revalidatePath("/dashboard");
}

export async function updateProfessionalIdentity(input: { headline: string; about: string; showGpa: boolean }): Promise<{ error?: string }> {
  const session = await requireUser();
  const headline = input.headline.trim().slice(0, 220);
  const about = input.about.trim().slice(0, 2600);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ headline: headline || null, about: about || null, show_gpa: input.showGpa })
    .eq("id", session.userId!);
  if (error) return { error: "Couldn't save your profile." };

  await afterProfessionalWrite(session.userId!);
  return {};
}

/**
 * Read-modify-write rather than a bare `.upsert()` with only the changed fields: the
 * generated ContactInfoUpsert type requires every value column (matching the DB's own
 * "everything optional individually, but the row itself either exists or doesn't" shape),
 * and more importantly a partial upsert payload would still silently reset every omitted
 * column back to its schema default on an existing row — this keeps every other saved
 * field untouched no matter which single section of the form last saved.
 */
async function upsertContactInfoPatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  patch: Partial<Omit<ContactInfo, "user_id" | "updated_at">>
): Promise<{ error?: string }> {
  const current = await getOwnContactInfo(supabase, userId);
  const merged = { ...current, ...patch };
  const { error } = await supabase.from("contact_info").upsert(
    {
      user_id: userId,
      phone: merged.phone,
      phone_visibility: merged.phone_visibility,
      email: merged.email,
      email_visibility: merged.email_visibility,
      linkedin_url: merged.linkedin_url,
      linkedin_visibility: merged.linkedin_visibility,
      instagram_handle: merged.instagram_handle,
      instagram_visibility: merged.instagram_visibility,
      github_url: merged.github_url,
      github_visibility: merged.github_visibility,
      website_url: merged.website_url,
      website_visibility: merged.website_visibility,
      twitter_handle: merged.twitter_handle,
      twitter_visibility: merged.twitter_visibility,
      discord_handle: merged.discord_handle,
      discord_visibility: merged.discord_visibility,
      open_to_visibility: merged.open_to_visibility,
    },
    { onConflict: "user_id" }
  );
  if (error) return { error: "Couldn't save." };
  return {};
}

export async function updateOpenTo(selected: string[], visibility: ContactVisibility): Promise<{ error?: string }> {
  const session = await requireUser();
  const unique = Array.from(new Set(selected));
  if (!unique.every(isValidOpenToOption)) return { error: "Invalid selection." };
  if (!isVisibility(visibility)) return { error: "Invalid visibility." };

  const supabase = await createClient();
  const { error: profileError } = await supabase.from("profiles").update({ open_to: unique }).eq("id", session.userId!);
  if (profileError) return { error: "Couldn't save." };

  const contactResult = await upsertContactInfoPatch(supabase, session.userId!, { open_to_visibility: visibility });
  if (contactResult.error) return contactResult;

  await afterProfessionalWrite(session.userId!);
  return {};
}

export interface ContactInfoFormInput {
  phone: string;
  phoneVisibility: ContactVisibility;
  email: string;
  emailVisibility: ContactVisibility;
  linkedinUrl: string;
  linkedinVisibility: ContactVisibility;
  instagramHandle: string;
  instagramVisibility: ContactVisibility;
  githubUrl: string;
  githubVisibility: ContactVisibility;
  websiteUrl: string;
  websiteVisibility: ContactVisibility;
  twitterHandle: string;
  twitterVisibility: ContactVisibility;
  discordHandle: string;
  discordVisibility: ContactVisibility;
}

export async function updateContactInfo(input: ContactInfoFormInput): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  const visibilities = [
    input.phoneVisibility,
    input.emailVisibility,
    input.linkedinVisibility,
    input.instagramVisibility,
    input.githubVisibility,
    input.websiteVisibility,
    input.twitterVisibility,
    input.discordVisibility,
  ];
  if (!visibilities.every(isVisibility)) return { error: "Invalid visibility value." };

  // Minor-safe phone rule (spec Phase — Professional Profile pack): age is always
  // computed server-side from profiles.birth_year, never trusted from a client flag.
  const { data: profile } = await supabase.from("profiles").select("birth_year").eq("id", session.userId!).single();
  const isAdult = isLikelyAdult(profile?.birth_year ?? null);
  if (!isPhoneVisibilityAllowed(input.phoneVisibility, isAdult)) {
    return { error: "Public phone visibility isn't available until you're 18." };
  }

  const linkedinUrl = input.linkedinUrl.trim();
  const githubUrl = input.githubUrl.trim();
  const websiteUrl = input.websiteUrl.trim();
  if (linkedinUrl && !isHttpUrl(linkedinUrl)) return { error: "LinkedIn URL must start with http:// or https://." };
  if (githubUrl && !isHttpUrl(githubUrl)) return { error: "GitHub URL must start with http:// or https://." };
  if (websiteUrl && !isHttpUrl(websiteUrl)) return { error: "Website URL must start with http:// or https://." };

  const result = await upsertContactInfoPatch(supabase, session.userId!, {
    phone: input.phone.trim() || null,
    phone_visibility: input.phoneVisibility,
    email: input.email.trim() || null,
    email_visibility: input.emailVisibility,
    linkedin_url: linkedinUrl || null,
    linkedin_visibility: input.linkedinVisibility,
    instagram_handle: input.instagramHandle.trim() || null,
    instagram_visibility: input.instagramVisibility,
    github_url: githubUrl || null,
    github_visibility: input.githubVisibility,
    website_url: websiteUrl || null,
    website_visibility: input.websiteVisibility,
    twitter_handle: input.twitterHandle.trim() || null,
    twitter_visibility: input.twitterVisibility,
    discord_handle: input.discordHandle.trim() || null,
    discord_visibility: input.discordVisibility,
  });
  if (result.error) return result;

  await afterProfessionalWrite(session.userId!);
  return {};
}
