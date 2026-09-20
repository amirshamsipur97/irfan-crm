"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { anchorFixedPos } from "@/components/crm/leads/cells";
import { shortDate } from "@/components/crm/leads/board-config";
import { toLocalDateString, todayLocalDateString } from "@/components/crm/activities/activities-config";
import { ConfirmDialog, useConfirm } from "@/components/ui/ConfirmDialog";
import { DeleteIcon } from "@/components/ui/DeleteIcon";
import { bedroomLabel, propertyTypeLabel } from "./demand-config";
import {
  NEGOTIATION_CHANNELS,
  NEGOTIATION_PURPOSES,
  NEGOTIATION_READINESS,
  NEGOTIATION_QUESTIONS,
  YES_NO,
  answeredCount,
  boolKey,
  keyBool,
} from "./negotiation-config";
import {
  createNegotiation,
  deleteNegotiation,
  listNegotiations,
  updateNegotiation,
} from "@/app/(app)/crm/contacts/negotiation-actions";
import type { CrmContact, CrmContactNegotiation } from "@/lib/types";

/** A project on the Developments board, offered as the alternative suggestion. */
export interface ProjectOption {
  id: string;
  name: string;
  /** the developer company this project belongs to */
  developer: string | null;
}

/** An offer already linked to this client, mirrored from the Offers board. */
export interface LinkedOffer {
  id: string;
  name: string;
  stage: string | null;
}

/** The editable half of one round. */
type RoundDraft = Pick<
  CrmContactNegotiation,
  | "negotiated_at"
  | "channel"
  | "resident"
  | "purpose"
  | "purpose_other"
  | "has_offer"
  | "alt_project"
  | "alt_project_id"
  | "readiness"
  | "note"
  | "next_at"
>;

const EMPTY_DRAFT: RoundDraft = {
  negotiated_at: null,
  channel: null,
  resident: null,
  purpose: null,
  purpose_other: null,
  has_offer: null,
  alt_project: null,
  alt_project_id: null,
  readiness: null,
  note: null,
  next_at: null,
};

const draftOf = (round: CrmContactNegotiation): RoundDraft => ({
  negotiated_at: round.negotiated_at,
  channel: round.channel,
  resident: round.resident,
  purpose: round.purpose,
  purpose_other: round.purpose_other,
  has_offer: round.has_offer,
  alt_project: round.alt_project,
  alt_project_id: round.alt_project_id,
  readiness: round.readiness,
  note: round.note,
  next_at: round.next_at,
});

/**
 * The negotiation log: one round per call, asked instead of typed.
 *
 * A client is rarely closed on the first call — a cold one needs a second and a
 * third — so the popup opens on the LATEST round, keeps the earlier ones a
 * click away in the strip at the top, and "+" starts the next one on the date
 * that round agreed. Each round is six answers picked from a list, with the
 * free note underneath for what a list cannot hold.
 *
 * The two ends that touch other boards are mirrored, not copied: "Create offer"
 * writes a real row on the Offers board through the same server action the
 * Offers add-row uses, and the alternative suggestion is picked from the
 * Developments projects that hang off the Accounts register.
 */
