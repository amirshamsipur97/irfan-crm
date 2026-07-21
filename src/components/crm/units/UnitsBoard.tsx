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
import type { CrmDevelopment, CrmUnit, CrmUnitGroup, CrmUser } from "@/lib/types";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { GROUP_COLORS } from "@/components/crm/leads/board-config";
import type { PickerOption } from "@/components/crm/deals/connect-picker";
import { UnitGroup } from "./UnitGroup";
import { quickCreateDevelopment } from "@/app/(app)/crm/developments/actions";
import {
  addUnit,
  addUnitGroup,
  renameUnitGroup,
  setUnitGroupCollapsed,
  updateUnit,
} from "@/app/(app)/crm/units/actions";
import { byPosition, useRowTools } from "@/components/crm/row-tools";

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
  const [localUnits, setLocalUnits] = useState(units);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useState(groups);
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
  const sortedRows = [...localUnits].sort(byPosition);

  const developmentOptions: PickerOption[] = developments.map((d) => ({
    name: d.name,
    sub: d.location,
  }));

  const [localColumns, setLocalColumns] = useState(customColumns);
  useEffect(() => setLocalColumns(customColumns), [customColumns]);
  useEffect(() => setLocalUnits(units), [units]);
  useEffect(() => setLocalGroups(groups), [groups]);

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
    setLocalUnits((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    updateUnit(id, patch as Record<string, unknown>);
    if (prevRow) {
      const previous = Object.fromEntries(
        Object.keys(patch).map((k) => [k, prevRow[k as keyof CrmUnit] ?? null])
      ) as Partial<CrmUnit>;
      setToast({
        message: "We successfully updated 1 item",
        undo: () => {
          setLocalUnits((prev) => prev.map((u) => (u.id === id ? { ...u, ...previous } : u)));
          updateUnit(id, previous as Record<string, unknown>);
        },
      });
    }
  };

  const handleAdd = async (groupId: string, name: string) => {
    setLocalUnits((prev) => [
      ...prev,
      {
        id: `temp-${prev.length}-${name}`,
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
    await addUnit(groupId, name);
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
                setUnitGroupCollapsed(group.id, collapsed);
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
