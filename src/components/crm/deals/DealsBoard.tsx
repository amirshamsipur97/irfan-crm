"use client";

import { useEffect, useRef, useState } from "react";
import { useServerState } from "@/lib/use-server-state";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Icon } from "@/components/ui/Icon";
import { canAnimate } from "@/lib/motion";
import type { CrmAccount, CrmContact, CrmDeal, CrmDealGroup, CrmDealStage, CrmUser } from "@/lib/types";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { GROUP_COLORS } from "@/components/crm/leads/board-config";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { DealGroup } from "./DealGroup";
import { SalesReport } from "./SalesReport";
import { PipelineView } from "./PipelineView";
import {
  addDeal,
  addDealGroup,
  quickCreateAccount,
  quickCreateContact,
  renameDealGroup,
  updateDeal,
} from "@/app/(app)/crm/offers/actions";
import { setGroupCollapsed } from "@/app/(app)/crm/actions";
import type { PickerOption } from "./connect-picker";
import { LostReasonDialog } from "./lost-reason-dialog";
import { ContactDrawer } from "@/components/crm/contacts/contact-drawer";
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
  customColumns = [],
}: {
  profile: CrmUser;
  groups: CrmDealGroup[];
  deals: CrmDeal[];
  stages: CrmDealStage[];
  users: CrmUser[];
  accounts: CrmAccount[];
  contacts: CrmContact[];
  customColumns?: CrmCustomColumn[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState("Main table");
  const [localDeals, setLocalDeals] = useServerState(deals);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [localGroups, setLocalGroups] = useServerState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  // options carry the row id so picking one of several same-named people
  // links EXACTLY that person; the C-code in the sub line tells them apart
  const [accountOptions, setAccountOptions] = useState<PickerOption[]>(
    accounts.map((a) => ({ id: a.id, name: a.name, sub: a.domain }))
  );
  const [contactOptions, setContactOptions] = useState<PickerOption[]>(
    contacts.map((c) => ({
      id: c.id,
      name: c.name,
      sub: [c.code, c.account_name].filter(Boolean).join(" · ") || null,
    }))
  );
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert"; undo?: () => void } | null>(null);
  const [lostPrompt, setLostPrompt] = useState<{ dealId: string; stageId: string } | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  // an offer row opens the CLIENT's file (the contact drawer); the
  // transaction-side drawer lives on the Deals board
  const resolveClient = (deal: CrmDeal): CrmContact | undefined =>
    contacts.find((c) => c.id === deal.contact_id) ??
    contacts.find(
      (c) =>
        !!deal.contact_name &&
        c.name.trim().toLowerCase() === deal.contact_name.trim().toLowerCase()
    );
  const openClientDrawer = (dealId: string) => {
    const deal = localDeals.find((d) => d.id === dealId);
    if (!deal) return;
    if (!resolveClient(deal)) {
      setToast({
        message: "Link a client to this offer first — opening it shows the client's file.",
        tone: "alert",
      });
      return;
    }
    setOpenDealId(dealId);
  };
  const rowTools = useRowTools({
    boardKey: "offers",
    rows: localDeals,
    setRows: setLocalDeals,
    groups: localGroups.map((g) => ({ id: g.id, name: g.name })),
    profile,
    onToast: (message, tone) => setToast({ message, tone }),
    onOpen: openClientDrawer,
  });
  const [localColumns, setLocalColumns] = useServerState(customColumns);
  useEffect(
    () => setAccountOptions(accounts.map((a) => ({ id: a.id, name: a.name, sub: a.domain }))),
    [accounts]
  );
  useEffect(
    () =>
      setContactOptions(
        contacts.map((c) => ({
          id: c.id,
          name: c.name,
          sub: [c.code, c.account_name].filter(Boolean).join(" · ") || null,
        }))
      ),
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
    const result = await addCustomColumn("offers", type);
    if (result.error || !result.column) {
      setToast({ message: result.error ?? "could not add column", tone: "alert" });
      return;
    }
    setLocalColumns((prev) => [...prev, result.column as CrmCustomColumn]);
    setToast({ message: "Column added — click its name to rename" });
  };

  const handleRenameColumn = (columnId: string, label: string) => {
    setLocalColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, label } : c)));
    renameCustomColumn(columnId, label, "offers");
  };

  const handleDeleteColumn = async (columnId: string) => {
    const prev = localColumns;
    setLocalColumns((cols) => cols.filter((c) => c.id !== columnId));
    const result = await deleteCustomColumn(columnId, "offers");
    if (result.error) {
      setLocalColumns(prev);
      setToast({ message: result.error, tone: "alert" });
    } else {
      setToast({ message: "Column removed (values kept in history)" });
    }
  };

  /**
   * The client accepted this offer — it becomes a deal. The row stays here
   * with a ✓ (like leads after Move to contact) and appears on the Deals
   * board, where its downpayment is tracked. The percent is prefilled from
   * the developer's customary rate the first time.
   */
  const handleMoveToDeal = async (deal: CrmDeal) => {
    const developer = accounts.find(
      (a) =>
        !!deal.account_name &&
        a.name.trim().toLowerCase() === deal.account_name.trim().toLowerCase()
    );
    const patch: Partial<CrmDeal> = { accepted_at: new Date().toISOString() };
    if (deal.downpayment_percent == null && developer?.default_downpayment_percent != null) {
      patch.downpayment_percent = Number(developer.default_downpayment_percent);
    }
    const saved = await patchDeal(deal.id, patch, true);
    if (saved) {
      setToast({
        message: `${deal.name} moved to Deals`,
        undo: () => {
          patchDeal(deal.id, { accepted_at: null }, true);
        },
      });
    }
  };

  const createAndLink = async (kind: "account" | "contact", dealId: string, name: string) => {
    // await the insert first — the FK-resolve trigger on the deal must be able
    // to find the new row, otherwise the link stays name-only
    if (kind === "account") {
      await quickCreateAccount(name);
      patchDeal(dealId, { account_name: name });
    } else {
      setContactOptions((prev) => [...prev, { name }]);
      await quickCreateContact(name);
      // the client IS the row now — the offer's name follows the pick
      patchDeal(dealId, { contact_name: name, name: `Offer — ${name}` });
    }
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
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const firstStage = stages[0];
    setLocalDeals((prev) => [
      ...prev,
      {
        id: tempId,
        name: name.trim() || "New Offer",
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
        offer_property_type: null,
        offer_bedrooms: null,
        offer_details: null,
        accepted_at: null,
        downpayment_percent: null,
        downpayment_amount: null,
        invoice_sent_at: null,
        downpayment_completed_at: null,
        custom: {},
        forecast_category: null,
        last_interaction_at: null,
        lead_id: null,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    // swap the placeholder for the row the database actually stored, so its
    // real id is in place before anyone can click a cell on it
    const created = await addDeal(groupId, name);
    if (created.error || !created.row) {
      setLocalDeals((prev) => prev.filter((r) => r.id !== tempId));
      setToast({ message: created.error ?? "could not add the row", tone: "alert" });
      return;
    }
    setLocalDeals((prev) =>
      prev.map((r) => (r.id === tempId ? ({ ...r, ...(created.row as object) } as typeof r) : r))
    );
    // typing an existing client's name in "+ Add offer" links them right away
    const match = contacts.find(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (match) {
      patchDeal(
        created.row.id as string,
        { contact_name: match.name, name: `Offer — ${match.name}` },
        true
      );
    }
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
            quickFilters={{ dims: filterDims, rows: localDeals, state: qf.state, onToggle: qf.toggle, onClear: qf.clear, visible: sortedRows.length, noun: "offers" }}
            profile={profile}
            title="Offers"
            tabs={VIEWS}
            activeTab={view}
            onTabChange={setView}
            newLabel="New offer"
            searchValue={search}
            onSearch={setSearch}
            users={users}
            personFilter={personFilter}
            onPersonFilter={setPersonFilter}
            onNew={() => {
              const first = localGroups[0];
              if (first) handleAddDeal(first.id, "New Offer");
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
                contacts={contacts}
              deals={sortedRows.filter((d) => d.group_id === group.id)}
                stages={stages}
                users={users}
                contactOptions={contactOptions}
                accountOptions={accountOptions}
                onCreateAccount={(dealId, name) => createAndLink("account", dealId, name)}
                onCreateContact={(dealId, name) => createAndLink("contact", dealId, name)}
                onOpenDeal={openClientDrawer}
                onMoveToDeal={handleMoveToDeal}
                customColumns={localColumns}
                profile={profile}
                onAddColumn={handleAddColumn}
                onRenameColumn={handleRenameColumn}
                onDeleteColumn={handleDeleteColumn}
                onToggleCollapse={(collapsed) => {
                  setGroupCollapsed("offers", group.id, collapsed);
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
        const client = resolveClient(openDeal);
        if (!client) return null;
        return (
          <ContactDrawer
            contact={client}
            profile={profile}
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
