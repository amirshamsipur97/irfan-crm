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
import { byPosition, useRowTools } from "@/components/crm/row-tools";
import { applyQuickFilters, useQuickFilters, type QuickFilterDim } from "@/components/crm/quick-filters";

export function ProjectsBoard({
  profile,
  groups,
  projects,
  users,
  customColumns = [],
}: {
  profile: CrmUser;
  groups: CrmProjectGroup[];
  projects: CrmProject[];
  users: CrmUser[];
  customColumns?: CrmCustomColumn[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("Main table");
  const [localProjects, setLocalProjects] = useState(projects);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert" } | null>(null);
  const rowTools = useRowTools({
    boardKey: "projects",
    rows: localProjects,
    setRows: setLocalProjects,
    groups: localGroups.map((g) => ({ id: g.id, name: g.name })),
    profile,
    onToast: (message, tone) => setToast({ message, tone }),
  });
  const qf = useQuickFilters();

  const filterDims: QuickFilterDim<CrmProject>[] = [
    { key: "group", label: "Group", get: (r) => r.group_id, format: (v) => localGroups.find((g) => g.id === v)?.name ?? "—", color: (v) => localGroups.find((g) => g.id === v)?.color },
    { key: "owner", label: "Owner", get: (r) => r.owner_id, format: (v) => users.find((u) => u.id === v)?.full_name ?? "—" },
    { key: "status", label: "Status", get: (r) => r.status },
    { key: "priority", label: "Priority", get: (r) => r.priority },
    { key: "account", label: "Account", get: (r) => r.account_name },
  ];
  const sortedRows = applyQuickFilters([...localProjects].sort(byPosition), filterDims, qf.state);
  const [localColumns, setLocalColumns] = useState(customColumns);
  useEffect(() => setLocalColumns(customColumns), [customColumns]);
  useEffect(() => setLocalProjects(projects), [projects]);
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
        custom: {},
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

  const handleAddColumn = async (type: CustomColumnType) => {
    const result = await addCustomColumn("projects", type);
    if (result.error || !result.column) {
      setToast({ message: result.error ?? "could not add column", tone: "alert" });
      return;
    }
    setLocalColumns((prev) => [...prev, result.column as CrmCustomColumn]);
    setToast({ message: "Column added — click its name to rename" });
  };

  const handleRenameColumn = (columnId: string, label: string) => {
    setLocalColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, label } : c)));
    renameCustomColumn(columnId, label, "projects");
  };

  const handleDeleteColumn = async (columnId: string) => {
    const prevCols = localColumns;
    setLocalColumns((cols) => cols.filter((c) => c.id !== columnId));
    const result = await deleteCustomColumn(columnId, "projects");
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
            quickFilters={{ dims: filterDims, rows: localProjects, state: qf.state, onToggle: qf.toggle, onClear: qf.clear, visible: sortedRows.length, noun: "projects" }}
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
              tools={rowTools}
              projects={sortedRows.filter(
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
              customColumns={localColumns}
              profile={profile}
              onAddColumn={handleAddColumn}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
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
      {toast && (
        <SuccessToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      )}
      <AiFloaty />
    </Surface>
  );
}
