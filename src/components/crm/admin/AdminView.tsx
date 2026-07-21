"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ROLE_LABELS } from "@/lib/permissions";
import type { CrmCustomColumn } from "@/lib/custom-columns";
import type { CrmInvite, CrmRole, CrmUser } from "@/lib/types";
import {
  createInvite,
  deleteInvite,
  setMemberActive,
  updateMemberRole,
} from "@/app/(app)/crm/team/actions";
import {
  deleteCustomColumn,
  renameCustomColumn,
} from "@/app/(app)/crm/custom-columns-actions";
import { setDashboardTargets, updateRegistrationSettings } from "@/app/(admin)/admin/actions";

export interface AdminAuditRow {
  id: number;
  actor: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface AdminBoardStat {
  key: string;
  name: string;
  href: string;
  rows: number;
  visits7d: number;
}

const ROLES: CrmRole[] = ["developer", "ceo", "media", "manager", "agent", "finance"];

const SECTIONS = [
  { key: "general", label: "General" },
  { key: "directory", label: "Directory" },
  { key: "customization", label: "Customization" },
  { key: "security", label: "Security" },
  { key: "usage", label: "Usage stats" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const SECTION_GLYPHS: Record<SectionKey, React.ReactNode> = {
  general: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M12.4 3.6L11 5M5 11l-1.4 1.4" />
    </svg>
  ),
  directory: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="5.5" r="2.2" />
      <path d="M1.8 13.4c.7-2 2-3 3.7-3s3 1 3.7 3" />
      <circle cx="11.5" cy="6.5" r="1.8" />
      <path d="M10.4 10.6c1.9 0 3.1.9 3.8 2.8" />
    </svg>
  ),
  customization: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 5h11M2.5 8h11M2.5 11h7" />
      <circle cx="11" cy="11" r="0.2" />
    </svg>
  ),
  security: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.8l4.8 1.8v3.6c0 3.2-2 5.6-4.8 6.9-2.8-1.3-4.8-3.7-4.8-6.9V3.6z" />
    </svg>
  ),
  usage: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 13.5V9M6.2 13.5V5.5M9.9 13.5V8M13.5 13.5V3.5" />
    </svg>
  ),
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-[20px]">
      <h3 className="m-0 pb-[12px] font-display text-[16px] font-semibold leading-[22px] text-white">
        {title}
      </h3>
      {children}
    </div>
  );
}

const inputCls =
  "h-[34px] rounded-[4px] border border-white/20 bg-white/[0.06] px-[10px] font-sans text-[13px] text-white outline-none placeholder:text-[#8b90b5] focus:border-[#579bfc]";
const btnCls =
  "h-[34px] rounded-[4px] bg-[#579bfc] px-[14px] font-sans text-[13px] text-white transition-opacity hover:opacity-90 disabled:opacity-40";
const ghostBtnCls =
  "rounded-[4px] px-[8px] py-[4px] font-sans text-[12px] text-[#9ba0c0] transition-colors hover:bg-white/10 hover:text-white";

