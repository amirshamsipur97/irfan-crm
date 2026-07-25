"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";
import type { CrmRole } from "@/lib/types";

const PAGE = "/crm/team";
const ROLES: CrmRole[] = ["developer", "ceo", "media", "manager", "agent", "finance"];

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
