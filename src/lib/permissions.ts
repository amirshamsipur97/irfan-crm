import type { CrmUser } from "@/lib/types";

/**
 * Phase-1 permission model: team-read, owner-edit.
 * Mirrors the RLS UPDATE policies (admin OR owner OR creator) so the UI can
 * block and explain edits the database would silently reject.
 */
export function canEditRow(
  profile: CrmUser,
  row: { owner_id?: string | null; created_by?: string | null }
): boolean {
  if (profile.role === "admin") return true;
  return row.owner_id === profile.id || row.created_by === profile.id;
}

export const OWNER_ONLY_MESSAGE = "Only the item's owner can edit it";
