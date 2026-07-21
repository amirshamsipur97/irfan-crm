"use client";

import { useEffect, useState } from "react";
import { Surface } from "@/components/shell/AppChrome";
import { Avatar } from "@/components/ui/Avatar";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { ROLE_LABELS } from "@/lib/permissions";
import type { CrmInvite, CrmRole, CrmUser } from "@/lib/types";
import {
  createInvite,
  deleteInvite,
  setMemberActive,
  updateMemberRole,
} from "@/app/(app)/crm/team/actions";

const ROLE_OPTIONS: { value: CrmRole; hint: string }[] = [
  { value: "developer", hint: "Full system control — settings, roles, deletes" },
  { value: "ceo", hint: "Full business access — operations, finance, team" },
  { value: "media", hint: "Edits all work boards — no financial data" },
  { value: "manager", hint: "Sales management — edits all work boards" },
  { value: "agent", hint: "Works own leads and deals — team read-only" },
  { value: "finance", hint: "Transactions, payments and commissions" },
];

export function TeamView({
  profile,
  members,
  invites,
}: {
  profile: CrmUser;
  members: CrmUser[];
  invites: CrmInvite[];
}) {
  const [localMembers, setLocalMembers] = useState(members);
  const [localInvites, setLocalInvites] = useState(invites);
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert" } | null>(null);

  useEffect(() => setLocalMembers(members), [members]);
  useEffect(() => setLocalInvites(invites), [invites]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<CrmRole>("agent");

  const changeRole = async (userId: string, role: CrmRole) => {
    const prev = localMembers.find((m) => m.id === userId)?.role;
    setLocalMembers((ms) => ms.map((m) => (m.id === userId ? { ...m, role } : m)));
    const result = await updateMemberRole(userId, role);
    if (result.error) {
      setLocalMembers((ms) => ms.map((m) => (m.id === userId ? { ...m, role: prev! } : m)));
      setToast({ message: result.error, tone: "alert" });
    } else {
      setToast({ message: `Role updated to ${ROLE_LABELS[role]}` });
    }
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    setLocalMembers((ms) => ms.map((m) => (m.id === userId ? { ...m, is_active: isActive } : m)));
    const result = await setMemberActive(userId, isActive);
    if (result.error) {
      setLocalMembers((ms) =>
        ms.map((m) => (m.id === userId ? { ...m, is_active: !isActive } : m))
      );
      setToast({ message: result.error, tone: "alert" });
    } else {
      setToast({ message: isActive ? "Member re-activated" : "Member deactivated" });
    }
  };

  const sendInvite = async () => {
    const result = await createInvite(inviteEmail, inviteName, inviteRole);
    if (result.error || !result.id) {
      setToast({ message: result.error ?? "invite failed", tone: "alert" });
      return;
    }
    setLocalInvites((prev) => [
      ...prev,
      {
        id: result.id!,
        email: inviteEmail.trim().toLowerCase(),
        full_name: inviteName.trim(),
        role: inviteRole,
        invited_by: profile.id,
        created_at: new Date().toISOString(),
        used_at: null,
      },
    ]);
    setToast({ message: `Invite ready — ${inviteEmail.trim()} can now sign up with this role` });
    setInviteEmail("");
    setInviteName("");
    setInviteRole("agent");
  };

  return (
    <Surface>
      <div className="thin-scroll h-full overflow-auto px-[32px] pb-[48px] pt-[24px]">
        <h1 className="m-0 font-display text-[24px] font-medium leading-[30px] tracking-[-0.1px] text-ink">
          Team
        </h1>
        <p className="mb-[20px] mt-[2px] font-sans text-[13px] text-ink-muted">
          Members, roles and invites — visible to Developer and CEO only. Role changes are also
          enforced by the database.
        </p>

        {/* members */}
        <div className="overflow-x-auto rounded-[8px] border border-line bg-white">
          <table className="w-full min-w-[720px] border-collapse font-sans text-[13.5px]">
            <thead>
              <tr>
                {["Member", "Email", "Role", "Access", "Status"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-line bg-canvas px-[14px] py-[10px] text-left text-[12px] font-bold text-ink-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {localMembers.map((m) => {
                const hint = ROLE_OPTIONS.find((r) => r.value === m.role)?.hint ?? "";
                const isSelf = m.id === profile.id;
                return (
                  <tr key={m.id} className="border-b border-line-soft last:border-b-0">
                    <td className="px-[14px] py-[9px]">
                      <span className="flex items-center gap-[8px]">
                        <Avatar name={m.full_name || m.email} src={m.avatar_url} size={28} />
                        <span className="font-medium text-ink">
                          {m.full_name || "—"}
                          {isSelf && <span className="pl-[6px] text-[11px] text-ink-muted">(you)</span>}
                        </span>
                      </span>
                    </td>
                    <td className="px-[14px] py-[9px] text-ink-muted">{m.email}</td>
                    <td className="px-[14px] py-[9px]">
                      <select
                        value={m.role}
                        disabled={isSelf}
                        onChange={(e) => changeRole(m.id, e.target.value as CrmRole)}
                        className="h-[30px] rounded-[4px] border border-line-strong px-[6px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {ROLE_LABELS[r.value]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="max-w-[280px] px-[14px] py-[9px] text-[12px] text-ink-muted">{hint}</td>
                    <td className="px-[14px] py-[9px]">
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => toggleActive(m.id, !m.is_active)}
                        className={`h-[26px] rounded-[13px] px-[12px] font-sans text-[12px] text-white transition-opacity disabled:opacity-50 ${
                          m.is_active ? "bg-brand" : "bg-[#676879]"
                        }`}
                      >
                        {m.is_active ? "Active" : "Deactivated"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* invites */}
        <h2 className="mb-[8px] mt-[28px] font-display text-[16px] font-medium leading-[24px] text-ink">
          Pending invites
        </h2>
        <div className="rounded-[8px] border border-line bg-white px-[16px] py-[12px]">
          {localInvites.filter((i) => !i.used_at).length === 0 && (
            <p className="m-0 py-[4px] font-sans text-[13px] text-ink-muted">
              No pending invites. Company-domain emails can always sign up as Agents.
            </p>
          )}
          {localInvites
            .filter((i) => !i.used_at)
            .map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between border-b border-line-soft py-[8px] last:border-b-0"
              >
                <span className="min-w-0 truncate font-sans text-[13.5px] text-ink">
                  {i.email}
                  <span className="pl-[8px] text-[12px] text-ink-muted">
                    {ROLE_LABELS[i.role]}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    setLocalInvites((prev) => prev.filter((x) => x.id !== i.id));
                    const result = await deleteInvite(i.id);
                    if (result.error) setToast({ message: result.error, tone: "alert" });
                  }}
                  className="shrink-0 rounded-[4px] px-[8px] py-[3px] font-sans text-[12px] text-alert transition-colors hover:bg-[var(--hover-ghost)]"
                >
                  Revoke
                </button>
              </div>
            ))}
          <div className="mt-[10px] flex flex-wrap gap-[6px] border-t border-line-soft pt-[12px]">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@company.com"
              className="h-[32px] w-[220px] rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
            />
            <input
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Full name (optional)"
              className="h-[32px] w-[180px] rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as CrmRole)}
              className="h-[32px] rounded-[4px] border border-line-strong px-[6px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {ROLE_LABELS[r.value]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!inviteEmail.trim()}
              onClick={sendInvite}
              className="h-[32px] rounded-[4px] bg-teal-deep px-[14px] font-sans text-[13px] text-white transition-opacity disabled:opacity-40"
            >
              Create invite
            </button>
          </div>
        </div>
      </div>
      {toast && (
        <SuccessToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      )}
    </Surface>
  );
}
