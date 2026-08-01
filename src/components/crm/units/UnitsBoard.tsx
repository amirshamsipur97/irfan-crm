"use client";

import type { CrmCustomColumn, CustomColumnType } from "@/lib/custom-columns";
import { useServerState } from "@/lib/use-server-state";
import {
  addCustomColumn,
  deleteCustomColumn,
  renameCustomColumn,
} from "@/app/(app)/crm/custom-columns-actions";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Icon } from "@/components/ui/Icon";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { applyRowEdit } from "@/components/crm/persist";
import { canEditRow, OWNER_ONLY_MESSAGE } from "@/lib/permissions";
import { canAnimate } from "@/lib/motion";
import type { CrmDevelopment, CrmUnit, CrmUnitGroup, CrmUser } from "@/lib/types";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { GROUP_COLORS } from "@/components/crm/leads/board-config";
import type { PickerOption } from "@/components/crm/deals/connect-picker";
import { UnitGroup } from "./UnitGroup";
import { quickCreateDevelopment } from "@/app/(app)/crm/developments/actions";
import { setGroupCollapsed } from "@/app/(app)/crm/actions";
import {
  addUnit,
  addUnitGroup,
  renameUnitGroup,
  updateUnit,
} from "@/app/(app)/crm/units/actions";
import { byPosition, useRowTools } from "@/components/crm/row-tools";
import { applyQuickFilters, useQuickFilters, type QuickFilterDim } from "@/components/crm/quick-filters";

export function UnitsBoard({
  profile,
  groups,
  units,
  users,
  developments,
  customColumns = [],
}: {
  profile: CrmUser;
  groups: CrmUnitGroup[];
  units: CrmUnit[];
  users: CrmUser[];
  developments: CrmDevelopment[];
  customColumns?: CrmCustomColumn[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("Main table");
  const [localUnits, setLocalUnits] = useServerState(units);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useServerState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert"; undo?: () => void } | null>(null);
  const rowTools = useRowTools({
    boardKey: "units",
    rows: localUnits,
    setRows: setLocalUnits,
    groups: localGroups.map((g) => ({ id: g.id, name: g.name })),
    profile,
    onToast: (message, tone) => setToast({ message, tone }),
  });
  const qf = useQuickFilters();

  const filterDims: QuickFilterDim<CrmUnit>[] = [
    { key: "group", label: "Group", get: (r) => r.group_id, format: (v) => localGroups.find((g) => g.id === v)?.name ?? "—", color: (v) => localGroups.find((g) => g.id === v)?.color },
    { key: "development", label: "Development", get: (r) => r.development_name },
    { key: "status", label: "Status", get: (r) => r.status },
    { key: "type", label: "Type", get: (r) => r.unit_type },
    { key: "bedrooms", label: "Bedrooms", get: (r) => (r.bedrooms == null ? null : String(r.bedrooms)) },
  ];
  const sortedRows = applyQuickFilters([...localUnits].sort(byPosition), filterDims, qf.state);

  const developmentOptions: PickerOption[] = developments.map((d) => ({
    name: d.name,
    sub: d.location,
  }));

  const [localColumns, setLocalColumns] = useServerState(customColumns);

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

  const patchUnit = (id: string, patch: Partial<CrmUnit>) => {
    const prevRow = localUnits.find((u) => u.id === id);
    if (prevRow && !canEditRow(profile, prevRow)) {
      setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
      return;
    }
    return applyRowEdit<CrmUnit>({
      id,
      patch,
      prev: prevRow,
      setRows: setLocalUnits,
      save: updateUnit,
      setToast,
    });
  };

  const handleAdd = async (groupId: string, name: string) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setLocalUnits((prev) => [
      ...prev,
      {
        id: tempId,
        name: name.trim() || "New unit",
        group_id: groupId,
        owner_id: null,
        development_name: null,
        development_id: null,
        unit_type: null,
        bedrooms: null,
        area_sqm: null,
        floor_label: null,
        price: null,
        currency: "OMR",
        status: "available",
        handover_date: null,
        custom: {},
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    // swap the placeholder for the row the database actually stored, so its
    // real id is in place before anyone can click a cell on it
    const created = await addUnit(groupId, name);
    if (created.error || !created.row) {
      setLocalUnits((prev) => prev.filter((r) => r.id !== tempId));
      setToast({ message: created.error ?? "could not add the row", tone: "alert" });
      return;
    }
    setLocalUnits((prev) =>
      prev.map((r) => (r.id === tempId ? ({ ...r, ...(created.row as object) } as typeof r) : r))
    );
  };

  const handleAddGroup = async () => {
    const color = GROUP_COLORS[localGroups.length % GROUP_COLORS.length];
    const result = await addUnitGroup("New Group", color);
    if (result.id) setNewGroupId(result.id);
  };

  const handleAddColumn = async (type: CustomColumnType) => {
    const result = await addCustomColumn("units", type);
    if (result.error || !result.column) {
      setToast({ message: result.error ?? "could not add column", tone: "alert" });
      return;
    }
    setLocalColumns((prev) => [...prev, result.column as CrmCustomColumn]);
    setToast({ message: "Column added — click its name to rename" });
  };

  const handleRenameColumn = (columnId: string, label: string) => {
    setLocalColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, label } : c)));
    renameCustomColumn(columnId, label, "units");
  };

  const handleDeleteColumn = async (columnId: string) => {
    const prevCols = localColumns;
    setLocalColumns((cols) => cols.filter((c) => c.id !== columnId));
    const result = await deleteCustomColumn(columnId, "units");
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
            quickFilters={{ dims: filterDims, rows: localUnits, state: qf.state, onToggle: qf.toggle, onClear: qf.clear, visible: sortedRows.length, noun: "units" }}
            profile={profile}
            title="Units"
            tabs={["Main table"]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            newLabel="New unit"
            searchValue={search}
            onSearch={setSearch}
            users={users}
            personFilter={personFilter}
            onPersonFilter={setPersonFilter}
            onNew={() => {
              const first = localGroups[0];
              if (first) handleAdd(first.id, "New unit");
            }}
          />
        </div>

        <div className="thin-scroll board-anim min-h-0 flex-1 overflow-auto bg-white pl-[40px] pt-[8px]">
          {localGroups.map((group) => (
            <UnitGroup
              key={group.id}
              group={group}
              isNew={group.id === newGroupId}
              tools={rowTools}
              units={sortedRows.filter(
                (u) =>
                  u.group_id === group.id &&
                  (!search.trim() ||
                    u.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                    (u.development_name ?? "")
                      .toLowerCase()
                      .includes(search.trim().toLowerCase())) &&
                  (!personFilter || u.owner_id === personFilter)
              )}
              users={users}
              developmentOptions={developmentOptions}
              onToggleCollapse={(collapsed) => {
                setGroupCollapsed("units", group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                renameUnitGroup(group.id, name);
              }}
              onPatch={patchUnit}
              customColumns={localColumns}
              profile={profile}
              onAddColumn={handleAddColumn}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              onAdd={(name) => handleAdd(group.id, name)}
              onCreateDevelopment={async (unitId, name) => {
                await quickCreateDevelopment(name);
                patchUnit(unitId, { development_name: name });
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
