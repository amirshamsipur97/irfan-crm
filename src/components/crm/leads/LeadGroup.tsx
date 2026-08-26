"use client";

import type { CrmCustomColumn, CustomColumnType } from "@/lib/custom-columns";
import { CUSTOM_COL_W } from "@/lib/custom-columns";
import {
  AddColumnButton,
  CustomColumnHeader,
  CustomValueCell,
} from "@/components/crm/custom/custom-columns";
import { canManageBoards, isFullAccess } from "@/lib/permissions";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import type { CrmLead, CrmLeadGroup, CrmUser } from "@/lib/types";
import {
  BOARD_COLUMNS,
  LEAD_SOURCES,
  NAME_COL_W,
  shortDate,
} from "./board-config";
import {
  Checkbox,
  InlineEdit,
  OwnerCell,
  TimelineCell,
} from "./cells";
import {
  ActivityComposer,
  ActivityLogMenu,
  type LogPayload,
} from "@/components/crm/deals/activity-log";
import { TimeCell } from "@/components/crm/activities/activity-cells";
import { toLocalDateString } from "@/components/crm/activities/activities-config";
import { NoteDialogCell, OptionCell } from "@/components/crm/contacts/contact-cells";
import { CenterEditCell, EmailCell, MoveToContactsCell, PhoneCell } from "./lead-cells";
import { RowTools, dropTargetProps, type RowToolsConfig } from "@/components/crm/row-tools";
import { useActiveRow, useCheckedRow } from "@/components/crm/active-row";
import { DealDoneBadge } from "@/components/crm/deal-done-badge";
import { CountryCell } from "@/components/crm/country-cell";
import { NumberCell } from "@/components/crm/deals/deal-cells";
import { GENDER_OPTIONS, TEMPERATURE_OPTIONS } from "@/lib/person-fields";
import { DeleteIcon } from "@/components/ui/DeleteIcon";

const ROW_H = 36;

