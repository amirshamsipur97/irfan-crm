"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BOARD_PATH = "/crm/products";

/** whitelist of directly patchable crm_products columns */
const PATCHABLE = new Set([
  "name",
  "owner_id",
  "status",
  "price",
  "billing",
  "sku",
  "description",
]);

export async function addProduct(groupId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data, error } = await supabase
    .from("crm_products")
    .insert({
      name: name.trim() || "New product",
      group_id: groupId,
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}

export async function updateProduct(productId: string, patch: Record<string, unknown>) {
  const entries = Object.entries(patch).filter(([k]) => PATCHABLE.has(k));
  if (entries.length === 0) return { error: "nothing to update" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_products")
    .update(Object.fromEntries(entries))
    .eq("id", productId);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function addProductGroup(name: string, color: string) {
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("crm_product_groups")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const { data, error } = await supabase
    .from("crm_product_groups")
    .insert({ name, color, position: (last?.position ?? -1) + 1 })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { id: data.id };
}

export async function renameProductGroup(groupId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_product_groups")
    .update({ name: name.trim() || "New Group" })
    .eq("id", groupId);
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function setProductGroupCollapsed(groupId: string, collapsed: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_product_groups")
    .update({ is_collapsed: collapsed })
    .eq("id", groupId);
  if (error) return { error: error.message };
  return {};
}
