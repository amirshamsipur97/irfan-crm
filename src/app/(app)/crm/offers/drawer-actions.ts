"use server";

import { revalidatePath } from "next/cache";
import { PERMISSION_ERROR } from "@/lib/mutate";
import { createClient } from "@/lib/supabase/server";
import type {
  CrmActivityItem,
  CrmOffer,
  CrmPropertyInterest,
  CrmReservation,
  CrmViewing,
} from "@/lib/types";

const BOARD_PATH = "/crm/offers";

/** The person an offer is for — shown in the drawer, never edited there. */
export interface DrawerClient {
  code: string | null;
  name: string;
  country: string | null;
  gender: string | null;
  age: number | null;
  /** how hot the client is — set on the lead, carried by the conversion */
  temperature: string | null;
  email: string | null;
  phone: string | null;
  country_code: string | null;
}

/** Everything the deal drawer shows, in one round trip. */
export async function getDealRelations(dealId: string) {
  const supabase = await createClient();

  const [{ data: interests }, { data: offers }, { data: reservations }, { data: viewings }, { data: deal }] =
    await Promise.all([
      supabase
        .from("crm_property_interests")
        .select("*, unit:crm_units(name, development_name)")
        .eq("deal_id", dealId)
        .order("created_at"),
      supabase.from("crm_offers").select("*").eq("deal_id", dealId).order("created_at").returns<CrmOffer[]>(),
      supabase
        .from("crm_reservations")
        .select("*, unit:crm_units(name)")
        .eq("deal_id", dealId)
        .order("created_at"),
      supabase
        .from("crm_viewings")
        .select("*")
        .eq("deal_id", dealId)
        .order("scheduled_start", { ascending: true, nullsFirst: false })
        .returns<CrmViewing[]>(),
      supabase
        // the client rides along so the drawer can show who this offer is for
        .from("crm_deals")
        .select("name, contact_name, contact:contact_id(code, name, country, gender, age, temperature, email, phone, country_code)")
        .eq("id", dealId)
        .maybeSingle<{
          name: string;
          contact_name: string | null;
          contact: DrawerClient | null;
        }>(),
    ]);

  const { data: activities } = deal
    ? await supabase
        .from("crm_activity_items")
        .select("*")
        .eq("related_item", deal.name)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<CrmActivityItem[]>()
    : { data: [] as CrmActivityItem[] };

  type JoinedInterest = CrmPropertyInterest & {
    unit: { name: string; development_name: string | null } | null;
  };
  type JoinedReservation = CrmReservation & { unit: { name: string } | null };

  return {
    interests: ((interests ?? []) as unknown as JoinedInterest[]).map((i) => ({
      ...i,
      unit_name: i.unit?.name ?? null,
      development_name: i.unit?.development_name ?? null,
    })),
    offers: offers ?? [],
    reservations: ((reservations ?? []) as unknown as JoinedReservation[]).map((r) => ({
      ...r,
      unit_name: r.unit?.name ?? null,
    })),
    viewings: viewings ?? [],
    activities: activities ?? [],
    client: (deal?.contact ?? null) as DrawerClient | null,
  };
}

/** Shortlist a unit on a deal (property interest). */
export async function addDealInterest(dealId: string, unitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: deal } = await supabase
    .from("crm_deals")
    .select("contact_id")
    .eq("id", dealId)
    .maybeSingle<{ contact_id: string | null }>();

  const { error } = await supabase.from("crm_property_interests").insert({
    deal_id: dealId,
    contact_id: deal?.contact_id ?? null,
    unit_id: unitId,
    status: "shortlisted",
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function setInterestStatus(
  interestId: string,
  status: "active" | "shortlisted" | "rejected"
) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_property_interests")
    .update({ status }, { count: "exact" })
    .eq("id", interestId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function addDealOffer(dealId: string, amount: number, unitId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: deal } = await supabase
    .from("crm_deals")
    .select("contact_id")
    .eq("id", dealId)
    .maybeSingle<{ contact_id: string | null }>();

  const { error } = await supabase.from("crm_offers").insert({
    deal_id: dealId,
    contact_id: deal?.contact_id ?? null,
    unit_id: unitId,
    amount,
    status: "submitted",
    submitted_at: new Date().toISOString(),
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  return {};
}

export async function setOfferStatus(offerId: string, status: string) {
  const supabase = await createClient();
  const { error, count } = await supabase.from("crm_offers").update({ status }, { count: "exact" }).eq("id", offerId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  return {};
}

/**
 * Reserve a unit for a deal. The DB enforces one pending/active reservation
 * per unit (partial unique index) and flips the unit to "reserved".
 */
export async function createDealReservation(dealId: string, unitId: string, amount: number | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: deal } = await supabase
    .from("crm_deals")
    .select("contact_id")
    .eq("id", dealId)
    .maybeSingle<{ contact_id: string | null }>();

  const { error } = await supabase.from("crm_reservations").insert({
    deal_id: dealId,
    contact_id: deal?.contact_id ?? null,
    unit_id: unitId,
    amount,
    status: "active",
    created_by: user.id,
  });
  if (error) {
    if (error.code === "23505") return { error: "This unit already has an active reservation" };
    return { error: error.message };
  }
  revalidatePath(BOARD_PATH);
  revalidatePath("/crm/units");
  return {};
}

export async function cancelDealReservation(reservationId: string, reason: string) {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_reservations")
    .update({ status: "cancelled", cancellation_reason: reason.trim() || "cancelled" }, { count: "exact" })
    .eq("id", reservationId);
  if (error) return { error: error.message };
  if (!count) return { error: PERMISSION_ERROR };
  revalidatePath(BOARD_PATH);
  revalidatePath("/crm/units");
  return {};
}

/** Quick-add a viewing linked to this deal. */
export async function addDealViewing(dealId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data: deal } = await supabase
    .from("crm_deals")
    .select("name, contact_name")
    .eq("id", dealId)
    .maybeSingle<{ name: string; contact_name: string | null }>();
  if (!deal) return { error: "deal not found" };

  const { data: group } = await supabase
    .from("crm_viewing_groups")
    .select("id")
    .order("position")
    .limit(1)
    .maybeSingle<{ id: string }>();

  const { error } = await supabase.from("crm_viewings").insert({
    name: `Viewing — ${deal.name}`,
    group_id: group?.id ?? null,
    agent_id: user.id,
    deal_name: deal.name,
    contact_name: deal.contact_name,
    status: "requested",
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(BOARD_PATH);
  revalidatePath("/crm/viewings");
  return {};
}
