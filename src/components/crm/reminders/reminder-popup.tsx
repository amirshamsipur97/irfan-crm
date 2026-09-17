"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { TemperaturePill } from "@/components/crm/temperature-pill";
import { countryFlag } from "@/components/crm/country-cell";
import { money, offerNumbers } from "@/components/crm/deals/deals-config";
import { sourceLabel } from "@/components/crm/leads/board-config";
import { activityTime } from "@/components/crm/activities/activities-config";
import { FollowUpField } from "@/components/crm/follow-ups/followup-field";
import { TrailComposer, TypeNode, trailTypeMeta, type TrailValues } from "@/components/crm/follow-ups/trail";
import { addLeadHistoryEntry, setLeadHistoryReminderDone } from "@/app/(app)/crm/history-actions";
import { addTrackingEntry, setReminderDone as setTrackingReminderDone } from "@/app/(app)/crm/contacts/tracking-actions";
import { getReminderClient, type ReminderClientDetails, type ReminderRow } from "@/app/(app)/crm/reminders/actions";
import type { CrmUser } from "@/lib/types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-[8px] py-[3px]">
      <span className="w-[96px] shrink-0 font-sans text-[12px] leading-[18px] text-ink-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate font-sans text-[13px] leading-[19px] text-ink">{children}</span>
    </div>
  );
}

export type FollowUpTarget = {
  leadId: string | null;
  contactId: string | null;
  /** fixed offer trail (an offer reminder); null lets a contact pick */
  dealId: string | null;
  name: string;
};

/**
 * The client follow-up popup, opened from a To-do list reminder or from a
 * board's "next follow up" cell: the drawer's key details, the latest trail
 * entries, the next follow up itself, and a report. The report is written to
 * the client's own trail (Lead history, or an offer's Lead tracking), so the
 * side panel shows it too. A next reminder on the report becomes the client's
 * next follow up through the database sync; without one, the follow up that
 * was being worked is closed.
 */
