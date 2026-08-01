// Shared definitions for user-defined board columns (Monday-style "+" menu).

export type CustomColumnType =
  // the CRM's own column kinds — what the "+" menu offers
  | "country"
  | "money"
  | "percent"
  | "property_type"
  | "bedrooms"
  | "text"
  | "number"
  | "date"
  | "people"
  // legacy Monday types: no longer creatable, kept so old columns render
  | "status"
  | "dropdown"
  | "checkbox"
  | "priority";

export interface CustomColumnOption {
  key: string;
  label: string;
  color: string;
}

export interface CrmCustomColumn {
  id: string;
  board_key: string;
  key: string;
  label: string;
  type: CustomColumnType;
  options: CustomColumnOption[] | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const CUSTOM_COL_W = 150;

export const DEFAULT_LABELS: Record<CustomColumnType, string> = {
  country: "Country",
  money: "Amount (OMR)",
  percent: "Percent %",
  property_type: "Property type",
  bedrooms: "Size",
  text: "Text",
  number: "Numbers",
  date: "Date",
  people: "People",
  status: "Status",
  dropdown: "Dropdown",
  checkbox: "Checkbox",
  priority: "Priority",
};

export const DEFAULT_OPTIONS: Partial<Record<CustomColumnType, CustomColumnOption[]>> = {
  status: [
    { key: "todo", label: "To Do", color: "#c4c4c4" },
    { key: "working", label: "Working on it", color: "#fdab3d" },
    { key: "done", label: "Done", color: "#00c875" },
    { key: "stuck", label: "Stuck", color: "#e2445c" },
  ],
  dropdown: [
    { key: "option_1", label: "Option 1", color: "#579bfc" },
    { key: "option_2", label: "Option 2", color: "#a25ddc" },
    { key: "option_3", label: "Option 3", color: "#00a0a0" },
  ],
  priority: [
    { key: "high", label: "High", color: "#ff642e" },
    { key: "medium", label: "Medium", color: "#fdab3d" },
    { key: "low", label: "Low", color: "#579bfc" },
  ],
};

/**
 * The "+" menu offers the CRM's own column kinds, matching how the boards
 * are actually used (client's country, OMR amounts, downpayment-style
 * percents, property type and size) — the generic Monday set was clutter
 * nobody used. Legacy types still render but cannot be created.
 */
export const COLUMN_MENU: { section: string; items: { type: CustomColumnType; hint: string }[] }[] = [
  {
    section: "Client & property",
    items: [
      { type: "country", hint: "Pick the client's country (with flag)" },
      { type: "property_type", hint: "Apartment, villa, shop…" },
      { type: "bedrooms", hint: "Unit size: 1BHK, 2BHK…" },
      { type: "money", hint: "An amount in OMR" },
      { type: "percent", hint: "A percentage, e.g. a fee or share" },
    ],
  },
  {
    section: "Basics",
    items: [
      { type: "text", hint: "Any free text" },
      { type: "number", hint: "Plain numbers and counts" },
      { type: "date", hint: "A calendar date" },
      { type: "people", hint: "Assign a team member" },
    ],
  },
];
