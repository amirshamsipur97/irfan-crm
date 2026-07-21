import type { CrmRole, CrmUser } from "@/lib/types";

/**
 * Role matrix (mirrors the RLS helper functions — keep the two in sync):
 *   developer — full system control incl. role management and deletes
 *   ceo       — full business access (operations + finance + team management)
 *   media     — media-team admin: edits ALL operational boards, NO finance
 *   manager   — same operational tier as media (sales management)
 *   agent     — team-read, owner-edit, no finance
 *   finance   — financial data + team-read of operations
 */
export const FULL_ROLES: CrmRole[] = ["developer", "ceo"];
export const MANAGE_ROLES: CrmRole[] = ["developer", "ceo", "media", "manager"];
export const FINANCE_ROLES: CrmRole[] = ["developer", "ceo", "finance"];

export const ROLE_LABELS: Record<CrmRole, string> = {
  developer: "Developer",
  ceo: "CEO",
  media: "Media Admin",
  manager: "Sales Manager",
  agent: "Agent",
  finance: "Finance",
};

/** Full tier: team management, deletes, settings. */
export function isFullAccess(role: CrmRole): boolean {
  return FULL_ROLES.includes(role);
}

/** Operational tier: may edit every row on the work boards. */
export function canManageBoards(role: CrmRole): boolean {
  return MANAGE_ROLES.includes(role);
}

/** Financial tier: transactions, payments, commissions, Finance page. */
export function canViewFinance(role: CrmRole): boolean {
  return FINANCE_ROLES.includes(role);
}

/**
 * Row-level edit check for the boards (mirrors the RLS UPDATE policies:
 * manage tier OR owner OR creator) so the UI can block and explain edits
 * the database would silently reject.
 */
export function canEditRow(
  profile: CrmUser,
  row: { owner_id?: string | null; created_by?: string | null }
): boolean {
  if (canManageBoards(profile.role)) return true;
  return row.owner_id === profile.id || row.created_by === profile.id;
}

export const OWNER_ONLY_MESSAGE = "Only the item's owner can edit it";
