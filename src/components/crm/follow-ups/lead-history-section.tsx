"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog, useConfirm } from "@/components/ui/ConfirmDialog";
import { money } from "@/components/crm/deals/deals-config";
import { sourceLabel } from "@/components/crm/leads/board-config";
import { isTempId, STILL_SAVING_MESSAGE } from "@/components/crm/persist";
import { trackingFileUrl } from "@/app/(app)/crm/contacts/tracking-actions";
import {
  addLeadHistoryEntry,
  deleteLeadHistoryEntry,
  listLeadHistory,
  setLeadHistoryReminderDone,
  type LeadHistoryData,
} from "@/app/(app)/crm/history-actions";
import { buildMilestones, mergeTimeline } from "./history-timeline";
import { useDebounced, useRealtimeTable } from "@/lib/use-realtime";
import { EntryCard, TrailComposer, TrailMilestone } from "./trail";
import type { CrmLeadHistory, HistoryMilestoneKind } from "@/lib/types";

const MILESTONE_LOOK: Record<HistoryMilestoneKind, { color: string; glyph: React.ReactNode }> = {
  lead_created: {
    color: "#579bfc",
    glyph: (
      <>
        <circle cx="7" cy="5.5" r="2.4" />
        <path d="M2.6 13c.7-2 2.3-3.1 4.4-3.1 1 0 1.9.2 2.6.7M12 9.5v4M10 11.5h4" />
      </>
    ),
  },
  assigned: {
    color: "#a25ddc",
    glyph: (
      <>
        <circle cx="6.5" cy="5.5" r="2.4" />
        <path d="M2.4 13c.7-2 2.2-3.1 4.1-3.1M10 10.8h4.2M12.4 9l1.8 1.8-1.8 1.8" />
      </>
    ),
  },
  first_response: {
    color: "#00c875",
    glyph: <path d="M2.6 3.6h10.8v6.8H8l-3 2.6v-2.6H2.6z" />,
  },
  moved: {
    color: "#007f9b",
    glyph: (
      <>
        <rect x="2.4" y="3.6" width="8" height="8.8" rx="1.4" />
        <path d="M9 8h5M12 6l2 2-2 2" />
      </>
    ),
  },
  contact_created: {
    color: "#007f9b",
    glyph: (
      <>
        <rect x="2.4" y="3.4" width="11.2" height="9.2" rx="1.4" />
        <circle cx="6" cy="7.4" r="1.5" />
        <path d="M4 10.6c.5-1 1.2-1.5 2-1.5s1.5.5 2 1.5M9.6 6.8h2.4M9.6 9h2.4" />
      </>
    ),
  },
  offer_created: {
    color: "#007f9b",
    glyph: (
      <>
        <path d="M4.4 2.2h4.4L11.8 5v8.8H4.4z" />
        <path d="M6.4 8.6l1.2 1.2 2.2-2.4" />
      </>
    ),
  },
  offer_accepted: {
    color: "#00c875",
    glyph: (
      <>
        <circle cx="8" cy="8" r="5.6" />
        <path d="M5.6 8.2l1.6 1.6 3.2-3.4" />
      </>
    ),
  },
  downpayment_done: {
    color: "#037f4c",
    glyph: (
      <>
        <ellipse cx="8" cy="5" rx="4.6" ry="1.9" />
        <path d="M3.4 5v3c0 1 2 1.9 4.6 1.9S12.6 9 12.6 8V5M3.4 8v3c0 1 2 1.9 4.6 1.9s4.6-.9 4.6-1.9V8" />
      </>
    ),
  },
  invoice_sent: {
    color: "#fdab3d",
    glyph: (
      <>
        <path d="M13.6 2.4L2.4 7.2l4.4 1.6 1.6 4.4z" />
        <path d="M6.8 8.8l6.8-6.4" />
      </>
    ),
  },
};

/**
 * Lead history — the client's whole story on one line, from the moment the
 * lead came in: what happened on its own (created, assigned, moved to
 * contacts, offers made and accepted, downpayment, invoice) interleaved with
 * what the team logged (calls, meetings, viewings, notes, documents). Opened
 * from a lead OR from a contact, it shows the entries of both sides, so
 * nothing is lost when a lead is moved. A reminder on an entry notifies its
 * author in the bell when it comes due (crm_send_due_reminders, every minute).
 */
