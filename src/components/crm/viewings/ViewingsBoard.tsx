"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Icon } from "@/components/ui/Icon";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { canEditRow, OWNER_ONLY_MESSAGE } from "@/lib/permissions";
import { canAnimate } from "@/lib/motion";
import type { CrmContact, CrmUnit, CrmUser, CrmViewing, CrmViewingGroup } from "@/lib/types";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { GROUP_COLORS } from "@/components/crm/leads/board-config";
import type { PickerOption } from "@/components/crm/deals/connect-picker";
import { quickCreateContact } from "@/app/(app)/crm/deals/actions";
import { ViewingGroup } from "./ViewingGroup";
import {
  addViewing,
  addViewingGroup,
  renameViewingGroup,
  setViewingGroupCollapsed,
  updateViewing,
} from "@/app/(app)/crm/viewings/actions";

export function ViewingsBoard({
  profile,
  groups,
  viewings,
  users,
  contacts,
  units,
}: {
  profile: CrmUser;
  groups: CrmViewingGroup[];
  viewings: CrmViewing[];
  users: CrmUser[];
  contacts: CrmContact[];
  units: CrmUnit[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("Main table");
  const [localViewings, setLocalViewings] = useState(viewings);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert"; undo?: () => void } | null>(null);
  const [contactOptions, setContactOptions] = useState<PickerOption[]>(
    contacts.map((c) => ({ name: c.name, sub: c.account_name }))
  );

  const unitOptions: PickerOption[] = units.map((u) => ({
    name: u.name,
    sub: u.development_name,
  }));

  useEffect(() => setLocalViewings(viewings), [viewings]);
  useEffect(() => setLocalGroups(groups), [groups]);
  useEffect(
    () => setContactOptions(contacts.map((c) => ({ name: c.name, sub: c.account_name }))),
    [contacts]
  );

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

  const patchViewing = (id: string, patch: Partial<CrmViewing>) => {
    const prevRow = localViewings.find((v) => v.id === id);
    if (
      prevRow &&
      !canEditRow(profile, { owner_id: prevRow.agent_id, created_by: prevRow.created_by })
    ) {
      setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
      return;
    }
    setLocalViewings((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    updateViewing(id, patch as Record<string, unknown>);
    if (prevRow) {
      const previous = Object.fromEntries(
        Object.keys(patch).map((k) => [k, prevRow[k as keyof CrmViewing] ?? null])
      ) as Partial<CrmViewing>;
      setToast({
        message: "We successfully updated 1 item",
        undo: () => {
          setLocalViewings((prev) => prev.map((v) => (v.id === id ? { ...v, ...previous } : v)));
          updateViewing(id, previous as Record<string, unknown>);
        },
      });
    }
  };

  const handleAdd = async (groupId: string, name: string) => {
    setLocalViewings((prev) => [
      ...prev,
      {
        id: `temp-${prev.length}-${name}`,
        name: name.trim() || "New viewing",
        group_id: groupId,
        agent_id: profile.id,
        contact_name: null,
        contact_id: null,
        unit_name: null,
        unit_id: null,
        deal_name: null,
        deal_id: null,
        scheduled_start: null,
        scheduled_end: null,
        status: "scheduled",
        feedback: null,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    await addViewing(groupId, name);
  };

  const handleAddGroup = async () => {
    const color = GROUP_COLORS[localGroups.length % GROUP_COLORS.length];
    const result = await addViewingGroup("New Group", color);
    if (result.id) setNewGroupId(result.id);
  };

  return (
    <Surface>
      <div ref={rootRef} className="flex h-full flex-col">
        <div className="board-anim">
          <BoardHeader
            profile={profile}
            title="Viewings"
            tabs={["Main table"]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            newLabel="New viewing"
            searchValue={search}
            onSearch={setSearch}
            users={users}
            personFilter={personFilter}
            onPersonFilter={setPersonFilter}
            onNew={() => {
              const first = localGroups[0];
              if (first) handleAdd(first.id, "New viewing");
            }}
          />
        </div>

        <div className="thin-scroll board-anim min-h-0 flex-1 overflow-auto bg-white pl-[40px] pt-[8px]">
          {localGroups.map((group) => (
            <ViewingGroup
              key={group.id}
              group={group}
              isNew={group.id === newGroupId}
              viewings={localViewings.filter(
                (v) =>
                  v.group_id === group.id &&
                  (!search.trim() ||
                    v.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                    (v.contact_name ?? "").toLowerCase().includes(search.trim().toLowerCase()) ||
                    (v.unit_name ?? "").toLowerCase().includes(search.trim().toLowerCase())) &&
                  (!personFilter || v.agent_id === personFilter)
              )}
              users={users}
              contactOptions={contactOptions}
              unitOptions={unitOptions}
              onToggleCollapse={(collapsed) => {
                setViewingGroupCollapsed(group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                renameViewingGroup(group.id, name);
              }}
              onPatch={patchViewing}
              onAdd={(name) => handleAdd(group.id, name)}
              onCreateContact={(viewingId, name) => {
                setContactOptions((prev) => [...prev, { name }]);
                quickCreateContact(name);
                patchViewing(viewingId, { contact_name: name });
              }}
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
