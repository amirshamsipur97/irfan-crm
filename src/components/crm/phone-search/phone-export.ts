import type { PhoneHit } from "@/app/(app)/crm/phone-search/actions";
import type { XlsxSheet } from "@/lib/xlsx";
import type { CrmUser } from "@/lib/types";
import { isDateOnly, toLocalDateString } from "@/components/crm/activities/activities-config";
import { temperatureLabel } from "@/lib/person-fields";

/** A stored day stays that day; a timestamp becomes the local (Muscat) day. */
function day(value: string | null): string | null {
  if (!value) return null;
  return isDateOnly(value) ? value.trim() : toLocalDateString(value);
}

/** The "Numbers" sheet: exactly the rows the Phone search page is showing. */
export function phoneSheet(hits: PhoneHit[], userById: Map<string, CrmUser>): XlsxSheet {
  return {
    name: "Numbers",
    columns: [
      { header: "Client", width: 26 },
      { header: "Board", width: 10 },
      { header: "Country code", width: 12 },
      { header: "Phone", width: 18 },
      { header: "Full number", width: 20 },
      { header: "Email", width: 28 },
      { header: "Owner", width: 22 },
      { header: "Group", width: 20 },
      { header: "Temperature", width: 13 },
      { header: "Source", width: 18 },
      { header: "Country", width: 14 },
      { header: "Lead date", width: 12 },
      { header: "Added", width: 12 },
      { header: "Moved to contact", width: 16 },
      { header: "Archived", width: 10 },
    ],
    rows: hits.map((h) => {
      const owner = h.owner_id ? userById.get(h.owner_id) : undefined;
      const full = `${h.country_code ?? ""}${h.phone ?? ""}`.replace(/[^0-9+]/g, "");
      return [
        h.name ?? "",
        h.table === "crm_leads" ? "Lead" : "Contact",
        h.country_code ?? "",
        h.phone ?? "",
        full,
        h.email ?? "",
        owner ? owner.full_name || owner.email : "",
        h.group_name ?? "",
        h.temperature ? temperatureLabel(h.temperature) : "",
        h.source ?? "",
        h.country ?? "",
        { date: day(h.lead_date) },
        { date: day(h.created_at) },
        h.table === "crm_leads" ? (h.converted_contact_id ? "Yes" : "No") : "",
        h.is_archived ? "Yes" : "",
      ];
    }),
  };
}

export function phoneFileName(agent: CrmUser | undefined, digits: string): string {
  const today = toLocalDateString(new Date().toISOString());
  const who = agent
    ? (agent.full_name || agent.email).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : "";
  return ["phone-numbers", who || null, digits || null, today].filter(Boolean).join("-") + ".xlsx";
}
