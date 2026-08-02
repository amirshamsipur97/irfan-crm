"use client";

import type { CrmCustomColumn, CustomColumnType } from "@/lib/custom-columns";
import { useServerState } from "@/lib/use-server-state";
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
import { applyRowEdit } from "@/components/crm/persist";
import { canEditRow, isFullAccess, OWNER_ONLY_MESSAGE } from "@/lib/permissions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { canAnimate } from "@/lib/motion";
import type { CrmContact, CrmUnit, CrmUser, CrmViewing, CrmViewingGroup } from "@/lib/types";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { GROUP_COLORS } from "@/components/crm/leads/board-config";
import type { PickerOption } from "@/components/crm/deals/connect-picker";
import { quickCreateContact } from "@/app/(app)/crm/offers/actions";
import { setGroupCollapsed } from "@/app/(app)/crm/actions";
import { quickCreateUnit } from "@/app/(app)/crm/units/actions";
import { ViewingGroup } from "./ViewingGroup";
import {
  addViewing,
  addViewingGroup,
  renameViewingGroup,
  updateViewing,
  deleteViewingGroup,
} from "@/app/(app)/crm/viewings/actions";
import { byPosition, useRowTools } from "@/components/crm/row-tools";
import { applyQuickFilters, useQuickFilters, type QuickFilterDim } from "@/components/crm/quick-filters";

