"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog, useConfirm } from "@/components/ui/ConfirmDialog";
import { isTempId, STILL_SAVING_MESSAGE } from "@/components/crm/persist";
import { money, offerNumbers } from "@/components/crm/deals/deals-config";
import { EntryCard, TrailComposer, TrailMilestone } from "@/components/crm/follow-ups/trail";
import {
  addTrackingEntry,
  deleteTrackingEntry,
  listTracking,
  setReminderDone,
  trackingFileUrl,
} from "@/app/(app)/crm/contacts/tracking-actions";
import type { CrmDeal, CrmOfferTracking } from "@/lib/types";

/**
 * Lead tracking — one activity trail PER OFFER. Entries are typed (call,
 * meeting, viewing, email, document, note), each drawn as a colored node on a
 * single vertical line, newest at the bottom, with the author, an optional
 * duration, reminder and attachment. The "+" on an offer opens the composer.
 * The node, card and composer are shared with Lead history (follow-ups/trail).
 */
export function TrackingSection({
  offers,
  onToast,
  onChanged,
}: {
  offers: CrmDeal[];
  onToast?: (message: string, tone?: "success" | "alert") => void;
  /** fired after an entry is added/removed, so the drawer's feed refreshes */
  onChanged?: () => void;
}) {
  const [entries, setEntries] = useState<CrmOfferTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const { pending: toDelete, ask: askDelete, close: closeDelete } = useConfirm<CrmOfferTracking>();

  // numbered by WHEN each offer was made, not by its place in this list —
  // the drawer hands them over newest-first
  const offerNo = offerNumbers(offers);

  const idsKey = offers
    .map((o) => o.id)
    .filter((id) => !isTempId(id))
    .join(",");

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await listTracking(idsKey ? idsKey.split(",") : []);
      if (!alive) return;
      setEntries(rows);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [idsKey]);

  const remove = async (entry: CrmOfferTracking) => {
    const prev = entries;
    setEntries((rows) => rows.filter((r) => r.id !== entry.id));
    const result = await deleteTrackingEntry(entry.id, entry.storage_path);
    if (result.error) {
      setEntries(prev);
      onToast?.(result.error, "alert");
      return;
    }
    onChanged?.();
  };

  const toggleReminder = async (entry: CrmOfferTracking) => {
    const next = !entry.reminder_done;
    setEntries((rows) => rows.map((r) => (r.id === entry.id ? { ...r, reminder_done: next } : r)));
    const result = await setReminderDone(entry.id, next);
    if (result.error) {
      setEntries((rows) => rows.map((r) => (r.id === entry.id ? { ...r, reminder_done: !next } : r)));
      onToast?.(result.error, "alert");
    }
  };

  const openFile = async (entry: CrmOfferTracking) => {
    if (!entry.storage_path) return;
    const result = await trackingFileUrl(entry.storage_path);
    if (result.error || !result.url) {
      onToast?.(result.error ?? "could not open the file", "alert");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  if (offers.length === 0) {
    return (
      <>
        <h4 className="m-0 pb-[8px] pt-[20px] font-display text-[14px] font-semibold leading-[20px] text-ink">
          Lead tracking
        </h4>
        <p className="m-0 font-sans text-[13px] text-ink-muted">
          Create an offer first — each offer keeps its own follow-up trail.
        </p>
      </>
    );
  }

  return (
    <>
      <h4 className="m-0 pb-[8px] pt-[20px] font-display text-[14px] font-semibold leading-[20px] text-ink">
        Lead tracking
        <span className="pl-[6px] font-sans text-[12px] font-normal text-ink-muted">one trail per offer</span>
      </h4>

      {loading ? (
        <p className="m-0 font-sans text-[13px] text-ink-muted">Loading…</p>
      ) : (
        offers.map((offer, offerIndex) => {
          const rows = entries.filter((e) => e.deal_id === offer.id);
          const isOpen = openFor === offer.id;
          const number = offerNo.get(offer.id) ?? offerIndex + 1;
          return (
            <div key={offer.id} className="mt-[12px] rounded-[10px] border border-line bg-canvas/40 px-[12px] pb-[12px] pt-[10px]">
              {/* offer header with the + */}
              <div className="flex items-center justify-between gap-[8px] pb-[8px]">
                <p className="m-0 min-w-0 truncate font-sans text-[13.5px] font-semibold leading-[20px] text-ink">
                  Offer {number}
                  <span className="pl-[6px] font-normal text-ink-muted">
                    {money(offer.deal_value, offer.currency)}
                    {offer.account_name ? ` · ${offer.account_name}` : ""}
                  </span>
                </p>
                <span className="flex shrink-0 items-center gap-[8px]">
                  <span className="font-sans text-[12px] text-ink-muted">
                    {rows.length} {rows.length === 1 ? "entry" : "entries"}
                  </span>
                  <button
                    type="button"
                    aria-label={`Add follow-up to offer ${number}`}
                    title="Add to this timeline"
                    onClick={() => setOpenFor(isOpen ? null : offer.id)}
                    className={`flex size-[26px] items-center justify-center rounded-[6px] border transition-colors ${
                      isOpen
                        ? "border-teal-deep bg-teal-deep text-white"
                        : "border-line-strong bg-white text-ink hover:bg-[var(--hover-ghost)]"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                      <path d="M7 2.5v9M2.5 7h9" />
                    </svg>
                  </button>
                </span>
              </div>

              {/* the trail — offer created is always where it starts */}
              <div className="relative">
                <TrailMilestone title="Offer created" at={offer.created_at} lineBelow={rows.length > 0} />
                {rows.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={() => askDelete(entry)}
                    onToggleReminder={() => toggleReminder(entry)}
                    onOpenFile={() => openFile(entry)}
                  />
                ))}
              </div>

              {isOpen && (
                <TrailComposer
                  key={offer.id}
                  uploadFolder={`tracking/${offer.id}`}
                  preflight={() => (isTempId(offer.id) ? STILL_SAVING_MESSAGE : null)}
                  onSave={async (values) => {
                    const result = await addTrackingEntry({ dealId: offer.id, ...values });
                    if (result.error || !result.entry) return { error: result.error ?? "could not save the follow-up" };
                    setEntries((prev) => [...prev, result.entry as CrmOfferTracking]);
                    return {};
                  }}
                  onDone={() => {
                    setOpenFor(null);
                    onChanged?.();
                  }}
                  onCancel={() => setOpenFor(null)}
                  onToast={onToast}
                />
              )}
            </div>
          );
        })
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete this follow-up?"
          message="It is removed from this offer's trail for everyone, attachment included. This can't be undone."
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
