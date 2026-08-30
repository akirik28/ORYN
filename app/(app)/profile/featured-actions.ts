"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { isUuidLike } from "@/lib/validation/uuid";
import {
  FEATURED_SOURCE_TABLES,
  canAddAnotherFeaturedItem,
  isDuplicateFeaturedSource,
  isFeaturedSourceOwnedByRequester,
  allFeaturedIdsOwned,
  buildFeaturedReorder,
  MAX_FEATURED_ITEMS,
} from "@/lib/social/featured";
import type { FeaturedItemType } from "@/types/database";

type ActionResult = { error?: string };
type AddResult = { id?: string; error?: string };

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
): Promise<AddResult> {
  const session = await requireUser();
  const supabase = await createClient();

  const { data: existingRows } = await supabase.from("featured_items").select("item_type, item_id").eq("user_id", session.userId!);
  const existing = (existingRows ?? []).map((r) => ({ itemType: r.item_type, itemId: r.item_id }));
  if (!canAddAnotherFeaturedItem(existing.length)) {
    return { error: `You can feature up to ${MAX_FEATURED_ITEMS} items. Remove one before adding another.` };
  }
  const nextOrder = existing.length;

  // Every insert below now returns the real row id — the client (featured-manager.tsx)
  // uses it for its optimistic item instead of a locally-generated `crypto.randomUUID()`.
  // The fake id looked identical to a real one but never matched an actual row: removing or
  // reordering that same item before the next full page load (which replaces optimistic
  // state with server-truthed data) sent a real Server Action a fake id — a silent no-op
  // delete that left the item's real row behind, or a reorder rejected outright by
  // `allFeaturedIdsOwned` below since the fake id owns nothing.
  let id: string | undefined;

  if (itemType === "external_link") {
    const url = (externalUrl ?? "").trim();
    if (!url || !isHttpUrl(url)) return { error: "Enter a link starting with http:// or https://." };
    const title = (externalTitle ?? "").trim().slice(0, 220) || url;

    const { data, error } = await supabase
      .from("featured_items")
      .insert({ user_id: session.userId!, item_type: "external_link", item_id: null, external_title: title, external_url: url, display_order: nextOrder })
      .select("id")
      .single();
    if (error || !data) return { error: "Couldn't feature that link." };
    id = data.id;
  } else {
    if (!itemId || !isUuidLike(itemId)) return { error: "Choose an item to feature." };
    if (isDuplicateFeaturedSource(existing, itemType, itemId)) return { error: "That's already featured." };

    // Fetched by id alone (not `.eq("user_id", ...)`) so ownership is decided by the
    // pure predicate below, not folded invisibly into the query filter — RLS on the
    // source table is the redundant, real backstop underneath either way.
    const table = FEATURED_SOURCE_TABLES[itemType];
    const { data: sourceRow } = await supabase.from(table as "projects").select("id, user_id").eq("id", itemId).maybeSingle();
    if (!isFeaturedSourceOwnedByRequester(sourceRow, session.userId!)) return { error: "That item couldn't be found." };

    const { data, error } = await supabase
      .from("featured_items")
      .insert({ user_id: session.userId!, item_type: itemType, item_id: itemId, external_title: null, external_url: null, display_order: nextOrder })
      .select("id")
      .single();
    if (error || !data) {
      if (error?.code === "23505") return { error: "That's already featured." };
      return { error: "Couldn't feature that." };
    }
    id = data.id;
  }

  await afterFeaturedWrite(session.userId!);
  return { id };
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
  if (!allFeaturedIdsOwned((owned ?? []).map((r) => r.id), orderedIds)) return { error: "Invalid order." };

  const { error } = await Promise.all(
    buildFeaturedReorder(orderedIds).map(({ id, displayOrder }) =>
      supabase.from("featured_items").update({ display_order: displayOrder }).eq("id", id).eq("user_id", session.userId!)
    )
  ).then((results) => results.find((r) => r.error) ?? { error: null });
  if (error) return { error: "Couldn't reorder." };

  await afterFeaturedWrite(session.userId!);
  return {};
}