export function FollowUpPopup({
  target,
  worked,
  followup,
  users,
  onClose,
  onSaved,
  onToast,
}: {
  target: FollowUpTarget;
  /** the reminder being worked (To-do list); closed when the report is saved */
  worked?: { note: string; remind_at: string | null; done: boolean; markDone: () => Promise<{ error?: string }> };
  /** the board's follow-up column (a table cell); set/cleared from the popup */
  followup?: { value: string | null; onSet: (next: string | null) => void };
  users: CrmUser[];
  onClose: () => void;
  onSaved: () => void;
  onToast: (message: string, tone?: "success" | "alert") => void;
}) {
  const { leadId, contactId, dealId } = target;
  const [details, setDetails] = useState<ReminderClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  // where the report goes: a fixed offer, else the client's Lead history or one of a contact's offers
  const [logOn, setLogOn] = useState<string>(dealId ?? "history");
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await getReminderClient({ leadId, contactId, dealId });
      if (!alive) return;
      setDetails(data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [leadId, contactId, dealId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const owner = details?.owner_id ? users.find((u) => u.id === details.owner_id) : undefined;
  const href = leadId ? `/crm/leads?lead=${leadId}` : contactId ? `/crm/contacts?contact=${contactId}` : null;
  const overdue = worked && !worked.done && worked.remind_at && new Date(worked.remind_at).getTime() <= openedAt;
  const offerNo = offerNumbers(details?.offers ?? []);
  const logDeal = logOn === "history" ? null : logOn;
  const closesCurrent = worked ? !worked.done : Boolean(followup?.value);

  const save = async (values: TrailValues): Promise<{ error?: string }> => {
    const report = logDeal
      ? await addTrackingEntry({ dealId: logDeal, ...values })
      : await addLeadHistoryEntry({ leadId, contactId: leadId ? null : contactId, ...values });
    if (report.error) return { error: report.error };
    if (worked && !worked.done) {
      // a next reminder already replaced it; ticking the replaced one again is a no-op
      const done = await worked.markDone();
      if (done.error) onToast(`Report saved, but the reminder could not be ticked off: ${done.error}`, "alert");
    } else if (!worked && followup?.value && !values.remindAt) {
      // no next reminder: this follow up is done (the database ticks its reminder)
      followup.onSet(null);
    }
    return {};
  };

  const kind = dealId ? "Offer" : leadId ? "Lead" : "Contact";

  return (
    <div
      className="fixed inset-0 z-[92] flex items-center justify-center bg-black/30 p-[16px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Follow up with ${target.name}`}
    >
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="thin-scroll relative flex max-h-[92vh] w-[580px] max-w-full flex-col overflow-y-auto rounded-[12px] bg-white shadow-[0px_15px_50px_rgba(0,0,0,0.3)]">
        {/* header */}
        <div className="sticky top-0 z-10 border-b border-line bg-white px-[22px] pb-[12px] pt-[16px]">
          <div className="flex items-start justify-between gap-[8px]">
            <div className="min-w-0">
              <div className="flex items-center gap-[8px]">
                <span className="rounded-[4px] bg-canvas px-[6px] font-sans text-[11px] leading-[18px] text-ink-muted">{kind}</span>
                <h3 className="m-0 truncate font-display text-[20px] font-medium leading-[28px] text-ink">
                  {details?.name ?? target.name}
                </h3>
                {details?.code && <span className="font-sans text-[13px] text-ink-muted">{details.code}</span>}
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-[30px] shrink-0 items-center justify-center rounded-[6px] font-sans text-[16px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
            >
              ✕
            </button>
          </div>

          {worked && (
            <div className="mt-[10px] flex items-start gap-[10px] rounded-[8px] border border-line bg-canvas/40 px-[10px] py-[8px]">
              <span className="pt-[1px]">⏰</span>
              <div className="min-w-0 flex-1">
                <p className="m-0 break-words font-sans text-[13px] leading-[19px] text-ink">{worked.note}</p>
                <p className="m-0 pt-[2px] font-sans text-[12px] text-ink-muted">
                  Due {worked.remind_at ? activityTime(worked.remind_at) : "—"}
                  {worked.done ? " · done" : overdue ? " · overdue" : ""}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-[22px] pb-[20px]">
          {followup && <FollowUpField value={followup.value} onSet={followup.onSet} />}

          {/* client box, like the drawer */}
          <h4 className="m-0 pb-[6px] pt-[14px] font-display text-[14px] font-semibold leading-[20px] text-ink">Client</h4>
          {loading ? (
            <p className="m-0 font-sans text-[13px] text-ink-muted">Loading…</p>
          ) : !details ? (
            <p className="m-0 font-sans text-[13px] text-ink-muted">This client is not visible to you.</p>
          ) : (
            <div className="rounded-[10px] border border-line px-[12px] py-[8px]">
              <Row label="Owner">
                {owner ? (
                  <span className="inline-flex items-center gap-[6px] align-middle">
                    <Avatar name={owner.full_name || owner.email} src={owner.avatar_url} size={20} />
                    {owner.full_name}
                  </span>
                ) : (
                  "No owner"
                )}
              </Row>
              <Row label="Phone">
                {details.phone ? (
                  <a href={`tel:${details.country_code ?? ""}${details.phone}`} className="text-[#0073ea] hover:underline">
                    {details.country_code ? `${details.country_code} ` : ""}
                    {details.phone}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Email">
                {details.email ? (
                  <a href={`mailto:${details.email}`} className="text-[#0073ea] hover:underline">
                    {details.email}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Country">
                {details.country ? `${countryFlag(details.country) ?? ""} ${details.country}` : "—"}
              </Row>
              <Row label="Status">
                <TemperaturePill value={details.temperature} />
              </Row>
              <Row label="Source">{details.source ? sourceLabel(details.source) : "—"}</Row>
              {details.budget != null && <Row label="Budget">{money(details.budget)}</Row>}
              {details.preferred_area && <Row label="Area">{details.preferred_area}</Row>}
              {href && (
                <div className="pt-[4px]">
                  <Link href={href} className="font-sans text-[12.5px] text-link hover:underline">
                    Open full profile →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* latest trail entries */}
          {details && details.recent.length > 0 && (
            <>
              <h4 className="m-0 pb-[6px] pt-[14px] font-display text-[14px] font-semibold leading-[20px] text-ink">
                Latest {dealId ? "on this offer" : "history"}
              </h4>
              <div className="flex flex-col gap-[6px]">
                {details.recent.map((e) => (
                  <div key={e.id} className="flex items-start gap-[8px]">
                    <TypeNode type={e.entry_type} size={22} />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 font-sans text-[12px] text-ink-muted">
                        {trailTypeMeta(e.entry_type).label} · {activityTime(e.created_at)}
                      </p>
                      <p className="m-0 line-clamp-2 font-sans text-[13px] leading-[18px] text-ink">{e.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* report + next reminder */}
          <div className="flex flex-wrap items-center justify-between gap-[8px] pb-[6px] pt-[16px]">
            <h4 className="m-0 font-display text-[14px] font-semibold leading-[20px] text-ink">Report</h4>
            {!dealId && contactId && (details?.offers.length ?? 0) > 0 ? (
              <label className="flex items-center gap-[6px] font-sans text-[12px] text-ink-muted">
                Log on
                <select
                  value={logOn}
                  onChange={(e) => setLogOn(e.target.value)}
                  className="h-[28px] rounded-[4px] border border-line-strong bg-white px-[6px] font-sans text-[12.5px] text-ink outline-none focus:border-teal-deep"
                >
                  <option value="history">Lead history</option>
                  {(details?.offers ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {`Offer ${offerNo.get(o.id) ?? ""} · ${money(o.deal_value, o.currency ?? "OMR")}${
                        o.account_name ? ` · ${o.account_name}` : ""
                      }`}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="font-sans text-[12px] text-ink-muted">
                saved to the client&apos;s {logDeal ? "offer trail (Lead tracking)" : "Lead history"}
              </span>
            )}
          </div>
          <TrailComposer
            key={logOn}
            uploadFolder={logDeal ? `tracking/${logDeal}` : `history/${leadId ? "lead" : "contact"}-${leadId ?? contactId}`}
            preflight={() => (leadId || contactId || logDeal ? null : "There is no client to report on.")}
            reminderLabel="Next reminder (optional)"
            saveLabel={closesCurrent ? "Save report & mark done" : "Save report"}
            notePlaceholder="What did you do? Called, no answer. Sent the payment plan. Agreed to a viewing on Friday…"
            onSave={save}
            onDone={() => {
              onSaved();
              onClose();
            }}
            onCancel={onClose}
            onToast={onToast}
          />
        </div>
      </div>
    </div>
  );
}

/** The To-do list's popup for one reminder row. */
export function ReminderPopup({
  row,
  users,
  onClose,
  onSaved,
  onToast,
}: {
  row: ReminderRow;
  users: CrmUser[];
  onClose: () => void;
  onSaved: () => void;
  onToast: (message: string, tone?: "success" | "alert") => void;
}) {
  const leadId = row.lead?.id ?? null;
  return (
    <FollowUpPopup
      target={{
        leadId,
        contactId: leadId ? null : row.contact?.id ?? null,
        dealId: row.source === "offer" ? row.offer?.id ?? null : null,
        name: row.lead?.name ?? row.contact?.name ?? "Client",
      }}
      worked={{
        note: row.offer ? `${row.offer.label}: ${row.note}` : row.note,
        remind_at: row.remind_at,
        done: row.reminder_done,
        markDone: () =>
          row.source === "offer" ? setTrackingReminderDone(row.id, true) : setLeadHistoryReminderDone(row.id, true),
      }}
      users={users}
      onClose={onClose}
      onSaved={onSaved}
      onToast={onToast}
    />
  );
}
