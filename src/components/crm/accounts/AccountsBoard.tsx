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
import type { CrmAccount, CrmAccountGroup, CrmContact, CrmDeal, CrmUser } from "@/lib/types";
import { BoardHeader } from "@/components/crm/leads/BoardHeader";
import { GROUP_COLORS } from "@/components/crm/leads/board-config";
import { AccountGroup } from "./AccountGroup";
import {
  addAccount,
  addAccountGroup,
  renameAccountGroup,
  updateAccount,
  deleteAccountGroup,
} from "@/app/(app)/crm/accounts/actions";
import { setGroupCollapsed } from "@/app/(app)/crm/actions";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { applyRowEdit } from "@/components/crm/persist";
import { canEditRow, isFullAccess, OWNER_ONLY_MESSAGE } from "@/lib/permissions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { byPosition, useRowTools } from "@/components/crm/row-tools";
import { applyQuickFilters, useQuickFilters, type QuickFilterDim } from "@/components/crm/quick-filters";
import { EmailComposer } from "@/components/crm/email/EmailComposer";

export function AccountsBoard({
  profile,
  groups,
  accounts,
  contacts,
  deals,
  customColumns = [],
  users = [],
}: {
  profile: CrmUser;
  groups: CrmAccountGroup[];
  accounts: CrmAccount[];
  contacts: CrmContact[];
  deals: CrmDeal[];
  customColumns?: CrmCustomColumn[];
  users?: CrmUser[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("Main View");
  const [localAccounts, setLocalAccounts] = useServerState(accounts);
  const [search, setSearch] = useState("");
  const [localGroups, setLocalGroups] = useServerState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);

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

  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert"; undo?: () => void } | null>(null);
  const [deleteGroupPrompt, setDeleteGroupPrompt] = useState<(typeof groups)[number] | null>(null);

  // only an EMPTY group may go, and never the last one — the checks repeat
  // server-side, this just gives an instant, friendly answer
  const requestDeleteGroup = (group: (typeof groups)[number]) => {
    const count = localAccounts.filter((r) => r.group_id === group.id).length;
    if (count) {
      setToast({
        message: `"${group.name}" still holds ${count} account${count === 1 ? "" : "s"} — move or delete them first.`,
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

  const [emailAccount, setEmailAccount] = useState<CrmAccount | null>(null);
  const rowTools = useRowTools({
    boardKey: "accounts",
    rows: localAccounts,
    setRows: setLocalAccounts,
    groups: localGroups.map((g) => ({ id: g.id, name: g.name })),
    profile,
    onToast: (message, tone) => setToast({ message, tone }),
  });
  const qf = useQuickFilters();

  const filterDims: QuickFilterDim<CrmAccount>[] = [
    { key: "group", label: "Group", get: (r) => r.group_id, format: (v) => localGroups.find((g) => g.id === v)?.name ?? "—", color: (v) => localGroups.find((g) => g.id === v)?.color },
    { key: "industry", label: "Industry", get: (r) => r.industries },
    { key: "employees", label: "Employees", get: (r) => r.employees_range },
    { key: "location", label: "HQ location", get: (r) => r.hq_location },
  ];
  const sortedRows = applyQuickFilters([...localAccounts].sort(byPosition), filterDims, qf.state);

  const patchAccount = (accountId: string, patch: Partial<CrmAccount>, silent = false) => {
    const prevRow = localAccounts.find((x) => x.id === accountId);
    if (prevRow && !canEditRow(profile, prevRow)) {
      setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
      return;
    }
    return applyRowEdit<CrmAccount>({
      id: accountId,
      patch,
      prev: prevRow,
      setRows: setLocalAccounts,
      save: updateAccount,
      setToast,
      silent,
    });
  };

  const handleAddAccount = async (groupId: string, name: string) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setLocalAccounts((prev) => [
      ...prev,
      {
        id: tempId,
        name: name.trim() || "New account",
        domain: null,
        email: null,
        email_label: null,
        industries: [],
        description: null,
        employees_range: null,
        hq_location: null,
        default_downpayment_percent: null,
        owner_id: profile.id,
        custom: {},
        group_id: groupId,
        last_interaction_at: null,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    // swap the placeholder for the row the database actually stored, so its
    // real id is in place before anyone can click a cell on it
    const created = await addAccount(groupId, name);
    if (created.error || !created.row) {
      setLocalAccounts((prev) => prev.filter((r) => r.id !== tempId));
      setToast({ message: created.error ?? "could not add the row", tone: "alert" });
      return;
    }
    setLocalAccounts((prev) =>
      prev.map((r) => (r.id === tempId ? ({ ...r, ...(created.row as object) } as typeof r) : r))
    );
  };

  const handleAddGroup = async () => {
    const color = GROUP_COLORS[localGroups.length % GROUP_COLORS.length];
    const result = await addAccountGroup("New Group", color);
    if (result.id) setNewGroupId(result.id);
  };

  const handleAddColumn = async (type: CustomColumnType) => {
    const result = await addCustomColumn("accounts", type);
    if (result.error || !result.column) {
      setToast({ message: result.error ?? "could not add column", tone: "alert" });
      return;
    }
    setLocalColumns((prev) => [...prev, result.column as CrmCustomColumn]);
    setToast({ message: "Column added — click its name to rename" });
  };

  const handleRenameColumn = (columnId: string, label: string) => {
    setLocalColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, label } : c)));
    renameCustomColumn(columnId, label, "accounts");
  };

  const handleDeleteColumn = async (columnId: string) => {
    const prevCols = localColumns;
    setLocalColumns((cols) => cols.filter((c) => c.id !== columnId));
    const result = await deleteCustomColumn(columnId, "accounts");
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
            quickFilters={{ dims: filterDims, rows: localAccounts, state: qf.state, onToggle: qf.toggle, onClear: qf.clear, visible: sortedRows.length, noun: "accounts" }}
            profile={profile}
            title="Accounts"
            tabs={["Main View", "Main table"]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            newLabel="New account"
            searchValue={search}
            onSearch={setSearch}
            onNew={() => {
              const first = localGroups[0];
              if (first) handleAddAccount(first.id, "New account");
            }}
          />
        </div>

        <div className="thin-scroll board-anim min-h-0 flex-1 overflow-auto bg-white pl-[40px] pt-[8px]">
          {localGroups.map((group) => (
            <AccountGroup
              key={group.id}
              onDeleteGroup={isFullAccess(profile.role) ? () => requestDeleteGroup(group) : undefined}
              group={group}
              isNew={group.id === newGroupId}
              tools={rowTools}
              onEmailAccount={setEmailAccount}
              accounts={sortedRows.filter(
                (a) =>
                  a.group_id === group.id &&
                  (!search.trim() ||
                    a.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                    (a.domain ?? "").toLowerCase().includes(search.trim().toLowerCase()))
              )}
              contacts={contacts}
              deals={deals}
              onToggleCollapse={(collapsed) => {
                setGroupCollapsed("accounts", group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                renameAccountGroup(group.id, name);
              }}
              onPatchAccount={patchAccount}
              customColumns={localColumns}
              users={users}
              profile={profile}
              onAddColumn={handleAddColumn}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              onAddAccount={(name) => handleAddAccount(group.id, name)}
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
      {emailAccount && emailAccount.email && (
        <EmailComposer
          profile={profile}
          to={[emailAccount.email]}
          target={{ type: "account", id: emailAccount.id, name: emailAccount.name }}
          onClose={() => setEmailAccount(null)}
          onDone={(message, tone) => setToast({ message, tone })}
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
            const result = await deleteAccountGroup(g.id);
            if (result.error) {
              setLocalGroups(prev);
              setToast({ message: result.error, tone: "alert" });
            } else {
              setToast({ message: `Group “${g.name}” deleted` });
            }
          }}
        />
      )}
      <AiFloaty />
    </Surface>
  );
}
