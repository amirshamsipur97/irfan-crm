/**
 * The Leads board as an Excel workbook.
 *
 * Everything the board holds goes out: the sticky Lead name, every visible
 * column, every custom column the team has added, plus the record-keeping
 * fields that live in the drawer or only in the database (stage, score,
 * conversion, who created the row and when). Nothing here reads the DOM — it
 * maps the same rows the board is rendering, so the file always matches what
 * the agent is looking at, filters included.
 *
 * Labels come from the shared lists (LEAD_SOURCES, TEMPERATURE_OPTIONS,
 * PROPERTY_TYPES…), never from a second copy — one list per concept.
 */

import type { CrmCustomColumn } from "@/lib/custom-columns";
import type { CrmLead, CrmLeadGroup, CrmStage, CrmUser } from "@/lib/types";
import type { XlsxColumn, XlsxSheet, XlsxValue } from "@/lib/xlsx";
import { toLocalDateString } from "@/components/crm/activities/activities-config";
import { BEDROOM_OPTIONS, PROPERTY_TYPES } from "@/components/crm/contacts/demand-config";
import { genderLabel, temperatureLabel } from "@/lib/person-fields";
import { sourceLabel } from "./board-config";

/** "2026-08-22 14:07" in the reader's own timezone — an instant, not a day. */
function stamp(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Exactly what the board's Move-to-contact cell shows a tick for. */
function movedToContact(lead: CrmLead): boolean {
  return (
    Boolean((lead.custom as Record<string, unknown> | null)?.moved_to_contacts) ||
    Boolean(lead.converted_contact_id)
  );
}

/** A custom column's stored value, rendered the way its cell renders it. */
function customValue(
  column: CrmCustomColumn,
  raw: unknown,
  users: CrmUser[]
): XlsxValue {
  if (raw == null || raw === "") return null;

  switch (column.type) {
    case "money":
    case "percent":
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : String(raw);
    }
    case "date":
      return { date: typeof raw === "string" ? toLocalDateString(raw) ?? raw : null };
    case "people":
      return users.find((u) => u.id === raw)?.full_name ?? String(raw);
    case "checkbox":
      return raw ? "Yes" : "No";
    case "property_type":
      return PROPERTY_TYPES.find((p) => p.key === raw)?.label ?? String(raw);
    case "bedrooms":
      return BEDROOM_OPTIONS.find((b) => b.key === raw)?.label ?? String(raw);
    case "status":
    case "dropdown":
    case "priority":
      return (column.options ?? []).find((o) => o.key === raw)?.label ?? String(raw);
    default:
      return String(raw);
  }
}

/**
 * The fixed part of the sheet. Kept in the board's reading order so the file
 * looks like the screen; custom columns are appended after it, then the
 * bookkeeping block that the board does not show.
 */
const BASE_COLUMNS: XlsxColumn[] = [
  { header: "Lead", width: 32 },
  { header: "Group", width: 20 },
  { header: "Status", width: 12 },
  { header: "Owner", width: 24 },
  { header: "First name", width: 18 },
  { header: "Last name", width: 18 },
  { header: "Country code", width: 13 },
  { header: "Telephone", width: 20 },
  { header: "Country", width: 18 },
  { header: "Gender", width: 10 },
  { header: "Age", width: 7 },
  { header: "Email", width: 30 },
  { header: "Lead Source", width: 15 },
  { header: "Date", width: 12 },
  { header: "Text", width: 60, wrap: true },
  { header: "Moved to contact", width: 17 },
  { header: "Moved on", width: 12 },
];

const TAIL_COLUMNS: XlsxColumn[] = [
  { header: "Pipeline stage", width: 18 },
  { header: "Lead score", width: 11 },
  { header: "Score band", width: 11 },
  { header: "Priority", width: 10 },
  { header: "Interest", width: 24 },
  { header: "Budget", width: 14 },
  { header: "Currency", width: 9 },
  { header: "Company", width: 22 },
  { header: "Title", width: 20 },
  { header: "Next follow-up", width: 17 },
  { header: "Last activity", width: 17 },
  { header: "Created by", width: 24 },
  { header: "Created at", width: 17 },
  { header: "Updated at", width: 17 },
  { header: "Lead ID", width: 38 },
];

/**
 * Two columns may legitimately carry one name — the board's built-in "Text"
 * and a custom column the team also called "Text". Excel allows it, but a
 * pivot or a VLOOKUP over the file cannot tell them apart, so the repeats
 * get numbered. The FIRST one keeps the plain name.
 */
function dedupeHeaders(columns: XlsxColumn[]): XlsxColumn[] {
  const seen = new Map<string, number>();
  return columns.map((c) => {
    const count = (seen.get(c.header) ?? 0) + 1;
    seen.set(c.header, count);
    return count === 1 ? c : { ...c, header: `${c.header} (${count})` };
  });
}

export interface LeadExportInput {
  leads: CrmLead[];
  groups: CrmLeadGroup[];
  users: CrmUser[];
  stages: CrmStage[];
  customColumns: CrmCustomColumn[];
}

/** Builds the single "Leads" sheet handed to buildXlsx / downloadXlsx. */
export function buildLeadsSheet({
  leads,
  groups,
  users,
  stages,
  customColumns,
}: LeadExportInput): XlsxSheet {
  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? null;
  const userName = (id: string | null) => users.find((u) => u.id === id)?.full_name ?? null;

  const columns = dedupeHeaders([
    ...BASE_COLUMNS,
    ...customColumns.map((c) => ({
      header: c.label,
      width: 18,
      wrap: c.type === "text",
    })),
    ...TAIL_COLUMNS,
  ]);

  const rows: XlsxValue[][] = leads.map((lead) => {
    const custom = (lead.custom ?? {}) as Record<string, unknown>;
    return [
      lead.name,
      groupName(lead.group_id),
      lead.temperature ? temperatureLabel(lead.temperature) : null,
      userName(lead.owner_id),
      lead.first_name,
      lead.last_name,
      lead.country_code,
      // a leading + or a 9-digit local number must stay text, never a float
      lead.phone,
      lead.country,
      lead.gender ? genderLabel(lead.gender) : null,
      lead.age,
      lead.email,
      lead.source ? sourceLabel(lead.source) : null,
      { date: lead.lead_date },
      lead.notes,
      // the board's ✓ reads custom.moved_to_contacts, and 35 live rows carry
      // that flag with no converted_contact_id (crm_convert_lead merged them
      // into an existing card). Keying the export off the id alone would say
      // "No" on rows the agent can see a tick on, so it follows the cell.
      movedToContact(lead) ? "Yes" : "No",
      { date: toLocalDateString(lead.converted_at) },
      ...customColumns.map((c) => customValue(c, custom[c.key], users)),
      stages.find((s) => s.id === lead.stage_id)?.name ?? null,
      lead.lead_score,
      lead.score_band,
      lead.priority,
      lead.interest,
      lead.budget,
      lead.budget == null ? null : lead.currency,
      lead.company,
      lead.title,
      stamp(lead.next_followup_at),
      stamp(lead.last_activity_at),
      userName(lead.created_by),
      stamp(lead.created_at),
      stamp(lead.updated_at),
      lead.id,
    ];
  });

  return { name: "Leads", columns, rows };
}

/** leads-2026-08-22.xlsx — the day is the exporter's own, not UTC's. */
export function leadsFileName(): string {
  return `leads-${toLocalDateString(new Date().toISOString())}.xlsx`;
}
