"use client";

import { useEffect, useRef, useState } from "react";
import { useServerState } from "@/lib/use-server-state";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Icon } from "@/components/ui/Icon";
import { canAnimate } from "@/lib/motion";
import type { CrmAccount, CrmContact, CrmContactGroup, CrmDeal, CrmUser } from "@/lib/types";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { GROUP_COLORS } from "@/components/crm/leads/board-config";
import { ContactGroup } from "./ContactGroup";
import { ContactDrawer } from "./contact-drawer";
import {
  addContact,
  addContactGroup,
  renameContactGroup,
  updateContact,
} from "@/app/(app)/crm/contacts/actions";
import { setGroupCollapsed } from "@/app/(app)/crm/actions";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { applyRowEdit } from "@/components/crm/persist";
import { canEditRow, OWNER_ONLY_MESSAGE } from "@/lib/permissions";
import { findDuplicateContact } from "@/app/(app)/crm/contacts/actions";
import { quickCreateAccount } from "@/app/(app)/crm/offers/actions";
import type { PickerOption } from "@/components/crm/deals/connect-picker";
import type { CrmCustomColumn, CustomColumnType } from "@/lib/custom-columns";
import {
  addCustomColumn,
  deleteCustomColumn,
  renameCustomColumn,
} from "@/app/(app)/crm/custom-columns-actions";
import { byPosition, useRowTools } from "@/components/crm/row-tools";
import { applyQuickFilters, useQuickFilters, type QuickFilterDim } from "@/components/crm/quick-filters";
import { EmailComposer } from "@/components/crm/email/EmailComposer";

