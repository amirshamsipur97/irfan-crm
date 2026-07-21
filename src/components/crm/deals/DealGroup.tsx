"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import type { CrmDeal, CrmDealGroup, CrmDealStage, CrmUser } from "@/lib/types";
import type { ForecastCategory } from "@/lib/types";
import {
  BatteryBar,
  Checkbox,
  InlineEdit,
  OwnerCell,
  TimelineCell,
  Popover,
} from "@/components/crm/leads/cells";
import { leadHash, shortDate } from "@/components/crm/leads/board-config";
import type { CrmCustomColumn, CustomColumnType } from "@/lib/custom-columns";
import { CUSTOM_COL_W } from "@/lib/custom-columns";
import {
  AddColumnButton,
  CustomColumnHeader,
  CustomValueCell,
} from "@/components/crm/custom/custom-columns";
import { isFullAccess } from "@/lib/permissions";
import {
  DEAL_COLUMNS,
  DEAL_NAME_COL_W,
  FORECAST_CATEGORIES,
  forecastValue,
  money,
} from "./deals-config";
import { CategoryCell, CloseDateCell, NumberCell } from "./deal-cells";
import { ActivityComposer, ActivityLogMenu, type LogPayload } from "./activity-log";
import { ConnectPicker, type PickerOption } from "./connect-picker";
import { TimeCell } from "@/components/crm/activities/activity-cells";

const ROW_H = 36;

function DealStageCell({
  stage,
  stages,
  onSelect,
}: {
  stage: CrmDealStage | undefined;
  stages: CrmDealStage[];
  onSelect: (stageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative size-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-full items-center justify-center font-sans text-[14px] leading-[20px] text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: stage?.color ?? "#c4c4c4" }}
      >
        <span className="truncate px-[4px]">{stage?.name ?? ""}</span>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[180px]">
        <div className="flex flex-col gap-[6px]">
          {stages.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s.id);
                setOpen(false);
              }}
              className="flex h-[32px] items-center justify-center rounded-[4px] font-sans text-[14px] text-white transition-transform hover:scale-[1.03]"
              style={{ backgroundColor: s.color }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}

