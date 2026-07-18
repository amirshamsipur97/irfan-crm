"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Icon } from "@/components/ui/Icon";
import { canAnimate } from "@/lib/motion";
import type { CrmProject, CrmProjectGroup, CrmUser } from "@/lib/types";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { GROUP_COLORS } from "@/components/crm/leads/board-config";
import { ProjectGroup } from "./ProjectGroup";
import {
  addProject,
  addProjectGroup,
  renameProjectGroup,
  setProjectGroupCollapsed,
  updateProject,
} from "@/app/(app)/crm/projects/actions";

export function ProjectsBoard({
  profile,
  groups,
  projects,
  users,
}: {
  profile: CrmUser;
  groups: CrmProjectGroup[];
  projects: CrmProject[];
  users: CrmUser[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("Main table");
  const [localProjects, setLocalProjects] = useState(projects);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);

  useEffect(() => setLocalProjects(projects), [projects]);
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

  const patchProject = (projectId: string, patch: Partial<CrmProject>) => {
    setLocalProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, ...patch } : p))
    );
    updateProject(projectId, patch as Record<string, unknown>);
  };

  const handleAddProject = async (groupId: string, name: string) => {
    setLocalProjects((prev) => [
      ...prev,
      {
        id: `temp-${prev.length}-${name}`,
        name: name.trim() || "New project",
        group_id: groupId,
        owner_id: null,
        status: null,
        priority: null,
        start_date: null,
        end_date: null,
        project_value: null,
        account_name: null,
        notes: null,
        last_interaction_at: null,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    await addProject(groupId, name);
  };

  const handleAddGroup = async () => {
    const color = GROUP_COLORS[localGroups.length % GROUP_COLORS.length];
    const result = await addProjectGroup("New Group", color);
    if (result.id) setNewGroupId(result.id);
  };

  return (
    <Surface>
      <div ref={rootRef} className="flex h-full flex-col">
        <div className="board-anim">
          <BoardHeader
            profile={profile}
            title="Client Projects"
            tabs={["Main table"]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            newLabel="New project"
            searchValue={search}
            onSearch={setSearch}
            users={users}
            personFilter={personFilter}
            onPersonFilter={setPersonFilter}
            automateLabel="Automate / 1"
            onNew={() => {
              const first = localGroups[0];
              if (first) handleAddProject(first.id, "New project");
            }}
          />
        </div>

        <div className="thin-scroll board-anim min-h-0 flex-1 overflow-auto bg-white pl-[40px] pt-[8px]">
          {localGroups.map((group) => (
            <ProjectGroup
              key={group.id}
              group={group}
              isNew={group.id === newGroupId}
              projects={localProjects.filter(
                (p) =>
                  p.group_id === group.id &&
                  (!search.trim() ||
                    p.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                    (p.account_name ?? "")
                      .toLowerCase()
                      .includes(search.trim().toLowerCase())) &&
                  (!personFilter || p.owner_id === personFilter)
              )}
              users={users}
              onToggleCollapse={(collapsed) => {
                setProjectGroupCollapsed(group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                renameProjectGroup(group.id, name);
              }}
              onPatchProject={patchProject}
              onAddProject={(name) => handleAddProject(group.id, name)}
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
