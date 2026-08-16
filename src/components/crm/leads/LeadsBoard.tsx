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
import { canAnimate } from "@/lib/motion";
import type { CrmLead, CrmLeadGroup, CrmStage, CrmUnit, CrmUser } from "@/lib/types";
import { BoardHeader } from "./BoardHeader";
import { LeadGroup } from "./LeadGroup";
import { LeadDrawer } from "./lead-drawer";
import { BOARD_COLUMNS, GROUP_COLORS, sourceColor, sourceLabel } from "./board-config";
import { todayLocalDateString } from "@/components/crm/activities/activities-config";
import { useColumnOrder } from "@/components/crm/column-order";
import {
  addGroup,
  addLead,
  logLeadActivity,
  moveLeadToContacts,
  deleteGroup,
  renameGroup,
  renameLead,
  updateLead,
  updateLeadOwner,
} from "@/app/(app)/crm/leads/actions";
import { setGroupCollapsed } from "@/app/(app)/crm/actions";
import type { LogPayload } from "@/components/crm/deals/activity-log";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { findDuplicateContact } from "@/app/(app)/crm/contacts/actions";
import { applyRowEdit, persist } from "@/components/crm/persist";
import { canEditRow, OWNER_ONLY_MESSAGE } from "@/lib/permissions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { byPosition, useRowTools } from "@/components/crm/row-tools";
import { applyQuickFilters, useQuickFilters, type QuickFilterDim } from "@/components/crm/quick-filters";
import { EmailComposer } from "@/components/crm/email/EmailComposer";
import { GENDER_OPTIONS, TEMPERATURE_OPTIONS, genderLabel, temperatureLabel } from "@/lib/person-fields";

