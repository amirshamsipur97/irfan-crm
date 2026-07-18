"use client";

import { useEffect, useRef, useState } from "react";
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
  logAccountActivity,
  addAccountGroup,
  renameAccountGroup,
  setAccountGroupCollapsed,
  updateAccount,
} from "@/app/(app)/crm/accounts/actions";
import type { LogPayload } from "@/components/crm/deals/activity-log";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { canEditRow, OWNER_ONLY_MESSAGE } from "@/lib/permissions";

export function AccountsBoard({
  profile,
  groups,
  accounts,
  contacts,
  deals,
}: {
  profile: CrmUser;
  groups: CrmAccountGroup[];
  accounts: CrmAccount[];
  contacts: CrmContact[];
  deals: CrmDeal[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("Main View");
  const [localAccounts, setLocalAccounts] = useState(accounts);
  const [search, setSearch] = useState("");
  const [localGroups, setLocalGroups] = useState(groups);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);

  useEffect(() => setLocalAccounts(accounts), [accounts]);
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

  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert"; undo?: () => void } | null>(null);

  const patchAccount = (accountId: string, patch: Partial<CrmAccount>, silent = false) => {
    const prevRow = localAccounts.find((x) => x.id === accountId);
    if (prevRow && !canEditRow(profile, prevRow)) {
      setToast({ message: OWNER_ONLY_MESSAGE, tone: "alert" });
      return;
    }
    setLocalAccounts((prev) =>
      prev.map((x) => (x.id === accountId ? { ...x, ...patch } : x))
    );
    updateAccount(accountId, patch as Record<string, unknown>);
    if (!silent && prevRow) {
      const previous = Object.fromEntries(
        Object.keys(patch).map((k) => [k, prevRow[k as keyof CrmAccount] ?? null])
      ) as Partial<CrmAccount>;
      setToast({
        message: "We successfully updated 1 item",
        undo: () => {
          setLocalAccounts((prev) =>
            prev.map((x) => (x.id === accountId ? { ...x, ...previous } : x))
          );
          updateAccount(accountId, previous as Record<string, unknown>);
        },
      });
    }
  };

  const handleAddAccount = async (groupId: string, name: string) => {
    setLocalAccounts((prev) => [
      ...prev,
      {
        id: `temp-${prev.length}-${name}`,
        name: name.trim() || "New account",
        domain: null,
        industries: [],
        description: null,
        employees_range: null,
        hq_location: null,
        group_id: groupId,
        last_interaction_at: null,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    await addAccount(groupId, name);
  };

  const handleAddGroup = async () => {
    const color = GROUP_COLORS[localGroups.length % GROUP_COLORS.length];
    const result = await addAccountGroup("New Group", color);
    if (result.id) setNewGroupId(result.id);
  };

  return (
    <Surface>
      <div ref={rootRef} className="flex h-full flex-col">
        <div className="board-anim">
          <BoardHeader
            profile={profile}
            title="Accounts"
            tabs={["Main View", "Main table"]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            newLabel="New account"
            searchValue={search}
            onSearch={setSearch}
            automateLabel="Automate / 1"
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
              group={group}
              isNew={group.id === newGroupId}
              accounts={localAccounts.filter(
                (a) =>
                  a.group_id === group.id &&
                  (!search.trim() ||
                    a.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                    (a.domain ?? "").toLowerCase().includes(search.trim().toLowerCase()))
              )}
              contacts={contacts}
              deals={deals}
              onToggleCollapse={(collapsed) => {
                setAccountGroupCollapsed(group.id, collapsed);
              }}
              onRenameGroup={(name) => {
                setLocalGroups((prev) =>
                  prev.map((g) => (g.id === group.id ? { ...g, name: name || "New Group" } : g))
                );
                setNewGroupId(null);
                renameAccountGroup(group.id, name);
              }}
              onPatchAccount={patchAccount}
              onLogActivity={(accountId, payload: LogPayload) => {
                patchAccount(accountId, {
                  last_interaction_at: payload.startAt ?? new Date().toISOString(),
                }, true);
                logAccountActivity(accountId, payload);
              }}
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
      <AiFloaty />
    </Surface>
  );
}
