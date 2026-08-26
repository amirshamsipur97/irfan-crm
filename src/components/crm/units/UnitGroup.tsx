"use client";

import type { CrmCustomColumn, CustomColumnType } from "@/lib/custom-columns";
import { CUSTOM_COL_W } from "@/lib/custom-columns";
import {
  AddColumnButton,
  CustomColumnHeader,
  CustomValueCell,
} from "@/components/crm/custom/custom-columns";
import { isFullAccess } from "@/lib/permissions";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import type { CrmUnit, CrmUnitGroup, CrmUser } from "@/lib/types";
import {
  BatteryBar,
  Checkbox,
  InlineEdit,
  OwnerCell,
} from "@/components/crm/leads/cells";
import { OptionCell } from "@/components/crm/contacts/contact-cells";
import { CONNECTED_UNDERLINE } from "@/components/crm/contacts/contacts-config";
import { ConnectPicker, type PickerOption } from "@/components/crm/deals/connect-picker";
import { NumberCell } from "@/components/crm/deals/deal-cells";
import { money } from "@/components/crm/deals/deals-config";
import { TimeCell } from "@/components/crm/activities/activity-cells";
import { toLocalDateString } from "@/components/crm/activities/activities-config";
import { shortDate } from "@/components/crm/leads/board-config";
import { UNIT_COLUMNS, UNIT_NAME_COL_W, UNIT_STATUSES, UNIT_TYPES } from "./units-config";
import { RowTools, dropTargetProps, type RowToolsConfig } from "@/components/crm/row-tools";
import { useActiveRow, useCheckedRow } from "@/components/crm/active-row";
import { DeleteIcon } from "@/components/ui/DeleteIcon";

const ROW_H = 36;

