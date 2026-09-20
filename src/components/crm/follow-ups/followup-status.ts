import {
  isDateOnly,
  parseLocalDate,
  toLocalDateString,
  todayLocalDateString,
} from "@/components/crm/activities/activities-config";

export type FollowUpTone = "overdue" | "today" | "upcoming";

/**
 * Where a follow up belongs — decided by the CALENDAR DAY, never by the hour.
 *
 * The three places that show a follow up each decided this for themselves, and
 * all three moved it out of "Today" as soon as its time had passed. A follow up
 * written without a time carries 08:00 Asia/Muscat (`crm_followup_instant` in
 * the database), so a client an agent had set for TODAY read as "Overdue" from
 * breakfast onwards and never appeared under Today on the To-do list. Today
 * owns today: an hour that has gone by is a nudge (see `isLate`), not a bucket.
 */
export function followUpTone(value: string | null | undefined): FollowUpTone | null {
  if (!value) return null;
  const at = parseLocalDate(value);
  if (!at) return null;
  const day = toLocalDateString(value) ?? "";
  const today = todayLocalDateString();
  if (day < today) return "overdue";
  return day === today ? "today" : "upcoming";
}

/**
 * Due today and the hour has already gone by. A day without a time is not late
 * until the day is over, so it never counts.
 */
export function isLate(value: string | null | undefined): boolean {
  if (!value || followUpTone(value) !== "today" || isDateOnly(value)) return false;
  const at = parseLocalDate(value);
  return !!at && at.getTime() <= Date.now();
}
