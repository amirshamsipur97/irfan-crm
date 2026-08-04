"use client";

import { useState } from "react";
import {
  DEFAULT_DIAL,
  PhoneFields,
  cleanNumber,
  countryFor,
  dialFlagFor,
} from "@/components/crm/phone-input";
import { InlineEdit, Popover } from "./cells";

/** Gray pencil chip — appears when the CELL is hovered (Monday style). */
export function PencilChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="ml-[4px] flex size-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#eceef2] opacity-0 transition-opacity duration-100 hover:bg-[#dde1e9] group-hover/cell:opacity-100"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M10.6 2.9l2.5 2.5L6 12.5l-3.2.7.7-3.2 7.1-7.1z"
          stroke="#323338"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** Email cell — mailto link + Monday-style "Add email address / Add text to display" popover. */
export function EmailCell({
  email,
  label,
  onSave,
  onSend,
}: {
  email: string | null;
  label: string | null;
  onSave: (email: string | null, label: string | null) => void;
  /** when provided, a hover ✉ chip opens the in-CRM email composer */
  onSend?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [labelDraft, setLabelDraft] = useState("");

  const display = label?.trim() || email || "";

  const openEditor = () => {
    setEmailDraft(email ?? "");
    setLabelDraft(display);
    setOpen(true);
  };

  const commit = () => {
    setOpen(false);
    const nextEmail = emailDraft.trim() || null;
    const nextLabel = labelDraft.trim() || null;
    if (nextEmail !== (email ?? null) || (nextLabel ?? "") !== (label?.trim() ?? "")) {
      onSave(nextEmail, nextLabel);
    }
  };

  const inputCls =
    "h-[36px] w-full rounded-[4px] border border-teal-deep bg-white px-[10px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted";

  return (
    <div className="group/cell relative flex size-full items-center justify-center px-[8px]">
      {email ? (
        <>
          <a
            href={`mailto:${email}`}
            className="truncate font-sans text-[14px] leading-[20px] text-link hover:underline"
            title={email}
          >
            {display}
          </a>
          {onSend && (
            <button
              type="button"
              aria-label={`Send email to ${email}`}
              onClick={onSend}
              className="ml-[4px] flex size-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#eceef2] opacity-0 transition-opacity duration-100 hover:bg-[#dde1e9] group-hover/cell:opacity-100"
            >
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="#323338" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="2" y="3.8" width="14" height="10.4" rx="1.6" />
                <path d="M2.6 4.6L9 9.6l6.4-5" />
              </svg>
            </button>
          )}
          <PencilChip label="Edit email" onClick={openEditor} />
        </>
      ) : (
        <button
          type="button"
          onClick={openEditor}
          className="flex size-full items-center justify-center font-sans text-[14px] text-transparent transition-colors hover:text-ink-muted"
        >
          +
        </button>
      )}

      <Popover open={open} onClose={commit} className="w-[300px] p-[16px]">
        <p className="pb-[6px] font-sans text-[14px] font-medium leading-[20px] text-ink">
          Add email address
        </p>
        <input
          autoFocus
          type="email"
          value={emailDraft}
          onChange={(e) => setEmailDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="name@company.com"
          className={inputCls}
        />
        <p className="pb-[6px] pt-[14px] font-sans text-[14px] font-medium leading-[20px] text-ink">
          Add text to display
        </p>
        <input
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={emailDraft || "Display text"}
          className={inputCls.replace(
            "border-teal-deep",
            "border-line-strong focus:border-teal-deep"
          )}
        />
      </Popover>
    </div>
  );
}

/** Phone cell — tel link, inline editable number (keeps the country code). */
export function PhoneCell({
  phone,
  countryCode,
  onSave,
}: {
  phone: string | null;
  countryCode: string | null;
  /** country code and number are stored separately, never as one string */
  onSave: (phone: string | null, countryCode: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dial, setDial] = useState(countryCode ?? DEFAULT_DIAL);
  const [number, setNumber] = useState(phone ?? "");

  const start = () => {
    setDial(countryCode ?? DEFAULT_DIAL);
    setNumber(phone ?? "");
    setOpen(true);
  };

  const commit = () => {
    setOpen(false);
    const nextNumber = cleanNumber(number) || null;
    const nextDial = nextNumber ? dial : null;
    if (nextNumber !== (phone ?? null) || nextDial !== (countryCode ?? null)) {
      onSave(nextNumber, nextDial);
    }
  };

  return (
    <span className="group/cell relative flex size-full items-center justify-center gap-[4px] px-[8px]">
      {phone ? (
        <>
          <span aria-hidden>{dialFlagFor(countryCode)}</span>
          <a
            href={`tel:${countryCode ?? ""}${phone}`}
            className="truncate font-sans text-[14px] leading-[20px] text-link hover:underline"
            title={countryFor(countryCode)?.name ?? undefined}
          >
            {countryCode ? `${countryCode} ` : ""}
            {phone}
          </a>
          <PencilChip label="Edit phone" onClick={start} />
        </>
      ) : (
        <button
          type="button"
          onClick={start}
          className="flex size-full items-center justify-center font-sans text-[14px] text-transparent transition-colors hover:bg-[var(--hover-ghost)] hover:text-ink-muted"
        >
          +
        </button>
      )}

      <Popover open={open} onClose={commit} className="w-[300px]">
        <p className="m-0 pb-[6px] font-sans text-[12px] leading-[16px] text-ink-muted">
          Pick the country, then type the number
        </p>
        <PhoneFields
          dial={dial}
          number={number}
          onDialChange={setDial}
          onNumberChange={setNumber}
          onEnter={commit}
        />
        <div className="flex justify-end gap-[6px] pt-[10px]">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-[28px] rounded-[4px] border border-line-strong px-[10px] font-sans text-[12px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            className="h-[28px] rounded-[4px] bg-teal-deep px-[12px] font-sans text-[12px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </div>
      </Popover>
    </span>
  );
}

/** Centered inline-editable text cell (Company / Title). Pass
 *  align="start" for long-text columns so the START of the text shows. */
export function CenterEditCell({
  value,
  onSave,
  align = "center",
}: {
  value: string | null;
  onSave: (next: string | null) => void;
  align?: "center" | "start";
}) {
  return (
    <span className="flex size-full items-center justify-center">
      <InlineEdit
        fill
        align={align}
        value={value ?? ""}
        onSave={(next) => onSave(next.trim() || null)}
        placeholder=""
        className="font-sans text-[14px] leading-[20px] text-ink"
      />
    </span>
  );
}

/** Move to Contacts — green button that turns into a check once moved. */
export function MoveToContactsCell({
  moved,
  onMove,
}: {
  moved: boolean;
  onMove: () => void;
}) {
  if (moved) {
    return (
      <span className="flex size-full items-center justify-center" title="Moved to Contacts">
        <span className="flex size-[24px] items-center justify-center rounded-full bg-brand">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M2.6 7.4l3 3L11.4 4"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onMove}
      className="h-[28px] w-full rounded-[4px] bg-brand font-sans text-[14px] leading-[20px] text-white transition-colors hover:bg-[#00b168]"
    >
      Move to Contacts
    </button>
  );
}
