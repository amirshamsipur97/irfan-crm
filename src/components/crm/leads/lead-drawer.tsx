"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { canAnimate } from "@/lib/motion";
import { money } from "@/components/crm/deals/deals-config";
import { shortDate } from "./board-config";
import { activityTime } from "@/components/crm/activities/activities-config";
import type {
  CrmActivityItem,
  CrmLead,
  CrmLeadStageHistory,
  CrmPropertyInterest,
  CrmStage,
  CrmUnit,
  CrmUser,
} from "@/lib/types";
import {
  addLeadInterest,
  getLeadRelations,
  setLeadInterestStatus,
} from "@/app/(app)/crm/leads/drawer-actions";
import { EmailComposer } from "@/components/crm/email/EmailComposer";

const BAND_COLORS: Record<string, string> = {
  hot: "#e2445c",
  warm: "#fdab3d",
  cold: "#c4c4c4",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="m-0 pb-[8px] pt-[20px] font-display text-[14px] font-semibold leading-[20px] text-ink">
      {children}
    </h4>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-[12px] px-[10px] font-sans text-[12px] leading-[16px] text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-[8px] py-[3px]">
      <span className="w-[120px] shrink-0 font-sans text-[12px] leading-[18px] text-ink-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate font-sans text-[13px] leading-[19px] text-ink">{children}</span>
    </div>
  );
}