export function LeadGroup({
  group,
  leads,
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
  onRenameLead,
  onOwnerChange,
  onAddLead,
  onLogActivity,
  onPatchLead,
  onMoveToContacts,
  onOpenLead,
  onEmailLead,
  tools,
  columns,
  columnDrag,
  doneContactIds = [],
}: {
  group: CrmLeadGroup;
  leads: CrmLead[];
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
  onRenameLead: (leadId: string, name: string) => void;
  onOwnerChange: (leadId: string, ownerId: string | null) => void;
  onAddLead: (name: string) => void;
  onLogActivity: (leadId: string, payload: LogPayload) => void;
  onPatchLead: (leadId: string, patch: Partial<CrmLead>) => void;
  onMoveToContacts: (leadId: string) => void;
  onOpenLead?: (leadId: string) => void;
  onEmailLead?: (lead: CrmLead) => void;
  tools?: RowToolsConfig;
  /** the board's columns in this user's saved order */
  columns: typeof BOARD_COLUMNS;
  /** drag-to-reorder handle props for the header cells */
  columnDrag?: { headerProps: (key: string) => Record<string, unknown>; draggingKey: string | null };
  /** contacts whose deal completed its downpayment — marks the source lead */
  doneContactIds?: string[];
}) {
  const [collapsed, setCollapsed] = useState(group.is_collapsed);
  const { isChecked, toggleChecked } = useCheckedRow("leads");
  const [addDraft, setAddDraft] = useState("");
  const [logMenuFor, setLogMenuFor] = useState<string | null>(null);
  const [composer, setComposer] = useState<{ lead: CrmLead; typeKey: string } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: bodyRef });
  const activeRow = useActiveRow("leads");

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
          // the sticky column header measures against the board scroll
          // container — a leftover overflow:hidden here would turn this
          // div into the scrollport and silently kill it
          onComplete: () => bodyRef.current?.style.removeProperty("overflow"),
        });
      });
    }
  });

  const cellBorder = "border-b border-r border-line";

  return (
    <section className="group w-fit min-w-full pb-[24px]">
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
              style={{ width: NAME_COL_W }}
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
                Lead
              </span>
            </div>
            {columns.map((col) => {
              const drag = columnDrag?.headerProps(col.key) ?? {};
              const { style: dragStyle, ...dragRest } = drag as { style?: React.CSSProperties };
              return (
                <span
                  key={col.key}
                  {...dragRest}
                  className={`flex items-center justify-center gap-[4px] border-b border-r border-t border-line bg-white font-sans text-[14px] leading-[20px] text-ink transition-opacity ${
                    columnDrag?.draggingKey === col.key ? "opacity-40" : ""
                  }`}
                  style={{ width: col.w, ...dragStyle }}
                >
                  {col.label}
                  {col.headerIcon && <Icon name={col.headerIcon} size={16} />}
                </span>
              );
            })}
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
            const owner = lead.owner_id ? userById.get(lead.owner_id) : undefined;
            return (
              <div key={lead.id} className="group/row relative flex w-fit items-stretch" style={{ height: ROW_H }} {...dropTargetProps(tools, group.id, lead.id)} {...activeRow.rowProps(lead.id)}>
                {tools && <RowTools row={lead} tools={tools} />}
                <div
                  className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white"
                  style={{ width: NAME_COL_W }}
                >
                  <span className="w-[6px] shrink-0" style={{ backgroundColor: group.color }} />
                  <span className="flex items-center border-b border-r border-line pl-[8px] pr-[9px]">
                    <Checkbox
                      label={`Select ${lead.name}`}
                      checked={isChecked(lead.id)}
                      onChange={() => toggleChecked(lead.id)}
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between border-b border-r border-line px-[6px] transition-colors group-hover/row:bg-canvas">
                    <InlineEdit
                      value={lead.name}
                      onSave={(name) => onRenameLead(lead.id, name)}
                      className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-ink"
                    />
                    {!!lead.converted_contact_id &&
                      doneContactIds.includes(lead.converted_contact_id) && <DealDoneBadge />}
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

                {columns.map((col) => {
                  const w = { width: col.w };
                  switch (col.key) {
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
                            canReassign={canManageBoards(profile.role)}
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
                    case "first_name":
                    case "last_name":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <CenterEditCell
                            value={col.key === "first_name" ? lead.first_name : lead.last_name}
                            onSave={(next) =>
                              onPatchLead(
                                lead.id,
                                col.key === "first_name"
                                  ? { first_name: next }
                                  : { last_name: next }
                              )
                            }
                          />
                        </span>
                      );
                    case "notes":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          {/* a paragraph, not a tag — edits in its own dialog,
                              same as the contacts First-negotiation note */}
                          <NoteDialogCell
                            value={lead.notes}
                            title={`Text — ${lead.name}`}
                            placeholder="Notes about this lead…"
                            onSave={(next) => onPatchLead(lead.id, { notes: next })}
                          />
                        </span>
                      );
                    case "date":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <TimeCell
                            value={lead.lead_date}
                            label="Date"
                            format={shortDate}
                            // slicing the ISO string would shift the date a day
                            // in +04, so go through the local-date helper
                            onChange={(iso) =>
                              onPatchLead(lead.id, { lead_date: toLocalDateString(iso) })
                            }
                          />
                        </span>
                      );
                    case "email":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <EmailCell
                            email={lead.email}
                            onSend={lead.email && onEmailLead ? () => onEmailLead(lead) : undefined}
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
                            onSave={(phone, code) =>
                              onPatchLead(lead.id, { phone, country_code: code })
                            }
                          />
                        </span>
                      );
                    case "country":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <CountryCell
                            value={lead.country}
                            onSave={(next) => onPatchLead(lead.id, { country: next })}
                          />
                        </span>
                      );
                    case "temperature":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <OptionCell
                            value={lead.temperature}
                            options={TEMPERATURE_OPTIONS}
                            onSelect={(next) => onPatchLead(lead.id, { temperature: next })}
                          />
                        </span>
                      );
                    case "gender":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <OptionCell
                            value={lead.gender}
                            options={GENDER_OPTIONS}
                            onSelect={(next) => onPatchLead(lead.id, { gender: next })}
                          />
                        </span>
                      );
                    case "age":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <NumberCell
                            value={lead.age}
                            format={(v) => (v == null ? "" : String(v))}
                            onSave={(next) => onPatchLead(lead.id, { age: next })}
                          />
                        </span>
                      );
                    case "source":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <OptionCell
                            value={lead.source}
                            options={LEAD_SOURCES}
                            onSelect={(next) => onPatchLead(lead.id, { source: next ?? "" })}
                          />
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
            <div className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white" style={{ width: NAME_COL_W }}>
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
              style={{ width: columns.reduce((s, c) => s + c.w, 0) + customColumns.length * CUSTOM_COL_W + 40 }}
            />
          </div>

          {/* the per-group summary strip (status / source battery bars) was
              removed on request — it read as a stray bordered row hanging under
              the table rather than as a footer. */}
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
