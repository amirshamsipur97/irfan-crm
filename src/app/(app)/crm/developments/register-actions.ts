"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RegisterImportResult = {
  developers_added: number;
  developers_updated: number;
  projects_added: number;
  projects_updated: number;
};

/**
 * Pull the property register (irfaninvest.com developers + projects) into the
 * CRM: every developer company becomes an Account, every project becomes a
 * Development under it. Safe to run again — rows are matched by their register
 * id, then by name, so nothing is duplicated and an existing row is adopted.
 */
export async function importPropertyRegister(): Promise<{ error?: string; result?: RegisterImportResult }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crm_import_property_register");
  if (error) return { error: error.message };
  const d = (data ?? {}) as RegisterImportResult & { error?: string };
  if (d.error) return { error: d.error };
  revalidatePath("/crm/accounts");
  revalidatePath("/crm/developments");
  return { result: d };
}
