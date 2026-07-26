"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, SERVICE_KEY_MISSING } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/temp-password";
import { sendTempPasswordEmail } from "@/lib/send-temp-password";
import { isFullAccess } from "@/lib/permissions";
import type { CrmRole, CrmUser } from "@/lib/types";

const PAGE = "/crm/team";
const ROLES: CrmRole[] = ["developer", "ceo", "media", "manager", "agent", "finance"];

/**
 * Approve a pending signup: issue a one-time temporary password, activate the
 * account, and mark it so the app forces a real password at first sign-in.
 *
 * The temporary password is returned to the approving admin as well as emailed,
 * so onboarding still works when mail delivery is not configured yet — that is
 * the only place it is ever readable, and it stops working the moment the new
 * member sets their own.
 */
export async function approveMember(userId: string, role?: CrmRole) {
  if (role && !ROLES.includes(role)) return { error: "invalid role" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  // the service-role client below ignores RLS, so the tier check is ours to make
  const { data: me } = await supabase
    .from("crm_users")
    .select("role")
    .eq("id", user.id)
    .single<{ role: CrmRole }>();
  if (!me || !isFullAccess(me.role))
    return { error: "Only a Developer or CEO can approve members." };

  const { data: target } = await supabase
    .from("crm_users")
    .select("id, email, full_name, is_active, requested_role")
    .eq("id", userId)
    .single<Pick<CrmUser, "id" | "email" | "full_name" | "is_active" | "requested_role">>();
  if (!target) return { error: "That account no longer exists." };

  const admin = createAdminClient();
  if (!admin) return { error: SERVICE_KEY_MISSING };

  const tempPassword = generateTempPassword();

  // set the password and confirm the address in one call — an approved member
  // should not also have to hunt for the original confirmation mail
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    password: tempPassword,
    email_confirm: true,
  });
  if (authError) return { error: authError.message };

  const { error: profileError } = await admin
    .from("crm_users")
    .update({
      is_active: true,
      must_change_password: true,
      approved_at: new Date().toISOString(),
      ...(role ? { role, requested_role: null } : {}),
    })
    .eq("id", userId);
  if (profileError) return { error: profileError.message };

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