export function AdminView({
  profile,
  registration,
  targets,
  members,
  invites,
  customColumns,
  audit,
  boardStats,
}: {
  profile: CrmUser;
  registration: { allowedDomains: string[]; maxAgents: number };
  targets: Record<string, number>;
  members: CrmUser[];
  invites: CrmInvite[];
  customColumns: CrmCustomColumn[];
  audit: AdminAuditRow[];
  boardStats: AdminBoardStat[];
}) {
  const [section, setSection] = useState<SectionKey>("general");
  const [flash, setFlash] = useState<string | null>(null);

  const say = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 4000);
  };

  /* ---- general ---- */
  const [domains, setDomains] = useState(registration.allowedDomains);
  const [domainDraft, setDomainDraft] = useState("");
  const [maxAgents, setMaxAgents] = useState(String(registration.maxAgents));
  const [annual, setAnnual] = useState(String(targets.annual_target ?? 0));
  const [monthly, setMonthly] = useState(String(targets.monthly_target ?? 0));
  const [forecast, setForecast] = useState(String(targets.forecast_goal ?? 0));

  /* ---- directory ---- */
  const [localMembers, setLocalMembers] = useState(members);
  const [localInvites, setLocalInvites] = useState(invites);
  const [invEmail, setInvEmail] = useState("");
  const [invName, setInvName] = useState("");
  const [invRole, setInvRole] = useState<CrmRole>("agent");

  /* ---- customization ---- */
  const [localColumns, setLocalColumns] = useState(customColumns);

  /* ---- security ---- */
  const [auditEntity, setAuditEntity] = useState("all");
  const auditEntities = useMemo(
    () => [...new Set(audit.map((a) => a.entity_type))].sort(),
    [audit]
  );
  const visibleAudit = audit.filter((a) => auditEntity === "all" || a.entity_type === auditEntity);

  const memberName = (id: string | null) =>
    localMembers.find((m) => m.id === id)?.full_name ?? "System";

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="flex h-full flex-col bg-[#171c3f] text-white">
      {/* header */}
      <header className="flex h-[52px] shrink-0 items-center gap-[16px] border-b border-white/10 bg-[#12163a] px-[16px]">
        <Link
          href="/crm"
          className="flex h-[36px] items-center gap-[8px] rounded-[4px] border border-white/15 px-[12px] font-sans text-[14px] text-white transition-colors hover:bg-white/10"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 2.5L4 7l4.5 4.5" />
          </svg>
          Back
        </Link>
        <p className="m-0 font-display text-[18px] leading-[24px]">
          <span className="font-semibold">CRM</span> administration
        </p>
        {flash && (
          <span className="ml-auto rounded-[4px] bg-[#00c875]/20 px-[10px] py-[4px] font-sans text-[13px] text-[#7de3b5]">
            {flash}
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* sidebar */}
        <nav className="w-[240px] shrink-0 overflow-y-auto border-r border-white/10 py-[16px]">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={`mx-[12px] mb-[2px] flex w-[calc(100%-24px)] items-center gap-[10px] rounded-[4px] px-[12px] py-[8px] text-left font-sans text-[14px] leading-[20px] transition-colors ${
                section === s.key
                  ? "bg-[#579bfc]/20 text-[#8ab4ff]"
                  : "text-[#c3c6d4] hover:bg-white/[0.06]"
              }`}
            >
              {SECTION_GLYPHS[s.key]}
              {s.label}
            </button>
          ))}
        </nav>

        {/* content */}
        <main className="thin-scroll min-w-0 flex-1 overflow-y-auto p-[32px]">
          {section === "general" && (
            <div className="flex max-w-[720px] flex-col gap-[20px]">
              <div>
                <h2 className="m-0 font-display text-[24px] font-semibold leading-[32px]">General</h2>
                <p className="m-0 pt-[4px] font-sans text-[14px] text-[#9ba0c0]">
                  Signup rules and sales targets. Changes apply immediately.
                </p>
              </div>

              <Panel title="Registration">
                <p className="m-0 pb-[8px] font-sans text-[13px] text-[#9ba0c0]">
                  Signups from these domains are auto-approved as Sales Agents. Everyone else needs
                  an invite.
                </p>
                <div className="flex flex-wrap items-center gap-[6px] pb-[10px]">
                  {domains.map((d) => (
                    <span
                      key={d}
                      className="flex items-center gap-[6px] rounded-[12px] bg-white/10 px-[10px] py-[3px] font-sans text-[13px]"
                    >
                      {d}
                      <button
                        type="button"
                        aria-label={`Remove ${d}`}
                        onClick={() => setDomains((prev) => prev.filter((x) => x !== d))}
                        className="text-[#9ba0c0] hover:text-white"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {domains.length === 0 && (
                    <span className="font-sans text-[13px] text-[#9ba0c0]">
                      No domains — every signup requires an invite.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-[8px]">
                  <input
                    value={domainDraft}
                    onChange={(e) => setDomainDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && domainDraft.trim()) {
                        setDomains((prev) => [...new Set([...prev, domainDraft.trim().toLowerCase()])]);
                        setDomainDraft("");
                      }
                    }}
                    placeholder="add domain, e.g. irfaninvest.com"
                    className={`${inputCls} w-[240px]`}
                  />
                  <span className="pl-[8px] font-sans text-[13px] text-[#9ba0c0]">Agent seat cap</span>
                  <input
                    value={maxAgents}
                    onChange={(e) => setMaxAgents(e.target.value.replace(/[^0-9]/g, ""))}
                    inputMode="numeric"
                    className={`${inputCls} w-[70px] text-center`}
                  />
                  <button
                    type="button"
                    className={btnCls}
                    onClick={async () => {
                      const pending = domainDraft.trim()
                        ? [...new Set([...domains, domainDraft.trim().toLowerCase()])]
                        : domains;
                      setDomainDraft("");
                      const result = await updateRegistrationSettings(pending, Number(maxAgents));
                      if (result.error) say(`⚠ ${result.error}`);
                      else {
                        setDomains(result.domains ?? pending);
                        say("Registration settings saved");
                      }
                    }}
                  >
                    Save
                  </button>
                </div>
              </Panel>

              <Panel title="Sales targets">
                <div className="flex flex-wrap items-end gap-[16px]">
                  {(
                    [
                      ["Annual target (OMR)", annual, setAnnual],
                      ["Monthly target (OMR)", monthly, setMonthly],
                      ["Forecast goal (OMR)", forecast, setForecast],
                    ] as const
                  ).map(([label, value, set]) => (
                    <label key={label} className="flex flex-col gap-[4px]">
                      <span className="font-sans text-[12px] text-[#9ba0c0]">{label}</span>
                      <input
                        value={value}
                        onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ""))}
                        inputMode="decimal"
                        className={`${inputCls} w-[160px]`}
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className={btnCls}
                    onClick={async () => {
                      const result = await setDashboardTargets({
                        annual_target: Number(annual),
                        monthly_target: Number(monthly),
                        forecast_goal: Number(forecast),
                      });
                      if (result.error) say(`⚠ ${result.error}`);
                      else say("Targets saved — Sales Dashboard updated");
                    }}
                  >
                    Save
                  </button>
                </div>
              </Panel>
            </div>
          )}

          {section === "directory" && (
            <div className="flex max-w-[860px] flex-col gap-[20px]">
              <div>
                <h2 className="m-0 font-display text-[24px] font-semibold leading-[32px]">Directory</h2>
                <p className="m-0 pt-[4px] font-sans text-[14px] text-[#9ba0c0]">
                  {localMembers.filter((m) => m.is_active).length} active of {localMembers.length}{" "}
                  members · {localInvites.filter((i) => !i.used_at).length} pending invites
                </p>
              </div>

              <Panel title="Members">
                {localMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-[12px] border-b border-white/10 py-[10px] last:border-0"
                  >
                    <Avatar name={m.full_name || m.email} src={m.avatar_url} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-[14px] leading-[20px]">
                        {m.full_name || m.email}
                        {m.id === profile.id && (
                          <span className="pl-[6px] text-[12px] text-[#9ba0c0]">(you)</span>
                        )}
                      </span>
                      <span className="block truncate font-sans text-[12px] leading-[16px] text-[#9ba0c0]">
                        {m.email}
                        {m.requested_role && (
                          <span className="pl-[8px] text-[#fdab3d]">
                            requested {ROLE_LABELS[m.requested_role]}
                          </span>
                        )}
                      </span>
                    </span>
                    <select
                      value={m.role}
                      disabled={m.id === profile.id}
                      onChange={async (e) => {
                        const role = e.target.value as CrmRole;
                        setLocalMembers((prev) =>
                          prev.map((x) => (x.id === m.id ? { ...x, role, requested_role: null } : x))
                        );
                        const result = await updateMemberRole(m.id, role);
                        if (result.error) say(`⚠ ${result.error}`);
                        else say(`${m.full_name || m.email} is now ${ROLE_LABELS[role]}`);
                      }}
                      className={`${inputCls} w-[150px] disabled:opacity-40`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r} className="bg-[#171c3f]">
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={m.id === profile.id}
                      onClick={async () => {
                        const next = !m.is_active;
                        setLocalMembers((prev) =>
                          prev.map((x) => (x.id === m.id ? { ...x, is_active: next } : x))
                        );
                        const result = await setMemberActive(m.id, next);
                        if (result.error) say(`⚠ ${result.error}`);
                      }}
                      className={`w-[86px] rounded-[12px] px-[10px] py-[4px] font-sans text-[12px] transition-colors disabled:opacity-40 ${
                        m.is_active
                          ? "bg-[#00c875]/20 text-[#7de3b5] hover:bg-[#00c875]/30"
                          : "bg-white/10 text-[#9ba0c0] hover:bg-white/20"
                      }`}
                    >
                      {m.is_active ? "Active" : "Deactivated"}
                    </button>
                  </div>
                ))}
              </Panel>

              <Panel title="Invites">
                <div className="flex items-center gap-[8px] pb-[12px]">
                  <input
                    value={invEmail}
                    onChange={(e) => setInvEmail(e.target.value)}
                    placeholder="email"
                    className={`${inputCls} w-[220px]`}
                  />
                  <input
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    placeholder="full name"
                    className={`${inputCls} w-[170px]`}
                  />
                  <select
                    value={invRole}
                    onChange={(e) => setInvRole(e.target.value as CrmRole)}
                    className={`${inputCls} w-[140px]`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="bg-[#171c3f]">
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!invEmail.trim()}
                    className={btnCls}
                    onClick={async () => {
                      const result = await createInvite(invEmail, invName, invRole);
                      if (result.error) {
                        say(`⚠ ${result.error}`);
                        return;
                      }
                      setLocalInvites((prev) => [
                        {
                          id: result.id!,
                          email: invEmail.trim().toLowerCase(),
                          full_name: invName.trim(),
                          role: invRole,
                          invited_by: profile.id,
                          created_at: new Date().toISOString(),
                          used_at: null,
                        },
                        ...prev,
                      ]);
                      setInvEmail("");
                      setInvName("");
                      say("Invite created");
                    }}
                  >
                    Invite
                  </button>
                </div>
                {localInvites.length === 0 && (
                  <p className="m-0 font-sans text-[13px] text-[#9ba0c0]">No invites yet.</p>
                )}
                {localInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-[12px] border-b border-white/10 py-[8px] last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate font-sans text-[13px]">
                      {inv.email}
                      {inv.full_name && <span className="text-[#9ba0c0]"> · {inv.full_name}</span>}
                    </span>
                    <span className="font-sans text-[12px] text-[#9ba0c0]">{ROLE_LABELS[inv.role]}</span>
                    {inv.used_at ? (
                      <span className="rounded-[12px] bg-[#00c875]/20 px-[10px] py-[3px] font-sans text-[12px] text-[#7de3b5]">
                        used
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={ghostBtnCls}
                        onClick={async () => {
                          setLocalInvites((prev) => prev.filter((x) => x.id !== inv.id));
                          const result = await deleteInvite(inv.id);
                          if (result.error) say(`⚠ ${result.error}`);
                          else say("Invite revoked");
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </Panel>
            </div>
          )}

          {section === "customization" && (
            <div className="flex max-w-[720px] flex-col gap-[20px]">
              <div>
                <h2 className="m-0 font-display text-[24px] font-semibold leading-[32px]">
                  Customization
                </h2>
                <p className="m-0 pt-[4px] font-sans text-[14px] text-[#9ba0c0]">
                  Custom columns members have added to boards. Deleting removes the column for
                  everyone (values stay in row history).
                </p>
              </div>
              {localColumns.length === 0 && (
                <p className="m-0 font-sans text-[14px] text-[#9ba0c0]">
                  No custom columns yet — add one from any board with the “+” header button.
                </p>
              )}
              {[...new Set(localColumns.map((c) => c.board_key))].map((board) => (
                <Panel key={board} title={board.charAt(0).toUpperCase() + board.slice(1)}>
                  {localColumns
                    .filter((c) => c.board_key === board)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-[12px] border-b border-white/10 py-[8px] last:border-0"
                      >
                        <input
                          defaultValue={c.label}
                          onBlur={(e) => {
                            const label = e.target.value.trim();
                            if (label && label !== c.label) {
                              setLocalColumns((prev) =>
                                prev.map((x) => (x.id === c.id ? { ...x, label } : x))
                              );
                              renameCustomColumn(c.id, label, c.board_key);
                              say("Column renamed");
                            }
                          }}
                          className={`${inputCls} w-[220px]`}
                        />
                        <span className="flex-1 font-sans text-[12px] uppercase tracking-wide text-[#9ba0c0]">
                          {c.type}
                        </span>
                        <button
                          type="button"
                          className={ghostBtnCls}
                          onClick={async () => {
                            const prev = localColumns;
                            setLocalColumns((cols) => cols.filter((x) => x.id !== c.id));
                            const result = await deleteCustomColumn(c.id, c.board_key);
                            if (result.error) {
                              setLocalColumns(prev);
                              say(`⚠ ${result.error}`);
                            } else say("Column deleted");
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                </Panel>
              ))}
            </div>
          )}

          {section === "security" && (
            <div className="flex max-w-[860px] flex-col gap-[20px]">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="m-0 font-display text-[24px] font-semibold leading-[32px]">
                    Security — audit log
                  </h2>
                  <p className="m-0 pt-[4px] font-sans text-[14px] text-[#9ba0c0]">
                    Last {audit.length} sensitive changes recorded by the database triggers.
                  </p>
                </div>
                <select
                  value={auditEntity}
                  onChange={(e) => setAuditEntity(e.target.value)}
                  className={`${inputCls} w-[190px]`}
                >
                  <option value="all" className="bg-[#171c3f]">
                    All entities
                  </option>
                  {auditEntities.map((t) => (
                    <option key={t} value={t} className="bg-[#171c3f]">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <Panel title="Events">
                {visibleAudit.length === 0 && (
                  <p className="m-0 font-sans text-[13px] text-[#9ba0c0]">No events recorded.</p>
                )}
                {visibleAudit.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-baseline gap-[10px] border-b border-white/10 py-[7px] font-sans text-[13px] last:border-0"
                  >
                    <span className="w-[110px] shrink-0 text-[#9ba0c0]">{fmtTime(a.created_at)}</span>
                    <span className="w-[130px] shrink-0 truncate">{memberName(a.actor)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-[#8ab4ff]">{a.action}</span>
                      <span className="text-[#9ba0c0]"> on {a.entity_type}</span>
                      {a.field && <span className="text-[#9ba0c0]"> · {a.field}</span>}
                      {(a.old_value || a.new_value) && (
                        <span>
                          {" "}
                          {a.old_value ?? "—"} <span className="text-[#9ba0c0]">→</span>{" "}
                          {a.new_value ?? "—"}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </Panel>
            </div>
          )}

          {section === "usage" && (
            <div className="flex max-w-[860px] flex-col gap-[20px]">
              <div>
                <h2 className="m-0 font-display text-[24px] font-semibold leading-[32px]">
                  Usage stats
                </h2>
                <p className="m-0 pt-[4px] font-sans text-[14px] text-[#9ba0c0]">
                  Live row counts and board opens over the last 7 days.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-[12px] lg:grid-cols-3">
                {boardStats.map((b) => (
                  <Link
                    key={b.key}
                    href={b.href}
                    className="rounded-[8px] border border-white/10 bg-white/[0.04] p-[16px] transition-colors hover:bg-white/[0.08]"
                  >
                    <p className="m-0 font-sans text-[13px] text-[#9ba0c0]">{b.name}</p>
                    <p className="m-0 pt-[4px] font-display text-[28px] font-semibold leading-[34px]">
                      {b.rows}
                    </p>
                    <p className="m-0 pt-[2px] font-sans text-[12px] text-[#9ba0c0]">
                      {b.visits7d} opens · 7d
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
