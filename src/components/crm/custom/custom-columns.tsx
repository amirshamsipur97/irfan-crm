"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Checkbox, InlineEdit, OwnerCell, Popover } from "@/components/crm/leads/cells";
import { OptionCell, TextCell } from "@/components/crm/contacts/contact-cells";
import { NumberCell } from "@/components/crm/deals/deal-cells";
import { TimeCell } from "@/components/crm/activities/activity-cells";
import { toLocalDateString } from "@/components/crm/activities/activities-config";
import { shortDate } from "@/components/crm/leads/board-config";
import type { CrmUser } from "@/lib/types";
import type { CrmCustomColumn, CustomColumnType } from "@/lib/custom-columns";
import { COLUMN_MENU, CUSTOM_COL_W, DEFAULT_LABELS } from "@/lib/custom-columns";

const TYPE_TILE_COLORS: Record<CustomColumnType, string> = {
  status: "#00c875",
  dropdown: "#00ca72",
  text: "#fdab3d",
  date: "#a25ddc",
  people: "#66ccff",
  number: "#fdab3d",
  checkbox: "#fdab3d",
  priority: "#ffcb00",
};

/** Monday-style "+" header button with the add-column menu. */
export function AddColumnButton({ onAdd }: { onAdd: (type: CustomColumnType) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const sections = COLUMN_MENU.map((s) => ({
    ...s,
    items: s.items.filter(
      (i) => !q || DEFAULT_LABELS[i.type].toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)
    ),
  })).filter((s) => s.items.length > 0);

  return (
    <span className="relative flex w-[40px] items-center justify-center border-b border-t border-line bg-white">
      <button
        type="button"
        aria-label="Add column"
        onClick={() => setOpen((v) => !v)}
        className="flex size-[28px] items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
      >
        <Icon name="tlAdd" size={16} />
      </button>
      <Popover open={open} onClose={() => { setOpen(false); setQuery(""); }} className="w-[340px]" align="right">
        <div className="p-[8px]">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or describe your column"
            className="mb-[8px] h-[34px] w-full rounded-[4px] border border-line-strong px-[10px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
          />
          {sections.length === 0 && (
            <p className="m-0 py-[12px] text-center font-sans text-[13px] text-ink-muted">
              No matching column type
            </p>
          )}
          {sections.map((section) => (
            <div key={section.section} className="pb-[6px]">
              <p className="m-0 px-[4px] pb-[4px] pt-[6px] font-sans text-[12px] leading-[16px] text-ink-muted">
                {section.section}
              </p>
              <div className="grid grid-cols-2 gap-[2px]">
                {section.items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    title={item.hint}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      onAdd(item.type);
                    }}
                    className="flex items-center gap-[8px] rounded-[4px] px-[8px] py-[7px] text-left transition-colors hover:bg-[var(--hover-ghost)]"
                  >
                    <span
                      className="flex size-[22px] shrink-0 items-center justify-center rounded-[4px] font-sans text-[11px] font-bold text-white"
                      style={{ backgroundColor: TYPE_TILE_COLORS[item.type] }}
                    >
                      {DEFAULT_LABELS[item.type][0]}
                    </span>
                    <span className="font-sans text-[13.5px] leading-[18px] text-ink">
                      {DEFAULT_LABELS[item.type]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Popover>
    </span>
  );
}

/** Header cell for a user-defined column: rename inline, delete on hover (full tier). */
export function CustomColumnHeader({
  column,
  canDelete,
  onRename,
  onDelete,
}: {
  column: CrmCustomColumn;
  canDelete: boolean;
  onRename: (label: string) => void;
  onDelete: () => void;
}) {
  return (
    <span
      className="group/cch relative flex items-center justify-center gap-[4px] whitespace-nowrap border-b border-r border-t border-line bg-white px-[4px] font-sans text-[14px] leading-[20px] text-ink"
      style={{ width: CUSTOM_COL_W }}
    >
      <InlineEdit
        value={column.label}
        onSave={onRename}
        placeholder="Column"
        className="max-w-[110px] text-center font-sans text-[14px] leading-[20px] text-ink"
      />
      {canDelete && (
        <button
          type="button"
          aria-label={`Delete column ${column.label}`}
          onClick={onDelete}
          className="absolute right-[2px] top-1/2 flex size-[18px] -translate-y-1/2 items-center justify-center rounded-[4px] text-ink-muted opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/cch:opacity-100"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}

/** Value cell for a user-defined column — dispatches to the shared cell kit. */
export function CustomValueCell({
  column,
  value,
  users,
  onSave,
}: {
  column: CrmCustomColumn;
  value: unknown;
  users: CrmUser[];
  onSave: (next: unknown) => void;
}) {
  const border = "border-b border-r border-line";
  const w = { width: CUSTOM_COL_W };

  switch (column.type) {
    case "text":
      return (
        <span className={`${border} block bg-white`} style={w}>
          <TextCell value={(value as string) ?? null} onSave={(next) => onSave(next || null)} />
        </span>
      );
    case "number":
      return (
        <span className={`${border} block bg-white`} style={w}>
          <NumberCell
            value={(value as number) ?? null}
            format={(v) => `${Number(v).toLocaleString("en-US")}`}
            onSave={(next) => onSave(next)}
          />
        </span>
      );
    case "status":
    case "dropdown":
    case "priority":
      return (
        <span className={`${border} block bg-white`} style={w}>
          <OptionCell
            value={(value as string) ?? null}
            options={column.options ?? []}
            onSelect={(next) => onSave(next)}
          />
        </span>
      );
    case "date":
      return (
        <span className={`${border} block bg-white`} style={w}>
          <TimeCell
            value={(value as string) ?? null}
            label={`${column.label} date`}
            format={shortDate}
            onChange={(iso) => onSave(toLocalDateString(iso))}
          />
        </span>
      );
    case "people":
      return (
        <span className={`${border} block bg-white`} style={w}>
          <OwnerCell
            owner={users.find((u) => u.id === value)}
            users={users}
            onSelect={(ownerId) => onSave(ownerId)}
          />
        </span>
      );
    case "checkbox":
      return (
        <span className={`${border} flex items-center justify-center bg-white`} style={w}>
          <Checkbox
            label={column.label}
            checked={Boolean(value)}
            onChange={() => onSave(!value)}
          />
        </span>
      );
    default:
      return <span className={`${border} block bg-white`} style={w} />;
  }
}