export function NegotiationPopup({
  contact,
  projects,
  offers,
  canEdit,
  onCreateOffer,
  onMirrored,
  onClose,
  onToast,
}: {
  contact: CrmContact;
  projects: ProjectOption[];
  offers: LinkedOffer[];
  canEdit: boolean;
  /** creates the offer on the Offers board and returns the row it made */
  onCreateOffer: (projectName: string | null) => Promise<{ id: string; name: string } | { error: string }>;
  /** the client row's copy of the log, recomputed server-side after each write */
  onMirrored?: (mirror: Partial<CrmContact>) => void;
  onClose: () => void;
  onToast?: (message: string, tone?: "success" | "alert") => void;
}) {
  const [rounds, setRounds] = useState<CrmContactNegotiation[]>([]);
  const [loading, setLoading] = useState(true);
  /** null while the first round is still a draft that no one has saved */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoundDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [madeOffers, setMadeOffers] = useState<LinkedOffer[]>([]);
  const { pending: toDelete, ask: askDelete, close: closeDelete } = useConfirm<CrmContactNegotiation>();

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await listNegotiations(contact.id);
      if (!alive) return;
      setRounds(rows);
      // an agent opens this to record the call they just had: the newest round
      const latest = rows[rows.length - 1] ?? null;
      setSelectedId(latest?.id ?? null);
      setDraft(latest ? draftOf(latest) : EMPTY_DRAFT);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [contact.id]);

  const selected = rounds.find((r) => r.id === selectedId) ?? null;
  const roundNumber = selected?.round ?? (rounds.length ? rounds[rounds.length - 1].round + 1 : 1);

  const set = <K extends keyof RoundDraft>(key: K, value: RoundDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  /** only what actually changed — an untouched field must not be written */
  const changedPatch = (): Record<string, unknown> => {
    const current = draft as unknown as Record<string, unknown>;
    const stored = (selected ? draftOf(selected) : EMPTY_DRAFT) as unknown as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(EMPTY_DRAFT)) {
      const next =
        key === "note" || key === "purpose_other"
          ? (current[key] as string | null)?.trim() || null
          : (current[key] ?? null);
      if (next !== (stored[key] ?? null)) patch[key] = next;
    }
    return patch;
  };

  /**
   * Writes the open round, creating it the first time. `ok` is false ONLY when
   * the database refused — an untouched form is a successful no-op, or Save
   * would refuse to close on a round nobody edited.
   */
  const persist = async (): Promise<{ ok: boolean }> => {
    const patch = changedPatch();
    if (Object.keys(patch).length === 0) return { ok: true };

    if (selected) {
      const result = await updateNegotiation(selected.id, patch);
      if ("error" in result && result.error) {
        onToast?.(result.error, "alert");
        return { ok: false };
      }
      setRounds((prev) => prev.map((r) => (r.id === selected.id ? ({ ...r, ...patch } as CrmContactNegotiation) : r)));
      if (result.mirror) onMirrored?.(result.mirror as Partial<CrmContact>);
      return { ok: true };
    }

    const result = await createNegotiation(contact.id, patch);
    if ("error" in result && result.error) {
      onToast?.(result.error, "alert");
      return { ok: false };
    }
    const row = result.row as CrmContactNegotiation;
    setRounds((prev) => [...prev, row]);
    setSelectedId(row.id);
    if (result.mirror) onMirrored?.(result.mirror as Partial<CrmContact>);
    return { ok: true };
  };

  const save = async () => {
    setSaving(true);
    const result = await persist();
    setSaving(false);
    if (result.ok) onClose();
  };

  /** switching rounds keeps the edits: the open one is written first */
  const selectRound = async (round: CrmContactNegotiation) => {
    if (canEdit) await persist();
    setSelectedId(round.id);
    setDraft(draftOf(round));
  };

  const addRound = async () => {
    setSaving(true);
    const saved = await persist();
    if (!saved.ok) {
      setSaving(false);
      return;
    }
    // the next call starts on the day this round agreed on, today otherwise
    const startsOn = draft.next_at ?? todayLocalDateString();
    const result = await createNegotiation(contact.id, { negotiated_at: startsOn });
    setSaving(false);
    if ("error" in result && result.error) {
      onToast?.(result.error, "alert");
      return;
    }
    const row = result.row as CrmContactNegotiation;
    setRounds((prev) => [...prev, row]);
    setSelectedId(row.id);
    setDraft(draftOf(row));
    if (result.mirror) onMirrored?.(result.mirror as Partial<CrmContact>);
  };

  const removeRound = async (round: CrmContactNegotiation) => {
    closeDelete();
    const result = await deleteNegotiation(round.id);
    if ("error" in result && result.error) {
      onToast?.(result.error, "alert");
      return;
    }
    const left = rounds.filter((r) => r.id !== round.id);
    setRounds(left);
    const next = left[left.length - 1] ?? null;
    setSelectedId(next?.id ?? null);
    setDraft(next ? draftOf(next) : EMPTY_DRAFT);
    if (result.mirror) onMirrored?.(result.mirror as Partial<CrmContact>);
    onToast?.(`Negotiation ${round.round} removed`);
  };

  const createOffer = async () => {
    setCreating(true);
    // the answers go in first: an agent who creates then closes must not lose
    // the call they just recorded
    await persist();
    const result = await onCreateOffer(draft.alt_project);
    setCreating(false);
    if ("error" in result) {
      onToast?.(result.error, "alert");
      return;
    }
    setMadeOffers((prev) => [...prev, { id: result.id, name: result.name, stage: null }]);
    onToast?.(`Offer created on the Offers board — “${result.name}”`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const allOffers = [...offers, ...madeOffers.filter((m) => !offers.some((o) => o.id === m.id))];
  const answered = answeredCount({
    negotiation_channel: draft.channel,
    negotiation_resident: draft.resident,
    negotiation_purpose: draft.purpose,
    negotiation_has_offer: draft.has_offer,
    negotiation_readiness: draft.readiness,
    first_negotiation_note: draft.note,
  });
  const demand = [
    propertyTypeLabel(contact.property_type) === "—" ? null : propertyTypeLabel(contact.property_type),
    bedroomLabel(contact.bedrooms) === "—" ? null : bedroomLabel(contact.bedrooms),
    contact.budget ? `${contact.budget.toLocaleString()} OMR` : null,
    contact.account_name,
  ].filter(Boolean) as string[];

  return createPortal(
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center p-[16px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Negotiations — ${contact.name}`}
    >
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/35" />
      <div className="thin-scroll relative flex max-h-[92vh] w-[620px] max-w-full flex-col overflow-y-auto rounded-[12px] bg-white shadow-[0px_15px_50px_rgba(0,0,0,0.3)]">
        {/* header: who, and what they asked for — the answers below are read against it */}
        <div className="sticky top-0 z-[1] border-b border-line bg-white px-[22px] pb-[10px] pt-[18px]">
          <div className="flex items-start gap-[12px]">
            <span className="mt-[2px] flex size-[34px] shrink-0 items-center justify-center rounded-full bg-teal-deep/12" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 5.5A2 2 0 0 1 6 3.5h8a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2H9.3l-2.9 2.3a.5.5 0 0 1-.8-.4V13H6a2 2 0 0 1-2-2z"
                  stroke="#00718a"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="m-0 font-display text-[18px] font-medium leading-[24px] text-ink">
                Negotiations — {contact.name}
              </h3>
              <p className="m-0 pt-[3px] font-sans text-[12.5px] leading-[18px] text-ink-muted">
                {demand.length ? `Asked for: ${demand.join(" · ")}` : "No demand recorded on this client yet"}
              </p>
            </div>
            <span className="shrink-0 rounded-[10px] bg-canvas px-[9px] py-[3px] font-sans text-[11.5px] tabular-nums text-ink-muted">
              {answered}/{NEGOTIATION_QUESTIONS}
            </span>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-[30px] shrink-0 items-center justify-center rounded-[6px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
            >
              ✕
            </button>
          </div>

          {/* the log: every round this client has been negotiated, + the next */}
          <div className="thin-scroll mt-[10px] flex items-center gap-[6px] overflow-x-auto pb-[2px]">
            {rounds.map((r) => {
              const active = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => selectRound(r)}
                  className={`flex h-[28px] shrink-0 items-center gap-[6px] rounded-[14px] border px-[10px] font-sans text-[12.5px] transition-colors ${
                    active
                      ? "border-teal-deep bg-teal-deep text-white"
                      : "border-line-strong text-ink hover:bg-[var(--hover-ghost)]"
                  }`}
                >
                  <span className="tabular-nums">#{r.round}</span>
                  <span className={active ? "text-white/80" : "text-ink-muted"}>
                    {r.negotiated_at ? shortDate(r.negotiated_at) : "no date"}
                  </span>
                </button>
              );
            })}
            {!selected && !loading && (
              <span className="flex h-[28px] shrink-0 items-center gap-[6px] rounded-[14px] border border-teal-deep bg-teal-deep px-[10px] font-sans text-[12.5px] text-white">
                <span className="tabular-nums">#1</span>
                <span className="text-white/80">new</span>
              </span>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={addRound}
                disabled={saving}
                title="Add the next negotiation"
                className="flex h-[28px] shrink-0 items-center gap-[4px] rounded-[14px] border border-dashed border-line-strong px-[10px] font-sans text-[12.5px] text-ink transition-colors hover:border-teal-deep hover:text-teal-deep disabled:opacity-40"
              >
                <span className="text-[15px] leading-none">+</span> Next negotiation
              </button>
            )}
            {selected && canEdit && (
              <button
                type="button"
                onClick={() => askDelete(selected)}
                aria-label={`Delete negotiation ${selected.round}`}
                title="Delete this negotiation"
                className="ml-auto flex size-[28px] shrink-0 items-center justify-center rounded-[6px] text-ink-muted transition-colors hover:bg-[#ffe9ec] hover:text-alert"
              >
                <DeleteIcon size={15} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="px-[22px] py-[28px] font-sans text-[14px] text-ink-muted">Loading the log…</p>
        ) : (
          <div className="px-[22px] pb-[20px] pt-[16px]">
            <p className="m-0 pb-[10px] font-sans text-[12.5px] text-ink-muted">
              {roundNumber === 1 ? "First negotiation" : `Negotiation ${roundNumber}`}
              {rounds.length > 1 ? ` of ${rounds.length}` : ""}
            </p>

            <div className="grid grid-cols-2 gap-x-[14px] gap-y-[12px]">
              <Field label="Date of the negotiation">
                <input
                  type="date"
                  disabled={!canEdit}
                  value={draft.negotiated_at ?? ""}
                  onChange={(e) => set("negotiated_at", e.target.value ? toLocalDateString(e.target.value) : null)}
                  className="h-[36px] w-full rounded-[6px] border border-line-strong px-[10px] font-sans text-[13.5px] text-ink outline-none focus:border-teal-deep disabled:bg-canvas"
                />
              </Field>
              <Dropdown
                label="First contact type"
                placeholder="How did we speak?"
                options={NEGOTIATION_CHANNELS}
                value={draft.channel}
                disabled={!canEdit}
                onPick={(key) => set("channel", key)}
              />
              <Dropdown
                label="Lives in Oman"
                placeholder="Resident?"
                options={YES_NO}
                value={boolKey(draft.resident)}
                disabled={!canEdit}
                onPick={(key) => set("resident", keyBool(key))}
              />
              <Dropdown
                label="Purpose of buying"
                placeholder="Why are they buying?"
                options={NEGOTIATION_PURPOSES}
                value={draft.purpose}
                disabled={!canEdit}
                onPick={(key) => set("purpose", key)}
              />
              {draft.purpose === "other" && (
                <div className="col-span-2">
                  <Field label="Purpose — in their own words">
                    <input
                      disabled={!canEdit}
                      value={draft.purpose_other ?? ""}
                      onChange={(e) => set("purpose_other", e.target.value)}
                      placeholder="e.g. buying for their parents to retire here"
                      className="h-[36px] w-full rounded-[6px] border border-line-strong px-[10px] font-sans text-[13.5px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep disabled:bg-canvas"
                    />
                  </Field>
                </div>
              )}
              <Dropdown
                label="Handover"
                placeholder="Ready to move or off-plan?"
                options={NEGOTIATION_READINESS}
                value={draft.readiness}
                disabled={!canEdit}
                onPick={(key) => set("readiness", key)}
              />
              <Dropdown
                label="Do we have a matching offer?"
                placeholder="Against what they asked for"
                options={YES_NO}
                value={boolKey(draft.has_offer)}
                disabled={!canEdit}
                onPick={(key) => set("has_offer", keyBool(key))}
              />
            </div>

            {/* yes → make the offer here; no → say what we suggested instead */}
            {draft.has_offer === true && (
              <div className="mt-[14px] rounded-[10px] border border-[#00c875]/40 bg-[#00c875]/8 px-[14px] py-[12px]">
                <div className="flex flex-wrap items-center justify-between gap-[10px]">
                  <div className="min-w-0">
                    <p className="m-0 font-sans text-[13px] font-semibold text-ink">We hold something that fits</p>
                    <p className="m-0 pt-[2px] font-sans text-[12px] leading-[17px] text-ink-muted">
                      Creating it here puts a real row on the Offers board, linked to this client and pre-filled with
                      the demand above.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!canEdit || creating}
                    onClick={createOffer}
                    className="h-[34px] shrink-0 rounded-[4px] bg-teal-deep px-[14px] font-sans text-[14px] text-white transition-colors hover:bg-[#006e87] disabled:opacity-40"
                  >
                    {creating ? "Creating…" : "Create offer"}
                  </button>
                </div>
                {draft.alt_project && (
                  // picked while the answer was still "no" — shown rather than
                  // silently kept, and the offer created here carries it
                  <p className="m-0 pt-[8px] font-sans text-[11.5px] leading-[16px] text-ink-muted">
                    Project on file for this client: {draft.alt_project}
                  </p>
                )}
                {allOffers.length > 0 && (
                  <ul className="m-0 mt-[10px] list-none space-y-[4px] p-0">
                    {allOffers.map((o) => (
                      <li key={o.id} className="flex items-center gap-[8px] font-sans text-[12.5px] text-ink">
                        <span className="size-[6px] shrink-0 rounded-full bg-[#00c875]" aria-hidden />
                        <Link href="/crm/offers" className="truncate text-link hover:underline">
                          {o.name}
                        </Link>
                        {o.stage && <span className="shrink-0 text-ink-muted">· {o.stage}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {draft.has_offer === false && (
              <div className="mt-[14px] rounded-[10px] border border-[#fdab3d]/50 bg-[#fdab3d]/10 px-[14px] py-[12px]">
                <p className="m-0 pb-[8px] font-sans text-[13px] font-semibold text-ink">What did we suggest instead?</p>
                <ProjectDropdown
                  projects={projects}
                  value={draft.alt_project}
                  disabled={!canEdit}
                  onPick={(project) => {
                    set("alt_project", project?.name ?? null);
                    set("alt_project_id", project?.id ?? null);
                  }}
                />
                <p className="m-0 pt-[6px] font-sans text-[11.5px] leading-[16px] text-ink-muted">
                  The list is the Developments board — every project of every developer company on Accounts.
                </p>
              </div>
            )}

            {/* no offer yet means there must be a next call */}
            <div className="mt-[14px] rounded-[10px] border border-line bg-canvas/60 px-[14px] py-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-[10px]">
                <div className="min-w-0">
                  <p className="m-0 font-sans text-[13px] font-semibold text-ink">Next negotiation</p>
                  <p className="m-0 pt-[2px] font-sans text-[12px] leading-[17px] text-ink-muted">
                    {draft.has_offer === false
                      ? "No matching offer yet — set the day we speak again, then add it with “+ Next negotiation”."
                      : "When do we speak to this client again?"}
                  </p>
                </div>
                <input
                  type="date"
                  disabled={!canEdit}
                  value={draft.next_at ?? ""}
                  onChange={(e) => set("next_at", e.target.value ? toLocalDateString(e.target.value) : null)}
                  className="h-[36px] w-[190px] shrink-0 rounded-[6px] border border-line-strong px-[10px] font-sans text-[13.5px] text-ink outline-none focus:border-teal-deep disabled:bg-canvas"
                />
              </div>
            </div>

            {/* everything the options cannot hold */}
            <div className="mt-[14px]">
              <Field label="Notes from the call">
                <textarea
                  disabled={!canEdit}
                  value={draft.note ?? ""}
                  onChange={(e) => set("note", e.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="Anything the answers above do not cover: what they objected to, who decides, when they can travel, what we promised to send…"
                  className="w-full resize-y rounded-[6px] border border-line-strong px-[10px] py-[8px] font-sans text-[13.5px] leading-[20px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep disabled:bg-canvas"
                />
              </Field>
            </div>

            {!canEdit && (
              <p className="m-0 pt-[10px] font-sans text-[12.5px] text-ink-muted">
                This client belongs to another member, so the log is read-only for you.
              </p>
            )}

            <div className="mt-[16px] flex items-center justify-between gap-[8px]">
              <span className="font-sans text-[11.5px] text-ink-muted">
                {rounds[0]?.negotiated_at ? `First negotiated ${shortDate(rounds[0].negotiated_at)}` : ""}
              </span>
              <span className="flex gap-[8px]">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-[34px] rounded-[4px] px-[12px] font-sans text-[14px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canEdit || saving}
                  onClick={save}
                  className="h-[34px] rounded-[4px] bg-teal-deep px-[16px] font-sans text-[14px] text-white transition-colors hover:bg-[#006e87] disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </span>
            </div>
          </div>
        )}
      </div>
      {toDelete && (
        <ConfirmDialog
          title={`Delete negotiation ${toDelete.round}?`}
          message="This round and everything written in it are removed from the client's log. This can't be undone."
          confirmLabel="Delete"
          onCancel={closeDelete}
          onConfirm={() => removeRound(toDelete)}
        />
      )}
    </div>,
    document.body
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block pb-[4px] font-sans text-[12px] font-medium leading-[16px] text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

/**
 * One dropdown shape for every answer, portalled to <body> so the panel is
 * never clipped by the dialog's own scroll box.
 */
function Dropdown({
  label,
  placeholder,
  options,
  value,
  disabled,
  onPick,
}: {
  label: string;
  placeholder: string;
  options: { key: string; label: string; color: string }[];
  value: string | null;
  disabled?: boolean;
  onPick: (key: string | null) => void;
}) {
  const chosen = options.find((o) => o.key === value) ?? null;
  return (
    <Field label={label}>
      <Menu
        disabled={disabled}
        trigger={
          chosen ? (
            <span className="flex min-w-0 items-center gap-[8px]">
              <span className="size-[8px] shrink-0 rounded-full" style={{ background: chosen.color }} aria-hidden />
              <span className="truncate text-ink">{chosen.label}</span>
            </span>
          ) : (
            <span className="truncate text-ink-muted">{placeholder}</span>
          )
        }
        onClear={chosen ? () => onPick(null) : undefined}
      >
        {(close) =>
          options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                onPick(o.key);
                close();
              }}
              className={`flex h-[34px] w-full items-center gap-[8px] px-[10px] text-left font-sans text-[13.5px] transition-colors hover:bg-[var(--hover-ghost)] ${
                o.key === value ? "bg-[var(--hover-ghost)] font-medium" : ""
              }`}
            >
              <span className="size-[8px] shrink-0 rounded-full" style={{ background: o.color }} aria-hidden />
              <span className="truncate text-ink">{o.label}</span>
            </button>
          ))
        }
      </Menu>
    </Field>
  );
}

/** The alternative suggestion: searchable, because the register keeps growing. */
function ProjectDropdown({
  projects,
  value,
  disabled,
  onPick,
}: {
  projects: ProjectOption[];
  value: string | null;
  disabled?: boolean;
  onPick: (project: ProjectOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? projects.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.developer ?? "").toLowerCase().includes(q)
      )
    : projects;

  return (
    <Menu
      disabled={disabled}
      onOpen={() => setQuery("")}
      trigger={
        value ? (
          <span className="truncate text-ink">{value}</span>
        ) : (
          <span className="truncate text-ink-muted">Pick a project</span>
        )
      }
      onClear={value ? () => onPick(null) : undefined}
    >
      {(close) => (
        <>
          <div className="sticky top-0 border-b border-line bg-white p-[6px]">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to find a project or developer…"
              className="h-[30px] w-full rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="m-0 px-[10px] py-[12px] font-sans text-[13px] text-ink-muted">
              No project matches. Projects are added on the Developments board.
            </p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onPick(p);
                  close();
                }}
                className={`block w-full px-[10px] py-[6px] text-left transition-colors hover:bg-[var(--hover-ghost)] ${
                  p.name === value ? "bg-[var(--hover-ghost)]" : ""
                }`}
              >
                <span className="block truncate font-sans text-[13.5px] text-ink">{p.name}</span>
                {p.developer && (
                  <span className="block truncate font-sans text-[11.5px] text-ink-muted">{p.developer}</span>
                )}
              </button>
            ))
          )}
        </>
      )}
    </Menu>
  );
}

/** The panel never grows past this, so it can be placed before it renders. */
const PANEL_MAX_H = 260;

/** Trigger + portalled panel, shared by both dropdowns above. */
function Menu({
  trigger,
  children,
  disabled,
  onClear,
  onOpen,
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  disabled?: boolean;
  onClear?: () => void;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // measured when the list is opened, not in an effect: the panel is capped at
  // PANEL_MAX_H anyway, so its box is known before it is rendered and one
  // measurement avoids a second render pass
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      // the dialog closes on Escape too — the open list swallows the first press
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <span className="relative flex">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (!open) {
            const anchor = triggerRef.current?.getBoundingClientRect();
            if (anchor)
              setPos({ ...anchorFixedPos(anchor, anchor.width, PANEL_MAX_H, "left"), width: anchor.width });
            onOpen?.();
          }
          setOpen((o) => !o);
        }}
        className={`flex h-[36px] w-full items-center justify-between gap-[8px] rounded-[6px] border px-[10px] font-sans text-[13.5px] transition-colors disabled:bg-canvas ${
          open ? "border-teal-deep" : "border-line-strong hover:border-teal-deep"
        }`}
      >
        <span className="min-w-0 flex-1 text-left">{trigger}</span>
        <span className="flex shrink-0 items-center gap-[4px]">
          {onClear && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="flex size-[18px] items-center justify-center rounded-[4px] text-[11px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
            >
              ✕
            </span>
          )}
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
            <path d="M1 1l4 4 4-4" stroke="#676879" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              ...(pos ? { left: pos.left, top: pos.top, width: pos.width } : { visibility: "hidden" }),
              maxHeight: PANEL_MAX_H,
            }}
            className="thin-scroll fixed z-[98] min-w-[220px] overflow-y-auto rounded-[8px] border border-line bg-white py-[4px] shadow-[0px_12px_32px_rgba(0,0,0,0.22)]"
          >
            {children(() => setOpen(false))}
          </div>,
          document.body
        )}
    </span>
  );
}