export function LeadsBoard({
  profile,
  groups,
  leads,
  stages,
  users,
  units = [],
  customColumns = [],
  columnOrder = null,
  doneContactIds = [],
}: {
  profile: CrmUser;
  groups: CrmLeadGroup[];
  leads: CrmLead[];
  stages: CrmStage[];
  users: CrmUser[];
  units?: CrmUnit[];
  customColumns?: CrmCustomColumn[];
  /** this user's saved column order, null until they drag one */
  columnOrder?: string[] | null;
  /** contacts whose deal completed its downpayment — marks the source lead */
  doneContactIds?: string[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [localLeads, setLocalLeads] = useServerState(leads);
  const [localGroups, setLocalGroups] = useServerState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const [localColumns, setLocalColumns] = useServerState(customColumns);
  const columnDrag = useColumnOrder({ boardKey: "leads", columns: BOARD_COLUMNS, savedOrder: columnOrder });

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

  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert"; undo?: () => void } | null>(null);
  const [deleteGroupPrompt, setDeleteGroupPrompt] = useState<(typeof groups)[number] | null>(null);

  const [emailLead, setEmailLead] = useState<CrmLead | null>(null);
  const rowTools = useRowTools({
    boardKey: "leads",
    rows: localLeads,
    setRows: setLocalLeads,
    groups: localGroups.map((g) => ({ id: g.id, name: g.name })),
    profile,
    onToast: (message, tone) => setToast({ message, tone }),
    onOpen: setOpenLeadId,
  });

  const patchLead = (leadId: string, patch: Partial<CrmLead>) =>
    setLocalLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...patch } : l)));

  /** cell edits: optimistic patch, awaited persist, rollback + toast on refusal */
  const editLead = async (leadId: string, patch: Partial<CrmLead>) => {
    const prevLead = localLeads.find((l) => l.id === leadId);
    if (prevLead && !canEditRow(profile, prevLead)) {
      setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
      return;
    }
    const saved = await applyRowEdit<CrmLead>({
      id: leadId,
      patch,
      prev: prevLead,
      setRows: setLocalLeads,
      save: updateLead,
      setToast,
    });
    if (saved && ("email" in patch || "phone" in patch)) {
      const next = { ...prevLead, ...patch } as CrmLead;
      const dup = await findDuplicateContact(
        next.email,
        `${next.country_code ?? ""}${next.phone ?? ""}`,
        null
      );
      if (dup)
        setToast({
          message: `Possible duplicate: contact "${dup.name}" has the same email/phone`,
          tone: "alert",
        });
    }
  };

  const handleMoveToContacts = async (leadId: string) => {
    const lead = localLeads.find((l) => l.id === leadId);
    const custom = (lead?.custom ?? {}) as Record<string, unknown>;
    if (custom.moved_to_contacts) return;
    if (lead && !canEditRow(profile, lead)) {
      setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
      return;
    }
    patchLead(leadId, { custom: { ...custom, moved_to_contacts: true } });
    const result = await moveLeadToContacts(leadId);
    if (result.error) {
      patchLead(leadId, { custom: { ...custom, moved_to_contacts: false } });
      setToast({ message: result.error, tone: "alert" });
      return;
    }
    // a merge must never be silent — say exactly whose card absorbed the lead
    setToast({
      message: result.matched
        ? `${lead?.name ?? "Lead"} matched existing contact ${result.contactName ?? "?"}${
            result.contactCode ? ` (${result.contactCode})` : ""
          } — that card was updated instead of creating a duplicate`
        : `${lead?.name ?? "Lead"} moved to Contacts`,
    });
  };

  const handleAddLead = async (groupId: string, name: string) => {
    const tempId = `temp-${Date.now()}`;
    const firstStage = stages[0];
    setLocalLeads((prev) => [
      ...prev,
      {
        id: tempId,
        name: name.trim() || "New Lead",
        first_name: null,
        last_name: null,
        notes: null,
        lead_date: todayLocalDateString(),
        phone: null,
        country_code: null,
        country: null,
        gender: null,
        temperature: null,
        age: null,
        email: null,
        company: null,
        title: null,
        group_id: groupId,
        source: "manual",
        interest: null,
        budget: null,
        currency: "OMR",
        pipeline_id: firstStage?.pipeline_id ?? "",
        stage_id: firstStage?.id ?? "",
        owner_id: profile.id,
        priority: "medium",
        is_archived: false,
        next_followup_at: null,
        last_activity_at: null,
        website_lead_id: null,
        converted_contact_id: null,
        converted_at: null,
        assigned_at: null,
        first_response_at: null,
        lead_score: 0,
        score_band: "cold",
        score_components: [],
        scored_at: null,
        custom: {},
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    // swap the placeholder for the row the database actually stored, so its
    // real id is in place before anyone can click a cell on it
    const created = await addLead(groupId, name);
    if (created.error || !created.row) {
      setLocalLeads((prev) => prev.filter((r) => r.id !== tempId));
      setToast({ message: created.error ?? "could not add the row", tone: "alert" });
      return;
    }
    setLocalLeads((prev) =>
      prev.map((r) => (r.id === tempId ? ({ ...r, ...(created.row as object) } as typeof r) : r))
    );
  };

  // only an EMPTY group may go, and never the last one — the checks repeat
  // server-side, this just gives an instant, friendly answer
  const requestDeleteGroup = (group: (typeof localGroups)[number]) => {
    const count = localLeads.filter((l) => l.group_id === group.id).length;
    if (count) {
      setToast({
        message: `"${group.name}" still holds ${count} lead${count === 1 ? "" : "s"} — move or delete them first.`,
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
        (l.first_name ?? "").toLowerCase().includes(q) ||
        (l.last_name ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q) ||
        (l.phone ?? "").toLowerCase().includes(q)) &&
      (!personFilter || l.owner_id === personFilter)
  );
  const qf = useQuickFilters();

  const filterDims: QuickFilterDim<CrmLead>[] = [
    { key: "group", label: "Group", get: (r) => r.group_id, format: (v) => localGroups.find((g) => g.id === v)?.name ?? "—", color: (v) => localGroups.find((g) => g.id === v)?.color },
    { key: "owner", label: "Owner", get: (r) => r.owner_id, format: (v) => users.find((u) => u.id === v)?.full_name ?? "—" },
    {
      key: "source",
      label: "Lead Source",
      get: (r) => r.source,
      format: (v) => sourceLabel(String(v ?? "")),
      color: (v) => sourceColor(String(v ?? "")),
    },
    { key: "country", label: "Country", get: (r) => r.country },
    { key: "gender", label: "Gender", get: (r) => r.gender, format: (v) => genderLabel(String(v ?? "")), color: (v) => GENDER_OPTIONS.find((g) => g.key === v)?.color },
    { key: "temperature", label: "Status", get: (r) => r.temperature, format: (v) => temperatureLabel(String(v ?? "")), color: (v) => TEMPERATURE_OPTIONS.find((t) => t.key === v)?.color },
    // Blank = still an open lead; the chip mirrors the Move-to-contact ✓
    { key: "converted", label: "Moved to contact", get: (r) => (r.converted_contact_id ? "yes" : null), format: () => "Moved ✓", color: () => "#00c875" },
  ];
  const sortedRows = applyQuickFilters([...visibleLeads].sort(byPosition), filterDims, qf.state);


  const handleAddColumn = async (type: CustomColumnType) => {
    const result = await addCustomColumn("leads", type);
    if (result.error || !result.column) {
      setToast({ message: result.error ?? "could not add column", tone: "alert" });
      return;
    }
    setLocalColumns((prev) => [...prev, result.column as CrmCustomColumn]);
    setToast({ message: "Column added — click its name to rename" });
  };

  const handleRenameColumn = (columnId: string, label: string) => {
    setLocalColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, label } : c)));
    renameCustomColumn(columnId, label, "leads");
  };

  const handleDeleteColumn = async (columnId: string) => {
    const prevCols = localColumns;
    setLocalColumns((cols) => cols.filter((c) => c.id !== columnId));
    const result = await deleteCustomColumn(columnId, "leads");
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
            quickFilters={{ dims: filterDims, rows: localLeads, state: qf.state, onToggle: qf.toggle, onClear: qf.clear, visible: sortedRows.length, noun: "leads" }}
            profile={profile}
            title="Leads"
            tabs={["Main table", "Lead submission form"]}
            activeTab="Main table"
            onTabChange={() => {}}
            newLabel="New lead"
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
              tools={rowTools}
              columns={columnDrag.columns}
              columnDrag={columnDrag}
              onDeleteGroup={() => requestDeleteGroup(group)}
              onEmailLead={setEmailLead}
              leads={sortedRows.filter((l) => l.group_id === group.id)}
              doneContactIds={doneContactIds}
              users={users}
              onToggleCollapse={(collapsed) => {
                setGroupCollapsed("leads", group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                const previous = group.name;
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                persist(renameGroup(group.id, name), {
                  setToast,
                  revert: () =>
                    setLocalGroups((prev) =>
                      prev.map((g) => (g.id === group.id ? { ...g, name: previous } : g))
                    ),
                });
              }}
              onRenameLead={(leadId, name) => {
                const row = localLeads.find((l) => l.id === leadId);
                if (row && !canEditRow(profile, row)) {
                  setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
                  return;
                }
                patchLead(leadId, { name });
                persist(renameLead(leadId, name), {
                  setToast,
                  revert: () => patchLead(leadId, { name: row?.name }),
                });
              }}
              onOwnerChange={(leadId, ownerId) => {
                const row = localLeads.find((l) => l.id === leadId);
                if (row && !canEditRow(profile, row)) {
                  setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
                  return;
                }
                patchLead(leadId, { owner_id: ownerId });
                persist(updateLeadOwner(leadId, ownerId), {
                  setToast,
                  revert: () => patchLead(leadId, { owner_id: row?.owner_id ?? null }),
                });
              }}
              onAddLead={(name) => handleAddLead(group.id, name)}
              onPatchLead={editLead}
              customColumns={localColumns}
              profile={profile}
              onAddColumn={handleAddColumn}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              onMoveToContacts={handleMoveToContacts}
              onOpenLead={setOpenLeadId}
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
            const result = await deleteGroup(g.id);
            if (result.error) {
              setLocalGroups(prev);
              setToast({ message: result.error, tone: "alert" });
            } else {
              setToast({ message: `Group “${g.name}” deleted` });
            }
          }}
        />
      )}
      {openLeadId && (() => {
        const openLead = localLeads.find((l) => l.id === openLeadId);
        if (!openLead) return null;
        return (
          <LeadDrawer
            lead={openLead}
            profile={profile}
            stages={stages}
            users={users}
            units={units}
            onClose={() => setOpenLeadId(null)}
            onToast={(message, tone) => setToast({ message, tone })}
            onConvert={handleMoveToContacts}
          />
        );
      })()}
      {emailLead && emailLead.email && (
        <EmailComposer
          profile={profile}
          to={[emailLead.email]}
          target={{ type: "lead", id: emailLead.id, name: emailLead.name }}
          onClose={() => setEmailLead(null)}
          onDone={(message, tone) => setToast({ message, tone })}
        />
      )}
      <AiFloaty />
    </Surface>
  );
}
