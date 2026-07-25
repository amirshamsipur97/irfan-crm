"use client";

import { useEffect, useRef, useState } from "react";
import { useServerState } from "@/lib/use-server-state";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Icon } from "@/components/ui/Icon";
import { canAnimate } from "@/lib/motion";
import type { CrmAccount, CrmContact, CrmDeal, CrmDealGroup, CrmDealStage, CrmUnit, CrmUser } from "@/lib/types";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { GROUP_COLORS } from "@/components/crm/leads/board-config";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { DealGroup } from "./DealGroup";
import { SalesReport } from "./SalesReport";
import { PipelineView } from "./PipelineView";
import {
  addDeal,
  addDealGroup,
  logDealActivity,
  quickCreateAccount,
  quickCreateContact,
  renameDealGroup,
  updateDeal,
} from "@/app/(app)/crm/deals/actions";
import { setGroupCollapsed } from "@/app/(app)/crm/actions";
import type { LogPayload } from "./activity-log";
import type { PickerOption } from "./connect-picker";
import { LostReasonDialog } from "./lost-reason-dialog";
import { DealDrawer } from "./deal-drawer";
import { applyRowEdit } from "@/components/crm/persist";
import { canEditRow, OWNER_ONLY_MESSAGE } from "@/lib/permissions";
import type { CrmCustomColumn, CustomColumnType } from "@/lib/custom-columns";
import {
  addCustomColumn,
  deleteCustomColumn,
  renameCustomColumn,
} from "@/app/(app)/crm/custom-columns-actions";
import { byPosition, useRowTools } from "@/components/crm/row-tools";
import { applyQuickFilters, useQuickFilters, type QuickFilterDim } from "@/components/crm/quick-filters";

const VIEWS = ["Main table", "Sales report", "Pipeline"];

