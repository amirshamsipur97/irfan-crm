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