export function LeadHistorySection({
  leadId,
  contactId,
  onToast,
  onChanged,
  refreshKey = 0,
  onFollowupChange,
}: {
  leadId?: string;
  contactId?: string;
  onToast?: (message: string, tone?: "success" | "alert") => void;
  onChanged?: () => void;
  /** bump to re-read the history (e.g. the "next follow up" cell was edited) */
  refreshKey?: number;
  /** a reminder changed here, so the lead's "next follow up" column may have too */
  onFollowupChange?: () => void;
}) {
  const scopeKey = `${leadId ?? ""}|${contactId ?? ""}`;
  const [loaded, setLoaded] = useState<{ key: string; data: LeadHistoryData } | null>(null);
  const [open, setOpen] = useState(false);
  const { pending: toDelete, ask: askDelete, close: closeDelete } = useConfirm<CrmLeadHistory>();

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await listLeadHistory({ leadId, contactId });
      if (alive) setLoaded({ key: `${leadId ?? ""}|${contactId ?? ""}`, data });
    })();
    return () => {
      alive = false;
    };
  }, [leadId, contactId, refreshKey]);

  // anyone's change to this client's history (the Reminders page, the Leads
  // column, another member) re-reads it
  const reloadSoon = useDebounced(async () => {
    const fresh = await listLeadHistory({ leadId, contactId });
    setLoaded({ key: `${leadId ?? ""}|${contactId ?? ""}`, data: fresh });
  }, 300);
  useRealtimeTable("crm_lead_history", (payload) => {
    const row = payload.new as { id?: string; lead_id?: string | null; contact_id?: string | null };
    const gone = payload.old as { id?: string };
    const current = loaded?.data;
    if (!current) return;
    const leadIds = new Set(current.leads.map((l) => l.id));
    const mine =
      (row?.lead_id && leadIds.has(row.lead_id)) ||
      (row?.contact_id && current.contact?.id === row.contact_id) ||
      (gone?.id && current.entries.some((e) => e.id === gone.id));
    if (mine) reloadSoon();
  });

  /**
   * After a reminder change the database may have touched OTHER entries too
   * (a replaced follow-up is ticked off) and the lead's column: re-read both.
   */
  const resync = async () => {
    const fresh = await listLeadHistory({ leadId, contactId });
    setLoaded({ key: `${leadId ?? ""}|${contactId ?? ""}`, data: fresh });
    onFollowupChange?.();
  };

  // a result for a different lead/contact is not this one's — show loading until it arrives
  const data = loaded && loaded.key === scopeKey ? loaded.data : null;

  const items = useMemo(() => {
    if (!data) return [];
    const names = new Map(data.users.map((u) => [u.id, u.full_name]));
    const milestones = buildMilestones({
      leads: data.leads,
      contact: data.contact,
      deals: data.deals,
      userName: (id) => (id ? names.get(id) ?? null : null),
      sourceText: sourceLabel,
      moneyText: (value, currency) => money(value, currency),
    });
    return mergeTimeline(data.entries, milestones);
  }, [data]);

  const setEntries = (update: (rows: CrmLeadHistory[]) => CrmLeadHistory[]) =>
    setLoaded((prev) => (prev ? { ...prev, data: { ...prev.data, entries: update(prev.data.entries) } } : prev));

  const remove = async (entry: CrmLeadHistory) => {
    const before = data?.entries ?? [];
    setEntries((rows) => rows.filter((r) => r.id !== entry.id));
    const result = await deleteLeadHistoryEntry(entry.id, entry.storage_path);
    if (result.error) {
      setEntries(() => before);
      onToast?.(result.error, "alert");
      return;
    }
    if (entry.followup_source) await resync();
    onChanged?.();
  };

  const toggleReminder = async (entry: CrmLeadHistory) => {
    const next = !entry.reminder_done;
    setEntries((rows) => rows.map((r) => (r.id === entry.id ? { ...r, reminder_done: next } : r)));
    const result = await setLeadHistoryReminderDone(entry.id, next);
    if (result.error) {
      setEntries((rows) => rows.map((r) => (r.id === entry.id ? { ...r, reminder_done: !next } : r)));
      onToast?.(result.error, "alert");
      return;
    }
    if (entry.followup_source) await resync();
  };

  const openFile = async (entry: CrmLeadHistory) => {
    if (!entry.storage_path) return;
    const result = await trackingFileUrl(entry.storage_path);
    if (result.error || !result.url) {
      onToast?.(result.error ?? "could not open the file", "alert");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  const parentId = leadId ?? contactId ?? "";
  const entryCount = data?.entries.length ?? 0;

  return (
    <>
      <h4 className="m-0 pb-[8px] pt-[20px] font-display text-[14px] font-semibold leading-[20px] text-ink">
        Lead history
        <span className="pl-[6px] font-sans text-[12px] font-normal text-ink-muted">from the first contact to today</span>
      </h4>

      <div className="rounded-[10px] border border-line bg-canvas/40 px-[12px] pb-[12px] pt-[10px]">
        <div className="flex items-center justify-between gap-[8px] pb-[8px]">
          <span className="font-sans text-[12px] text-ink-muted">
            {data ? `${entryCount} ${entryCount === 1 ? "entry" : "entries"}` : "Loading…"}
          </span>
          <button
            type="button"
            aria-label="Add to the lead history"
            title="Add to this history"
            disabled={!data}
            onClick={() => setOpen((v) => !v)}
            className={`flex size-[26px] items-center justify-center rounded-[6px] border transition-colors disabled:opacity-40 ${
              open ? "border-teal-deep bg-teal-deep text-white" : "border-line-strong bg-white text-ink hover:bg-[var(--hover-ghost)]"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M7 2.5v9M2.5 7h9" />
            </svg>
          </button>
        </div>

        {data && items.length === 0 && (
          <p className="m-0 pb-[8px] font-sans text-[13px] text-ink-muted">Nothing to show for this client yet.</p>
        )}

        {data && (
          <div className="relative">
            {items.map((item, index) =>
              item.milestone ? (
                <TrailMilestone
                  key={item.key}
                  title={item.milestone.title}
                  detail={item.milestone.detail}
                  at={item.milestone.at}
                  color={MILESTONE_LOOK[item.milestone.kind].color}
                  glyph={MILESTONE_LOOK[item.milestone.kind].glyph}
                  lineBelow={index < items.length - 1}
                />
              ) : (
                <EntryCard
                  key={item.key}
                  entry={item.entry}
                  onDelete={() => askDelete(item.entry)}
                  onToggleReminder={() => toggleReminder(item.entry)}
                  onOpenFile={() => openFile(item.entry)}
                  isNextFollowUp={Boolean(item.entry.followup_source)}
                />
              )
            )}
          </div>
        )}

        {open && data && (
          <TrailComposer
            key={scopeKey}
            uploadFolder={`history/${leadId ? "lead" : "contact"}-${parentId}`}
            preflight={() => (isTempId(parentId) ? STILL_SAVING_MESSAGE : null)}
            onSave={async (values) => {
              const result = await addLeadHistoryEntry({
                leadId: leadId ?? null,
                contactId: leadId ? null : contactId ?? null,
                ...values,
              });
              if (result.error || !result.entry) return { error: result.error ?? "could not save this entry" };
              const saved = result.entry;
              setEntries((rows) => [...rows, saved]);
              // a lead reminder becomes the lead's next follow up
              if (leadId && saved.remind_at) await resync();
              return {};
            }}
            onDone={() => {
              setOpen(false);
              onChanged?.();
            }}
            onCancel={() => setOpen(false)}
            onToast={onToast}
          />
        )}
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Delete this entry?"
          message="It is removed from this client's history for everyone, attachment included. This can't be undone."
          confirmLabel="Delete"
          onCancel={closeDelete}
          onConfirm={() => {
            const entry = toDelete;
            closeDelete();
            remove(entry);
          }}
        />
      )}
    </>
  );
}
