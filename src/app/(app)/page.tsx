import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { HomeView, type HomeData } from "@/components/home/HomeView";

function compactMoney(value: number, currency = "OMR"): string {
  return `${new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)} ${currency}`;
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Home — every number on this page is live and follows the product's real
 * funnel: leads → contacts (demand) → offers → accepted deals → downpayment.
 * (The old version summed LEAD budgets by lead stage and called it a deal
 * pipeline — believable-looking numbers that measured nothing.)
 */
export default async function HomePage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient()]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [
    { data: offers },
    { data: parts },
    { data: leads },
    { data: viewings },
    { data: reg },
    { data: layoutRow },
    { count: accountsTotal },
    { count: accountsContacted },
    { count: contactsTotal },
    { count: contactsEngaged },
  ] = await Promise.all([
    supabase
      .from("crm_deals")
      .select("id, deal_value, accepted_at, downpayment_amount, downpayment_completed_at, invoice_sent_at")
      .returns<
        {
          id: string;
          deal_value: number | null;
          accepted_at: string | null;
          downpayment_amount: number | null;
          downpayment_completed_at: string | null;
          invoice_sent_at: string | null;
        }[]
      >(),
    supabase.from("crm_deal_downpayments").select("deal_id, amount").returns<
      { deal_id: string; amount: number }[]
    >(),
    supabase
      .from("crm_leads")
      .select("id, lead_source, converted_contact_id, created_at")
      .eq("is_archived", false)
      .returns<
        {
          id: string;
          lead_source: string | null;
          converted_contact_id: string | null;
          created_at: string;
        }[]
      >(),
    supabase
      .from("crm_viewings")
      .select("id, name, contact_name, scheduled_start, status")
      .gte("scheduled_start", new Date().toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(5)
      .returns<
        {
          id: string;
          name: string;
          contact_name: string | null;
          scheduled_start: string | null;
          status: string | null;
        }[]
      >(),
    supabase
      .from("crm_registration_settings")
      .select("default_currency")
      .maybeSingle<{ default_currency: string }>(),
    supabase
      .from("crm_home_layout")
      .select("sections")
      .eq("user_id", profile.id)
      .maybeSingle<{ sections: string[] }>(),
    supabase.from("crm_accounts").select("id", { count: "exact", head: true }),
    supabase
      .from("crm_accounts")
      .select("id", { count: "exact", head: true })
      .gte("last_interaction_at", monthStart.toISOString()),
    supabase.from("crm_contacts").select("id", { count: "exact", head: true }),
    supabase
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .gte("last_interaction_at", monthStart.toISOString()),
  ]);

  const currency = reg?.default_currency ?? "OMR";
  const allOffers = offers ?? [];
  const openOffers = allOffers.filter((o) => !o.accepted_at);
  const deals = allOffers.filter((o) => o.accepted_at);

  const openOffersValue = openOffers.reduce((s, o) => s + (Number(o.deal_value) || 0), 0);
  const dealsValue = deals.reduce((s, o) => s + (Number(o.deal_value) || 0), 0);

  const dealIds = new Set(deals.map((d) => d.id));
  const dpTarget = deals.reduce((s, d) => s + (Number(d.downpayment_amount) || 0), 0);
  const dpCollected = (parts ?? [])
    .filter((p) => dealIds.has(p.deal_id))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const invoicesPending = deals.filter(
    (d) => d.downpayment_completed_at && !d.invoice_sent_at
  ).length;

  const allLeads = leads ?? [];
  const leads30d = allLeads.filter((l) => l.created_at >= thirtyDaysAgo);
  const sourceCounts = new Map<string, number>();
  for (const l of leads30d) {
    const key = l.lead_source?.trim() || "No source";
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }
  const leadSources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([source, count]) => ({ source, count }));

  const now = new Date();
  const data: HomeData = {
    firstName: (profile.full_name || profile.email).split(/\s+/)[0],
    fullName: profile.full_name || profile.email,
    avatarUrl: profile.avatar_url,
    dateLabel: now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    greeting: greetingFor(now.getHours()),
    openOffersValueLabel: compactMoney(openOffersValue, currency),
    openOffersChip: `${openOffers.length} open offer${openOffers.length === 1 ? "" : "s"}`,
    dealsValueLabel: compactMoney(dealsValue, currency),
    dealsChip: `${deals.length} accepted deal${deals.length === 1 ? "" : "s"}`,
    dpCollectedLabel: compactMoney(dpCollected, currency),
    dpChip:
      dpTarget > 0
        ? `${Math.min(100, Math.round((dpCollected / dpTarget) * 100))}% of ${compactMoney(dpTarget, currency)}`
        : "no downpayments yet",
    invoicesPending,
    leadsNewCount: leads30d.length,
    leadsConvertedCount: allLeads.filter((l) => l.converted_contact_id).length,
    leadSources,
    viewingsUpcoming: (viewings ?? []).map((v) => ({
      id: v.id,
      name: v.contact_name || v.name,
      when: v.scheduled_start,
      status: v.status,
    })),
    accountsTotal: accountsTotal ?? 0,
    accountsContacted: accountsContacted ?? 0,
    contactsTotal: contactsTotal ?? 0,
    contactsEngaged: contactsEngaged ?? 0,
  };

  return <HomeView data={data} layout={layoutRow?.sections ?? null} />;
}