function responseTime(assigned: string | null, first: string | null) {
  if (!assigned || !first) return null;
  const mins = Math.round((new Date(first).getTime() - new Date(assigned).getTime()) / 60_000);
  if (mins < 1) return "under a minute";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 48) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)} days`;
}

export function LeadDrawer({
  lead,
  profile,
  stages,
  users,
  units,
  onClose,
  onToast,
  onConvert,
}: {
  lead: CrmLead;
  profile: CrmUser;
  stages: CrmStage[];
  users: CrmUser[];
  units: CrmUnit[];
  onClose: () => void;
  onToast: (message: string, tone?: "success" | "alert") => void;
  onConvert: (leadId: string) => void;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [interests, setInterests] = useState<CrmPropertyInterest[]>([]);
  const [history, setHistory] = useState<CrmLeadStageHistory[]>([]);
  const [activities, setActivities] = useState<CrmActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [interestPick, setInterestPick] = useState("");

  const stage = stages.find((s) => s.id === lead.stage_id);
  const owner = users.find((u) => u.id === lead.owner_id);
  const band = lead.score_band ?? "cold";
  const converted = Boolean((lead.custom as Record<string, unknown>)?.moved_to_contacts) || Boolean(lead.converted_at);

  const reload = async () => {
    const data = await getLeadRelations(lead.id);
    setInterests(data.interests);
    setHistory(data.history);
    setActivities(data.activities);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  useGSAP(
    () => {
      if (!canAnimate() || !panelRef.current) return;
      gsap.from(panelRef.current, { x: 40, opacity: 0, duration: 0.28, ease: "power2.out", clearProps: "all" });
    },
    { scope: panelRef }
  );

  const stageName = (id: string | null) => stages.find((s) => s.id === id)?.name ?? "—";
  const userName = (id: string | null) => users.find((u) => u.id === id)?.full_name ?? "System";
  const shortlistableUnits = units.filter(
    (u) => !interests.some((i) => i.unit_id === u.id && i.status !== "rejected")
  );
  const respTime = responseTime(lead.assigned_at, lead.first_response_at);

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close lead panel"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/20"
      />
      <div
        ref={panelRef}
        className="thin-scroll absolute right-0 top-0 flex h-full w-[460px] flex-col overflow-y-auto bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.15)]"
      >
        {/* header */}
        <div className="sticky top-0 z-10 border-b border-line bg-white px-[24px] pb-[14px] pt-[18px]">
          <div className="flex items-start justify-between gap-[8px]">
            <h3 className="m-0 font-display text-[20px] font-medium leading-[28px] text-ink">{lead.name}</h3>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-[28px] shrink-0 items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M3 3l8 8M11 3l-8 8" stroke="#323338" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="mt-[8px] flex flex-wrap items-center gap-[8px] font-sans text-[13px] text-ink-muted">
            {stage && <Pill label={stage.name} color={stage.color} />}
            <Pill label={`${lead.lead_score ?? 0} · ${band}`} color={BAND_COLORS[band]} />
            {owner && <span>· {owner.full_name}</span>}
            {converted && <span className="text-brand">· in Contacts ✓</span>}
          </div>
        </div>

        <div className="flex-1 px-[24px] pb-[32px]">
          {/* details */}
          <SectionTitle>Details</SectionTitle>
          <DetailRow label="Email">
            {lead.email ? (
              <span className="flex items-center gap-[8px]">
                <a href={`mailto:${lead.email}`} className="truncate text-[#0073ea] hover:underline">
                  {lead.email}
                </a>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="shrink-0 rounded-[4px] border border-line-strong px-[8px] py-[2px] font-sans text-[12px] text-ink transition-colors hover:bg-[var(--hover-ghost)]"
                >
                  Send email
                </button>
              </span>
            ) : (
              "—"
            )}
          </DetailRow>
          <DetailRow label="Phone">
            {lead.phone ? (
              <a href={`tel:${lead.country_code ?? ""}${lead.phone}`} className="text-[#0073ea] hover:underline">
                {lead.country_code ? `${lead.country_code} ` : ""}
                {lead.phone}
              </a>
            ) : (
              "—"
            )}
          </DetailRow>
          <DetailRow label="Company">{lead.company ?? "—"}</DetailRow>
          <DetailRow label="Title">{lead.title ?? "—"}</DetailRow>
          <DetailRow label="Budget">{lead.budget != null ? money(lead.budget, lead.currency) : "—"}</DetailRow>
          <DetailRow label="Source">{lead.source}</DetailRow>
          <DetailRow label="Priority">{lead.priority}</DetailRow>
          <DetailRow label="Created">{shortDate(lead.created_at)}</DetailRow>
          <DetailRow label="Assigned">{lead.assigned_at ? activityTime(lead.assigned_at) : "not yet"}</DetailRow>
          <DetailRow label="First response">
            {lead.first_response_at
              ? `${activityTime(lead.first_response_at)}${respTime ? ` (${respTime} after assignment)` : ""}`
              : "no response logged yet"}
          </DetailRow>

          {/* score breakdown */}
          <SectionTitle>Score breakdown</SectionTitle>
          {(lead.score_components ?? []).length === 0 ? (
            <p className="m-0 font-sans text-[13px] text-ink-muted">No scoring signals yet.</p>
          ) : (
            (lead.score_components ?? []).map((c, idx) => (
              <div key={idx} className="flex items-center justify-between py-[3px]">
                <span className="min-w-0 truncate pr-[8px] font-sans text-[13px] leading-[19px] text-ink">
                  {c.rule}
                </span>
                <span
                  className={`shrink-0 font-sans text-[13px] font-medium ${
                    c.points >= 0 ? "text-brand" : "text-alert"
                  }`}
                >
                  {c.points > 0 ? `+${c.points}` : c.points}
                </span>
              </div>
            ))
          )}

          {loading ? (
            <p className="pt-[24px] font-sans text-[14px] text-ink-muted">Loading…</p>
          ) : (
            <>
              {/* shortlisted properties */}
              <SectionTitle>Shortlisted properties</SectionTitle>
              {interests.length === 0 && (
                <p className="m-0 font-sans text-[13px] text-ink-muted">No properties shortlisted yet.</p>
              )}
              {interests.map((i) => (
                <div
                  key={i.id}
                  className="mt-[6px] flex items-center justify-between rounded-[6px] border border-line px-[12px] py-[8px]"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate font-sans text-[14px] leading-[20px] text-ink">
                      {i.unit_name ?? "Unit"}
                    </p>
                    <p className="m-0 truncate font-sans text-[12px] leading-[16px] text-ink-muted">
                      {i.development_name ?? ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-[6px]">
                    <Pill
                      label={i.status}
                      color={i.status === "rejected" ? "#e2445c" : i.status === "shortlisted" ? "#579bfc" : "#00c875"}
                    />
                    {i.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={async () => {
                          setInterests((prev) =>
                            prev.map((x) => (x.id === i.id ? { ...x, status: "rejected" } : x))
                          );
                          await setLeadInterestStatus(i.id, "rejected");
                        }}
                        className="rounded-[4px] px-[6px] py-[2px] font-sans text-[12px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)]"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="mt-[8px] flex gap-[6px]">
                <select
                  value={interestPick}
                  onChange={(e) => setInterestPick(e.target.value)}
                  className="h-[32px] min-w-0 flex-1 rounded-[4px] border border-line-strong px-[8px] font-sans text-[13px] text-ink outline-none focus:border-teal-deep"
                >
                  <option value="">Select a unit to shortlist…</option>
                  {shortlistableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.development_name ? ` — ${u.development_name}` : ""} ({u.status})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!interestPick}
                  onClick={async () => {
                    const result = await addLeadInterest(lead.id, interestPick);
                    if (result.error) onToast(result.error, "alert");
                    else onToast("Property shortlisted — score updates on next touch");
                    setInterestPick("");
                    reload();
                  }}
                  className="h-[32px] shrink-0 rounded-[4px] bg-teal-deep px-[12px] font-sans text-[13px] text-white transition-opacity disabled:opacity-40"
                >
                  Add
                </button>
              </div>

              {/* stage journey */}
              <SectionTitle>Stage journey</SectionTitle>
              {history.length === 0 && (
                <p className="m-0 font-sans text-[13px] text-ink-muted">No stage changes yet.</p>
              )}
              {history.map((h) => (
                <div key={h.id} className="mt-[6px] flex items-center justify-between">
                  <p className="m-0 min-w-0 truncate pr-[8px] font-sans text-[13px] leading-[20px] text-ink">
                    {h.from_stage_id ? `${stageName(h.from_stage_id)} → ` : ""}
                    <span className="font-medium">{stageName(h.to_stage_id)}</span>
                    <span className="text-ink-muted"> · {userName(h.changed_by)}</span>
                  </p>
                  <span className="shrink-0 font-sans text-[12px] text-ink-muted">{shortDate(h.changed_at)}</span>
                </div>
              ))}

              {/* activity timeline */}
              <SectionTitle>Latest activity</SectionTitle>
              {activities.length === 0 && (
                <p className="m-0 font-sans text-[13px] text-ink-muted">No logged activity yet.</p>
              )}
              {activities.map((a) => (
                <div key={a.id} className="mt-[6px] flex items-center justify-between">
                  <p className="m-0 min-w-0 truncate pr-[8px] font-sans text-[13px] leading-[20px] text-ink">
                    {a.name}
                  </p>
                  <span className="shrink-0 font-sans text-[12px] text-ink-muted">
                    {a.start_at ? activityTime(a.start_at) : shortDate(a.created_at)}
                  </span>
                </div>
              ))}

              {/* convert */}
              {!converted && (
                <button
                  type="button"
                  onClick={() => {
                    onConvert(lead.id);
                    onClose();
                  }}
                  className="mt-[24px] h-[36px] w-full rounded-[4px] bg-teal-deep font-sans text-[14px] text-white transition-opacity hover:opacity-90"
                >
                  Convert to contact
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {composerOpen && lead.email && (
        <EmailComposer
          profile={profile}
          to={[lead.email]}
          target={{ type: "lead", id: lead.id, name: lead.name }}
          onClose={() => setComposerOpen(false)}
          onDone={onToast}
        />
      )}
    </div>
  );
}
