"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { anchorFixedPos } from "@/components/crm/leads/cells";
import { shortDate } from "@/components/crm/leads/board-config";
import { toLocalDateString } from "@/components/crm/activities/activities-config";
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
  type NegotiationValue,
} from "./negotiation-config";
import type { CrmContact } from "@/lib/types";

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

/**
 * The first negotiation, asked instead of typed.
 *
 * The old popup was a single blank textarea, so the same call came back written
 * five different ways. Here the call is six answers an agent picks from — how
 * the client came in, whether they are already in Oman, why they are buying,
 * whether we hold something that fits, ready-to-move or off-plan — with the
 * free note kept underneath for everything a list cannot hold.
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
  onSave,
  onCreateOffer,
  onClose,
  onToast,
}: {
  contact: CrmContact;
  projects: ProjectOption[];
  offers: LinkedOffer[];
  canEdit: boolean;
  /** saves the changed fields on the contact row (board + database) */
  onSave: (patch: Partial<CrmContact>) => Promise<void> | void;
  /** creates the offer on the Offers board and returns the row it made */
  onCreateOffer: (projectName: string | null) => Promise<{ id: string; name: string } | { error: string }>;
  onClose: () => void;
  onToast?: (message: string, tone?: "success" | "alert") => void;
}) {
  const [draft, setDraft] = useState<NegotiationValue>({
    first_negotiation_at: contact.first_negotiation_at,
    negotiation_channel: contact.negotiation_channel ?? null,
    negotiation_resident: contact.negotiation_resident ?? null,
    negotiation_purpose: contact.negotiation_purpose ?? null,
    negotiation_purpose_other: contact.negotiation_purpose_other ?? null,
    negotiation_has_offer: contact.negotiation_has_offer ?? null,
    negotiation_alt_project: contact.negotiation_alt_project ?? null,
    negotiation_alt_project_id: contact.negotiation_alt_project_id ?? null,
    negotiation_readiness: contact.negotiation_readiness ?? null,
    first_negotiation_note: contact.first_negotiation_note ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [madeOffers, setMadeOffers] = useState<LinkedOffer[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof NegotiationValue>(key: K, value: NegotiationValue[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  /** only what actually changed — an untouched field must not be written */
  const changedPatch = (): Partial<CrmContact> => {
    const patch: Record<string, unknown> = {};
    const current = draft as unknown as Record<string, unknown>;
    const row = contact as unknown as Record<string, unknown>;
    for (const key of Object.keys(draft) as (keyof NegotiationValue)[]) {
      const next = key === "first_negotiation_note" || key === "negotiation_purpose_other"
        ? ((current[key] as string | null)?.trim() || null)
        : (current[key] ?? null);
      if (next !== (row[key] ?? null)) patch[key] = next;
    }
    return patch as Partial<CrmContact>;
  };

  const persist = async () => {
    const patch = changedPatch();
    if (Object.keys(patch).length === 0) return;
    await onSave(patch);
  };

  const save = async () => {
    setSaving(true);
    await persist();
    setSaving(false);
    onClose();
  };

  const createOffer = async () => {
    setCreating(true);
    // the answers go in first: the offer is built from this client's demand,
    // and an agent who creates then closes must not lose the call
    await persist();
    const result = await onCreateOffer(draft.negotiation_alt_project);
    setCreating(false);
    if ("error" in result) {
      onToast?.(result.error, "alert");
      return;
    }
    setMadeOffers((prev) => [...prev, { id: result.id, name: result.name, stage: null }]);
    onToast?.(`Offer created on the Offers board — “${result.name}”`);
  };

  const allOffers = [...offers, ...madeOffers.filter((m) => !offers.some((o) => o.id === m.id))];
  const answered = answeredCount(draft);
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
      aria-label={`First negotiation — ${contact.name}`}
    >
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/35" />
      <div className="thin-scroll relative flex max-h-[92vh] w-[620px] max-w-full flex-col overflow-y-auto rounded-[12px] bg-white shadow-[0px_15px_50px_rgba(0,0,0,0.3)]">
        {/* header: who, and what they asked for — the answers below are read against it */}
        <div className="sticky top-0 z-[1] flex items-start gap-[12px] border-b border-line bg-white px-[22px] pb-[14px] pt-[18px]">
          <span className="mt-[2px] flex size-[34px] shrink-0 items-center justify-center rounded-full bg-teal-deep/12" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v6A2.5 2.5 0 0 1 14.5 14H8l-4 3v-3H5.5"
                stroke="#00718a"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="m-0 font-display text-[18px] font-medium leading-[24px] text-ink">
              First negotiation — {contact.name}
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

        <div className="px-[22px] pb-[20px] pt-[16px]">
          {/* the call itself */}
          <div className="grid grid-cols-2 gap-x-[14px] gap-y-[12px]">
            <Field label="Date of the negotiation">
              <input
                type="date"
                disabled={!canEdit}
                value={draft.first_negotiation_at ?? ""}
                onChange={(e) => set("first_negotiation_at", e.target.value ? toLocalDateString(e.target.value) : null)}
                className="h-[36px] w-full rounded-[6px] border border-line-strong px-[10px] font-sans text-[13.5px] text-ink outline-none focus:border-teal-deep disabled:bg-canvas"
              />
            </Field>
            <Dropdown
              label="First contact type"
              placeholder="How did we speak first?"
              options={NEGOTIATION_CHANNELS}
              value={draft.negotiation_channel}
              disabled={!canEdit}
              onPick={(key) => set("negotiation_channel", key)}
            />
            <Dropdown
              label="Lives in Oman"
              placeholder="Resident?"
              options={YES_NO}
              value={boolKey(draft.negotiation_resident)}
              disabled={!canEdit}
              onPick={(key) => set("negotiation_resident", keyBool(key))}
            />
            <Dropdown
              label="Purpose of buying"
              placeholder="Why are they buying?"
              options={NEGOTIATION_PURPOSES}
              value={draft.negotiation_purpose}
              disabled={!canEdit}
              onPick={(key) => set("negotiation_purpose", key)}
            />
            {draft.negotiation_purpose === "other" && (
              <div className="col-span-2">
                <Field label="Purpose — in their own words">
                  <input
                    disabled={!canEdit}
                    value={draft.negotiation_purpose_other ?? ""}
                    onChange={(e) => set("negotiation_purpose_other", e.target.value)}
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
              value={draft.negotiation_readiness}
              disabled={!canEdit}
              onPick={(key) => set("negotiation_readiness", key)}
            />
            <Dropdown
              label="Do we have a matching offer?"
              placeholder="Against what they asked for"
              options={YES_NO}
              value={boolKey(draft.negotiation_has_offer)}
              disabled={!canEdit}
              onPick={(key) => set("negotiation_has_offer", keyBool(key))}
            />
          </div>

          {/* yes → make the offer here; no → say what we suggested instead */}
          {draft.negotiation_has_offer === true && (
            <div className="mt-[14px] rounded-[10px] border border-[#00c875]/40 bg-[#00c875]/8 px-[14px] py-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-[10px]">
                <div className="min-w-0">
                  <p className="m-0 font-sans text-[13px] font-semibold text-ink">We hold something that fits</p>
                  <p className="m-0 pt-[2px] font-sans text-[12px] leading-[17px] text-ink-muted">
                    Creating it here puts a real row on the Offers board, linked to this client and pre-filled with the
                    demand above.
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
              {draft.negotiation_alt_project && (
                // picked while the answer was still "no" — shown rather than
                // silently kept, and the offer created here carries it
                <p className="m-0 pt-[8px] font-sans text-[11.5px] leading-[16px] text-ink-muted">
                  Project on file for this client: {draft.negotiation_alt_project}
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

          {draft.negotiation_has_offer === false && (
            <div className="mt-[14px] rounded-[10px] border border-[#fdab3d]/50 bg-[#fdab3d]/10 px-[14px] py-[12px]">
              <p className="m-0 pb-[8px] font-sans text-[13px] font-semibold text-ink">What did we suggest instead?</p>
              <ProjectDropdown
                projects={projects}
                value={draft.negotiation_alt_project}
                disabled={!canEdit}
                onPick={(project) => {
                  set("negotiation_alt_project", project?.name ?? null);
                  set("negotiation_alt_project_id", project?.id ?? null);
                }}
              />
              <p className="m-0 pt-[6px] font-sans text-[11.5px] leading-[16px] text-ink-muted">
                The list is the Developments board — every project of every developer company on Accounts.
              </p>
            </div>
          )}

          {/* everything the options cannot hold */}
          <div className="mt-[14px]">
            <Field label="Notes from the call">
              <textarea
                disabled={!canEdit}
                value={draft.first_negotiation_note ?? ""}
                onChange={(e) => set("first_negotiation_note", e.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="Anything the answers above do not cover: what they objected to, who decides, when they can travel, what we promised to send…"
                className="w-full resize-y rounded-[6px] border border-line-strong px-[10px] py-[8px] font-sans text-[13.5px] leading-[20px] text-ink outline-none placeholder:text-ink-muted focus:border-teal-deep disabled:bg-canvas"
              />
            </Field>
          </div>

          {!canEdit && (
            <p className="m-0 pt-[10px] font-sans text-[12.5px] text-ink-muted">
              This client belongs to another member, so the negotiation is read-only for you.
            </p>
          )}

          <div className="mt-[16px] flex items-center justify-between gap-[8px]">
            <span className="font-sans text-[11.5px] text-ink-muted">
              {contact.first_negotiation_at ? `First negotiated ${shortDate(contact.first_negotiation_at)}` : ""}
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
      </div>
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
            style={{ ...(pos ? { left: pos.left, top: pos.top, width: pos.width } : { visibility: "hidden" }), maxHeight: PANEL_MAX_H }}
            className="thin-scroll fixed z-[98] min-w-[220px] overflow-y-auto rounded-[8px] border border-line bg-white py-[4px] shadow-[0px_12px_32px_rgba(0,0,0,0.22)]"
          >
            {children(() => setOpen(false))}
          </div>,
          document.body
        )}
    </span>
  );
}
