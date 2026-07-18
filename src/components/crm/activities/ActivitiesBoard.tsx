"use client";

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

export function ActivitiesBoard({
  profile,
  groups,
  activities,
  users,
}: {
  profile: CrmUser;
  groups: CrmActivityGroup[];
  activities: CrmActivityItem[];
  users: CrmUser[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [localActivities, setLocalActivities] = useState(activities);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [itemHeight, setItemHeight] = useState<ItemHeight>("single");

  useEffect(() => setLocalActivities(activities), [activities]);
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
            automateLabel="Automate / 1"
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
              activities={localActivities.filter(
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
      <AiFloaty />
    </Surface>
  );
}
