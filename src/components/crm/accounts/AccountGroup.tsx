"use client";

import type { CrmCustomColumn, CustomColumnType } from "@/lib/custom-columns";
import { CUSTOM_COL_W } from "@/lib/custom-columns";
import {
  AddColumnButton,
  CustomColumnHeader,
  CustomValueCell,
} from "@/components/crm/custom/custom-columns";
import { isFullAccess } from "@/lib/permissions";
import type { CrmUser } from "@/lib/types";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import type { CrmAccount, CrmAccountGroup, CrmContact, CrmDeal } from "@/lib/types";
import { Checkbox, InlineEdit, OwnerCell } from "@/components/crm/leads/cells";
import { DealsChipCell, TextCell } from "@/components/crm/contacts/contact-cells";
import { NumberCell } from "@/components/crm/deals/deal-cells";
import { CONNECTED_UNDERLINE } from "@/components/crm/contacts/contacts-config";
import { ACCOUNT_COLUMNS, ACCOUNT_NAME_COL_W } from "./accounts-config";
import { ContactsChipCell, DomainCell, IndustryCell } from "./account-cells";
import { RowTools, dropTargetProps, type RowToolsConfig } from "@/components/crm/row-tools";
import { EmailCell } from "@/components/crm/leads/lead-cells";
import { DeleteIcon } from "@/components/ui/DeleteIcon";

const ROW_H = 36;

