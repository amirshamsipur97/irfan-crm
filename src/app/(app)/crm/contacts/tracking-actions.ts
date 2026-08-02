"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";
import type { CrmOfferFloorPlan, CrmOfferTracking, OfferTrackingType } from "@/lib/types";

const ENTRY_TYPES: OfferTrackingType[] = [
  "note",
  "call",
  "meeting",
  "email",
  "viewing",
  "document",
];

const BOARD_PATH = "/crm/contacts";
const BUCKET = "crm-documents";

/** Every tracking entry for the given offers, oldest first (timeline order). */
export async function listTracking(dealIds: string[]) {
  if (dealIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    // the author rides along so the card can show who logged it
    .from("crm_offer_tracking")
    .select("*, author:created_by(full_name, avatar_url)")
    .in("deal_id", dealIds)
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<CrmOfferTracking[]>();
  return data ?? [];
}

/**
 * Add a follow-up entry. The file (if any) is already in the private bucket —
 * the browser uploads it directly, so a big scan never travels through here.
 */
export async function addTrackingEntry(input: {
  dealId: string;
  entryType: OfferTrackingType;
  durationMin: number | null;
  entryDate: string;
  note: string;
  remindAt: string | null;
  file: { name: string; storagePath: string; mimeType: string | null; sizeBytes: number | null } | null;
}) {
  if (!input.note.trim()) return { error: "Write something for this follow-up." };
  if (!ENTRY_TYPES.includes(input.entryType)) return { error: "unknown entry type" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data, error } = await supabase
    .from("crm_offer_tracking")
    .insert({
      deal_id: input.dealId,
      entry_type: input.entryType,
      duration_min: input.durationMin,
      entry_date: input.entryDate,
      note: input.note.trim(),
      remind_at: input.remindAt,
      file_name: input.file?.name ?? null,
      storage_path: input.file?.storagePath ?? null,
      mime_type: input.file?.mimeType ?? null,
      size_bytes: input.file?.sizeBytes ?? null,
      created_by: user.id,
    })
    .select("*, author:created_by(full_name, avatar_url)")
    .single<CrmOfferTracking>();
  if (error) return { error: error.message };

  revalidatePath(BOARD_PATH);
  return { entry: data };
}

/** Tick a reminder off (or back on) without touching the note itself. */
export async function setReminderDone(entryId: string, done: boolean) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_offer_tracking")
    .update({ reminder_done: done }, { count: "exact" })
    .eq("id", entryId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function deleteTrackingEntry(entryId: string, storagePath: string | null) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_offer_tracking")
    .delete({ count: "exact" })
    .eq("id", entryId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };

  // the row is the source of truth; a leftover object would just be orphaned
  if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath]);
  revalidatePath(BOARD_PATH);
  return {};
}

/** Short-lived link to a private attachment (the bucket has no public read). */
export async function trackingFileUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 5);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

/**
 * Register a floor plan sent to the client for an offer. The browser has
 * already put the file in the private bucket (same flow as tracking
 * attachments), so only the metadata travels through here.
 */
export async function registerFloorPlan(input: {
  dealId: string;
  name: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data, error } = await supabase
    .from("crm_offer_floor_plans")
    .insert({
      deal_id: input.dealId,
      file_name: input.name,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      created_by: user.id,
    })
    .select("*")
    .single<CrmOfferFloorPlan>();
  if (error) return { error: error.message };

  revalidatePath(BOARD_PATH);
  return { plan: data };
}

export async function deleteFloorPlan(planId: string, storagePath: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_offer_floor_plans")
    .delete({ count: "exact" })
    .eq("id", planId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };

  await supabase.storage.from(BUCKET).remove([storagePath]);
  revalidatePath(BOARD_PATH);
  return {};
}
