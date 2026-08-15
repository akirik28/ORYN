import "server-only";

import { notFound } from "next/navigation";
import { getCurrentProfile } from "./dal";

/** Admin routes 404 rather than redirect for non-admins — doesn't reveal that an admin
 * panel exists at all to a normal user poking at URLs. */
export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) {
    notFound();
  }
  return profile;
}
