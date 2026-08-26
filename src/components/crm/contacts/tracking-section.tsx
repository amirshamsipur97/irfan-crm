"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { isTempId, STILL_SAVING_MESSAGE } from "@/components/crm/persist";
import { money, offerNumbers } from "@/components/crm/deals/deals-config";
import {
  addTrackingEntry,
  deleteTrackingEntry,
  listTracking,
  setReminderDone,
  trackingFileUrl,
} from "@/app/(app)/crm/contacts/tracking-actions";
import type { CrmDeal, CrmOfferTracking, OfferTrackingType } from "@/lib/types";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const LONG_NOTE = 150;

/** Each kind of follow-up gets its own colored node, like a real activity feed. */
const TYPES: {
  key: OfferTrackingType;
  label: string;
  color: string;
  timed: boolean;
  glyph: React.ReactNode;
}[] = [
  {
    key: "call",
    label: "Call",
    color: "#00c875",
    timed: true,
    glyph: (
      <path d="M3.6 2.8h2.1l1 2.5-1.3.9a7.5 7.5 0 003.4 3.4l.9-1.3 2.5 1v2.1c0 .6-.5 1.1-1.1 1A10.4 10.4 0 013.7 3.9c-.1-.6.4-1.1 1-1.1z" />
    ),
  },
  {
    key: "meeting",
    label: "Meeting",
    color: "#a25ddc",
    timed: true,
    glyph: (
      <>
        <rect x="2.6" y="3.4" width="10.8" height="10" rx="1.6" />
        <path d="M2.6 6.4h10.8M5.6 2.2v2.4M10.4 2.2v2.4" />
      </>
    ),
  },
  {
    key: "email",
    label: "Email",
    color: "#fdab3d",
    timed: false,
    glyph: (
      <>
        <rect x="2.2" y="3.8" width="11.6" height="8.4" rx="1.4" />
        <path d="M2.6 4.6L8 8.8l5.4-4.2" />
      </>
    ),
  },
  {
    key: "viewing",
    label: "Viewing",
    color: "#00a0a0",
    timed: true,
    glyph: (
      <>
        <path d="M2.4 7.4L8 2.8l5.6 4.6" />
        <path d="M4 8.4v4.4h8V8.4" />
      </>
    ),
  },
  {
    key: "document",
    label: "Document",
    color: "#0086c0",
    timed: false,
    glyph: (
      <>
        <path d="M4.4 2.2h4.4L11.8 5v8.8H4.4z" />
        <path d="M6.2 7.4h4M6.2 9.8h4" />
      </>
    ),
  },
  {
    key: "note",
    label: "Note",
    color: "#579bfc",
    timed: false,
    glyph: (
      <>
        <rect x="2.6" y="2.8" width="10.8" height="10.4" rx="1.6" />
        <path d="M5.2 6h5.6M5.2 8.6h5.6M5.2 11h3.4" />
      </>
    ),
  },
];

const typeMeta = (key: string) => TYPES.find((t) => t.key === key) ?? TYPES[TYPES.length - 1];

