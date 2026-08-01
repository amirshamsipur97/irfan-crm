"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";
import type { CrmContactDocument } from "@/lib/types";

const BOARD_PATH = "/crm/contacts";
const BUCKET = "crm-documents";

/** Columns of the client's demand that the drawer may write. */
const DEMAND_PATCHABLE = new Set([
  "property_type",
  "bedrooms",
  "budget",
  "preferred_area",
  "requirements",
  "notes",
]);

export async function updateDemand(contactId: string, patch: Record<string, unknown>) {
  const entries = Object.entries(patch).filter(([k]) => DEMAND_PATCHABLE.has(k));
  if (entries.length === 0) return { error: "nothing to update" };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_contacts")
    .update(Object.fromEntries(entries), { count: "exact" })
    .eq("id", contactId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function listDocuments(contactId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_contact_documents")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .returns<CrmContactDocument[]>();
  return data ?? [];
}

/**
 * Record a file that the browser has already put in the private bucket.
 * The upload itself goes straight from the browser to storage so large scans
 * never travel through a server action.
 */
export async function registerDocument(input: {
  contactId: string;
  name: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  docType: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data, error } = await supabase
    .from("crm_contact_documents")
    .insert({
      contact_id: input.contactId,
      name: input.name,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      doc_type: input.docType,
      uploaded_by: user.id,
    })
    .select("*")
    .single<CrmContactDocument>();
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return { document: data };
}

/**
 * Short-lived link to a private document. Identity papers are never public —
 * the bucket has no anonymous read, so this is the only way to open one.
 */
export async function documentUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 5);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

export async function deleteDocument(documentId: string, storagePath: string) {
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("crm_contact_documents")
    .delete({ count: "exact" })
    .eq("id", documentId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };

  // the row is the source of truth; a leftover object would just be orphaned
  await supabase.storage.from(BUCKET).remove([storagePath]);
  revalidatePath(BOARD_PATH);
  return {};
}
