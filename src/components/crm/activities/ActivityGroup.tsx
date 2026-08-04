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
import type { CrmActivityGroup, CrmActivityItem, CrmUser } from "@/lib/types";
import {
  BatteryBar,
  Checkbox,
  InlineEdit,
  OwnerCell,
} from "@/components/crm/leads/cells";
import { OptionCell } from "@/components/crm/contacts/contact-cells";
import {
  ACTIVITY_COLUMNS,
  ACTIVITY_NAME_COL_W,
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
} from "./activities-config";
import { RelatedItemCell, TimeCell } from "./activity-cells";
import { RowTools, dropTargetProps, type RowToolsConfig } from "@/components/crm/row-tools";
import { DeleteIcon } from "@/components/ui/DeleteIcon";

export function ActivityGroup({
  group,
  activities,
  users,
  rowH = 36,
  isNew = false,
  customColumns,
  profile,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onToggleCollapse,
  onRenameGroup,
  onDeleteGroup,
  onPatchActivity,
  onAddActivity,
  tools,
}: {
  group: CrmActivityGroup;
  activities: CrmActivityItem[];
  users: CrmUser[];
  /** row height from the board's Item height setting */
  rowH?: number;
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
  onPatchActivity: (activityId: string, patch: Partial<CrmActivityItem>) => void;
  onAddActivity: (name: string) => void;
  tools?: RowToolsConfig;
}) {
  const ROW_H = rowH;
  const [collapsed, setCollapsed] = useState(group.is_collapsed);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addDraft, setAddDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: bodyRef });

  const userById = new Map(users.map((u) => [u.id, u]));

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
        });
      });
    }
  });

  const statusSegments = [
    ...ACTIVITY_STATUSES.map((s) => ({
      color: s.color,
      count: activities.filter((a) => a.status === s.key).length,
    })),
    { color: "#c4c4c4", count: activities.filter((a) => !a.status).length },
  ].filter((s) => s.count > 0);

  const cellBorder = "border-b border-r border-line";

  return (
    <section className="group pb-[24px]">
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
          {activities.length} Activities
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
          {/* column headers */}
          <div className="flex h-[36px] w-fit items-stretch">
            <div
              className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: ACTIVITY_NAME_COL_W }}
            >
              <span
                className="w-[6px] shrink-0 rounded-tl-[6px]"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex items-center border-b border-r border-t border-line pl-[8px] pr-[9px]">
                <Checkbox
                  label="Select all in group"
                  checked={activities.length > 0 && selected.size === activities.length}
                  onChange={() =>
                    setSelected(
                      selected.size === activities.length
                        ? new Set()
                        : new Set(activities.map((a) => a.id))
                    )
                  }
                />
              </span>
              <span className="flex flex-1 items-center justify-center border-b border-r border-t border-line font-sans text-[14px] leading-[20px] text-ink">
                Activity
              </span>
            </div>
            {ACTIVITY_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="flex items-center justify-center gap-[4px] whitespace-nowrap border-b border-r border-t border-line bg-white px-[4px] font-sans text-[14px] leading-[20px] text-ink"
                style={{ width: col.w }}
              >
                {col.label}
                {col.key === "related" && <Icon name="tblInfo" size={14} className="opacity-70" />}
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
          {activities.map((activity) => {
            const owner = activity.owner_id ? userById.get(activity.owner_id) : undefined;
            return (
              <div
                key={activity.id}
                className="group/row relative flex w-fit items-stretch"
                style={{ height: ROW_H }}
              {...dropTargetProps(tools, group.id, activity.id)}
              >
                {tools && <RowTools row={activity} tools={tools} />}
                <div
                  className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white"
                  style={{ width: ACTIVITY_NAME_COL_W }}
                >
                  <span className="w-[6px] shrink-0" style={{ backgroundColor: group.color }} />
                  <span className="flex items-center border-b border-r border-line pl-[8px] pr-[9px]">
                    <Checkbox
                      label={`Select ${activity.name}`}
                      checked={selected.has(activity.id)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(activity.id)) next.delete(activity.id);
                          else next.add(activity.id);
                          return next;
                        })
                      }
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between border-b border-r border-line px-[6px] transition-colors group-hover/row:bg-canvas">
                    <InlineEdit
                      value={activity.name}
                      onSave={(name) => onPatchActivity(activity.id, { name })}
                      className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-ink"
                    />
                    <button
                      type="button"
                      aria-label={`Open ${activity.name}`}
                      className="flex size-[24px] shrink-0 items-center justify-center rounded-[4px] opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/row:opacity-100"
                    >
                      <Icon name="rowOpen" size={16} />
                    </button>
                  </span>
                </div>

                {ACTIVITY_COLUMNS.map((col) => {
                  const w = { width: col.w };
                  switch (col.key) {
                    case "owner":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <OwnerCell
                            owner={owner}
                            users={users}
                            onSelect={(ownerId) =>
                              onPatchActivity(activity.id, { owner_id: ownerId })
                            }
                          />
                        </span>
                      );
                    case "type":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <OptionCell
                            value={activity.activity_type}
                            options={ACTIVITY_TYPES}
                            onSelect={(next) =>
                              onPatchActivity(activity.id, { activity_type: next })
                            }
                          />
                        </span>
                      );
                    case "start":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <TimeCell
                            value={activity.start_at}
                            label="Start time"
                            onChange={(iso) => onPatchActivity(activity.id, { start_at: iso })}
                          />
                        </span>
                      );
                    case "end":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <TimeCell
                            value={activity.end_at}
                            label="End time"
                            onChange={(iso) => onPatchActivity(activity.id, { end_at: iso })}
                          />
                        </span>
                      );
                    case "status":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <OptionCell
                            value={activity.status}
                            options={ACTIVITY_STATUSES}
                            onSelect={(next) => onPatchActivity(activity.id, { status: next })}
                          />
                        </span>
                      );
                    case "related":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <RelatedItemCell
                            value={activity.related_item}
                            onSave={(next) =>
                              onPatchActivity(activity.id, { related_item: next || null })
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
                    value={(activity.custom ?? {})[col.key]}
                    users={users}
                    onSave={(next) =>
                      onPatchActivity(activity.id, {
                        custom: { ...(activity.custom ?? {}), [col.key]: next },
                      })
                    }
                  />
                ))}
                <span className="w-[40px] border-b border-line bg-white" />
              </div>
            );
          })}

          {/* add activity row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }} {...dropTargetProps(tools, group.id, null)}>
            <div
              className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: ACTIVITY_NAME_COL_W }}
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
                      onAddActivity(addDraft);
                      setAddDraft("");
                    }
                  }}
                  placeholder="+ Add activity"
                  className="h-[24px] w-full min-w-[200px] rounded-[4px] bg-transparent px-[4px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border focus:border-teal-deep focus:bg-white"
                />
              </span>
            </div>
            <span
              className="border-b border-line bg-white"
              style={{ width: ACTIVITY_COLUMNS.reduce((s, c) => s + c.w, 0) + customColumns.length * CUSTOM_COL_W + 40 }}
            />
          </div>

          {/* summary row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }}>
            <span
              className="gutter-cover sticky left-0 z-10 block bg-white"
              style={{ width: ACTIVITY_NAME_COL_W }}
            />
            {ACTIVITY_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="flex items-center justify-center border-b border-r border-line bg-white"
                style={{ width: col.w }}
              >
                {col.key === "status" && statusSegments.length > 0 && (
                  <BatteryBar segments={statusSegments} />
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
