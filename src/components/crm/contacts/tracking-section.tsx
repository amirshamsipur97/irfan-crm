"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isTempId, STILL_SAVING_MESSAGE } from "@/components/crm/persist";
import { money } from "@/components/crm/deals/deals-config";
import {
  addTrackingEntry,
  deleteTrackingEntry,
  listTracking,
  setReminderDone,
  trackingFileUrl,
} from "@/app/(app)/crm/contacts/tracking-actions";
import type { CrmDeal, CrmOfferTracking } from "@/lib/types";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(value: string): string {
  return new Date(`${value}T00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function reminderLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Lead tracking — one follow-up trail PER OFFER, drawn as a node-and-line
 * timeline so the history of a single offer reads top to bottom. Each entry
 * is a date, a note, an optional reminder and an optional attachment.
 */
export function TrackingSection({
  offers,
  onToast,
}: {
  offers: CrmDeal[];
  onToast?: (message: string, tone?: "success" | "alert") => void;
}) {
  const [entries, setEntries] = useState<CrmOfferTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [date, setDate] = useState(localToday());
  const [note, setNote] = useState("");
  const [remind, setRemind] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const offerIds = offers.map((o) => o.id).filter((id) => !isTempId(id));
  const idsKey = offerIds.join(",");

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

  const resetForm = () => {
    setNote("");
    setRemind("");
    setDate(localToday());
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (dealId: string) => {
    if (isTempId(dealId)) {
      onToast?.(STILL_SAVING_MESSAGE, "alert");
      return;
    }
    if (!note.trim()) {
      onToast?.("Write something for this follow-up.", "alert");
      return;
    }
    setSaving(true);

    let uploaded: { name: string; storagePath: string; mimeType: string | null; sizeBytes: number | null } | null =
      null;
    if (file) {
      if (file.size > MAX_FILE_BYTES) {
        setSaving(false);
        onToast?.(`"${file.name}" is larger than 25 MB`, "alert");
        return;
      }
      // straight to the private bucket, like the identity papers
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `tracking/${dealId}/${crypto.randomUUID()}-${safe}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("crm-documents")
        .upload(path, file, { contentType: file.type || undefined });
      if (uploadError) {
        setSaving(false);
        onToast?.(uploadError.message, "alert");
        return;
      }
      uploaded = {
        name: file.name,
        storagePath: path,
        mimeType: file.type || null,
        sizeBytes: file.size,
      };
    }

    const result = await addTrackingEntry({
      dealId,
      entryDate: date,
      note,
      remindAt: remind ? new Date(remind).toISOString() : null,
      file: uploaded,
    });
    setSaving(false);
    if (result.error || !result.entry) {
      onToast?.(result.error ?? "could not save the follow-up", "alert");
      return;
    }
    setEntries((prev) => [...prev, result.entry as CrmOfferTracking]);
    resetForm();
    setOpenFor(null);
    onToast?.("Follow-up added");
  };

  const remove = async (entry: CrmOfferTracking) => {
    const prev = entries;
    setEntries((rows) => rows.filter((r) => r.id !== entry.id));
    const result = await deleteTrackingEntry(entry.id, entry.storage_path);
    if (result.error) {
      setEntries(prev);
      onToast?.(result.error, "alert");
    }
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
        <span className="pl-[6px] font-sans text-[12px] font-normal text-ink-muted">
          one trail per offer
        </span>
      </h4>

      {loading ? (
        <p className="m-0 font-sans text-[13px] text-ink-muted">Loading…</p>
      ) : (
        offers.map((offer, offerIndex) => {
          const rows = entries.filter((e) => e.deal_id === offer.id);
          const isOpen = openFor === offer.id;
          return (
            <div key={offer.id} className="mt-[10px] rounded-[8px] border border-line px-[12px] py-[10px]">
              {/* offer header */}
              <div className="flex items-baseline justify-between gap-[8px]">
                <p className="m-0 min-w-0 truncate font-sans text-[13.5px] font-semibold leading-[20px] text-ink">
                  Offer {offerIndex + 1}
                  <span className="pl-[6px] font-normal text-ink-muted">
                    {money(offer.deal_value, offer.currency)}
                    {offer.account_name ? ` · ${offer.account_name}` : ""}
                  </span>
                </p>
                <span className="shrink-0 font-sans text-[12px] text-ink-muted">
                  {rows.length} {rows.length === 1 ? "note" : "notes"}
                </span>
              </div>

              {/* the trail: node + line, oldest at the top */}
              {rows.length > 0 && (
                <div className="pt-[10px]">
                  {rows.map((entry, i) => (
                    <div key={entry.id} className="group/tr relative flex gap-[10px]">
                      {/* node column */}
                      <div className="relative flex w-[14px] shrink-0 justify-center">
                        {i < rows.length - 1 && (
                          <span className="absolute left-1/2 top-[14px] h-[calc(100%-6px)] w-px -translate-x-1/2 bg-line-strong" />
                        )}
                        <span
                          className="relative z-10 mt-[5px] size-[9px] rounded-full ring-2 ring-white"
                          style={{
                            backgroundColor: entry.remind_at && !entry.reminder_done ? "#fdab3d" : "#00a0a0",
                          }}
                        />
                      </div>

                      {/* entry body */}
                      <div className="min-w-0 flex-1 pb-[12px]">
                        <div className="flex items-baseline gap-[8px]">
                          <span className="font-sans text-[12px] font-medium leading-[18px] text-ink">
                            {dayLabel(entry.entry_date)}
                          </span>
                          <button
                            type="button"
                            aria-label="Delete follow-up"
                            onClick={() => remove(entry)}
                            className="ml-auto shrink-0 rounded-[4px] px-[4px] font-sans text-[12px] text-alert opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/tr:opacity-100"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="m-0 whitespace-pre-wrap break-words pt-[2px] font-sans text-[13px] leading-[19px] text-ink">
                          {entry.note}
                        </p>
                        <div className="flex flex-wrap items-center gap-[6px] pt-[5px]">
                          {entry.remind_at && (
                            <button
                              type="button"
                              onClick={() => toggleReminder(entry)}
                              title={entry.reminder_done ? "Mark as still pending" : "Mark reminder done"}
                              className={`flex items-center gap-[4px] rounded-[10px] px-[8px] py-[2px] font-sans text-[11.5px] leading-[16px] transition-colors ${
                                entry.reminder_done
                                  ? "bg-[#00c875]/15 text-[#0b8b57] line-through"
                                  : "bg-[#fdab3d]/20 text-[#b97416]"
                              }`}
                            >
                              ⏰ {reminderLabel(entry.remind_at)}
                            </button>
                          )}
                          {entry.storage_path && (
                            <button
                              type="button"
                              onClick={() => openFile(entry)}
                              className="flex max-w-full items-center gap-[4px] truncate rounded-[10px] bg-cyan-soft px-[8px] py-[2px] font-sans text-[11.5px] leading-[16px] text-ink transition-colors hover:bg-cyan-tint"
                            >
                              📎 {entry.file_name}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* add entry */}
              {isOpen ? (
                <div className="mt-[8px] rounded-[6px] bg-canvas p-[10px]">
                  <div className="flex flex-wrap gap-[6px]">
                    <label className="flex flex-col gap-[2px]">
                      <span className="font-sans text-[11px] text-ink-muted">Date</span>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-[30px] rounded-[4px] border border-line-strong bg-white px-[6px] font-sans text-[12.5px] text-ink outline-none focus:border-teal-deep"
                      />
                    </label>
                    <label className="flex flex-col gap-[2px]">
                      <span className="font-sans text-[11px] text-ink-muted">Reminder (optional)</span>
                      <input
                        type="datetime-local"
                        value={remind}
                        onChange={(e) => setRemind(e.target.value)}
                        className="h-[30px] rounded-[4px] border border-line-strong bg-white px-[6px] font-sans text-[12.5px] text-ink outline-none focus:border-teal-deep"
                      />
                    </label>
                  </div>
                  <textarea
                    autoFocus
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={4000}
                    placeholder="What happened? Called the client, sent the brochure, agreed to meet…"
                    className="mt-[6px] w-full resize-none rounded-[4px] border border-line-strong bg-white px-[8px] py-[6px] font-sans text-[13px] leading-[19px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep"
                  />
                  <div className="mt-[6px] flex flex-wrap items-center gap-[8px]">
                    <label className="flex h-[30px] cursor-pointer items-center rounded-[4px] border border-dashed border-line-strong bg-white px-[10px] font-sans text-[12.5px] text-ink transition-colors hover:bg-[var(--hover-ghost)]">
                      {file ? `📎 ${file.name}` : "Upload document"}
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <span className="ml-auto flex gap-[6px]">
                      <button
                        type="button"
                        onClick={() => {
                          resetForm();
                          setOpenFor(null);
                        }}
                        className="h-[30px] rounded-[4px] border border-line-strong px-[10px] font-sans text-[12.5px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => submit(offer.id)}
                        className="h-[30px] rounded-[4px] bg-teal-deep px-[12px] font-sans text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {saving ? "Saving…" : "Add"}
                      </button>
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setOpenFor(offer.id);
                  }}
                  className="mt-[8px] h-[28px] w-full rounded-[4px] border border-dashed border-line-strong font-sans text-[12.5px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)] hover:text-ink"
                >
                  + Add follow-up
                </button>
              )}
            </div>
          );
        })
      )}
    </>
  );
}
