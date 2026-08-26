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
import type { CrmProject, CrmProjectGroup, CrmUser } from "@/lib/types";
import {
  BatteryBar,
  Checkbox,
  InlineEdit,
  OwnerCell,
} from "@/components/crm/leads/cells";
import { OptionCell, TextCell } from "@/components/crm/contacts/contact-cells";
import { CONNECTED_UNDERLINE } from "@/components/crm/contacts/contacts-config";
import { ChipCell, NumberCell } from "@/components/crm/deals/deal-cells";
import { money } from "@/components/crm/deals/deals-config";
import {
  PROJECT_COLUMNS,
  PROJECT_NAME_COL_W,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
} from "./projects-config";
import { TimelineRangeCell } from "./project-cells";
import { RowTools, dropTargetProps, type RowToolsConfig } from "@/components/crm/row-tools";
import { DeleteIcon } from "@/components/ui/DeleteIcon";

const ROW_H = 36;

export function ProjectGroup({
  group,
  projects,
  users,
  isNew = false,
  customColumns,
  profile,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onToggleCollapse,
  onRenameGroup,
  onDeleteGroup,
  onPatchProject,
  onAddProject,
  tools,
}: {
  group: CrmProjectGroup;
  projects: CrmProject[];
  users: CrmUser[];
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
  onPatchProject: (projectId: string, patch: Partial<CrmProject>) => void;
  onAddProject: (name: string) => void;
  tools?: RowToolsConfig;
}) {
  const [collapsed, setCollapsed] = useState(group.is_collapsed);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addDraft, setAddDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: bodyRef });

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

  const statusSegments = PROJECT_STATUSES.map((s) => ({
    color: s.color,
    count: projects.filter((p) => p.status === s.key).length,
  })).filter((s) => s.count > 0);

  const totalValue = projects.reduce((s, p) => s + (Number(p.project_value) || 0), 0);

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
          {projects.length} Projects
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
              style={{ width: PROJECT_NAME_COL_W }}
            >
              <span
                className="w-[6px] shrink-0 rounded-tl-[6px]"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex items-center border-b border-r border-t border-line pl-[8px] pr-[9px]">
                <Checkbox
                  label="Select all in group"
                  checked={projects.length > 0 && selected.size === projects.length}
                  onChange={() =>
                    setSelected(
                      selected.size === projects.length
                        ? new Set()
                        : new Set(projects.map((p) => p.id))
                    )
                  }
                />
              </span>
              <span className="flex flex-1 items-center justify-center border-b border-r border-t border-line font-sans text-[14px] leading-[20px] text-ink">
                Project
              </span>
            </div>
            {PROJECT_COLUMNS.map((col) => (
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
          {projects.map((project) => (
            <div
              key={project.id}
              className="group/row relative flex w-fit items-stretch"
              style={{ height: ROW_H }}
            {...dropTargetProps(tools, group.id, project.id)}
            >
              {tools && <RowTools row={project} tools={tools} />}
              <div
                className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white"
                style={{ width: PROJECT_NAME_COL_W }}
              >
                <span className="w-[6px] shrink-0" style={{ backgroundColor: group.color }} />
                <span className="flex items-center border-b border-r border-line pl-[8px] pr-[9px]">
                  <Checkbox
                    label={`Select ${project.name}`}
                    checked={selected.has(project.id)}
                    onChange={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(project.id)) next.delete(project.id);
                        else next.add(project.id);
                        return next;
                      })
                    }
                  />
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between border-b border-r border-line px-[6px] transition-colors group-hover/row:bg-canvas">
                  <InlineEdit
                    value={project.name}
                    onSave={(name) => onPatchProject(project.id, { name })}
                    className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-ink"
                  />
                  <button
                    type="button"
                    aria-label={`Open ${project.name}`}
                    className="flex size-[24px] shrink-0 items-center justify-center rounded-[4px] opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/row:opacity-100"
                  >
                    <Icon name="rowOpen" size={16} />
                  </button>
                </span>
              </div>

              {PROJECT_COLUMNS.map((col) => {
                const w = { width: col.w };
                switch (col.key) {
                  case "owner":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <OwnerCell
                          owner={users.find((u) => u.id === project.owner_id)}
                          users={users}
                          onSelect={(ownerId) => onPatchProject(project.id, { owner_id: ownerId })}
                        />
                      </span>
                    );
                  case "status":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <OptionCell
                          value={project.status}
                          options={PROJECT_STATUSES}
                          onSelect={(next) => onPatchProject(project.id, { status: next })}
                        />
                      </span>
                    );
                  case "timeline":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <TimelineRangeCell
                          start={project.start_date}
                          end={project.end_date}
                          color={group.color}
                          onSave={(start_date, end_date) =>
                            onPatchProject(project.id, { start_date, end_date })
                          }
                        />
                      </span>
                    );
                  case "priority":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <OptionCell
                          value={project.priority}
                          options={PROJECT_PRIORITIES}
                          onSelect={(next) => onPatchProject(project.id, { priority: next })}
                        />
                      </span>
                    );
                  case "value":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <NumberCell
                          value={project.project_value}
                          format={money}
                          onSave={(next) => onPatchProject(project.id, { project_value: next })}
                        />
                      </span>
                    );
                  case "account":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <ChipCell
                          value={project.account_name}
                          kind="account"
                          onSave={(next) =>
                            onPatchProject(project.id, { account_name: next || null })
                          }
                        />
                      </span>
                    );
                  case "notes":
                    return (
                      <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                        <TextCell
                          value={project.notes}
                          onSave={(next) => onPatchProject(project.id, { notes: next || null })}
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
                  value={(project.custom ?? {})[col.key]}
                  users={users}
                  onSave={(next) =>
                    onPatchProject(project.id, {
                      custom: { ...(project.custom ?? {}), [col.key]: next },
                    })
                  }
                />
              ))}
              <span className="w-[40px] border-b border-line bg-white" />
            </div>
          ))}

          {/* add project row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }} {...dropTargetProps(tools, group.id, null)}>
            <div
              className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: PROJECT_NAME_COL_W }}
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
                      onAddProject(addDraft);
                      setAddDraft("");
                    }
                  }}
                  placeholder="+ Add project"
                  className="h-[24px] w-full min-w-[200px] rounded-[4px] bg-transparent px-[4px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border focus:border-teal-deep focus:bg-white"
                />
              </span>
            </div>
            <span
              className="border-b border-line bg-white"
              style={{ width: PROJECT_COLUMNS.reduce((s, c) => s + c.w, 0) + customColumns.length * CUSTOM_COL_W + 40 }}
            />
          </div>

          {/* summary row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }}>
            <span
              className="gutter-cover sticky left-0 z-10 block bg-white"
              style={{ width: PROJECT_NAME_COL_W }}
            />
            {PROJECT_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="flex flex-col items-center justify-center border-b border-r border-line bg-white"
                style={{ width: col.w }}
              >
                {col.key === "status" && statusSegments.length > 0 && (
                  <BatteryBar segments={statusSegments} />
                )}
                {col.key === "value" && totalValue > 0 && (
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
