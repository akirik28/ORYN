"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { isUuidLike } from "@/lib/validation/uuid";
import { FEATURED_SOURCE_TABLES } from "@/lib/social/featured";
import type { FeaturedItemType } from "@/types/database";

type ActionResult = { error?: string };

const MAX_FEATURED = 5;

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value);
}

async function afterFeaturedWrite(userId: string) {
  revalidatePath("/profile");
  revalidatePath(`/u/${userId}`);
}

/**
 * Featuring an item must never bypass the underlying item's own privacy (spec) —
 * enforced here by re-verifying `.eq("user_id", ...)` ownership against the live source
 * row at add time, and again at every read by lib/social/featured.ts (which re-checks
 * canViewPortfolio and silently drops a since-deleted/since-transferred row rather than
 * showing stale data).
 */
export async function addFeaturedItem(
  itemType: FeaturedItemType,
  itemId: string | null,
  externalTitle: string | null,
  externalUrl: string | null
): Promise<ActionResult> {
  const session = await requireUser();
  const supabase = await createClient();

  const { count } = await supabase.from("featured_items").select("id", { count: "exact", head: true }).eq("user_id", session.userId!);
  const nextOrder = count ?? 0;
  if (nextOrder >= MAX_FEATURED) return { error: `You can feature up to ${MAX_FEATURED} items. Remove one before adding another.` };

  if (itemType === "external_link") {
    const url = (externalUrl ?? "").trim();
    if (!url || !isHttpUrl(url)) return { error: "Enter a link starting with http:// or https://." };
    const title = (externalTitle ?? "").trim().slice(0, 220) || url;

    const { error } = await supabase
      .from("featured_items")
      .insert({ user_id: session.userId!, item_type: "external_link", item_id: null, external_title: title, external_url: url, display_order: nextOrder });
    if (error) return { error: "Couldn't feature that link." };
  } else {
    if (!itemId || !isUuidLike(itemId)) return { error: "Choose an item to feature." };
    const table = FEATURED_SOURCE_TABLES[itemType];
    const { data: owned } = await supabase.from(table as "projects").select("id").eq("id", itemId).eq("user_id", session.userId!).maybeSingle();
    if (!owned) return { error: "That item couldn't be found." };

    const { error } = await supabase
      .from("featured_items")
      .insert({ user_id: session.userId!, item_type: itemType, item_id: itemId, external_title: null, external_url: null, display_order: nextOrder });
    if (error) {
      if (error.code === "23505") return { error: "That's already featured." };
      return { error: "Couldn't feature that." };
    }
  }

  await afterFeaturedWrite(session.userId!);
  return {};
}

export async function removeFeaturedItem(id: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!isUuidLike(id)) return { error: "Invalid item." };

  const supabase = await createClient();
  const { error } = await supabase.from("featured_items").delete().eq("id", id).eq("user_id", session.userId!);
  if (error) return { error: "Couldn't remove that." };

  await afterFeaturedWrite(session.userId!);
  return {};
}

export async function reorderFeaturedItems(orderedIds: string[]): Promise<ActionResult> {
  const session = await requireUser();
  if (orderedIds.length === 0 || !orderedIds.every(isUuidLike)) return { error: "Invalid order." };

  const supabase = await createClient();
  const { data: owned } = await supabase.from("featured_items").select("id").eq("user_id", session.userId!).in("id", orderedIds);
  if (!owned || owned.length !== orderedIds.length) return { error: "Invalid order." };

  const { error } = await Promise.all(
    orderedIds.map((id, index) => supabase.from("featured_items").update({ display_order: index }).eq("id", id).eq("user_id", session.userId!))
  ).then((results) => results.find((r) => r.error) ?? { error: null });
  if (error) return { error: "Couldn't reorder." };

  await afterFeaturedWrite(session.userId!);
  return {};
}
