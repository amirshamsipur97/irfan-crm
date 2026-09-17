"use server";

import { createClient } from "@/lib/supabase/server";

/** What the duplicate-phone popup needs after the guard refused a save. */
export type DuplicatePhoneInfo = {
  attemptId: string;
  boardLabel: string;
  ownerName: string;
  isOwn: boolean;
};

export type CollaborationRow = {
  id: string;
  entity_table: "crm_leads" | "crm_contacts";
  entity_id: string;
  entity_name: string | null;
  phone: string | null;
  owner_id: string | null;
  requester_id: string;
  message: string | null;
  agreement_version: string;
  signature_name: string;
  signed_at: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  responded_by: string | null;
  responded_at: string | null;
  response_note: string | null;
  created_at: string;
};

export type DuplicateAttemptRow = {
  id: string;
  attempted_by: string;
  board: "leads" | "contacts";
  phone: string;
  existing_table: "crm_leads" | "crm_contacts";
  existing_id: string;
  existing_name: string | null;
  existing_owner_id: string | null;
  collaboration_id: string | null;
  created_at: string;
};

export type SharedClient = {
  collaboration_id: string;
  entity_table: "crm_leads" | "crm_contacts";
  entity_id: string;
  name: string | null;
  phone: string | null;
  country_code: string | null;
  email: string | null;
  temperature: string | null;
  owner_name: string | null;
};

/**
 * Record a duplicate-number attempt (admins are alerted by the database) and
 * return who holds the number. Only the owner's name and board are returned,
 * which is what the guard's own message already says.
 */
export async function reportDuplicatePhone(input: {
  board: "leads" | "contacts";
  rowId: string;
  countryCode: string | null;
  phone: string | null;
}): Promise<DuplicatePhoneInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crm_report_duplicate_phone", {
    p_board: input.board,
    p_row_id: input.rowId,
    p_country_code: input.countryCode,
    p_phone: input.phone,
  });
  if (error || !data) return null;
  const d = data as { attempt_id: string; board_label: string; owner_name: string; is_own: boolean };
  return { attemptId: d.attempt_id, boardLabel: d.board_label, ownerName: d.owner_name, isOwn: d.is_own };
}

/**
 * The shared path for board saves: when the duplicate-phone guard refused an
 * update, work out the phone the row would have had and report the attempt.
 */
export async function duplicateFromGuardError(
  board: "leads" | "contacts",
  rowId: string,
  patch: Record<string, unknown>,
  error: { code?: string; message: string }
): Promise<DuplicatePhoneInfo | null> {
  if (error.code !== "23505" || !error.message.includes("already registered")) return null;
  if (!("phone" in patch) && !("country_code" in patch)) return null;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from(board === "leads" ? "crm_leads" : "crm_contacts")
    .select("phone, country_code")
    .eq("id", rowId)
    .maybeSingle<{ phone: string | null; country_code: string | null }>();
  return reportDuplicatePhone({
    board,
    rowId,
    phone: ("phone" in patch ? (patch.phone as string | null) : row?.phone) ?? null,
    countryCode: ("country_code" in patch ? (patch.country_code as string | null) : row?.country_code) ?? null,
  });
}

export async function requestCollaboration(input: {
  attemptId: string;
  message: string;
  signature: string;
  agreed: boolean;
}): Promise<{ error?: string; already?: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crm_request_collaboration", {
    p_attempt_id: input.attemptId,
    p_message: input.message,
    p_signature: input.signature,
    p_agreed: input.agreed,
  });
  if (error) return { error: error.message };
  const d = (data ?? {}) as { error?: string; already?: boolean };
  return d.error ? { error: d.error } : { already: d.already };
}

export async function respondCollaboration(id: string, accept: boolean, note: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crm_respond_collaboration", { p_id: id, p_accept: accept, p_note: note });
  if (error) return { error: error.message };
  const d = (data ?? {}) as { error?: string };
  return d.error ? { error: d.error } : {};
}

export async function cancelCollaboration(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crm_cancel_collaboration", { p_id: id });
  if (error) return { error: error.message };
  const d = (data ?? {}) as { error?: string };
  return d.error ? { error: d.error } : {};
}

/** Everything the Collaboration page shows; RLS limits it to the caller's own unless admin. */
export async function listCollaborationData(): Promise<{
  collaborations: CollaborationRow[];
  attempts: DuplicateAttemptRow[];
  shared: SharedClient[];
}> {
  const supabase = await createClient();
  const [{ data: collaborations }, { data: attempts }, { data: shared }] = await Promise.all([
    supabase
      .from("crm_collaborations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<CollaborationRow[]>(),
    supabase
      .from("crm_phone_duplicate_attempts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<DuplicateAttemptRow[]>(),
    supabase.rpc("crm_collaboration_clients").returns<SharedClient[]>(),
  ]);
  return { collaborations: collaborations ?? [], attempts: attempts ?? [], shared: (shared as SharedClient[]) ?? [] };
}

/** Sidebar badge: requests waiting for an answer (to me; every pending one for admins). */
export async function countPendingCollaborations(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data: me } = await supabase
    .from("crm_users")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle<{ role: string; is_active: boolean }>();
  if (!me?.is_active) return 0;
  let q = supabase.from("crm_collaborations").select("id", { count: "exact", head: true }).eq("status", "pending");
  if (!["developer", "ceo"].includes(me.role)) q = q.eq("owner_id", user.id);
  const { count } = await q;
  return count ?? 0;
}
