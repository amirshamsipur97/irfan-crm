"use client";

import type { CrmCustomColumn, CustomColumnType } from "@/lib/custom-columns";
import {
  addCustomColumn,
  deleteCustomColumn,
  renameCustomColumn,
} from "@/app/(app)/crm/custom-columns-actions";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Icon } from "@/components/ui/Icon";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { canEditRow, OWNER_ONLY_MESSAGE } from "@/lib/permissions";
import { canAnimate } from "@/lib/motion";
import type {
  CrmAccount,
  CrmDevelopment,
  CrmDevelopmentGroup,
  CrmUnit,
  CrmUser,
} from "@/lib/types";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { GROUP_COLORS } from "@/components/crm/leads/board-config";
import type { PickerOption } from "@/components/crm/deals/connect-picker";
import { quickCreateAccount } from "@/app/(app)/crm/deals/actions";
import { DevelopmentGroup } from "./DevelopmentGroup";
import {
  addDevelopment,
  addDevelopmentGroup,
  renameDevelopmentGroup,
  setDevelopmentGroupCollapsed,
  updateDevelopment,
} from "@/app/(app)/crm/developments/actions";

export function DevelopmentsBoard({
  profile,
  groups,
  developments,
  units,
  users,
  accounts,
  customColumns = [],
}: {
  profile: CrmUser;
  groups: CrmDevelopmentGroup[];
  developments: CrmDevelopment[];
  units: CrmUnit[];
  users: CrmUser[];
  accounts: CrmAccount[];
  customColumns?: CrmCustomColumn[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("Main table");
  const [localDevelopments, setLocalDevelopments] = useState(developments);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert"; undo?: () => void } | null>(null);
  const [developerOptions, setDeveloperOptions] = useState<PickerOption[]>(
    accounts.map((a) => ({ name: a.name, sub: a.domain }))
  );

  const [localColumns, setLocalColumns] = useState(customColumns);
  useEffect(() => setLocalColumns(customColumns), [customColumns]);
  useEffect(() => setLocalDevelopments(developments), [developments]);
  useEffect(() => setLocalGroups(groups), [groups]);
  useEffect(
    () => setDeveloperOptions(accounts.map((a) => ({ name: a.name, sub: a.domain }))),
    [accounts]
  );

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

  const patchDevelopment = (id: string, patch: Partial<CrmDevelopment>) => {
    const prevRow = localDevelopments.find((d) => d.id === id);
    if (prevRow && !canEditRow(profile, prevRow)) {
      setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
      return;
    }
    setLocalDevelopments((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    updateDevelopment(id, patch as Record<string, unknown>);
    if (prevRow) {
      const previous = Object.fromEntries(
        Object.keys(patch).map((k) => [k, prevRow[k as keyof CrmDevelopment] ?? null])
      ) as Partial<CrmDevelopment>;
      setToast({
        message: "We successfully updated 1 item",
        undo: () => {
          setLocalDevelopments((prev) =>
            prev.map((d) => (d.id === id ? { ...d, ...previous } : d))
          );
          updateDevelopment(id, previous as Record<string, unknown>);
        },
      });
    }
  };

  const handleAdd = async (groupId: string, name: string) => {
    setLocalDevelopments((prev) => [
      ...prev,
      {
        id: `temp-${prev.length}-${name}`,
        name: name.trim() || "New development",
        group_id: groupId,
        owner_id: null,
        developer_name: null,
        developer_account_id: null,
        status: null,
        location: null,
        completion_date: null,
        description: null,
        custom: {},
        currency: "OMR",
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    await addDevelopment(groupId, name);
  };

  const handleAddGroup = async () => {
    const color = GROUP_COLORS[localGroups.length % GROUP_COLORS.length];
    const result = await addDevelopmentGroup("New Group", color);
    if (result.id) setNewGroupId(result.id);
  };

  const handleAddColumn = async (type: CustomColumnType) => {
    const result = await addCustomColumn("developments", type);
    if (result.error || !result.column) {
      setToast({ message: result.error ?? "could not add column", tone: "alert" });
      return;
    }
    setLocalColumns((prev) => [...prev, result.column as CrmCustomColumn]);
    setToast({ message: "Column added — click its name to rename" });
  };

  const handleRenameColumn = (columnId: string, label: string) => {
    setLocalColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, label } : c)));
    renameCustomColumn(columnId, label, "developments");
  };

  const handleDeleteColumn = async (columnId: string) => {
    const prevCols = localColumns;
    setLocalColumns((cols) => cols.filter((c) => c.id !== columnId));
    const result = await deleteCustomColumn(columnId, "developments");
    if (result.error) {
      setLocalColumns(prevCols);
      setToast({ message: result.error, tone: "alert" });
    } else {
      setToast({ message: "Column removed (values kept in history)" });
    }
  };

  return (
    <Surface>
      <div ref={rootRef} className="flex h-full flex-col">
        <div className="board-anim">
          <BoardHeader
            profile={profile}
            title="Developments"
            tabs={["Main table"]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            newLabel="New development"
            searchValue={search}
            onSearch={setSearch}
            users={users}
            personFilter={personFilter}
            onPersonFilter={setPersonFilter}
            onNew={() => {
              const first = localGroups[0];
              if (first) handleAdd(first.id, "New development");
            }}
          />
        </div>

        <div className="thin-scroll board-anim min-h-0 flex-1 overflow-auto bg-white pl-[40px] pt-[8px]">
          {localGroups.map((group) => (
            <DevelopmentGroup
              key={group.id}
              group={group}
              isNew={group.id === newGroupId}
              developments={localDevelopments.filter(
                (d) =>
                  d.group_id === group.id &&
                  (!search.trim() ||
                    d.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                    (d.developer_name ?? "").toLowerCase().includes(search.trim().toLowerCase()) ||
                    (d.location ?? "").toLowerCase().includes(search.trim().toLowerCase())) &&
                  (!personFilter || d.owner_id === personFilter)
              )}
              units={units}
              users={users}
              developerOptions={developerOptions}
              onToggleCollapse={(collapsed) => {
                setDevelopmentGroupCollapsed(group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                renameDevelopmentGroup(group.id, name);
              }}
              onPatch={patchDevelopment}
              customColumns={localColumns}
              profile={profile}
              onAddColumn={handleAddColumn}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              onAdd={(name) => handleAdd(group.id, name)}
              onCreateDeveloper={async (developmentId, name) => {
                setDeveloperOptions((prev) => [...prev, { name }]);
                await quickCreateAccount(name);
                patchDevelopment(developmentId, { developer_name: name });
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
