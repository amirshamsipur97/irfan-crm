// Shared definitions for user-defined board columns (Monday-style "+" menu).

export type CustomColumnType =
  | "text"
  | "number"
  | "status"
  | "dropdown"
  | "date"
  | "people"
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
  text: "Text",
  number: "Numbers",
  status: "Status",
  dropdown: "Dropdown",
  date: "Date",
  people: "People",
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

/** Menu layout mirrors the Monday reference (only types we actually support). */
export const COLUMN_MENU: { section: string; items: { type: CustomColumnType; hint: string }[] }[] = [
  {
    section: "Essentials",
    items: [
      { type: "status", hint: "Colored labels for stages of work" },
      { type: "dropdown", hint: "Pick one of your own options" },
      { type: "text", hint: "Any free text" },
      { type: "date", hint: "A calendar date" },
      { type: "people", hint: "Assign a team member" },
      { type: "number", hint: "Amounts, sizes, counts" },
    ],
  },
  {
    section: "Super useful",
    items: [
      { type: "checkbox", hint: "Simple yes / no" },
      { type: "priority", hint: "High / Medium / Low" },
    ],
  },
];