export function ContactsBoard({
  profile,
  groups,
  contacts,
  deals,
  users,
  accounts,
  customColumns,
}: {
  profile: CrmUser;
  groups: CrmContactGroup[];
  contacts: CrmContact[];
  deals: CrmDeal[];
  users: CrmUser[];
  accounts: CrmAccount[];
  customColumns: CrmCustomColumn[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [localContacts, setLocalContacts] = useServerState(contacts);
  const [search, setSearch] = useState("");
  const [localGroups, setLocalGroups] = useServerState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [openContactId, setOpenContactId] = useState<string | null>(null);

  const [localColumns, setLocalColumns] = useServerState(customColumns);

  const handleAddColumn = async (type: CustomColumnType) => {
    const result = await addCustomColumn("contacts", type);
    if (result.error || !result.column) {
      setToast({ message: result.error ?? "could not add column", tone: "alert" });
      return;
    }
    setLocalColumns((prev) => [...prev, result.column as CrmCustomColumn]);
    setToast({ message: "Column added — click its name to rename" });
  };

  const handleRenameColumn = (columnId: string, label: string) => {
    setLocalColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, label } : c)));
    renameCustomColumn(columnId, label, "contacts");
  };

  const handleDeleteColumn = async (columnId: string) => {
    const prev = localColumns;
    setLocalColumns((cols) => cols.filter((c) => c.id !== columnId));
    const result = await deleteCustomColumn(columnId, "contacts");
    if (result.error) {
      setLocalColumns(prev);
      setToast({ message: result.error, tone: "alert" });
    } else {
      setToast({ message: "Column removed (values kept in history)" });
    }
  };

  useGSAP(
    () => {
      if (!canAnimate()) return;
      gsap.from(".board-anim", {
        y: 8,
        opacity: 0,
        duration: 0.22,
        stagger: 0.04,
        ease: "power2.out",
        clearProps: "all",
      });
    },
    { scope: rootRef }
  );

  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert"; undo?: () => void } | null>(null);

  const [emailContact, setEmailContact] = useState<CrmContact | null>(null);
  const rowTools = useRowTools({
    boardKey: "contacts",
    rows: localContacts,
    setRows: setLocalContacts,
    groups: localGroups.map((g) => ({ id: g.id, name: g.name })),
    profile,
    onToast: (message, tone) => setToast({ message, tone }),
    onOpen: setOpenContactId,
  });
  const qf = useQuickFilters();

  const filterDims: QuickFilterDim<CrmContact>[] = [
    { key: "group", label: "Group", get: (r) => r.group_id, format: (v) => localGroups.find((g) => g.id === v)?.name ?? "—", color: (v) => localGroups.find((g) => g.id === v)?.color },
    { key: "type", label: "Type", get: (r) => r.contact_type },
    { key: "priority", label: "Priority", get: (r) => r.priority },
    { key: "account", label: "Account", get: (r) => r.account_name },
    { key: "title", label: "Title", get: (r) => r.title },
  ];
  const sortedRows = applyQuickFilters([...localContacts].sort(byPosition), filterDims, qf.state);
  const [accountOptions, setAccountOptions] = useState<PickerOption[]>(
    accounts.map((a) => ({ name: a.name, sub: a.domain }))
  );

  useEffect(
    () => setAccountOptions(accounts.map((a) => ({ name: a.name, sub: a.domain }))),
    [accounts]
  );

  const patchContact = async (contactId: string, patch: Partial<CrmContact>, silent = false) => {
    const prevRow = localContacts.find((x) => x.id === contactId);
    if (prevRow && !canEditRow(profile, prevRow)) {
      setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
      return;
    }
    const saved = await applyRowEdit<CrmContact>({
      id: contactId,
      patch,
      prev: prevRow,
      setRows: setLocalContacts,
      save: updateContact,
      setToast,
      silent,
    });
    if (saved && ("email" in patch || "phone" in patch)) {
      const next = { ...prevRow, ...patch } as CrmContact;
      const dup = await findDuplicateContact(
        next.email,
        `${next.country_code ?? ""}${next.phone ?? ""}`,
        contactId
      );
      if (dup)
        setToast({
          message: `Possible duplicate: "${dup.name}" has the same email/phone`,
          tone: "alert",
        });
    }
  };

  const handleAddContact = async (groupId: string, name: string) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setLocalContacts((prev) => [
      ...prev,
      {
        id: tempId,
        code: null,
        name: name.trim() || "New Contact",
        email: null,
        email_label: null,
        phone: null,
        country_code: null,
        title: null,
        contact_type: null,
        priority: null,
        comments: null,
        account_name: null,
        account_id: null,
        owner_id: profile.id,
        first_name: null,
        last_name: null,
        notes: null,
        lead_source: null,
        lead_date: null,
        property_type: null,
        bedrooms: null,
        budget: null,
        preferred_area: null,
        requirements: null,
        custom: {},
        group_id: groupId,
        last_interaction_at: null,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    // swap the placeholder for the row the database actually stored, so its
    // real id is in place before anyone can click a cell on it
    const created = await addContact(groupId, name);
    if (created.error || !created.row) {
      setLocalContacts((prev) => prev.filter((r) => r.id !== tempId));
      setToast({ message: created.error ?? "could not add the row", tone: "alert" });
      return;
    }
    setLocalContacts((prev) =>
      prev.map((r) => (r.id === tempId ? ({ ...r, ...(created.row as object) } as typeof r) : r))
    );
  };

  const handleAddGroup = async () => {
    const color = GROUP_COLORS[localGroups.length % GROUP_COLORS.length];
    const result = await addContactGroup("New Group", color);
    if (result.id) setNewGroupId(result.id);
  };

  return (
    <Surface>
      <div ref={rootRef} className="flex h-full flex-col">
        <div className="board-anim">
          <BoardHeader
            quickFilters={{ dims: filterDims, rows: localContacts, state: qf.state, onToggle: qf.toggle, onClear: qf.clear, visible: sortedRows.length, noun: "contacts" }}
            profile={profile}
            title="Contacts"
            tabs={["Main table"]}
            activeTab="Main table"
            onTabChange={() => {}}
            newLabel="New contact"
            searchValue={search}
            onSearch={setSearch}
            onNew={() => {
              const first = localGroups[0];
              if (first) handleAddContact(first.id, "New Contact");
            }}
          />
        </div>

        <div className="thin-scroll board-anim min-h-0 flex-1 overflow-auto bg-white pl-[40px] pt-[8px]">
          {localGroups.map((group) => (
            <ContactGroup
              key={group.id}
              group={group}
              isNew={group.id === newGroupId}
              tools={rowTools}
              onEmailContact={setEmailContact}
              contacts={sortedRows.filter(
                (c) =>
                  c.group_id === group.id &&
                  (!search.trim() ||
                    c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                    (c.email ?? "").toLowerCase().includes(search.trim().toLowerCase()) ||
                    (c.account_name ?? "").toLowerCase().includes(search.trim().toLowerCase()))
              )}
              deals={deals}
              onToggleCollapse={(collapsed) => {
                setGroupCollapsed("contacts", group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                renameContactGroup(group.id, name);
              }}
              onPatchContact={patchContact}
              customColumns={localColumns}
              users={users}
              profile={profile}
              onAddColumn={handleAddColumn}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              accountOptions={accountOptions}
              onCreateAccount={async (contactId, name) => {
                setAccountOptions((prev) => [...prev, { name }]);
                await quickCreateAccount(name);
                patchContact(contactId, { account_name: name });
              }}
              onAddContact={(name) => handleAddContact(group.id, name)}
              onOpenContact={setOpenContactId}
            />
          ))}

          <div className="sticky left-0 w-fit pb-[40px] pt-[8px]">
            <button
              type="button"
              onClick={handleAddGroup}
              className="flex h-[32px] items-center gap-[8px] rounded-[4px] border border-line-strong px-[9px] py-[5px] font-sans text-[14px] leading-[22px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
            >
              <Icon name="grpAdd" size={20} />
              Add new group
            </button>
          </div>
        </div>
      </div>
      {toast && (
        <SuccessToast
          message={toast.message}
          tone={toast.tone}
          onUndo={toast.undo}
          onClose={() => setToast(null)}
        />
      )}
      {openContactId && (() => {
        const openContact = localContacts.find((c) => c.id === openContactId);
        if (!openContact) return null;
        return (
          <ContactDrawer
            contact={openContact}
            profile={profile}
            onClose={() => setOpenContactId(null)}
            onToast={(message, tone) => setToast({ message, tone })}
          />
        );
      })()}
      {emailContact && emailContact.email && (
        <EmailComposer
          profile={profile}
          to={[emailContact.email]}
          target={{ type: "contact", id: emailContact.id, name: emailContact.name }}
          onClose={() => setEmailContact(null)}
          onDone={(message, tone) => setToast({ message, tone })}
        />
      )}
      <AiFloaty />
    </Surface>
  );
}
