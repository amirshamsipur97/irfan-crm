"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  CrmActivityItem,
  CrmDeal,
  CrmOfferFloorPlan,
  CrmOfferTracking,
} from "@/lib/types";

type JoinedDeal = CrmDeal & { stage: { name: string; color: string } | null };

/** One line of the drawer's Latest activity — synthesized from real events. */
export type ContactFeedItem = {
  id: string;
  name: string;
  start_at: string | null;
  created_at: string;
};

const TRACKING_LABEL: Record<string, string> = {
  call: "Call logged",
  meeting: "Meeting logged",
  viewing: "Viewing logged",
  email: "Email logged",
  document: "Document logged",
  note: "Note added",
};

/** Everything the contact drawer shows, in one round trip. */
export async function getContactRelations(contactId: string) {
  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("crm_contacts")
    .select("name")
    .eq("id", contactId)
    .maybeSingle<{ name: string }>();

  const [{ data: dealsById }, { data: dealsByName }, { data: activities }, { data: documents }] =
    await Promise.all([
      supabase
        .from("crm_deals")
        .select("*, stage:crm_deal_stages(name, color)")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false }),
      contact?.name
        ? supabase
            .from("crm_deals")
            .select("*, stage:crm_deal_stages(name, color)")
            .ilike("contact_name", contact.name.trim())
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      contact?.name
        ? supabase
            .from("crm_activity_items")
            .select("*")
            .eq("related_item", contact.name)
            .order("created_at", { ascending: false })
            .limit(20)
            .returns<CrmActivityItem[]>()
        : Promise.resolve({ data: [] as CrmActivityItem[] }),
      supabase
        .from("crm_contact_documents")
        .select("id, name, doc_type, created_at")
        .eq("contact_id", contactId)
        .returns<{ id: string; name: string; doc_type: string | null; created_at: string }[]>(),
    ]);

  // merge FK matches + display-name matches (Phase 1 keeps FK as truth, names as cache)
  const seen = new Set<string>();
  const deals: JoinedDeal[] = [];
  for (const d of [...((dealsById ?? []) as unknown as JoinedDeal[]), ...((dealsByName ?? []) as unknown as JoinedDeal[])]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    deals.push(d);
  }

  // the offers' satellites need the merged deal ids, so they go second
  const dealIds = deals.map((d) => d.id);
  const [{ data: tracking }, { data: floorPlans }] = dealIds.length
    ? await Promise.all([
        supabase
          .from("crm_offer_tracking")
          .select("id, deal_id, entry_type, note, entry_date, created_at")
          .in("deal_id", dealIds)
          .returns<Pick<CrmOfferTracking, "id" | "deal_id" | "entry_type" | "note" | "entry_date" | "created_at">[]>(),
        supabase
          .from("crm_offer_floor_plans")
          .select("*")
          .in("deal_id", dealIds)
          .order("created_at")
          .returns<CrmOfferFloorPlan[]>(),
      ])
    : [{ data: [] as Pick<CrmOfferTracking, "id" | "deal_id" | "entry_type" | "note" | "entry_date" | "created_at">[] }, { data: [] as CrmOfferFloorPlan[] }];

  // Latest activity = what actually happened, merged chronologically:
  // offers created/accepted/finished, follow-ups, documents, floor plans.
  const feed: ContactFeedItem[] = [];
  for (const d of deals) {
    feed.push({ id: `offer-${d.id}`, name: `Offer created — ${d.name}`, start_at: null, created_at: d.created_at });
    if (d.accepted_at)
      feed.push({ id: `deal-${d.id}`, name: `Moved to deal — ${d.name}`, start_at: null, created_at: d.accepted_at });
    if (d.downpayment_completed_at)
      feed.push({ id: `dp-${d.id}`, name: `Downpayment completed — ${d.name}`, start_at: null, created_at: d.downpayment_completed_at });
    if (d.invoice_sent_at)
      feed.push({ id: `inv-${d.id}`, name: `Invoice sent — ${d.name}`, start_at: null, created_at: d.invoice_sent_at });
  }
  for (const t of tracking ?? []) {
    const label = TRACKING_LABEL[t.entry_type] ?? "Follow-up";
    feed.push({
      id: `trk-${t.id}`,
      name: t.note ? `${label} — ${t.note.length > 60 ? `${t.note.slice(0, 60)}…` : t.note}` : label,
      start_at: t.entry_date,
      created_at: t.created_at,
    });
  }
  for (const doc of documents ?? []) {
    feed.push({ id: `doc-${doc.id}`, name: `Document uploaded — ${doc.name}`, start_at: null, created_at: doc.created_at });
  }
  for (const fp of floorPlans ?? []) {
    feed.push({ id: `fp-${fp.id}`, name: `Floor plan sent — ${fp.file_name}`, start_at: null, created_at: fp.created_at });
  }
  for (const a of activities ?? []) {
    feed.push({ id: a.id, name: a.name, start_at: a.start_at, created_at: a.created_at });
  }
  feed.sort((a, b) =>
    (b.start_at ?? b.created_at).localeCompare(a.start_at ?? a.created_at)
  );

  return {
    deals: deals.map((d) => ({
      ...d,
      stage_name: d.stage?.name ?? null,
      stage_color: d.stage?.color ?? null,
    })),
    activities: feed.slice(0, 15),
    floorPlans: floorPlans ?? [],
  };
}
