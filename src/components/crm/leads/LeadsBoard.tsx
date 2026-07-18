"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Icon } from "@/components/ui/Icon";
import { canAnimate } from "@/lib/motion";
import type { CrmLead, CrmLeadGroup, CrmStage, CrmUser } from "@/lib/types";
import { BoardHeader } from "./BoardHeader";
import { LeadGroup } from "./LeadGroup";
import { GROUP_COLORS } from "./board-config";
import {
  addGroup,
  addLead,
  logLeadActivity,
  moveLeadToContacts,
  renameGroup,
  renameLead,
  setGroupCollapsed,
  updateLead,
  updateLeadOwner,
  updateLeadStage,
} from "@/app/(app)/crm/leads/actions";
import type { LogPayload } from "@/components/crm/deals/activity-log";
import { SuccessToast } from "@/components/ui/SuccessToast";

export function LeadsBoard({
  profile,
  groups,
  leads,
  stages,
  users,
}: {
  profile: CrmUser;
  groups: CrmLeadGroup[];
  leads: CrmLead[];
  stages: CrmStage[];
  users: CrmUser[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [localLeads, setLocalLeads] = useState(leads);
  const [localGroups, setLocalGroups] = useState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);

  useEffect(() => setLocalLeads(leads), [leads]);
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

  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);

  const patchLead = (leadId: string, patch: Partial<CrmLead>) =>
    setLocalLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...patch } : l)));

  /** cell edits: optimistic patch + persist + green toast with working undo */
  const editLead = (leadId: string, patch: Partial<CrmLead>) => {
    const prevLead = localLeads.find((l) => l.id === leadId);
    patchLead(leadId, patch);
    updateLead(leadId, patch as Record<string, unknown>);
    if (prevLead) {
      const previous = Object.fromEntries(
        Object.keys(patch).map((k) => [k, prevLead[k as keyof CrmLead] ?? null])
      ) as Partial<CrmLead>;
      setToast({
        message: "We successfully updated 1 item",
        undo: () => {
          patchLead(leadId, previous);
          updateLead(leadId, previous as Record<string, unknown>);
        },
      });
    }
  };

  const handleMoveToContacts = (leadId: string) => {
    const lead = localLeads.find((l) => l.id === leadId);
    const custom = (lead?.custom ?? {}) as Record<string, unknown>;
    if (custom.moved_to_contacts) return;
    patchLead(leadId, { custom: { ...custom, moved_to_contacts: true } });
    moveLeadToContacts(leadId);
    setToast({ message: `${lead?.name ?? "Lead"} moved to Contacts` });
  };

  const handleAddLead = async (groupId: string, name: string) => {
    const tempId = `temp-${Date.now()}`;
    const firstStage = stages[0];
    setLocalLeads((prev) => [
      ...prev,
      {
        id: tempId,
        name: name.trim() || "New Lead",
        phone: null,
        country_code: null,
        email: null,
        company: null,
        title: null,
        group_id: groupId,
        source: "manual",
        interest: null,
        budget: null,
        currency: "AED",
        pipeline_id: firstStage?.pipeline_id ?? "",
        stage_id: firstStage?.id ?? "",
        owner_id: null,
        priority: "medium",
        is_archived: false,
        next_followup_at: null,
        last_activity_at: null,
        website_lead_id: null,
        custom: {},
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    await addLead(groupId, name);
  };

  const handleAddGroup = async () => {
    const color = GROUP_COLORS[localGroups.length % GROUP_COLORS.length];
    const result = await addGroup("New Group", color);
    if (result.id) setNewGroupId(result.id);
  };

  const q = search.trim().toLowerCase();
  const visibleLeads = localLeads.filter(
    (l) =>
      (!q ||
        l.name.toLowerCase().includes(q) ||
        (l.company ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q)) &&
      (!personFilter || l.owner_id === personFilter)
  );

  return (
    <Surface>
      <div ref={rootRef} className="flex h-full flex-col">
        <div className="board-anim">
          <BoardHeader
            profile={profile}
            title="Leads"
            tabs={["Main table", "Lead submission form"]}
            activeTab="Main table"
            onTabChange={() => {}}
            newLabel="New lead"
            showAiAgents
            searchValue={search}
            onSearch={setSearch}
            users={users}
            personFilter={personFilter}
            onPersonFilter={setPersonFilter}
            onNew={() => {
              const first = localGroups[0];
              if (first) handleAddLead(first.id, "New Lead");
            }}
          />
        </div>

        <div className="thin-scroll board-anim min-h-0 flex-1 overflow-auto bg-white pl-[40px] pt-[8px]">
          {localGroups.map((group) => (
            <LeadGroup
              key={group.id}
              group={group}
              isNew={group.id === newGroupId}
              leads={visibleLeads.filter((l) => l.group_id === group.id)}
              stages={stages}
              users={users}
              onToggleCollapse={(collapsed) => {
                setGroupCollapsed(group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                renameGroup(group.id, name);
              }}
              onRenameLead={(leadId, name) => {
                patchLead(leadId, { name });
                renameLead(leadId, name);
              }}
              onStageChange={(leadId, stageId) => {
                patchLead(leadId, { stage_id: stageId });
                updateLeadStage(leadId, stageId);
              }}
              onOwnerChange={(leadId, ownerId) => {
                patchLead(leadId, { owner_id: ownerId });
                updateLeadOwner(leadId, ownerId);
              }}
              onAddLead={(name) => handleAddLead(group.id, name)}
              onPatchLead={editLead}
              onMoveToContacts={handleMoveToContacts}
              onLogActivity={(leadId, payload: LogPayload) => {
                patchLead(leadId, {
                  last_activity_at: payload.startAt ?? new Date().toISOString(),
                });
                logLeadActivity(leadId, payload);
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
          onUndo={toast.undo}
          onClose={() => setToast(null)}
        />
      )}
      <AiFloaty />
    </Surface>
  );
}
