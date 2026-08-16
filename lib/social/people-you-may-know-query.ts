import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isExcludedFromPeopleYouMayKnow, scorePeopleYouMayKnowCandidate, hasAnyPeopleYouMayKnowSignal } from "./people-you-may-know";

export interface PYMKResult {
  id: string;
  displayName: string | null;
  reasons: string[];
}

const CANDIDATE_POOL_CAP = 100;
const SECOND_DEGREE_SOURCE_CAP = 30;

function orInList(column: string, ids: string[]): string {
  return ids.map((id) => `${column}.eq.${id}`).join(",");
}

/**
 * Deterministic V1 candidate gathering (spec: mutual connections, same school, shared
 * interests, shared skills — the exact four signals lib/social/people-you-may-know.ts's
 * pure scorer already supports). No AI. Two-hop candidate pool — connections of your
 * accepted connections, plus same-school public profiles — rather than scanning every
 * user, so this stays a handful of batched queries regardless of platform size, never
 * N+1. `is_public` gates the same "discoverable" boundary the rest of this app already
 * uses (Connect only ever appears from an already-public profile page).
 */
export async function getPeopleYouMayKnow(userId: string, limit = 10): Promise<PYMKResult[]> {
  const admin = createAdminClient();

  const [connectionsRes, blockedRes, myProfileRes, myInterestsRes, mySkillsRes] = await Promise.all([
    admin.from("connections").select("requester_id, recipient_id, status").or(`requester_id.eq.${userId},recipient_id.eq.${userId}`),
    admin.from("blocked_users").select("blocker_id, blocked_id").or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
    admin.from("profiles").select("school_name").eq("id", userId).maybeSingle(),
    admin.from("student_interests").select("label").eq("user_id", userId),
    admin.from("skills").select("name").eq("user_id", userId),
  ]);

  const connectionRows = connectionsRes.data ?? [];
  const anyConnectionIds = new Set(connectionRows.map((r) => (r.requester_id === userId ? r.recipient_id : r.requester_id)));
  const acceptedConnectionIds = new Set(
    connectionRows.filter((r) => r.status === "accepted").map((r) => (r.requester_id === userId ? r.recipient_id : r.requester_id))
  );
  const blockedIds = new Set((blockedRes.data ?? []).map((r) => (r.blocker_id === userId ? r.blocked_id : r.blocker_id)));
  const mySchool = myProfileRes.data?.school_name ?? null;
  const myInterests = new Set((myInterestsRes.data ?? []).map((r) => r.label));
  const mySkills = new Set((mySkillsRes.data ?? []).map((r) => r.name));

  const candidateIds = new Set<string>();

  if (acceptedConnectionIds.size > 0) {
    const sourceIds = [...acceptedConnectionIds].slice(0, SECOND_DEGREE_SOURCE_CAP);
    const { data: secondDegree } = await admin
      .from("connections")
      .select("requester_id, recipient_id")
      .eq("status", "accepted")
      .or(`${orInList("requester_id", sourceIds)},${orInList("recipient_id", sourceIds)}`);
    for (const row of secondDegree ?? []) {
      candidateIds.add(row.requester_id);
      candidateIds.add(row.recipient_id);
    }
  }

  if (mySchool) {
    const { data: schoolMates } = await admin.from("profiles").select("id").eq("school_name", mySchool).eq("is_public", true).limit(50);
    for (const row of schoolMates ?? []) candidateIds.add(row.id);
  }

  candidateIds.delete(userId);
  for (const id of anyConnectionIds) candidateIds.delete(id);
  for (const id of blockedIds) candidateIds.delete(id);
  if (candidateIds.size === 0) return [];

  const idsArr = [...candidateIds].slice(0, CANDIDATE_POOL_CAP);

  const [profilesRes, candidateConnRes, candidateInterestsRes, candidateSkillsRes] = await Promise.all([
    admin.from("profiles").select("id, display_name, school_name, is_public").in("id", idsArr),
    admin.from("connections").select("requester_id, recipient_id, status").eq("status", "accepted").or(`${orInList("requester_id", idsArr)},${orInList("recipient_id", idsArr)}`),
    admin.from("student_interests").select("user_id, label").in("user_id", idsArr),
    admin.from("skills").select("user_id, name").in("user_id", idsArr),
  ]);

  const candidateAcceptedIds = new Map<string, Set<string>>();
  for (const row of candidateConnRes.data ?? []) {
    if (idsArr.includes(row.requester_id)) {
      const set = candidateAcceptedIds.get(row.requester_id) ?? new Set<string>();
      set.add(row.recipient_id);
      candidateAcceptedIds.set(row.requester_id, set);
    }
    if (idsArr.includes(row.recipient_id)) {
      const set = candidateAcceptedIds.get(row.recipient_id) ?? new Set<string>();
      set.add(row.requester_id);
      candidateAcceptedIds.set(row.recipient_id, set);
    }
  }

  const candidateInterests = new Map<string, string[]>();
  for (const row of candidateInterestsRes.data ?? []) {
    const list = candidateInterests.get(row.user_id) ?? [];
    list.push(row.label);
    candidateInterests.set(row.user_id, list);
  }
  const candidateSkills = new Map<string, string[]>();
  for (const row of candidateSkillsRes.data ?? []) {
    const list = candidateSkills.get(row.user_id) ?? [];
    list.push(row.name);
    candidateSkills.set(row.user_id, list);
  }

  const results: (PYMKResult & { score: number })[] = [];

  for (const profile of profilesRes.data ?? []) {
    if (!profile.is_public) continue;
    if (isExcludedFromPeopleYouMayKnow({ candidateId: profile.id, selfId: userId, hasAnyConnectionRecord: anyConnectionIds.has(profile.id), isBlocked: blockedIds.has(profile.id) })) {
      continue;
    }

    const theirAccepted = candidateAcceptedIds.get(profile.id) ?? new Set<string>();
    const mutualConnectionCount = [...acceptedConnectionIds].filter((id) => theirAccepted.has(id)).length;
    const sameSchool = Boolean(mySchool) && profile.school_name === mySchool;
    const overlappingInterests = (candidateInterests.get(profile.id) ?? []).filter((label) => myInterests.has(label));
    const overlappingSkills = (candidateSkills.get(profile.id) ?? []).filter((name) => mySkills.has(name));

    const score = scorePeopleYouMayKnowCandidate({ mutualConnectionCount, sameSchool, overlappingInterests, overlappingSkills });
    if (!hasAnyPeopleYouMayKnowSignal(score)) continue;

    results.push({ id: profile.id, displayName: profile.display_name, reasons: score.reasons, score: score.score });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ id, displayName, reasons }) => ({ id, displayName, reasons }));
}
