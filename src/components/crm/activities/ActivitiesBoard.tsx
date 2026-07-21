"use client";

import type { CrmCustomColumn, CustomColumnType } from "@/lib/custom-columns";
import {
  addCustomColumn,
  deleteCustomColumn,
  renameCustomColumn,
} from "@/app/(app)/crm/custom-columns-actions";
import { SuccessToast } from "@/components/ui/SuccessToast";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Icon } from "@/components/ui/Icon";
import { canAnimate } from "@/lib/motion";
import type { CrmActivityGroup, CrmActivityItem, CrmUser } from "@/lib/types";
import { BoardHeader, type ItemHeight } from "@/components/crm/leads/BoardHeader";
import { GROUP_COLORS } from "@/components/crm/leads/board-config";
import { ActivityGroup } from "./ActivityGroup";
import { ROW_HEIGHTS } from "./activities-config";
import {
  addActivity,
  addActivityGroup,
  renameActivityGroup,
  setActivityGroupCollapsed,
  updateActivity,
} from "@/app/(app)/crm/activities/actions";
import { byPosition, useRowTools } from "@/components/crm/row-tools";

export function ActivitiesBoard({
  profile,
  groups,
  activities,
  users,
  customColumns = [],
}: {
  profile: CrmUser;
  groups: CrmActivityGroup[];
  activities: CrmActivityItem[];
  users: CrmUser[];
  customColumns?: CrmCustomColumn[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [localActivities, setLocalActivities] = useState(activities);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [itemHeight, setItemHeight] = useState<ItemHeight>("single");

  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert" } | null>(null);
  const rowTools = useRowTools({
    boardKey: "activities",
    rows: localActivities,
    setRows: setLocalActivities,
    groups: localGroups.map((g) => ({ id: g.id, name: g.name })),
    profile,
    onToast: (message, tone) => setToast({ message, tone }),
  });
  const sortedRows = [...localActivities].sort(byPosition);
  const [localColumns, setLocalColumns] = useState(customColumns);
  useEffect(() => setLocalColumns(customColumns), [customColumns]);
  useEffect(() => setLocalActivities(activities), [activities]);
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

  const patchActivity = (activityId: string, patch: Partial<CrmActivityItem>) => {
    setLocalActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, ...patch } : a))
    );
    updateActivity(activityId, patch as Record<string, unknown>);
  };

  const handleAddActivity = async (groupId: string, name: string) => {
    setLocalActivities((prev) => [
      ...prev,
      {
        id: `temp-${prev.length}-${name}`,
        name: name.trim() || "New Activity",
        group_id: groupId,
        owner_id: null,
        activity_type: null,
        status: null,
        start_at: null,
        end_at: null,
        related_item: null,
        custom: {},
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    await addActivity(groupId, name);
  };

  const handleAddGroup = async () => {
    const color = GROUP_COLORS[localGroups.length % GROUP_COLORS.length];
    const result = await addActivityGroup("New Group", color);
    if (result.id) setNewGroupId(result.id);
  };

  const handleAddColumn = async (type: CustomColumnType) => {
    const result = await addCustomColumn("activities", type);
    if (result.error || !result.column) {
      setToast({ message: result.error ?? "could not add column", tone: "alert" });
      return;
    }
    setLocalColumns((prev) => [...prev, result.column as CrmCustomColumn]);
    setToast({ message: "Column added — click its name to rename" });
  };

  const handleRenameColumn = (columnId: string, label: string) => {
    setLocalColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, label } : c)));
    renameCustomColumn(columnId, label, "activities");
  };

  const handleDeleteColumn = async (columnId: string) => {
    const prevCols = localColumns;
    setLocalColumns((cols) => cols.filter((c) => c.id !== columnId));
    const result = await deleteCustomColumn(columnId, "activities");
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
            title="Activities"
            tabs={["Main table"]}
            activeTab="Main table"
            onTabChange={() => {}}
            newLabel="New activity"
            searchValue={search}
            onSearch={setSearch}
            users={users}
            personFilter={personFilter}
            onPersonFilter={setPersonFilter}
            showImport={false}
            itemHeight={itemHeight}
            onItemHeight={setItemHeight}
            onNew={() => {
              const first = localGroups[0];
              if (first) handleAddActivity(first.id, "New Activity");
            }}
          />
        </div>

        <div className="thin-scroll board-anim min-h-0 flex-1 overflow-auto bg-white pl-[40px] pt-[8px]">
          {localGroups.map((group) => (
            <ActivityGroup
              key={group.id}
              group={group}
              isNew={group.id === newGroupId}
              tools={rowTools}
              activities={sortedRows.filter(
                (a) =>
                  a.group_id === group.id &&
                  (!search.trim() ||
                    a.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                    (a.related_item ?? "")
                      .toLowerCase()
                      .includes(search.trim().toLowerCase())) &&
                  (!personFilter || a.owner_id === personFilter)
              )}
              users={users}
              rowH={ROW_HEIGHTS[itemHeight]}
              onToggleCollapse={(collapsed) => {
                setActivityGroupCollapsed(group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                renameActivityGroup(group.id, name);
              }}
              onPatchActivity={patchActivity}
              customColumns={localColumns}
              profile={profile}
              onAddColumn={handleAddColumn}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              onAddActivity={(name) => handleAddActivity(group.id, name)}
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
        <SuccessToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      )}
      <AiFloaty />
    </Surface>
  );
}
