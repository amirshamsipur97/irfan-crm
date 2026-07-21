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
import type { CrmLead, CrmLeadGroup, CrmStage, CrmUser } from "@/lib/types";
import {
  BOARD_COLUMNS,
  NAME_COL_W,
  dialFlag,
  shortDate,
  sourceColor,
} from "./board-config";
import {
  BatteryBar,
  Checkbox,
  InlineEdit,
  OwnerCell,
  StatusCell,
  TimelineCell,
} from "./cells";
import {
  ActivityComposer,
  ActivityLogMenu,
  type LogPayload,
} from "@/components/crm/deals/activity-log";
import { TimeCell } from "@/components/crm/activities/activity-cells";
import { CenterEditCell, EmailCell, MoveToContactsCell, PhoneCell } from "./lead-cells";
import { RowTools, dropTargetProps, type RowToolsConfig } from "@/components/crm/row-tools";

const ROW_H = 36;

export function LeadGroup({
  group,
  leads,
  stages,
  users,
  isNew = false,
  customColumns,
  profile,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onToggleCollapse,
  onRenameGroup,
  onRenameLead,
  onStageChange,
  onOwnerChange,
  onAddLead,
  onLogActivity,
  onPatchLead,
  onMoveToContacts,
  onOpenLead,
  tools,
}: {
  group: CrmLeadGroup;
  leads: CrmLead[];
  stages: CrmStage[];
  users: CrmUser[];
  isNew?: boolean;
  customColumns: CrmCustomColumn[];
  profile: CrmUser;
  onAddColumn: (type: CustomColumnType) => void;
  onRenameColumn: (columnId: string, label: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleCollapse: (collapsed: boolean) => void;
  onRenameGroup: (name: string) => void;
  onRenameLead: (leadId: string, name: string) => void;
  onStageChange: (leadId: string, stageId: string) => void;
  onOwnerChange: (leadId: string, ownerId: string | null) => void;
  onAddLead: (name: string) => void;
  onLogActivity: (leadId: string, payload: LogPayload) => void;
  onPatchLead: (leadId: string, patch: Partial<CrmLead>) => void;
  onMoveToContacts: (leadId: string) => void;
  onOpenLead?: (leadId: string) => void;
  tools?: RowToolsConfig;
}) {
  const [collapsed, setCollapsed] = useState(group.is_collapsed);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addDraft, setAddDraft] = useState("");
  const [logMenuFor, setLogMenuFor] = useState<string | null>(null);
  const [composer, setComposer] = useState<{ lead: CrmLead; typeKey: string } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: bodyRef });

  const stageById = new Map(stages.map((s) => [s.id, s]));
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

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const statusSegments = stages
    .map((s) => ({ color: s.color, count: leads.filter((l) => l.stage_id === s.id).length }))
    .filter((s) => s.count > 0);
  const sourceSegments = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      acc[l.source] = (acc[l.source] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([source, count]) => ({ color: sourceColor(source), count }));

  const cellBorder = "border-b border-r border-line";

  return (
    <section className="group pb-[24px]">
      {/* group title — stays put while columns scroll */}
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
          {leads.length} Leads
        </span>
      </div>

      {!collapsed && (
        <div ref={bodyRef} className="w-fit">
          {/* column headers */}
          <div className="flex h-[36px] w-fit items-stretch">
            <div
              className="sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: NAME_COL_W }}
            >
              <span
                className="w-[6px] shrink-0 rounded-tl-[6px]"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex items-center border-b border-r border-t border-line pl-[8px] pr-[9px]">
                <Checkbox label="Select all in group"
                  checked={leads.length > 0 && selected.size === leads.length}
                  onChange={() =>
                    setSelected(selected.size === leads.length ? new Set() : new Set(leads.map((l) => l.id)))
                  }
                />
              </span>
              <span className="flex flex-1 items-center justify-center border-b border-r border-t border-line font-sans text-[14px] leading-[20px] text-ink">
                Lead
              </span>
            </div>
            {BOARD_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="flex items-center justify-center gap-[4px] border-b border-r border-t border-line bg-white font-sans text-[14px] leading-[20px] text-ink"
                style={{ width: col.w }}
              >
                {col.label}
                {col.headerIcon && <Icon name={col.headerIcon} size={16} />}
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
          {leads.map((lead) => {
            const stage = stageById.get(lead.stage_id);
            const owner = lead.owner_id ? userById.get(lead.owner_id) : undefined;
            return (
              <div key={lead.id} className="group/row relative flex w-fit items-stretch" style={{ height: ROW_H }} {...dropTargetProps(tools, group.id, lead.id)}>
                {tools && <RowTools row={lead} tools={tools} />}
                <div
                  className="sticky left-0 z-10 flex items-stretch bg-white"
                  style={{ width: NAME_COL_W }}
                >
                  <span className="w-[6px] shrink-0" style={{ backgroundColor: group.color }} />
                  <span className="flex items-center border-b border-r border-line pl-[8px] pr-[9px]">
                    <Checkbox
                      label={`Select ${lead.name}`}
                      checked={selected.has(lead.id)}
                      onChange={() => toggleRow(lead.id)}
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between border-b border-r border-line px-[6px] transition-colors group-hover/row:bg-canvas">
                    <InlineEdit
                      value={lead.name}
                      onSave={(name) => onRenameLead(lead.id, name)}
                      className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-ink"
                    />
                    <button
                      type="button"
                      aria-label={`Open ${lead.name}`}
                      onClick={() => onOpenLead?.(lead.id)}
                      className="flex size-[24px] shrink-0 items-center justify-center rounded-[4px] opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/row:opacity-100"
                    >
                      <Icon name="rowOpen" size={16} />
                    </button>
                  </span>
                </div>

                {BOARD_COLUMNS.map((col) => {
                  const w = { width: col.w };
                  switch (col.key) {
                    case "status":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <StatusCell
                            stage={stage}
                            stages={stages}
                            onSelect={(stageId) => onStageChange(lead.id, stageId)}
                          />
                        </span>
                      );
                    case "score": {
                      const band = lead.score_band ?? "cold";
                      const bandColor =
                        band === "hot" ? "#e2445c" : band === "warm" ? "#fdab3d" : "#c4c4c4";
                      const explanation = (lead.score_components ?? [])
                        .map((c) => `${c.rule} (${c.points > 0 ? "+" : ""}${c.points})`)
                        .join("\n");
                      return (
                        <span
                          key={col.key}
                          className={`${cellBorder} flex items-center justify-center bg-white`}
                          style={w}
                          title={explanation || "No scoring signals yet"}
                        >
                          <span
                            className="inline-flex h-[22px] items-center rounded-[12px] px-[10px] font-sans text-[12px] font-medium leading-[16px] text-white"
                            style={{ backgroundColor: bandColor }}
                          >
                            {lead.lead_score ?? 0}
                          </span>
                        </span>
                      );
                    }
                    case "owner":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <OwnerCell
                            owner={owner}
                            users={users}
                            onSelect={(ownerId) => onOwnerChange(lead.id, ownerId)}
                          />
                        </span>
                      );
                    case "timeline":
                      return (
                        <span
                          key={col.key}
                          className={`${cellBorder} relative block bg-white`}
                          style={w}
                        >
                          <TimelineCell
                            leadId={lead.id}
                            lastActivityAt={lead.last_activity_at}
                            hasActivity={!!lead.last_activity_at}
                            onAdd={() =>
                              setLogMenuFor((cur) => (cur === lead.id ? null : lead.id))
                            }
                            addActive={logMenuFor === lead.id}
                          />
                          <ActivityLogMenu
                            open={logMenuFor === lead.id}
                            onClose={() => setLogMenuFor(null)}
                            onPick={(typeKey) => {
                              setLogMenuFor(null);
                              setComposer({ lead, typeKey });
                            }}
                          />
                        </span>
                      );
                    case "contact":
                      return (
                        <span
                          key={col.key}
                          className={`${cellBorder} flex items-center justify-center bg-white px-[8px]`}
                          style={w}
                        >
                          <MoveToContactsCell
                            moved={Boolean((lead.custom as Record<string, unknown>)?.moved_to_contacts)}
                            onMove={() => onMoveToContacts(lead.id)}
                          />
                        </span>
                      );
                    case "company":
                    case "title":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <CenterEditCell
                            value={col.key === "company" ? lead.company : lead.title}
                            onSave={(next) =>
                              onPatchLead(
                                lead.id,
                                col.key === "company" ? { company: next } : { title: next }
                              )
                            }
                          />
                        </span>
                      );
                    case "email":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <EmailCell
                            email={lead.email}
                            label={
                              ((lead.custom as Record<string, unknown>)?.email_label as
                                | string
                                | undefined) ?? null
                            }
                            onSave={(email, label) =>
                              onPatchLead(lead.id, {
                                email,
                                custom: {
                                  ...(lead.custom as Record<string, unknown>),
                                  email_label: label ?? "",
                                },
                              })
                            }
                          />
                        </span>
                      );
                    case "phone":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <PhoneCell
                            phone={lead.phone}
                            countryCode={lead.country_code}
                            onSave={(phone) => onPatchLead(lead.id, { phone })}
                          />
                        </span>
                      );
                    case "source":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <span
                            className="flex size-full items-center justify-center font-sans text-[14px] leading-[20px] text-white"
                            style={{ backgroundColor: sourceColor(lead.source) }}
                          >
                            <span className="truncate px-[4px] capitalize">{lead.source}</span>
                          </span>
                        </span>
                      );
                    case "last":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <TimeCell
                            value={lead.last_activity_at}
                            label="Last interaction"
                            format={shortDate}
                            onChange={(iso) => onPatchLead(lead.id, { last_activity_at: iso })}
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
                    value={(lead.custom ?? {})[col.key]}
                    users={users}
                    onSave={(next) =>
                      onPatchLead(lead.id, {
                        custom: { ...(lead.custom ?? {}), [col.key]: next },
                      })
                    }
                  />
                ))}
                <span className="w-[40px] border-b border-line bg-white" />
              </div>
            );
          })}

          {/* add lead row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }} {...dropTargetProps(tools, group.id, null)}>
            <div className="sticky left-0 z-10 flex items-stretch bg-white" style={{ width: NAME_COL_W }}>
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
                      onAddLead(addDraft);
                      setAddDraft("");
                    }
                  }}
                  placeholder="+ Add lead"
                  className="h-[24px] w-full min-w-[200px] rounded-[4px] bg-transparent px-[4px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border focus:border-teal-deep focus:bg-white"
                />
              </span>
            </div>
            <span
              className="border-b border-line bg-white"
              style={{ width: BOARD_COLUMNS.reduce((s, c) => s + c.w, 0) + customColumns.length * CUSTOM_COL_W + 40 }}
            />
          </div>

          {/* summary row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }}>
            <span className="sticky left-0 z-10 block bg-white" style={{ width: NAME_COL_W }} />
            {BOARD_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="flex items-center justify-center border-b border-r border-line bg-white"
                style={{ width: col.w }}
              >
                {col.key === "status" && statusSegments.length > 0 && (
                  <BatteryBar segments={statusSegments} />
                )}
                {col.key === "source" && sourceSegments.length > 0 && (
                  <BatteryBar segments={sourceSegments} />
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

      {composer && (
        <ActivityComposer
          typeKey={composer.typeKey}
          target={{ name: composer.lead.name, account_name: composer.lead.company }}
          onClose={() => setComposer(null)}
          onAdd={(payload) => {
            onLogActivity(composer.lead.id, payload);
            setComposer(null);
          }}
        />
      )}
    </section>
  );
}