export function AccountGroup({
  group,
  accounts,
  contacts,
  deals,
  isNew = false,
  users,
  customColumns,
  profile,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onToggleCollapse,
  onRenameGroup,
  onDeleteGroup,
  onPatchAccount,
  onAddAccount,
  tools,
  onEmailAccount,
}: {
  group: CrmAccountGroup;
  accounts: CrmAccount[];
  contacts: CrmContact[];
  deals: CrmDeal[];
  isNew?: boolean;
  users: CrmUser[];
  customColumns: CrmCustomColumn[];
  profile: CrmUser;
  onAddColumn: (type: CustomColumnType) => void;
  onRenameColumn: (columnId: string, label: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleCollapse: (collapsed: boolean) => void;
  onRenameGroup: (name: string) => void;
  /** present only for admin tier — hides the header trash button otherwise */
  onDeleteGroup?: () => void;
  onPatchAccount: (accountId: string, patch: Partial<CrmAccount>) => void;
  onAddAccount: (name: string) => void;
  tools?: RowToolsConfig;
  onEmailAccount?: (account: CrmAccount) => void;
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

  const byAccount = (name: string | null, target: string) =>
    !!name && name.trim().toLowerCase() === target.trim().toLowerCase();

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
          {accounts.length} Accounts
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
          <div className="sticky top-0 z-30 flex h-[36px] w-fit items-stretch bg-white">
            <div
              className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: ACCOUNT_NAME_COL_W }}
            >
              <span
                className="w-[6px] shrink-0 rounded-tl-[6px]"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex items-center border-b border-r border-t border-line pl-[8px] pr-[9px]">
                <Checkbox
                  label="Select all in group"
                  checked={accounts.length > 0 && selected.size === accounts.length}
                  onChange={() =>
                    setSelected(
                      selected.size === accounts.length
                        ? new Set()
                        : new Set(accounts.map((a) => a.id))
                    )
                  }
                />
              </span>
              <span className="flex flex-1 items-center justify-center border-b border-r border-t border-line font-sans text-[14px] leading-[20px] text-ink">
                Account
              </span>
            </div>
            {ACCOUNT_COLUMNS.map((col) => (
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
          {accounts.map((account) => {
            const linkedContacts = contacts.filter((c) => byAccount(c.account_name, account.name));
            const linkedDeals = deals.filter((d) => byAccount(d.account_name, account.name));
            return (
              <div
                key={account.id}
                className="group/row relative flex w-fit items-stretch"
                style={{ height: ROW_H }}
              {...dropTargetProps(tools, group.id, account.id)}
              >
                {tools && <RowTools row={account} tools={tools} />}
                <div
                  className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white"
                  style={{ width: ACCOUNT_NAME_COL_W }}
                >
                  <span className="w-[6px] shrink-0" style={{ backgroundColor: group.color }} />
                  <span className="flex items-center border-b border-r border-line pl-[8px] pr-[9px]">
                    <Checkbox
                      label={`Select ${account.name}`}
                      checked={selected.has(account.id)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(account.id)) next.delete(account.id);
                          else next.add(account.id);
                          return next;
                        })
                      }
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between border-b border-r border-line px-[6px] transition-colors group-hover/row:bg-canvas">
                    <InlineEdit
                      value={account.name}
                      onSave={(name) => onPatchAccount(account.id, { name })}
                      className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-ink"
                    />
                    <button
                      type="button"
                      aria-label={`Open ${account.name}`}
                      className="flex size-[24px] shrink-0 items-center justify-center rounded-[4px] opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/row:opacity-100"
                    >
                      <Icon name="rowOpen" size={16} />
                    </button>
                  </span>
                </div>

                {ACCOUNT_COLUMNS.map((col) => {
                  const w = { width: col.w };
                  switch (col.key) {
                    case "owner":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <OwnerCell
                            owner={users.find((u) => u.id === account.owner_id)}
                            users={users}
                            onSelect={(ownerId) =>
                              onPatchAccount(account.id, { owner_id: ownerId })
                            }
                          />
                        </span>
                      );
                    case "domain":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <DomainCell
                            value={account.domain}
                            onSave={(next) => onPatchAccount(account.id, { domain: next || null })}
                          />
                        </span>
                      );
                    case "email":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <EmailCell
                            email={account.email}
                            onSend={account.email && onEmailAccount ? () => onEmailAccount(account) : undefined}
                            label={account.email_label}
                            onSave={(email, label) =>
                              onPatchAccount(account.id, { email: email || null, email_label: label || null })
                            }
                          />
                        </span>
                      );
                    case "downpayment":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <NumberCell
                            value={
                              account.default_downpayment_percent == null
                                ? null
                                : Number(account.default_downpayment_percent)
                            }
                            format={(v) => (v == null ? "" : `${v}%`)}
                            title="This developer's customary rate — prefills accepted offers"
                            onSave={(next) =>
                              onPatchAccount(account.id, { default_downpayment_percent: next })
                            }
                          />
                        </span>
                      );
                    case "industry":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <IndustryCell
                            values={account.industries}
                            onSave={(next) => onPatchAccount(account.id, { industries: next })}
                          />
                        </span>
                      );
                    case "description":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <TextCell
                            value={account.description}
                            onSave={(next) =>
                              onPatchAccount(account.id, { description: next || null })
                            }
                          />
                        </span>
                      );
                    case "employees":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <span className="flex size-full items-center justify-center">
                            <InlineEdit
                              value={account.employees_range ?? ""}
                              onSave={(next) =>
                                onPatchAccount(account.id, { employees_range: next || null })
                              }
                              placeholder=""
                              className="max-w-full text-center font-sans text-[14px] leading-[20px] text-ink"
                            />
                          </span>
                        </span>
                      );
                    case "hq":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <span className="flex size-full items-center justify-center">
                            <InlineEdit
                              value={account.hq_location ?? ""}
                              onSave={(next) =>
                                onPatchAccount(account.id, { hq_location: next || null })
                              }
                              placeholder=""
                              className="max-w-full text-center font-sans text-[14px] leading-[20px] text-ink"
                            />
                          </span>
                        </span>
                      );
                    case "contacts":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <ContactsChipCell contactNames={linkedContacts.map((c) => c.name)} />
                        </span>
                      );
                    case "deals":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <DealsChipCell dealNames={linkedDeals.map((d) => d.name)} />
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
                    value={(account.custom ?? {})[col.key]}
                    users={users}
                    onSave={(next) =>
                      onPatchAccount(account.id, {
                        custom: { ...(account.custom ?? {}), [col.key]: next },
                      })
                    }
                  />
                ))}
                <span className="w-[40px] border-b border-line bg-white" />
              </div>
            );
          })}

          {/* add account row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }} {...dropTargetProps(tools, group.id, null)}>
            <div
              className="gutter-cover sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: ACCOUNT_NAME_COL_W }}
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
                      onAddAccount(addDraft);
                      setAddDraft("");
                    }
                  }}
                  placeholder="+ Add account"
                  className="h-[24px] w-full min-w-[200px] rounded-[4px] bg-transparent px-[4px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border focus:border-teal-deep focus:bg-white"
                />
              </span>
            </div>
            <span
              className="border-b border-line bg-white"
              style={{ width: ACCOUNT_COLUMNS.reduce((s, c) => s + c.w, 0) + customColumns.length * CUSTOM_COL_W + 40 }}
            />
          </div>

          {/* summary row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }}>
            <span
              className="gutter-cover sticky left-0 z-10 block bg-white"
              style={{ width: ACCOUNT_NAME_COL_W }}
            />
            {ACCOUNT_COLUMNS.map((col) => (
              <span
                key={col.key}
                className="flex items-center justify-center border-b border-r border-line bg-white"
                style={{ width: col.w }}
              >
                {col.key === "deals" && (
                  <span className="font-sans text-[14px] leading-[20px] text-ink-muted">-</span>
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