export function UnitGroup({
  group,
  units,
  users,
  developmentOptions,
  isNew = false,
  customColumns,
  profile,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onToggleCollapse,
  onRenameGroup,
  onDeleteGroup,
  onPatch,
  onAdd,
  onCreateDevelopment,
  tools,
}: {
  group: CrmUnitGroup;
  units: CrmUnit[];
  users: CrmUser[];
  developmentOptions: PickerOption[];
  isNew?: boolean;
  customColumns: CrmCustomColumn[];
  profile: CrmUser;
  onAddColumn: (type: CustomColumnType) => void;
  onRenameColumn: (columnId: string, label: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleCollapse: (collapsed: boolean) => void;
  onRenameGroup: (name: string) => void;
  /** present only for admin tier — hides the header trash button otherwise */
  onDeleteGroup?: () => void;
  onPatch: (id: string, patch: Partial<CrmUnit>) => void;
  onAdd: (name: string) => void;
  onCreateDevelopment: (unitId: string, name: string) => void;
  tools?: RowToolsConfig;
}) {
  const [collapsed, setCollapsed] = useState(group.is_collapsed);
  const { isChecked, toggleChecked } = useCheckedRow("units");
  const [addDraft, setAddDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: bodyRef });
  const activeRow = useActiveRow("units");

  const toggleCollapse = contextSafe(() => {
    const next = !collapsed;
    onToggleCollapse(next);
    if (!bodyRef.current) {
      setCollapsed(next);
      return;
    }
    // clip only while the collapse/expand animation runs — a permanent
    // overflow-hidden would clip the row-tools handle in the left gutter
    gsap.set(bodyRef.current, { overflow: "hidden" });
    if (next) {
      gsap.to(bodyRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.inOut",
        onComplete: () => setCollapsed(true),
      });
    } else {
      setCollapsed(false);
      requestAnimationFrame(() => {
        if (!bodyRef.current) return;
        gsap.from(bodyRef.current, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
          clearProps: "all",
          // the sticky column header measures against the board scroll
          // container — a leftover overflow:hidden here would turn this
          // div into the scrollport and silently kill it
          onComplete: () => bodyRef.current?.style.removeProperty("overflow"),
        });
      });
    }
  });

  const statusSegments = UNIT_STATUSES.map((s) => ({
    color: s.color,
    count: units.filter((u) => u.status === s.key).length,
  })).filter((s) => s.count > 0);

  const totalValue = units.reduce((s, u) => s + (Number(u.price) || 0), 0);

  const cellBorder = "border-b border-r border-line";

  return (
    <section className="group w-fit min-w-full pb-[24px]">
      <div className="sticky left-0 z-20 flex h-[40px] w-fit items-center pl-[5px]">
        <button
          type="button"
          aria-label={collapsed ? "Expand group" : "Collapse group"}
          onClick={toggleCollapse}
          className="mx-[2px] flex size-[22px] items-center justify-center rounded-[4px] transition-transform duration-200 hover:bg-[var(--hover-ghost)]"
          style={{ transform: collapsed ? "none" : "rotate(90deg)" }}
        >
          <Icon name="grpChevron" size={22} />
        </button>
        <InlineEdit
          value={group.name}
          onSave={onRenameGroup}
          autoEdit={isNew}
          placeholder="New Group"
          className="font-display text-[18px] font-medium leading-[24px] tracking-[-0.1px]"
          style={{ color: group.color }}
        />
        <span className="pl-[4px] font-sans text-[14px] leading-[22px] text-ink-muted opacity-0 transition-opacity group-hover:opacity-100">
          {units.length} Units
        </span>
        {onDeleteGroup && (
          <button
            type="button"
            aria-label={`Delete group ${group.name}`}
            title="Delete group"
            onClick={onDeleteGroup}
            className="ml-[4px] flex size-[24px] items-center justify-center rounded-[4px] text-ink-muted opacity-0 transition-all hover:bg-[#ffe9ec] hover:text-alert group-hover:opacity-100"
          >
            <DeleteIcon size={15} />
          </button>
        )}
      </div>

      {!collapsed && (
        <div ref={bodyRef} className="w-fit">
          {/* column headers — .board-head paints the 8px band the scroller's
              pt-[8px] leaves above the pinned bar (sticky offsets measure from
              the content box), the same reason .gutter-cover paints the 40px
              lane on the left */}
          <div className="board-head sticky top-0 z-30 flex h-[36px] w-fit items-stretch bg-white">
            <div
              className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: UNIT_NAME_COL_W }}
            >
              <span
                className="w-[6px] shrink-0 rounded-tl-[6px]"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex items-center border-b border-r border-t border-line pl-[8px] pr-[9px]">
                {/* no "select all": one tick per board, so this could only ever put
                    several boxes green at once. The spacer keeps the header lined
                    up with the checkbox column below it. */}
                <span className="size-[16px] shrink-0" />
              </span>
              <span className="flex flex-1 items-center justify-center border-b border-r border-t border-line font-sans text-[14px] leading-[20px] text-ink">
                Unit
              </span>
            </div>
            {UNIT_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="relative flex items-center justify-center gap-[4px] whitespace-nowrap border-b border-r border-t border-line bg-white px-[4px] font-sans text-[14px] leading-[20px] text-ink"
                style={{ width: col.w }}
              >
                {col.label}
                {col.connected && (
                  <span
                    className="absolute inset-x-0 bottom-[-1px] h-[2px]"
                    style={{ backgroundColor: CONNECTED_UNDERLINE }}
                  />
                )}
              </span>
            ))}
            {customColumns.map((col) => (
              <CustomColumnHeader
                key={col.id}
                column={col}
                canDelete={isFullAccess(profile.role)}
                onRename={(label) => onRenameColumn(col.id, label)}
                onDelete={() => onDeleteColumn(col.id)}
              />
            ))}
            <AddColumnButton onAdd={onAddColumn} />
          </div>

          {/* rows */}
          {units.map((unit) => (
            <div
              key={unit.id}
              className="group/row relative flex w-fit items-stretch"
              style={{ height: ROW_H }}
            {...dropTargetProps(tools, group.id, unit.id)} {...activeRow.rowProps(unit.id)}
            >
              {tools && <RowTools row={unit} tools={tools} />}
              <div
                className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white"
                style={{ width: UNIT_NAME_COL_W }}
              >
                <span className="w-[6px] shrink-0" style={{ backgroundColor: group.color }} />
                <span className="flex items-center border-b border-r border-line pl-[8px] pr-[9px]">
                  <Checkbox
                    label={`Select ${unit.name}`}
                    checked={isChecked(unit.id)}
                    onChange={() => toggleChecked(unit.id)}
                  />
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between border-b border-r border-line px-[6px] transition-colors group-hover/row:bg-canvas">
                  <InlineEdit
                    value={unit.name}
                    onSave={(name) => onPatch(unit.id, { name })}
                    className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-ink"
                  />
                  <button
                    type="button"
                    aria-label={`Open ${unit.name}`}
                    className="flex size-[24px] shrink-0 items-center justify-center rounded-[4px] opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/row:opacity-100"
                  >
                    <Icon name="rowOpen" size={16} />
                  </button>
                </span>
              </div>

              {UNIT_COLUMNS.map((col) => {
                const w = { width: col.w };
                switch (col.key) {
                  case "development":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <ConnectPicker
                          value={unit.development_name}
                          options={developmentOptions}
                          entityLabel="development"
                          kind="account"
                          onPick={(name) => onPatch(unit.id, { development_name: name })}
                          onClear={() => onPatch(unit.id, { development_name: null })}
                          onCreate={(name) => onCreateDevelopment(unit.id, name)}
                        />
                      </span>
                    );
                  case "unit_type":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <OptionCell
                          value={unit.unit_type}
                          options={UNIT_TYPES}
                          onSelect={(next) => onPatch(unit.id, { unit_type: next })}
                        />
                      </span>
                    );
                  case "bedrooms":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <NumberCell
                          value={unit.bedrooms}
                          format={(v) => `${v}`}
                          onSave={(next) => onPatch(unit.id, { bedrooms: next })}
                        />
                      </span>
                    );
                  case "area":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <NumberCell
                          value={unit.area_sqm}
                          format={(v) => `${Number(v).toLocaleString("en-US")} m²`}
                          onSave={(next) => onPatch(unit.id, { area_sqm: next })}
                        />
                      </span>
                    );
                  case "price":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <NumberCell
                          value={unit.price}
                          format={money}
                          onSave={(next) => onPatch(unit.id, { price: next })}
                        />
                      </span>
                    );
                  case "status":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <OptionCell
                          value={unit.status}
                          options={UNIT_STATUSES}
                          onSelect={(next) => onPatch(unit.id, { status: next ?? "available" })}
                        />
                      </span>
                    );
                  case "owner":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <OwnerCell
                          owner={users.find((u) => u.id === unit.owner_id)}
                          users={users}
                          onSelect={(ownerId) => onPatch(unit.id, { owner_id: ownerId })}
                        />
                      </span>
                    );
                  case "handover":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <TimeCell
                          value={unit.handover_date}
                          label={`Handover date for ${unit.name}`}
                          format={shortDate}
                          onChange={(iso) =>
                            onPatch(unit.id, { handover_date: toLocalDateString(iso) })
                          }
                        />
                      </span>
                    );
                  default:
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w} />
                    );
                }
              })}
              {customColumns.map((col) => (
                <CustomValueCell
                  key={col.id}
                  column={col}
                  value={(unit.custom ?? {})[col.key]}
                  users={users}
                  onSave={(next) =>
                    onPatch(unit.id, {
                      custom: { ...(unit.custom ?? {}), [col.key]: next },
                    })
                  }
                />
              ))}
              <span className="w-[40px] border-b border-line bg-white" />
            </div>
          ))}

          {/* add row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }} {...dropTargetProps(tools, group.id, null)}>
            <div
              className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: UNIT_NAME_COL_W }}
            >
              <span
                className="w-[6px] shrink-0 rounded-bl-[6px] opacity-50"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex items-center border-b border-r border-line pl-[8px] pr-[9px]">
                <Checkbox label="disabled" disabled />
              </span>
              <span className="flex flex-1 items-center border-b border-line px-[10px]">
                <input
                  value={addDraft}
                  onChange={(e) => setAddDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && addDraft.trim()) {
                      onAdd(addDraft);
                      setAddDraft("");
                    }
                  }}
                  placeholder="+ Add unit"
                  className="h-[24px] w-full min-w-[200px] rounded-[4px] bg-transparent px-[4px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border focus:border-teal-deep focus:bg-white"
                />
              </span>
            </div>
            <span
              className="border-b border-line bg-white"
              style={{ width: UNIT_COLUMNS.reduce((s, c) => s + c.w, 0) + customColumns.length * CUSTOM_COL_W + 40 }}
            />
          </div>

          {/* summary row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }}>
            <span
              className="gutter-cover sticky left-0 z-10 block bg-white"
              style={{ width: UNIT_NAME_COL_W }}
            />
            {UNIT_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="flex flex-col items-center justify-center border-b border-r border-line bg-white"
                style={{ width: col.w }}
              >
                {col.key === "status" && statusSegments.length > 0 && (
                  <BatteryBar segments={statusSegments} />
                )}
                {col.key === "price" && totalValue > 0 && (
                  <>
                    <span className="font-sans text-[14px] leading-[18px] text-ink">
                      {money(totalValue)}
                    </span>
                    <span className="font-sans text-[12px] leading-[14px] text-ink-muted">sum</span>
                  </>
                )}
              </span>
            ))}
            {customColumns.map((col) => (
              <span
                key={col.id}
                className="border-b border-r border-line bg-white"
                style={{ width: CUSTOM_COL_W }}
              />
            ))}
            <span className="w-[40px] border-b border-line bg-white" />
          </div>
        </div>
      )}
    </section>
  );
}
