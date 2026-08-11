/**
 * Person facts shared by Leads and Contacts. One list per concept — both
 * boards, both drawers and the custom-column kit read these, so a label or a
 * color never has to be kept in step by hand.
 */
export const GENDER_OPTIONS: { key: string; label: string; color: string }[] = [
  { key: "male", label: "Male", color: "#579bfc" },
  { key: "female", label: "Female", color: "#e5688f" },
];

export function genderLabel(key: string | null | undefined): string {
  if (!key) return "—";
  return GENDER_OPTIONS.find((g) => g.key === key)?.label ?? key;
}

/** Age is a snapshot the agent was told, not a birthday — shown as "34 yrs". */
export function ageLabel(age: number | null | undefined): string {
  return age == null ? "—" : `${age} yrs`;
}

/**
 * How hot the person is — NOT the pipeline Status (that is where the lead
 * sits in the funnel; this is how likely they are to buy). Set on a lead,
 * carried onto the contact by crm_convert_lead, mirrored into the offer and
 * deal drawers from there. The blue is deeper than the board's stage blue so
 * the two colour languages never read as the same thing.
 */
export const TEMPERATURE_OPTIONS: { key: string; label: string; color: string }[] = [
  { key: "warm", label: "Warm", color: "#00c875" },
  { key: "cold", label: "Cold", color: "#0086c0" },
  { key: "pending", label: "Pending", color: "#fdab3d" },
];

export function temperatureLabel(key: string | null | undefined): string {
  if (!key) return "—";
  return TEMPERATURE_OPTIONS.find((t) => t.key === key)?.label ?? key;
}

export function temperatureColor(key: string | null | undefined): string | undefined {
  return TEMPERATURE_OPTIONS.find((t) => t.key === key)?.color;
}
