"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  addContact,
  logContactActivity,
  addContactGroup,
  renameContactGroup,
  setContactGroupCollapsed,
  updateContact,
} from "@/app/(app)/crm/contacts/actions";
import type { LogPayload } from "@/components/crm/deals/activity-log";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { canEditRow, OWNER_ONLY_MESSAGE } from "@/lib/permissions";
import { findDuplicateContact } from "@/app/(app)/crm/contacts/actions";
import { quickCreateAccount } from "@/app/(app)/crm/deals/actions";
import type { PickerOption } from "@/components/crm/deals/connect-picker";

export function ContactsBoard({
  profile,
  groups,
  contacts,
  deals,
  accounts,
}: {
  profile: CrmUser;
  groups: CrmContactGroup[];
  contacts: CrmContact[];
  deals: CrmDeal[];
  users: CrmUser[];
  accounts: CrmAccount[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [localContacts, setLocalContacts] = useState(contacts);
  const [search, setSearch] = useState("");
  const [localGroups, setLocalGroups] = useState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);

  useEffect(() => setLocalContacts(contacts), [contacts]);
  useEffect(() => setLocalGroups(groups), [groups]);

  useGSAP(
    () => {
      if (!canAnimate()) return;
      gsap.from(".board-anim", {
        y: 14,
        opacity: 0,
        duration: 0.35,
        stagger: 0.08,
        ease: "power2.out",
        clearProps: "all",
      });
    },
    { scope: rootRef }
  );

  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert"; undo?: () => void } | null>(null);
  const [accountOptions, setAccountOptions] = useState<PickerOption[]>(
    accounts.map((a) => ({ name: a.name, sub: a.domain }))
  );

  useEffect(
    () => setAccountOptions(accounts.map((a) => ({ name: a.name, sub: a.domain }))),
    [accounts]
  );

  const patchContact = (contactId: string, patch: Partial<CrmContact>, silent = false) => {
    const prevRow = localContacts.find((x) => x.id === contactId);
    if (prevRow && !canEditRow(profile, prevRow)) {
      setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
      return;
    }
    setLocalContacts((prev) =>
      prev.map((x) => (x.id === contactId ? { ...x, ...patch } : x))
    );
    updateContact(contactId, patch as Record<string, unknown>);
    if ("email" in patch || "phone" in patch) {
      const next = { ...prevRow, ...patch } as CrmContact;
      findDuplicateContact(
        next.email,
        `${next.country_code ?? ""}${next.phone ?? ""}`,
        contactId
      ).then((dup) => {
        if (dup) setToast({ message: `Possible duplicate: "${dup.name}" has the same email/phone`, tone: "alert" });
      });
    }
    if (!silent && prevRow) {
      const previous = Object.fromEntries(
        Object.keys(patch).map((k) => [k, prevRow[k as keyof CrmContact] ?? null])
      ) as Partial<CrmContact>;
      setToast({
        message: "We successfully updated 1 item",
        undo: () => {
          setLocalContacts((prev) =>
            prev.map((x) => (x.id === contactId ? { ...x, ...previous } : x))
          );
          updateContact(contactId, previous as Record<string, unknown>);
        },
      });
    }
  };

  const handleAddContact = async (groupId: string, name: string) => {
    setLocalContacts((prev) => [
      ...prev,
      {
        id: `temp-${prev.length}-${name}`,
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
        group_id: groupId,
        last_interaction_at: null,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    await addContact(groupId, name);
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
            profile={profile}
            title="Contacts"
            tabs={["Main table"]}
            activeTab="Main table"
            onTabChange={() => {}}
            newLabel="New contact"
            searchValue={search}
            onSearch={setSearch}
            automateLabel="Automate / 3"
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
              contacts={localContacts.filter(
                (c) =>
                  c.group_id === group.id &&
                  (!search.trim() ||
                    c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                    (c.email ?? "").toLowerCase().includes(search.trim().toLowerCase()) ||
                    (c.account_name ?? "").toLowerCase().includes(search.trim().toLowerCase()))
              )}
              deals={deals}
              onToggleCollapse={(collapsed) => {
                setContactGroupCollapsed(group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                renameContactGroup(group.id, name);
              }}
              onPatchContact={patchContact}
              accountOptions={accountOptions}
              onCreateAccount={(contactId, name) => {
                setAccountOptions((prev) => [...prev, { name }]);
                quickCreateAccount(name);
                patchContact(contactId, { account_name: name });
              }}
              onLogActivity={(contactId, payload: LogPayload) => {
                patchContact(contactId, {
                  last_interaction_at: payload.startAt ?? new Date().toISOString(),
                }, true);
                logContactActivity(contactId, payload);
              }}
              onAddContact={(name) => handleAddContact(group.id, name)}
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
      <AiFloaty />
    </Surface>
  );
}
