"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import type { CrmContact, CrmDeal, CrmDealGroup, CrmDealStage, CrmUser } from "@/lib/types";
import {
  BatteryBar,
  Checkbox,
  InlineEdit,
  OwnerCell,
  Popover,
} from "@/components/crm/leads/cells";
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
  compactMoney,
  money,
} from "./deals-config";
import { CloseDateCell, NumberCell } from "./deal-cells";
import { OptionCell, TextCell } from "@/components/crm/contacts/contact-cells";
import {
  BEDROOM_OPTIONS,
  PROPERTY_TYPES,
  bedroomLabel,
  propertyTypeLabel,
} from "@/components/crm/contacts/demand-config";
import { ConnectPicker, type PickerOption } from "./connect-picker";
import { RowTools, dropTargetProps, type RowToolsConfig } from "@/components/crm/row-tools";
import { DealDoneBadge } from "@/components/crm/deal-done-badge";

const ROW_H = 36;

/** Move to deal — green button that turns into a check once accepted. */
function MoveToDealCell({ moved, onMove }: { moved: boolean; onMove: () => void }) {
  if (moved) {
    return (
      <span className="flex size-full items-center justify-center" title="Moved to Deals">
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
    <span className="flex size-full items-center justify-center px-[6px]">
      <button
        type="button"
        onClick={onMove}
        className="h-[28px] w-full rounded-[4px] bg-brand font-sans text-[13px] leading-[20px] text-white transition-colors hover:bg-[#00b168]"
      >
        Move to deal
      </button>
    </span>
  );
}

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
  contacts,
  accountOptions,
  onCreateAccount,
  stages,
  users,
  isNew = false,
  onToggleCollapse,
  onRenameGroup,
  onPatchDeal,
  onOpenDeal,
  onMoveToDeal,
  customColumns,
  profile,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onAddDeal,
  contactOptions,
  onCreateContact,
  tools,
}: {
  group: CrmDealGroup;
  deals: CrmDeal[];
  contacts: CrmContact[];
  stages: CrmDealStage[];
  users: CrmUser[];
  isNew?: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  onRenameGroup: (name: string) => void;
  onPatchDeal: (dealId: string, patch: Partial<CrmDeal>) => void;
  onOpenDeal?: (dealId: string) => void;
  onMoveToDeal?: (deal: CrmDeal) => void;
  customColumns: CrmCustomColumn[];
  profile: CrmUser;
  onAddColumn: (type: CustomColumnType) => void;
  onRenameColumn: (columnId: string, label: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddDeal: (name: string) => void;
  contactOptions: PickerOption[];
  accountOptions: PickerOption[];
  onCreateAccount: (dealId: string, name: string) => void;
  onCreateContact: (dealId: string, name: string) => void;
  tools?: RowToolsConfig;
}) {
  const [collapsed, setCollapsed] = useState(group.is_collapsed);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addDraft, setAddDraft] = useState("");
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
          {deals.length} Offers
        </span>
      </div>

      {!collapsed && (
        <div ref={bodyRef} className="w-fit">
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
                Client
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
            // the client this offer is for — matched by FK first, then by the
            // name cache the connected column keeps
            const client =
              contacts.find((c) => c.id === deal.contact_id) ??
              contacts.find(
                (c) =>
                  !!deal.contact_name &&
                  c.name.trim().toLowerCase() === deal.contact_name.trim().toLowerCase()
              );
            return (
              <div
                key={deal.id}
                className="group/row relative flex w-fit items-stretch"
                style={{ height: ROW_H }}
              {...dropTargetProps(tools, group.id, deal.id)}
              >
                {tools && <RowTools row={deal} tools={tools} />}
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
                  <span className="flex min-w-0 flex-1 items-center justify-between border-b border-r border-line px-[2px] transition-colors group-hover/row:bg-canvas">
                    {/* the row IS the client — picked from Contacts, and the
                        offer's stored name follows the pick automatically */}
                    <span className="block min-w-0 flex-1">
                      <ConnectPicker
                        value={deal.contact_name}
                        options={contactOptions}
                        entityLabel="Contacts"
                        kind="contact"
                        onPick={(name, id) =>
                          onPatchDeal(deal.id, {
                            contact_name: name,
                            name: `Offer — ${name}`,
                            // several people can share a name — the picked row's
                            // id pins the link to exactly this person
                            ...(id ? { contact_id: id } : {}),
                          })
                        }
                        onClear={() => onPatchDeal(deal.id, { contact_name: null })}
                        onCreate={(name) => onCreateContact(deal.id, name)}
                      />
                    </span>
                    {deal.downpayment_completed_at && <DealDoneBadge />}
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
                            format={(v) => compactMoney(v)}
                            title={
                              deal.deal_value == null
                                ? undefined
                                : money(Number(deal.deal_value))
                            }
                            onSave={(next) => onPatchDeal(deal.id, { deal_value: next })}
                          />
                        </span>
                      );
                    case "client_demand": {
                      // mirrored from the linked contact so the two can never drift
                      const want = [
                        propertyTypeLabel(client?.property_type ?? null),
                        bedroomLabel(client?.bedrooms ?? null),
                      ].filter((v) => v !== "—");
                      return (
                        <span
                          key={col.key}
                          className={`${cellBorder} flex items-center justify-center gap-[4px] bg-canvas px-[6px]`}
                          style={w}
                          title="From the client's demand — edit it on the Contacts board"
                        >
                          {want.length === 0 ? (
                            <span className="font-sans text-[13px] text-ink-muted">—</span>
                          ) : (
                            want.map((v) => (
                              <span
                                key={v}
                                className="truncate rounded-[10px] bg-white px-[8px] py-[2px] font-sans text-[12px] leading-[18px] text-ink"
                              >
                                {v}
                              </span>
                            ))
                          )}
                        </span>
                      );
                    }
                    case "client_budget":
                      return (
                        <span
                          key={col.key}
                          className={`${cellBorder} flex items-center justify-center truncate whitespace-nowrap bg-canvas px-[6px] font-sans text-[14px] leading-[20px] text-ink`}
                          style={w}
                          title={
                            client?.budget != null
                              ? `${money(Number(client.budget))} — from the client's demand`
                              : "From the client's demand — edit it on the Contacts board"
                          }
                        >
                          {client?.budget != null ? compactMoney(Number(client.budget)) : "—"}
                        </span>
                      );
                    case "accounts":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <ConnectPicker
                            value={deal.account_name}
                            options={accountOptions}
                            entityLabel="Developer"
                            kind="account"
                            onPick={(name, id) =>
                              onPatchDeal(deal.id, {
                                account_name: name,
                                ...(id ? { account_id: id } : {}),
                              })
                            }
                            onClear={() => onPatchDeal(deal.id, { account_name: null })}
                            onCreate={(name) => onCreateAccount(deal.id, name)}
                          />
                        </span>
                      );
                    case "offer_property_type":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <OptionCell
                            value={deal.offer_property_type}
                            options={PROPERTY_TYPES}
                            onSelect={(next) =>
                              onPatchDeal(deal.id, { offer_property_type: next })
                            }
                          />
                        </span>
                      );
                    case "offer_bedrooms":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <OptionCell
                            value={deal.offer_bedrooms}
                            options={BEDROOM_OPTIONS}
                            onSelect={(next) => onPatchDeal(deal.id, { offer_bedrooms: next })}
                          />
                        </span>
                      );
                    case "vs_budget": {
                      // the whole point of the board: does this offer fit?
                      const budget = client?.budget == null ? null : Number(client.budget);
                      const price = deal.deal_value == null ? null : Number(deal.deal_value);
                      const diff = budget != null && price != null ? price - budget : null;
                      return (
                        <span
                          key={col.key}
                          className={`${cellBorder} flex items-center justify-center overflow-hidden bg-white px-[6px] font-sans text-[13px] leading-[20px]`}
                          style={w}
                        >
                          {diff == null ? (
                            <span className="text-ink-muted">—</span>
                          ) : (
                            <span
                              // one line, clipped to the cell: a full figure wraps
                              // and spills the chip into the row below
                              className="max-w-full truncate whitespace-nowrap rounded-[10px] px-[8px] py-[2px] text-white"
                              style={{ backgroundColor: diff <= 0 ? "#00c875" : "#e2445c" }}
                              title={`${diff <= 0 ? "within" : "over"} ${money(Math.abs(Math.round(diff)))}`}
                            >
                              {diff <= 0 ? "within" : "over"}{" "}
                              {compactMoney(Math.abs(Math.round(diff)))}
                            </span>
                          )}
                        </span>
                      );
                    }
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
                    case "offer_details":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <TextCell
                            value={deal.offer_details}
                            onSave={(next) =>
                              onPatchDeal(deal.id, { offer_details: next || null })
                            }
                          />
                        </span>
                      );
                    case "move":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <MoveToDealCell
                            moved={!!deal.accepted_at}
                            onMove={() => onMoveToDeal?.(deal)}
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
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }} {...dropTargetProps(tools, group.id, null)}>
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
                  placeholder="+ Add offer — type the client's name"
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

    </section>
  );
}