export function DealsBoard({
  profile,
  groups,
  deals,
  stages,
  users,
  accounts,
  contacts,
  units = [],
  customColumns = [],
}: {
  profile: CrmUser;
  groups: CrmDealGroup[];
  deals: CrmDeal[];
  stages: CrmDealStage[];
  users: CrmUser[];
  accounts: CrmAccount[];
  contacts: CrmContact[];
  units?: CrmUnit[];
  customColumns?: CrmCustomColumn[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState("Main table");
  const [localDeals, setLocalDeals] = useServerState(deals);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useServerState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [accountOptions, setAccountOptions] = useState<PickerOption[]>(
    accounts.map((a) => ({ name: a.name, sub: a.domain }))
  );
  const [contactOptions, setContactOptions] = useState<PickerOption[]>(
    contacts.map((c) => ({ name: c.name, sub: c.account_name }))
  );
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert"; undo?: () => void } | null>(null);
  const [lostPrompt, setLostPrompt] = useState<{ dealId: string; stageId: string } | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const rowTools = useRowTools({
    boardKey: "deals",
    rows: localDeals,
    setRows: setLocalDeals,
    groups: localGroups.map((g) => ({ id: g.id, name: g.name })),
    profile,
    onToast: (message, tone) => setToast({ message, tone }),
    onOpen: setOpenDealId,
  });
  const [localColumns, setLocalColumns] = useServerState(customColumns);
  useEffect(
    () => setAccountOptions(accounts.map((a) => ({ name: a.name, sub: a.domain }))),
    [accounts]
  );
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
    { scope: rootRef, dependencies: [view] }
  );

  const patchDeal = (dealId: string, patch: Partial<CrmDeal>, silent = false) => {
    const prevDeal = localDeals.find((d) => d.id === dealId);
    if (prevDeal && !canEditRow(profile, prevDeal)) {
      setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
      return;
    }
    // entering the Lost stage requires a reason (dialog completes the patch)
    if (patch.stage_id && !("lost_reason" in patch)) {
      const target = stages.find((s) => s.id === patch.stage_id);
      if (target?.is_lost) {
        setLostPrompt({ dealId, stageId: patch.stage_id });
        return;
      }
    }
    // Monday-style confirmation with a real undo (restores the previous values)
    return applyRowEdit<CrmDeal>({
      id: dealId,
      patch,
      prev: prevDeal,
      setRows: setLocalDeals,
      save: updateDeal,
      setToast,
      silent,
    });
  };

  const handleAddColumn = async (type: CustomColumnType) => {
    const result = await addCustomColumn("deals", type);
    if (result.error || !result.column) {
      setToast({ message: result.error ?? "could not add column", tone: "alert" });
      return;
    }
    setLocalColumns((prev) => [...prev, result.column as CrmCustomColumn]);
    setToast({ message: "Column added — click its name to rename" });
  };

  const handleRenameColumn = (columnId: string, label: string) => {
    setLocalColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, label } : c)));
    renameCustomColumn(columnId, label, "deals");
  };

  const handleDeleteColumn = async (columnId: string) => {
    const prev = localColumns;
    setLocalColumns((cols) => cols.filter((c) => c.id !== columnId));
    const result = await deleteCustomColumn(columnId, "deals");
    if (result.error) {
      setLocalColumns(prev);
      setToast({ message: result.error, tone: "alert" });
    } else {
      setToast({ message: "Column removed (values kept in history)" });
    }
  };

  const createAndLink = async (kind: "account" | "contact", dealId: string, name: string) => {
    // await the insert first — the FK-resolve trigger on the deal must be able
    // to find the new row, otherwise the link stays name-only
    if (kind === "account") {
      setAccountOptions((prev) => [...prev, { name }]);
      await quickCreateAccount(name);
      patchDeal(dealId, { account_name: name });
    } else {
      setContactOptions((prev) => [...prev, { name }]);
      await quickCreateContact(name);
      patchDeal(dealId, { contact_name: name });
    }
  };

  const logActivity = (dealId: string, payload: LogPayload) => {
    const iso = payload.startAt ?? new Date().toISOString();
    setLocalDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, last_interaction_at: iso } : d))
    );
    logDealActivity(dealId, payload);
  };

  const q = search.trim().toLowerCase();
  const visibleDeals = localDeals.filter(
    (d) =>
      (!q ||
        d.name.toLowerCase().includes(q) ||
        (d.contact_name ?? "").toLowerCase().includes(q) ||
        (d.account_name ?? "").toLowerCase().includes(q)) &&
      (!personFilter || d.owner_id === personFilter)
  );
  const qf = useQuickFilters();

  const filterDims: QuickFilterDim<CrmDeal>[] = [
    { key: "group", label: "Group", get: (r) => r.group_id, format: (v) => localGroups.find((g) => g.id === v)?.name ?? "—", color: (v) => localGroups.find((g) => g.id === v)?.color },
    { key: "stage", label: "Stage", get: (r) => r.stage_id, format: (v) => stages.find((s) => s.id === v)?.name ?? "—", color: (v) => stages.find((s) => s.id === v)?.color },
    { key: "owner", label: "Owner", get: (r) => r.owner_id, format: (v) => users.find((u) => u.id === v)?.full_name ?? "—" },
    { key: "contact", label: "Contact", get: (r) => r.contact_name },
    { key: "account", label: "Account", get: (r) => r.account_name },
  ];
  const sortedRows = applyQuickFilters([...visibleDeals].sort(byPosition), filterDims, qf.state);


  const handleAddDeal = async (groupId: string, name: string) => {
    const firstStage = stages[0];
    setLocalDeals((prev) => [
      ...prev,
      {
        id: `temp-${prev.length}-${name}`,
        name: name.trim() || "New Deal",
        group_id: groupId,
        stage_id: firstStage?.id ?? "",
        owner_id: null,
        deal_value: null,
        close_probability: null,
        expected_close_date: null,
        is_done: false,
        contact_name: null,
        account_name: null,
        contact_id: null,
        account_id: null,
        currency: "OMR",
        lost_reason: null,
        next_step: null,
        custom: {},
        forecast_category: null,
        last_interaction_at: null,
        lead_id: null,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    await addDeal(groupId, name);
  };

  const handleAddGroup = async () => {
    const color = GROUP_COLORS[localGroups.length % GROUP_COLORS.length];
    const result = await addDealGroup("New Group", color);
    if (result.id) setNewGroupId(result.id);
  };

  return (
    <Surface>
      <div ref={rootRef} className="flex h-full flex-col">
        <div className="board-anim">
          <BoardHeader
            quickFilters={{ dims: filterDims, rows: localDeals, state: qf.state, onToggle: qf.toggle, onClear: qf.clear, visible: sortedRows.length, noun: "deals" }}
            profile={profile}
            title="Deals"
            tabs={VIEWS}
            activeTab={view}
            onTabChange={setView}
            newLabel="New deal"
            searchValue={search}
            onSearch={setSearch}
            users={users}
            personFilter={personFilter}
            onPersonFilter={setPersonFilter}
            onNew={() => {
              const first = localGroups[0];
              if (first) handleAddDeal(first.id, "New Deal");
            }}
          />
        </div>

        {view === "Main table" && (
          <div className="thin-scroll board-anim min-h-0 flex-1 overflow-auto bg-white pl-[40px] pt-[8px]">
            {localGroups.map((group) => (
              <DealGroup
                key={group.id}
                group={group}
                isNew={group.id === newGroupId}
                tools={rowTools}
                deals={sortedRows.filter((d) => d.group_id === group.id)}
                stages={stages}
                users={users}
                onLogActivity={logActivity}
                accountOptions={accountOptions}
                contactOptions={contactOptions}
                onCreateAccount={(dealId, name) => createAndLink("account", dealId, name)}
                onCreateContact={(dealId, name) => createAndLink("contact", dealId, name)}
                onOpenDeal={setOpenDealId}
                customColumns={localColumns}
                profile={profile}
                onAddColumn={handleAddColumn}
                onRenameColumn={handleRenameColumn}
                onDeleteColumn={handleDeleteColumn}
                onToggleCollapse={(collapsed) => {
                  setGroupCollapsed("deals", group.id, collapsed);
                }}
                onRenameGroup={(name) => {
                  setLocalGroups((prev) =>
                    prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                  );
                  setNewGroupId(null);
                  renameDealGroup(group.id, name);
                }}
                onPatchDeal={patchDeal}
                onAddDeal={(name) => handleAddDeal(group.id, name)}
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
        )}

        {view === "Sales report" && (
          <div className="board-anim flex min-h-0 flex-1 flex-col">
            <SalesReport deals={localDeals} stages={stages} />
          </div>
        )}

        {view === "Pipeline" && (
          <div className="board-anim flex min-h-0 flex-1 flex-col">
            <PipelineView
              deals={localDeals}
              stages={stages}
              users={users}
              onStageChange={(dealId, stageId) => patchDeal(dealId, { stage_id: stageId })}
            />
          </div>
        )}
      </div>
      {toast && (
        <SuccessToast
          message={toast.message}
          tone={toast.tone}
          onUndo={toast.undo}
          onClose={() => setToast(null)}
        />
      )}
      {openDealId && (() => {
        const openDeal = localDeals.find((d) => d.id === openDealId);
        if (!openDeal) return null;
        return (
          <DealDrawer
            deal={openDeal}
            profile={profile}
            stages={stages}
            users={users}
            units={units}
            onClose={() => setOpenDealId(null)}
            onToast={(message, tone) => setToast({ message, tone })}
          />
        );
      })()}
      {lostPrompt && (
        <LostReasonDialog
          dealName={localDeals.find((d) => d.id === lostPrompt.dealId)?.name ?? "deal"}
          onCancel={() => setLostPrompt(null)}
          onSubmit={(reason) => {
            patchDeal(lostPrompt.dealId, { stage_id: lostPrompt.stageId, lost_reason: reason });
            setLostPrompt(null);
          }}
        />
      )}
      <AiFloaty />
    </Surface>
  );
}
