"use server";

import { createClient } from "@/lib/supabase/server";
import type { CrmActivityItem, CrmDeal, CrmPropertyInterest } from "@/lib/types";

type JoinedDeal = CrmDeal & { stage: { name: string; color: string } | null };

/** Everything the contact drawer shows, in one round trip. */
export async function getContactRelations(contactId: string) {
  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("crm_contacts")
    .select("name")
    .eq("id", contactId)
    .maybeSingle<{ name: string }>();

  const [{ data: dealsById }, { data: dealsByName }, { data: interests }, { data: activities }] =
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
      supabase
        .from("crm_property_interests")
        .select("*, unit:crm_units(name, development_name)")
        .eq("contact_id", contactId)
        .order("created_at"),
      contact?.name
        ? supabase
            .from("crm_activity_items")
            .select("*")
            .eq("related_item", contact.name)
            .order("created_at", { ascending: false })
            .limit(20)
            .returns<CrmActivityItem[]>()
        : Promise.resolve({ data: [] as CrmActivityItem[] }),
    ]);

  // merge FK matches + display-name matches (Phase 1 keeps FK as truth, names as cache)
  const seen = new Set<string>();
  const deals: JoinedDeal[] = [];
  for (const d of [...((dealsById ?? []) as unknown as JoinedDeal[]), ...((dealsByName ?? []) as unknown as JoinedDeal[])]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    deals.push(d);
  }

  type JoinedInterest = CrmPropertyInterest & {
    unit: { name: string; development_name: string | null } | null;
  };

  return {
    deals: deals.map((d) => ({
      ...d,
      stage_name: d.stage?.name ?? null,
      stage_color: d.stage?.color ?? null,
    })),
    interests: ((interests ?? []) as unknown as JoinedInterest[]).map((i) => ({
      ...i,
      unit_name: i.unit?.name ?? null,
      development_name: i.unit?.development_name ?? null,
    })),
    activities: activities ?? [],
  };
}