function TypeNode({ type, size = 28 }: { type: string; size?: number }) {
  const meta = typeMeta(type);
  return (
    <span
      className="relative z-10 flex items-center justify-center rounded-[7px] ring-4 ring-white"
      style={{ width: size, height: size, backgroundColor: meta.color }}
      aria-hidden
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        stroke="#fff"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {meta.glyph}
      </svg>
    </span>
  );
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function stamp(dateOnly: string, createdAt: string): string {
  const d = new Date(`${dateOnly}T00:00`);
  const t = new Date(createdAt);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${t.toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit" }
  )}`;
}

function reminderLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** One card on the trail — collapses a long note behind "Show more". */
function EntryCard({
  entry,
  onDelete,
  onToggleReminder,
  onOpenFile,
}: {
  entry: CrmOfferTracking;
  onDelete: () => void;
  onToggleReminder: () => void;
  onOpenFile: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = entry.note.length > LONG_NOTE;
  const shown = long && !expanded ? `${entry.note.slice(0, LONG_NOTE).trimEnd()}…` : entry.note;
  const meta = typeMeta(entry.entry_type);

  return (
    <div className="group/tr relative flex gap-[10px]">
      {/* node + connecting line */}
      <div className="relative flex w-[28px] shrink-0 justify-center">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-line-strong" />
        <TypeNode type={entry.entry_type} />
      </div>

      <div className="min-w-0 flex-1 pb-[14px]">
        {/* kind + timestamp, above the card like the reference */}
        <div className="flex items-baseline justify-between gap-[8px] pb-[4px]">
          <span className="font-sans text-[12.5px] font-medium leading-[18px] text-ink">
            {meta.label}
          </span>
          <span className="shrink-0 font-sans text-[11.5px] leading-[16px] text-ink-muted">
            {stamp(entry.entry_date, entry.created_at)}
          </span>
        </div>

        <div className="rounded-[8px] border border-line bg-white px-[12px] py-[10px]">
          <div className="flex items-center gap-[8px]">
            <Avatar name={entry.author?.full_name || "Member"} src={entry.author?.avatar_url} size={24} />
            <span className="min-w-0 flex-1 truncate font-sans text-[13px] font-medium leading-[19px] text-ink">
              {entry.author?.full_name || "Member"}
            </span>
            {entry.duration_min != null && (
              <span className="flex shrink-0 items-center gap-[3px] font-sans text-[12px] leading-[18px] text-ink-muted">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                  <circle cx="8" cy="8" r="5.6" />
                  <path d="M8 4.8V8l2.2 1.4" strokeLinecap="round" />
                </svg>
                {entry.duration_min} min
              </span>
            )}
            <button
              type="button"
              aria-label="Delete follow-up"
              onClick={onDelete}
              className="shrink-0 rounded-[4px] px-[4px] font-sans text-[12px] text-alert opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/tr:opacity-100"
            >
              ✕
            </button>
          </div>

          <p className="m-0 whitespace-pre-wrap break-words pt-[6px] font-sans text-[13px] leading-[19px] text-ink">
            {shown}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-[2px] font-sans text-[12.5px] text-link hover:underline"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}

          {(entry.remind_at || entry.storage_path) && (
            <div className="flex flex-wrap items-center gap-[6px] pt-[8px]">
              {entry.remind_at && (
                <button
                  type="button"
                  onClick={onToggleReminder}
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
                  onClick={onOpenFile}
                  className="flex max-w-full items-center gap-[4px] truncate rounded-[10px] bg-cyan-soft px-[8px] py-[2px] font-sans text-[11.5px] leading-[16px] text-ink transition-colors hover:bg-cyan-tint"
                >
                  📎 {entry.file_name}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Lead tracking — one activity trail PER OFFER. Entries are typed (call,
 * meeting, viewing, email, document, note), each drawn as a colored node on a
 * single vertical line, newest at the bottom, with the author, an optional
 * duration, reminder and attachment. The "+" on an offer opens the composer.
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
  const [type, setType] = useState<OfferTrackingType>("call");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(localToday());
  const [note, setNote] = useState("");
  const [remind, setRemind] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const resetForm = () => {
    setType("call");
    setDuration("");
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

    let uploaded:
      | { name: string; storagePath: string; mimeType: string | null; sizeBytes: number | null }
      | null = null;
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

    const minutes = Number(duration);
    const result = await addTrackingEntry({
      dealId,
      entryType: type,
      durationMin: duration.trim() && Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null,
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
    onToast?.(`${typeMeta(type).label} logged`);
    onChanged?.();
  };

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
            <div key={offer.id} className="mt-[12px] rounded-[10px] border border-line bg-canvas/40 px-[12px] pb-[12px] pt-[10px]">
              {/* offer header with the + */}
              <div className="flex items-center justify-between gap-[8px] pb-[8px]">
                <p className="m-0 min-w-0 truncate font-sans text-[13.5px] font-semibold leading-[20px] text-ink">
                  Offer {offerNo.get(offer.id) ?? offerIndex + 1}
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
                    aria-label={`Add follow-up to offer ${offerNo.get(offer.id) ?? offerIndex + 1}`}
                    title="Add to this timeline"
                    onClick={() => {
                      resetForm();
                      setOpenFor(isOpen ? null : offer.id);
                    }}
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

              {/* the trail */}
              <div className="relative">
                {/* offer created — the trail always starts somewhere */}
                <div className="relative flex gap-[10px]">
                  <div className="relative flex w-[28px] shrink-0 justify-center">
                    {rows.length > 0 && (
                      <span className="absolute left-1/2 top-[14px] h-full w-px -translate-x-1/2 bg-line-strong" />
                    )}
                    <span
                      className="relative z-10 flex size-[28px] items-center justify-center rounded-[7px] bg-[#007f9b] ring-4 ring-white"
                      aria-hidden
                    >
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4.4 2.2h4.4L11.8 5v8.8H4.4z" />
                        <path d="M6.4 8.6l1.2 1.2 2.2-2.4" />
                      </svg>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pb-[14px]">
                    <div className="flex items-baseline justify-between gap-[8px]">
                      <span className="font-sans text-[12.5px] font-medium leading-[18px] text-ink">
                        Offer created
                      </span>
                      <span className="shrink-0 font-sans text-[11.5px] leading-[16px] text-ink-muted">
                        {new Date(offer.created_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {rows.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={() => remove(entry)}
                    onToggleReminder={() => toggleReminder(entry)}
                    onOpenFile={() => openFile(entry)}
                  />
                ))}
              </div>

              {/* composer */}
              {isOpen && (
                <div className="rounded-[8px] border border-line bg-white p-[10px]">
                  <div className="flex flex-wrap gap-[4px] pb-[8px]">
                    {TYPES.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setType(t.key)}
                        className={`flex items-center gap-[5px] rounded-[14px] border px-[9px] py-[3px] font-sans text-[12px] leading-[18px] transition-colors ${
                          type === t.key
                            ? "border-transparent text-white"
                            : "border-line-strong text-ink hover:bg-[var(--hover-ghost)]"
                        }`}
                        style={type === t.key ? { backgroundColor: t.color } : undefined}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={type === t.key ? "#fff" : t.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          {t.glyph}
                        </svg>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-[6px]">
                    <label className="flex flex-col gap-[2px]">
                      <span className="font-sans text-[11px] text-ink-muted">Date</span>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-[30px] rounded-[4px] border border-line-strong px-[6px] font-sans text-[12.5px] text-ink outline-none focus:border-teal-deep"
                      />
                    </label>
                    {typeMeta(type).timed && (
                      <label className="flex flex-col gap-[2px]">
                        <span className="font-sans text-[11px] text-ink-muted">Duration (min)</span>
                        <input
                          value={duration}
                          onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ""))}
                          inputMode="numeric"
                          placeholder="30"
                          className="h-[30px] w-[90px] rounded-[4px] border border-line-strong px-[6px] font-sans text-[12.5px] text-ink outline-none focus:border-teal-deep"
                        />
                      </label>
                    )}
                    <label className="flex flex-col gap-[2px]">
                      <span className="font-sans text-[11px] text-ink-muted">Reminder (optional)</span>
                      <input
                        type="datetime-local"
                        value={remind}
                        onChange={(e) => setRemind(e.target.value)}
                        className="h-[30px] rounded-[4px] border border-line-strong px-[6px] font-sans text-[12.5px] text-ink outline-none focus:border-teal-deep"
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
                    className="mt-[6px] w-full resize-none rounded-[4px] border border-line-strong px-[8px] py-[6px] font-sans text-[13px] leading-[19px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep"
                  />

                  <div className="mt-[6px] flex flex-wrap items-center gap-[8px]">
                    <label className="flex h-[30px] cursor-pointer items-center rounded-[4px] border border-dashed border-line-strong px-[10px] font-sans text-[12.5px] text-ink transition-colors hover:bg-[var(--hover-ghost)]">
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
              )}
            </div>
          );
        })
      )}
    </>
  );
}