export function ViewingsBoard({
  profile,
  groups,
  viewings,
  users,
  contacts,
  units,
  customColumns = [],
}: {
  profile: CrmUser;
  groups: CrmViewingGroup[];
  viewings: CrmViewing[];
  users: CrmUser[];
  contacts: CrmContact[];
  units: CrmUnit[];
  customColumns?: CrmCustomColumn[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("Main table");
  const [localViewings, setLocalViewings] = useServerState(viewings);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useServerState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert"; undo?: () => void } | null>(null);
  const [deleteGroupPrompt, setDeleteGroupPrompt] = useState<(typeof groups)[number] | null>(null);

  // only an EMPTY group may go, and never the last one — the checks repeat
  // server-side, this just gives an instant, friendly answer
  const requestDeleteGroup = (group: (typeof groups)[number]) => {
    const count = localViewings.filter((r) => r.group_id === group.id).length;
    if (count) {
      setToast({
        message: `"${group.name}" still holds ${count} viewing${count === 1 ? "" : "s"} — move or delete them first.`,
        tone: "alert",
      });
      return;
    }
    if (localGroups.length <= 1) {
      setToast({ message: "At least one group must remain.", tone: "alert" });
      return;
    }
    setDeleteGroupPrompt(group);
  };
  const rowTools = useRowTools({
    boardKey: "viewings",
    rows: localViewings,
    setRows: setLocalViewings,
    groups: localGroups.map((g) => ({ id: g.id, name: g.name })),
    profile,
    onToast: (message, tone) => setToast({ message, tone }),
  });
  const qf = useQuickFilters();

  const filterDims: QuickFilterDim<CrmViewing>[] = [
    { key: "group", label: "Group", get: (r) => r.group_id, format: (v) => localGroups.find((g) => g.id === v)?.name ?? "—", color: (v) => localGroups.find((g) => g.id === v)?.color },
    { key: "status", label: "Status", get: (r) => r.status },
    { key: "contact", label: "Contact", get: (r) => r.contact_name },
    { key: "unit", label: "Unit", get: (r) => r.unit_name },
  ];
  const sortedRows = applyQuickFilters([...localViewings].sort(byPosition), filterDims, qf.state);
  const [contactOptions, setContactOptions] = useState<PickerOption[]>(
    contacts.map((c) => ({ name: c.name, sub: c.account_name }))
  );

  const unitOptions: PickerOption[] = units.map((u) => ({
    name: u.name,
    sub: u.development_name,
  }));

  const [localColumns, setLocalColumns] = useServerState(customColumns);
  useEffect(
    () => setContactOptions(contacts.map((c) => ({ name: c.name, sub: c.account_name }))),
    [contacts]
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

  const patchViewing = (id: string, patch: Partial<CrmViewing>) => {
    const prevRow = localViewings.find((v) => v.id === id);
    if (
      prevRow &&
      !canEditRow(profile, { owner_id: prevRow.agent_id, created_by: prevRow.created_by })
    ) {
      setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
      return;
    }
    return applyRowEdit<CrmViewing>({
      id,
      patch,
      prev: prevRow,
      setRows: setLocalViewings,
      save: updateViewing,
      setToast,
    });
  };

  const handleAdd = async (groupId: string, name: string) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setLocalViewings((prev) => [
      ...prev,
      {
        id: tempId,
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
        custom: {},
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    // swap the placeholder for the row the database actually stored, so its
    // real id is in place before anyone can click a cell on it
    const created = await addViewing(groupId, name);
    if (created.error || !created.row) {
      setLocalViewings((prev) => prev.filter((r) => r.id !== tempId));
      setToast({ message: created.error ?? "could not add the row", tone: "alert" });
      return;
    }
    setLocalViewings((prev) =>
      prev.map((r) => (r.id === tempId ? ({ ...r, ...(created.row as object) } as typeof r) : r))
    );
  };

  const handleAddGroup = async () => {
    const color = GROUP_COLORS[localGroups.length % GROUP_COLORS.length];
    const result = await addViewingGroup("New Group", color);
    if (result.id) setNewGroupId(result.id);
  };

  const handleAddColumn = async (type: CustomColumnType) => {
    const result = await addCustomColumn("viewings", type);
    if (result.error || !result.column) {
      setToast({ message: result.error ?? "could not add column", tone: "alert" });
      return;
    }
    setLocalColumns((prev) => [...prev, result.column as CrmCustomColumn]);
    setToast({ message: "Column added — click its name to rename" });
  };

  const handleRenameColumn = (columnId: string, label: string) => {
    setLocalColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, label } : c)));
    renameCustomColumn(columnId, label, "viewings");
  };

  const handleDeleteColumn = async (columnId: string) => {
    const prevCols = localColumns;
    setLocalColumns((cols) => cols.filter((c) => c.id !== columnId));
    const result = await deleteCustomColumn(columnId, "viewings");
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
            quickFilters={{ dims: filterDims, rows: localViewings, state: qf.state, onToggle: qf.toggle, onClear: qf.clear, visible: sortedRows.length, noun: "viewings" }}
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
              onDeleteGroup={isFullAccess(profile.role) ? () => requestDeleteGroup(group) : undefined}
              group={group}
              isNew={group.id === newGroupId}
              tools={rowTools}
              viewings={sortedRows.filter(
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
                setGroupCollapsed("viewings", group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                renameViewingGroup(group.id, name);
              }}
              onPatch={patchViewing}
              customColumns={localColumns}
              profile={profile}
              onAddColumn={handleAddColumn}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              onAdd={(name) => handleAdd(group.id, name)}
              onCreateContact={async (viewingId, name) => {
                setContactOptions((prev) => [...prev, { name }]);
                await quickCreateContact(name);
                patchViewing(viewingId, { contact_name: name });
              }}
              onCreateUnit={async (viewingId, name) => {
                await quickCreateUnit(name);
                patchViewing(viewingId, { unit_name: name });
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
      {deleteGroupPrompt && (
        <ConfirmDialog
          title={`Delete “${deleteGroupPrompt.name}”?`}
          message="The empty group will be removed from this board. This can't be undone."
          onCancel={() => setDeleteGroupPrompt(null)}
          onConfirm={async () => {
            const g = deleteGroupPrompt;
            setDeleteGroupPrompt(null);
            const prev = localGroups;
            setLocalGroups((gs) => gs.filter((x) => x.id !== g.id));
            const result = await deleteViewingGroup(g.id);
            if (result.error) {
              setLocalGroups(prev);
              setToast({ message: result.error, tone: "alert" });
            } else {
              setToast({ message: `Group “${g.name}” deleted` });
            }
          }}
        />
      )}
      <AiFloaty />
    </Surface>
  );
}
