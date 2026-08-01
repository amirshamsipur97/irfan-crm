"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";
import { generateTempPassword } from "@/lib/temp-password";
import { sendTempPasswordEmail } from "@/lib/send-temp-password";
import type { CrmRole, CrmUser } from "@/lib/types";

const PAGE = "/crm/team";
const ROLES: CrmRole[] = ["developer", "ceo", "media", "manager", "agent", "finance"];

/**
 * Approve a pending signup: issue a one-time temporary password, activate the
 * account, and mark it so the app forces a real password at first sign-in.
 *
 * The heavy lifting happens in the crm_approve_member RPC (security definer,
 * admin-gated in the database), so no service-role key is needed. The
 * temporary password is returned to the approving admin as well as emailed,
 * so onboarding still works when mail delivery is not configured yet — that is
 * the only place it is ever readable, and it stops working the moment the new
 * member sets their own.
 */
export async function approveMember(userId: string, role?: CrmRole) {
  if (role && !ROLES.includes(role)) return { error: "invalid role" };

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("crm_users")
    .select("id, email, full_name, is_active, requested_role")
    .eq("id", userId)
    .single<Pick<CrmUser, "id" | "email" | "full_name" | "is_active" | "requested_role">>();
  if (!target) return { error: "That account no longer exists." };

  const tempPassword = generateTempPassword();

  const { data, error } = await supabase.rpc("crm_approve_member", {
    p_user_id: userId,
    p_password: tempPassword,
    p_role: role ?? null,
  });
  if (error) return { error: error.message };
  const approved = (data ?? {}) as { ok?: boolean; error?: string };
  if (approved.error || !approved.ok)
    return { error: approved.error ?? "approval failed" };

  const mail = await sendTempPasswordEmail({
    to: target.email,
    fullName: target.full_name,
    tempPassword,
  });

  revalidatePath(PAGE);
  revalidatePath("/admin");
  return { tempPassword, emailed: mail.sent, emailError: mail.error };
}

/** Role changes are additionally enforced by the DB privilege-guard trigger. */
export async function updateMemberRole(userId: string, role: CrmRole) {
  if (!ROLES.includes(role)) return { error: "invalid role" };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_users")
    .update({ role, requested_role: null }, { count: "exact" })
    .eq("id", userId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(PAGE);
  return {};
}

export async function setMemberActive(userId: string, isActive: boolean) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_users")
    .update({ is_active: isActive }, { count: "exact" })
    .eq("id", userId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(PAGE);
  return {};
}

export async function createInvite(email: string, fullName: string, role: CrmRole) {
  if (!ROLES.includes(role)) return { error: "invalid role" };
  const clean = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return { error: "invalid email" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: existing } = await supabase
    .from("crm_users")
    .select("id")
    .ilike("email", clean)
    .maybeSingle<{ id: string }>();
  if (existing) return { error: "This email is already a member" };

  const { data, error } = await supabase
    .from("crm_invites")
    .insert({
      email: clean,
      full_name: fullName.trim(),
      role,
      invited_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return { error: error.message };
  revalidatePath(PAGE);
  return { id: data.id };
}

export async function deleteInvite(inviteId: string) {
  const supabase = await createClient();
  const { error, count } = await supabase.from("crm_invites").delete({ count: "exact" }).eq("id", inviteId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(PAGE);
  return {};
}
