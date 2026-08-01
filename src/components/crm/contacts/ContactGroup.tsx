"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import type { CrmContact, CrmContactGroup, CrmDeal } from "@/lib/types";
import {
  Checkbox,
  InlineEdit,
  OwnerCell,
} from "@/components/crm/leads/cells";
import { compactMoney, money } from "@/components/crm/deals/deals-config";
import {
  CONNECTED_UNDERLINE,
  CONTACT_COLUMNS,
  CONTACT_NAME_COL_W,
} from "./contacts-config";
import { DealsChipCell, OptionCell, TextCell } from "./contact-cells";
import { BEDROOM_OPTIONS, PROPERTY_TYPES } from "./demand-config";
import { NumberCell } from "@/components/crm/deals/deal-cells";
import { EmailCell, PhoneCell } from "@/components/crm/leads/lead-cells";
import { ConnectPicker, type PickerOption } from "@/components/crm/deals/connect-picker";
import { DealDoneBadge } from "@/components/crm/deal-done-badge";
import type { CrmUser } from "@/lib/types";
import type { CrmCustomColumn, CustomColumnType } from "@/lib/custom-columns";
import { CUSTOM_COL_W } from "@/lib/custom-columns";
import {
  AddColumnButton,
  CustomColumnHeader,
  CustomValueCell,
} from "@/components/crm/custom/custom-columns";
import { isFullAccess } from "@/lib/permissions";
import { RowTools, dropTargetProps, type RowToolsConfig } from "@/components/crm/row-tools";

const ROW_H = 36;