export function DealGroup({
  group,
  deals,
  stages,
  users,
  isNew = false,
  onToggleCollapse,
  onRenameGroup,
  onPatchDeal,
  onOpenDeal,
  customColumns,
  profile,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onAddDeal,
  onLogActivity,
  accountOptions,
  contactOptions,
  onCreateAccount,
  onCreateContact,
}: {
  group: CrmDealGroup;
  deals: CrmDeal[];
  stages: CrmDealStage[];
  users: CrmUser[];
  isNew?: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  onRenameGroup: (name: string) => void;
  onPatchDeal: (dealId: string, patch: Partial<CrmDeal>) => void;
  onOpenDeal?: (dealId: string) => void;
  customColumns: CrmCustomColumn[];
  profile: CrmUser;
  onAddColumn: (type: CustomColumnType) => void;
  onRenameColumn: (columnId: string, label: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddDeal: (name: string) => void;
  onLogActivity: (dealId: string, payload: LogPayload) => void;
  accountOptions: PickerOption[];
  contactOptions: PickerOption[];
  onCreateAccount: (dealId: string, name: string) => void;
  onCreateContact: (dealId: string, name: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(group.is_collapsed);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addDraft, setAddDraft] = useState("");
  const [logMenuFor, setLogMenuFor] = useState<string | null>(null);
  const [composer, setComposer] = useState<{ deal: CrmDeal; typeKey: string } | null>(null);
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

  const stageSegments = stages
    .map((s) => ({ color: s.color, count: deals.filter((d) => d.stage_id === s.id).length }))
    .filter((s) => s.count > 0);
  const categorySegments = FORECAST_CATEGORIES.map((c) => ({
    color: c.color,
    count: deals.filter((d) => d.forecast_category === c.key).length,
  })).filter((s) => s.count > 0);
  const totalValue = deals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);

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
          {deals.length} Deals
        </span>
      </div>

      {!collapsed && (
        <div ref={bodyRef} className="w-fit overflow-hidden">
          {/* column headers */}
          <div className="flex h-[36px] w-fit items-stretch">
            <div
              className="sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: DEAL_NAME_COL_W }}
            >
              <span
                className="w-[6px] shrink-0 rounded-tl-[6px]"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex items-center border-b border-r border-t border-line pl-[8px] pr-[9px]">
                <Checkbox
                  label="Select all in group"
                  checked={deals.length > 0 && selected.size === deals.length}
                  onChange={() =>
                    setSelected(
                      selected.size === deals.length ? new Set() : new Set(deals.map((d) => d.id))
                    )
                  }
                />
              </span>
              <span className="flex flex-1 items-center justify-center border-b border-r border-t border-line font-sans text-[14px] leading-[20px] text-ink">
                Deal
              </span>
            </div>
            {DEAL_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="flex items-center justify-center gap-[4px] whitespace-nowrap border-b border-r border-t border-line bg-white px-[4px] font-sans text-[14px] leading-[20px] text-ink"
                style={{ width: col.w }}
              >
                {col.label}
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
          {deals.map((deal) => {
            const stage = stageById.get(deal.stage_id);
            const owner = deal.owner_id ? userById.get(deal.owner_id) : undefined;
            const isClosed = !!stage && (stage.is_won || stage.is_lost);
            return (
              <div
                key={deal.id}
                className="group/row flex w-fit items-stretch"
                style={{ height: ROW_H }}
              >
                <div
                  className="sticky left-0 z-10 flex items-stretch bg-white"
                  style={{ width: DEAL_NAME_COL_W }}
                >
                  <span className="w-[6px] shrink-0" style={{ backgroundColor: group.color }} />
                  <span className="flex items-center border-b border-r border-line pl-[8px] pr-[9px]">
                    <Checkbox
                      label={`Select ${deal.name}`}
                      checked={selected.has(deal.id)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(deal.id)) next.delete(deal.id);
                          else next.add(deal.id);
                          return next;
                        })
                      }
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between border-b border-r border-line px-[6px] transition-colors group-hover/row:bg-canvas">
                    <InlineEdit
                      value={deal.name}
                      onSave={(name) => onPatchDeal(deal.id, { name })}
                      className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-ink"
                    />
                    <button
                      type="button"
                      aria-label={`Open ${deal.name}`}
                      onClick={() => onOpenDeal?.(deal.id)}
                      className="flex size-[24px] shrink-0 items-center justify-center rounded-[4px] opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/row:opacity-100"
                    >
                      <Icon name="rowOpen" size={16} />
                    </button>
                  </span>
                </div>

                {DEAL_COLUMNS.map((col) => {
                  const w = { width: col.w };
                  switch (col.key) {
                    case "timeline":
                      return (
                        <span
                          key={col.key}
                          className={`${cellBorder} relative block bg-white`}
                          style={w}
                        >
                          <TimelineCell
                            leadId={deal.id}
                            lastActivityAt={deal.last_interaction_at}
                            hasActivity={!!deal.last_interaction_at || leadHash(deal.id) % 3 !== 0}
                            onAdd={() =>
                              setLogMenuFor((cur) => (cur === deal.id ? null : deal.id))
                            }
                            addActive={logMenuFor === deal.id}
                          />
                          <ActivityLogMenu
                            open={logMenuFor === deal.id}
                            onClose={() => setLogMenuFor(null)}
                            onPick={(typeKey) => {
                              setLogMenuFor(null);
                              setComposer({ deal, typeKey });
                            }}
                          />
                        </span>
                      );
                    case "stage":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <DealStageCell
                            stage={stage}
                            stages={stages}
                            onSelect={(stageId) => onPatchDeal(deal.id, { stage_id: stageId })}
                          />
                        </span>
                      );
                    case "owner":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <OwnerCell
                            owner={owner}
                            users={users}
                            onSelect={(ownerId) => onPatchDeal(deal.id, { owner_id: ownerId })}
                          />
                        </span>
                      );
                    case "value":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <NumberCell
                            value={deal.deal_value == null ? null : Number(deal.deal_value)}
                            format={(v) => money(v)}
                            onSave={(next) => onPatchDeal(deal.id, { deal_value: next })}
                          />
                        </span>
                      );
                    case "contacts":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <ConnectPicker
                            value={deal.contact_name}
                            options={contactOptions}
                            entityLabel="Contacts"
                            kind="contact"
                            onPick={(name) => onPatchDeal(deal.id, { contact_name: name })}
                            onClear={() => onPatchDeal(deal.id, { contact_name: null })}
                            onCreate={(name) => onCreateContact(deal.id, name)}
                          />
                        </span>
                      );
                    case "accounts":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <ConnectPicker
                            value={deal.account_name}
                            options={accountOptions}
                            entityLabel="Accounts"
                            kind="account"
                            onPick={(name) => onPatchDeal(deal.id, { account_name: name })}
                            onClear={() => onPatchDeal(deal.id, { account_name: null })}
                            onCreate={(name) => onCreateAccount(deal.id, name)}
                          />
                        </span>
                      );
                    case "close_date":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <CloseDateCell
                            deal={deal}
                            onToggleDone={() => onPatchDeal(deal.id, { is_done: !deal.is_done })}
                            onDateChange={(iso) =>
                              onPatchDeal(deal.id, { expected_close_date: iso })
                            }
                          />
                        </span>
                      );
                    case "probability":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <NumberCell
                            value={deal.close_probability}
                            format={(v) => `${v}`}
                            suffix="%"
                            onSave={(next) =>
                              onPatchDeal(deal.id, {
                                close_probability:
                                  next == null ? null : Math.max(0, Math.min(100, next)),
                              })
                            }
                          />
                        </span>
                      );
                    case "forecast":
                      return (
                        <span
                          key={col.key}
                          className={`${cellBorder} flex items-center justify-center bg-white font-sans text-[14px] leading-[20px] text-ink`}
                          style={w}
                        >
                          {deal.deal_value != null && deal.close_probability != null
                            ? money(forecastValue(Number(deal.deal_value), deal.close_probability))
                            : ""}
                        </span>
                      );
                    case "last":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <TimeCell
                            value={deal.last_interaction_at}
                            label="Last interaction"
                            format={shortDate}
                            onChange={(iso) =>
                              onPatchDeal(deal.id, { last_interaction_at: iso })
                            }
                          />
                        </span>
                      );
                    case "category":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <CategoryCell
                            value={deal.forecast_category}
                            isClosed={isClosed}
                            onSelect={(next: ForecastCategory | null) =>
                              onPatchDeal(deal.id, { forecast_category: next })
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
                    value={(deal.custom ?? {})[col.key]}
                    users={users}
                    onSave={(next) =>
                      onPatchDeal(deal.id, {
                        custom: { ...(deal.custom ?? {}), [col.key]: next },
                      })
                    }
                  />
                ))}
                <span className="w-[40px] border-b border-line bg-white" />
              </div>
            );
          })}

          {/* add deal row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }}>
            <div
              className="sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: DEAL_NAME_COL_W }}
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
                      onAddDeal(addDraft);
                      setAddDraft("");
                    }
                  }}
                  placeholder="+ Add deal"
                  className="h-[24px] w-full min-w-[200px] rounded-[4px] bg-transparent px-[4px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border focus:border-teal-deep focus:bg-white"
                />
              </span>
            </div>
            <span
              className="border-b border-line bg-white"
              style={{ width: DEAL_COLUMNS.reduce((s, c) => s + c.w, 0) + customColumns.length * CUSTOM_COL_W + 40 }}
            />
          </div>

          {/* summary row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }}>
            <span className="sticky left-0 z-10 block bg-white" style={{ width: DEAL_NAME_COL_W }} />
            {DEAL_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="flex flex-col items-center justify-center border-b border-r border-line bg-white"
                style={{ width: col.w }}
              >
                {col.key === "stage" && stageSegments.length > 0 && (
                  <BatteryBar segments={stageSegments} />
                )}
                {col.key === "category" && categorySegments.length > 0 && (
                  <BatteryBar segments={categorySegments} />
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

      {composer && (
        <ActivityComposer
          typeKey={composer.typeKey}
          target={composer.deal}
          onClose={() => setComposer(null)}
          onAdd={(payload) => {
            onLogActivity(composer.deal.id, payload);
            setComposer(null);
          }}
        />
      )}
    </section>
  );
}
