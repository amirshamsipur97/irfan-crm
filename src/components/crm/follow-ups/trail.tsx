"use client";

/**
 * The pieces of a follow-up trail, shared by the per-offer "Lead tracking"
 * and the client-wide "Lead history": the typed nodes, the entry card, the
 * milestone row and the composer. One copy, so the two trails can never drift
 * apart in how an entry looks or how a file is uploaded.
 */

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError, reachable } from "@/components/crm/persist";
import { Avatar } from "@/components/ui/Avatar";
import type { CrmOfferTracking, OfferTrackingType } from "@/lib/types";

export const MAX_TRAIL_FILE_BYTES = 25 * 1024 * 1024;
const LONG_NOTE = 150;
const BUCKET = "crm-documents";

/** Each kind of follow-up gets its own colored node, like a real activity feed. */
export const TRAIL_TYPES: {
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

export const trailTypeMeta = (key: string) =>
  TRAIL_TYPES.find((t) => t.key === key) ?? TRAIL_TYPES[TRAIL_TYPES.length - 1];

export function TypeNode({ type, size = 28 }: { type: string; size?: number }) {
  const meta = trailTypeMeta(type);
  return (
    <span
      className="relative z-10 flex items-center justify-center rounded-[7px] ring-4 ring-white"
      style={{ width: size, height: size, backgroundColor: meta.color }}
      aria-hidden
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
        {meta.glyph}
      </svg>
    </span>
  );
}

export function localToday(): string {
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

export function whenLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** What an entry card needs, whichever trail it sits on. */
export type TrailEntry = Pick<
  CrmOfferTracking,
  | "id"
  | "entry_type"
  | "entry_date"
  | "note"
  | "remind_at"
  | "reminder_done"
  | "storage_path"
  | "file_name"
  | "duration_min"
  | "created_at"
  | "author"
>;

/** One card on the trail — collapses a long note behind "Show more". */
export function EntryCard({
  entry,
  onDelete,
  onToggleReminder,
  onOpenFile,
  isNextFollowUp = false,
}: {
  entry: TrailEntry;
  onDelete: () => void;
  onToggleReminder: () => void;
  onOpenFile: () => void;
  /** this reminder is the one shown in the Leads "next follow up" column */
  isNextFollowUp?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = entry.note.length > LONG_NOTE;
  const shown = long && !expanded ? `${entry.note.slice(0, LONG_NOTE).trimEnd()}…` : entry.note;
  const meta = trailTypeMeta(entry.entry_type);

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
          <span className="font-sans text-[12.5px] font-medium leading-[18px] text-ink">{meta.label}</span>
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
              className="shrink-0 rounded-[4px] px-[4px] font-sans text-[12px] text-alert opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] focus-visible:opacity-100 group-hover/tr:opacity-100"
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
                    entry.reminder_done ? "bg-[#00c875]/15 text-[#0b8b57] line-through" : "bg-[#fdab3d]/20 text-[#b97416]"
                  }`}
                >
                  ⏰ {reminderLabel(entry.remind_at)}
                </button>
              )}
              {entry.remind_at && isNextFollowUp && !entry.reminder_done && (
                <span
                  title="Shown in the Leads table as next follow up"
                  className="rounded-[10px] bg-teal-deep/10 px-[8px] py-[2px] font-sans text-[11.5px] leading-[16px] text-teal-deep"
                >
                  next follow up
                </span>
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

/** Something that happened on its own (offer created, moved to contacts…): a node, a title, when. */
export function TrailMilestone({
  title,
  detail,
  at,
  color = "#007f9b",
  glyph,
  lineBelow,
}: {
  title: string;
  detail?: string | null;
  at: string;
  color?: string;
  glyph?: React.ReactNode;
  /** draw the connector down to the next item */
  lineBelow: boolean;
}) {
  return (
    <div className="relative flex gap-[10px]">
      <div className="relative flex w-[28px] shrink-0 justify-center">
        {lineBelow && <span className="absolute left-1/2 top-[14px] h-full w-px -translate-x-1/2 bg-line-strong" />}
        <span
          className="relative z-10 flex size-[28px] items-center justify-center rounded-[7px] ring-4 ring-white"
          style={{ backgroundColor: color }}
          aria-hidden
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
            {glyph ?? (
              <>
                <path d="M4.4 2.2h4.4L11.8 5v8.8H4.4z" />
                <path d="M6.4 8.6l1.2 1.2 2.2-2.4" />
              </>
            )}
          </svg>
        </span>
      </div>
      <div className="min-w-0 flex-1 pb-[14px]">
        <div className="flex items-baseline justify-between gap-[8px]">
          <span className="min-w-0 truncate font-sans text-[12.5px] font-medium leading-[18px] text-ink">{title}</span>
          <span className="shrink-0 font-sans text-[11.5px] leading-[16px] text-ink-muted">{whenLabel(at)}</span>
        </div>
        {detail && (
          <p className="m-0 truncate font-sans text-[12px] leading-[17px] text-ink-muted" title={detail}>
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

export interface TrailValues {
  entryType: OfferTrackingType;
  durationMin: number | null;
  entryDate: string;
  note: string;
  remindAt: string | null;
  file: { name: string; storagePath: string; mimeType: string | null; sizeBytes: number | null } | null;
}

/**
 * The "+" form. Owns its own fields, so opening it always starts clean.
 * Order of checks matters: anything that can refuse the save runs BEFORE the
 * file is uploaded, and a save the server refuses removes the file it just
 * uploaded, so a failed entry never leaves an orphan in the bucket.
 */
export function TrailComposer({
  uploadFolder,
  preflight,
  onSave,
  onDone,
  onCancel,
  onToast,
  reminderLabel = "Reminder (optional)",
  saveLabel = "Add",
  notePlaceholder = "What happened? Called the client, sent the brochure, agreed to meet…",
}: {
  reminderLabel?: string;
  saveLabel?: string;
  notePlaceholder?: string;
  /** bucket folder for an attachment, e.g. `tracking/<dealId>` */
  uploadFolder: string;
  /** a message here stops the save before anything is uploaded */
  preflight?: () => string | null;
  onSave: (values: TrailValues) => Promise<{ error?: string }>;
  onDone: () => void;
  onCancel: () => void;
  onToast?: (message: string, tone?: "success" | "alert") => void;
}) {
  const [type, setType] = useState<OfferTrackingType>("call");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(localToday());
  const [note, setNote] = useState("");
  const [remind, setRemind] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (saving) return;
    const blocked = preflight?.();
    if (blocked) {
      onToast?.(blocked, "alert");
      return;
    }
    if (!note.trim()) {
      onToast?.("Write something for this follow-up.", "alert");
      return;
    }
    if (!date) {
      onToast?.("Pick a date for this entry.", "alert");
      return;
    }
    const remindAt = remind ? new Date(remind) : null;
    if (remindAt && Number.isNaN(remindAt.getTime())) {
      onToast?.("That reminder time is not a valid date.", "alert");
      return;
    }
    if (file && file.size > MAX_TRAIL_FILE_BYTES) {
      onToast?.(`"${file.name}" is larger than 25 MB`, "alert");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    let uploaded: TrailValues["file"] = null;
    if (file) {
      // straight to the private bucket, like the identity papers
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${uploadFolder}/${crypto.randomUUID()}-${safe}`;
      const upload = await reachable(
        supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type || undefined })
          .then((r) => ({ error: r.error?.message }))
      );
      if (upload.error) {
        setSaving(false);
        onToast?.(friendlyError(upload.error), "alert");
        return;
      }
      uploaded = { name: file.name, storagePath: path, mimeType: file.type || null, sizeBytes: file.size };
    }

    const minutes = Number(duration);
    // the report is the agent's work: a save that never comes back must say so
    // and leave the form filled in, never die with the button stuck on "Saving…"
    const result = await reachable(
      onSave({
        entryType: type,
        durationMin:
          trailTypeMeta(type).timed && duration.trim() && Number.isFinite(minutes) && minutes > 0
            ? Math.min(Math.round(minutes), 24 * 60)
            : null,
        entryDate: date,
        note,
        remindAt: remindAt ? remindAt.toISOString() : null,
        file: uploaded,
      })
    );
    setSaving(false);
    if (result.error) {
      if (uploaded) await supabase.storage.from(BUCKET).remove([uploaded.storagePath]).catch(() => {});
      onToast?.(friendlyError(result.error), "alert");
      return;
    }
    onToast?.(`${trailTypeMeta(type).label} logged`);
    onDone();
  };

  return (
    <div className="rounded-[8px] border border-line bg-white p-[10px]">
      <div className="flex flex-wrap gap-[4px] pb-[8px]">
        {TRAIL_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            className={`flex items-center gap-[5px] rounded-[14px] border px-[9px] py-[3px] font-sans text-[12px] leading-[18px] transition-colors ${
              type === t.key ? "border-transparent text-white" : "border-line-strong text-ink hover:bg-[var(--hover-ghost)]"
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
        {trailTypeMeta(type).timed && (
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
          <span className="font-sans text-[11px] text-ink-muted">{reminderLabel}</span>
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
        placeholder={notePlaceholder}
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
            onClick={onCancel}
            className="h-[30px] rounded-[4px] border border-line-strong px-[10px] font-sans text-[12.5px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="h-[30px] rounded-[4px] bg-teal-deep px-[12px] font-sans text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : saveLabel}
          </button>
        </span>
      </div>
    </div>
  );
}