export function ContactGroup({
  group,
  contacts,
  deals,
  isNew = false,
  onToggleCollapse,
  onRenameGroup,
  onPatchContact,
  onAddContact,
  accountOptions,
  onCreateAccount,
  customColumns,
  users,
  profile,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onOpenContact,
  onEmailContact,
  tools,
}: {
  group: CrmContactGroup;
  contacts: CrmContact[];
  deals: CrmDeal[];
  isNew?: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  onRenameGroup: (name: string) => void;
  onPatchContact: (contactId: string, patch: Partial<CrmContact>) => void;
  onAddContact: (name: string) => void;
  accountOptions: PickerOption[];
  onCreateAccount: (contactId: string, name: string) => void;
  customColumns: CrmCustomColumn[];
  users: CrmUser[];
  profile: CrmUser;
  onAddColumn: (type: CustomColumnType) => void;
  onRenameColumn: (columnId: string, label: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onOpenContact?: (contactId: string) => void;
  onEmailContact?: (contact: CrmContact) => void;
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
        });
      });
    }
  });

  const dealsForContact = (contact: CrmContact) =>
    deals.filter(
      (d) =>
        d.contact_name &&
        contact.name &&
        d.contact_name.trim().toLowerCase() === contact.name.trim().toLowerCase()
    );

  // FK match first, name-cache match as fallback — same rule the drawer uses
  const hasDoneDeal = (contact: CrmContact) =>
    deals.some(
      (d) =>
        !!d.downpayment_completed_at &&
        (d.contact_id === contact.id ||
          (!!d.contact_name &&
            !!contact.name &&
            d.contact_name.trim().toLowerCase() === contact.name.trim().toLowerCase()))
    );


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
          {contacts.length} Contacts
        </span>
      </div>

      {!collapsed && (
        <div ref={bodyRef} className="w-fit">
          {/* column headers */}
          <div className="flex h-[36px] w-fit items-stretch">
            <div
              className="sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: CONTACT_NAME_COL_W }}
            >
              <span
                className="w-[6px] shrink-0 rounded-tl-[6px]"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex items-center border-b border-r border-t border-line pl-[8px] pr-[9px]">
                <Checkbox
                  label="Select all in group"
                  checked={contacts.length > 0 && selected.size === contacts.length}
                  onChange={() =>
                    setSelected(
                      selected.size === contacts.length
                        ? new Set()
                        : new Set(contacts.map((c) => c.id))
                    )
                  }
                />
              </span>
              <span className="flex flex-1 items-center justify-center border-b border-r border-t border-line font-sans text-[14px] leading-[20px] text-ink">
                Contact
              </span>
            </div>
            {CONTACT_COLUMNS.map((col) => (
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
          {contacts.map((contact) => {
            const linkedDeals = dealsForContact(contact);
            const dealsValue = linkedDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
            return (
              <div
                key={contact.id}
                className="group/row relative flex w-fit items-stretch"
                style={{ height: ROW_H }}
              {...dropTargetProps(tools, group.id, contact.id)}
              >
                {tools && <RowTools row={contact} tools={tools} />}
                <div
                  className="sticky left-0 z-10 flex items-stretch bg-white"
                  style={{ width: CONTACT_NAME_COL_W }}
                >
                  <span className="w-[6px] shrink-0" style={{ backgroundColor: group.color }} />
                  <span className="flex items-center border-b border-r border-line pl-[8px] pr-[9px]">
                    <Checkbox
                      label={`Select ${contact.name}`}
                      checked={selected.has(contact.id)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(contact.id)) next.delete(contact.id);
                          else next.add(contact.id);
                          return next;
                        })
                      }
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between border-b border-r border-line px-[6px] transition-colors group-hover/row:bg-canvas">
                    <InlineEdit
                      value={contact.name}
                      onSave={(name) => onPatchContact(contact.id, { name })}
                      className="min-w-0 flex-1 font-sans text-[14px] leading-[20px] text-ink"
                    />
                    {hasDoneDeal(contact) && <DealDoneBadge />}
                    <button
                      type="button"
                      aria-label={`Open ${contact.name}`}
                      onClick={() => onOpenContact?.(contact.id)}
                      className="flex size-[24px] shrink-0 items-center justify-center rounded-[4px] opacity-0 transition-opacity hover:bg-[var(--hover-ghost)] group-hover/row:opacity-100"
                    >
                      <Icon name="rowOpen" size={16} />
                    </button>
                  </span>
                </div>

                {CONTACT_COLUMNS.map((col) => {
                  const w = { width: col.w };
                  switch (col.key) {
                    case "owner":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <OwnerCell
                            owner={users.find((u) => u.id === contact.owner_id)}
                            users={users}
                            onSelect={(ownerId) =>
                              onPatchContact(contact.id, { owner_id: ownerId })
                            }
                          />
                        </span>
                      );
                    case "email":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <EmailCell
                            email={contact.email}
                            onSend={contact.email && onEmailContact ? () => onEmailContact(contact) : undefined}
                            label={contact.email_label}
                            onSave={(email, label) =>
                              onPatchContact(contact.id, { email, email_label: label })
                            }
                          />
                        </span>
                      );
                    case "accounts":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <ConnectPicker
                            value={contact.account_name}
                            options={accountOptions}
                            entityLabel="Accounts"
                            kind="account"
                            onPick={(name) => onPatchContact(contact.id, { account_name: name })}
                            onClear={() => onPatchContact(contact.id, { account_name: null })}
                            onCreate={(name) => onCreateAccount(contact.id, name)}
                          />
                        </span>
                      );
                    case "deals":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <DealsChipCell dealNames={linkedDeals.map((d) => d.name)} />
                        </span>
                      );
                    case "deals_value":
                      return (
                        <span
                          key={col.key}
                          className={`${cellBorder} flex items-center justify-center bg-white font-sans text-[14px] leading-[20px] text-ink`}
                          style={w}
                        >
                          {linkedDeals.length > 0 ? money(dealsValue) : ""}
                        </span>
                      );
                    case "phone":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <PhoneCell
                            phone={contact.phone}
                            countryCode={contact.country_code}
                            onSave={(phone, code) =>
                              onPatchContact(contact.id, { phone, country_code: code })
                            }
                          />
                        </span>
                      );
                    case "property_type":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <OptionCell
                            value={contact.property_type}
                            options={PROPERTY_TYPES}
                            onSelect={(next) =>
                              onPatchContact(contact.id, { property_type: next })
                            }
                          />
                        </span>
                      );
                    case "bedrooms":
                      return (
                        <span key={col.key} className={`${cellBorder} block`} style={w}>
                          <OptionCell
                            value={contact.bedrooms}
                            options={BEDROOM_OPTIONS}
                            onSelect={(next) => onPatchContact(contact.id, { bedrooms: next })}
                          />
                        </span>
                      );
                    case "budget":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <NumberCell
                            value={contact.budget}
                            format={(n) => compactMoney(n)}
                            title={contact.budget == null ? undefined : money(contact.budget)}
                            onSave={(next) => onPatchContact(contact.id, { budget: next })}
                          />
                        </span>
                      );
                    case "preferred_area":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <TextCell
                            value={contact.preferred_area}
                            onSave={(next) =>
                              onPatchContact(contact.id, { preferred_area: next || null })
                            }
                          />
                        </span>
                      );
                    case "requirements":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <TextCell
                            value={contact.requirements}
                            onSave={(next) =>
                              onPatchContact(contact.id, { requirements: next || null })
                            }
                          />
                        </span>
                      );
                    case "comments":
                      return (
                        <span key={col.key} className={`${cellBorder} block bg-white`} style={w}>
                          <TextCell
                            value={contact.comments}
                            onSave={(next) =>
                              onPatchContact(contact.id, { comments: next || null })
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
                    value={(contact.custom ?? {})[col.key]}
                    users={users}
                    onSave={(next) =>
                      onPatchContact(contact.id, {
                        custom: { ...(contact.custom ?? {}), [col.key]: next },
                      })
                    }
                  />
                ))}
                <span className="w-[40px] border-b border-line bg-white" />
              </div>
            );
          })}

          {/* add contact row */}

          {/* add row */}
          <div className="flex w-fit items-stretch" style={{ height: ROW_H }} {...dropTargetProps(tools, group.id, null)}>
            <div
              className="sticky left-0 z-10 flex items-stretch bg-white"
              style={{ width: CONTACT_NAME_COL_W }}
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
                      onAddContact(addDraft);
                      setAddDraft("");
                    }
                  }}
                  placeholder="+ Add contact"
                  className="h-[24px] w-full min-w-[200px] rounded-[4px] bg-transparent px-[4px] font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border focus:border-teal-deep focus:bg-white"
                />
              </span>
            </div>
            <span
              className="border-b border-line bg-white"
              style={{ width: CONTACT_COLUMNS.reduce((s, c) => s + c.w, 0) + customColumns.length * CUSTOM_COL_W + 40 }}
            />
          </div>
        </div>
      )}

    </section>
  );
}
