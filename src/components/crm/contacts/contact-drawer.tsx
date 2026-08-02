"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { canAnimate } from "@/lib/motion";
import { money } from "@/components/crm/deals/deals-config";
import { shortDate, sourceLabel } from "@/components/crm/leads/board-config";
import { canEditRow } from "@/lib/permissions";
import { DemandSection } from "./demand-section";
import { TrackingSection } from "./tracking-section";
import { activityTime } from "@/components/crm/activities/activities-config";
import type { CrmActivityItem, CrmContact, CrmDeal, CrmPropertyInterest, CrmUser } from "@/lib/types";
import { EmailComposer } from "@/components/crm/email/EmailComposer";
import { getContactRelations } from "@/app/(app)/crm/contacts/drawer-actions";

type DrawerDeal = CrmDeal & { stage_name: string | null; stage_color: string | null };

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

const PRIORITY_COLORS: Record<string, string> = {
  high: "#e2445c",
  medium: "#fdab3d",
  low: "#579bfc",
};

export function ContactDrawer({
  contact,
  profile,
  onClose,
  onToast,
}: {
  contact: CrmContact;
  profile: CrmUser;
  onClose: () => void;
  onToast?: (message: string, tone?: "success" | "alert") => void;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [deals, setDeals] = useState<DrawerDeal[]>([]);
  const [interests, setInterests] = useState<CrmPropertyInterest[]>([]);
  const [activities, setActivities] = useState<CrmActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getContactRelations(contact.id);
      setDeals(data.deals as DrawerDeal[]);
      setInterests(data.interests);
      setActivities(data.activities);
      setLoading(false);
    })();
  }, [contact.id]);

  useGSAP(
    () => {
      if (!canAnimate() || !panelRef.current) return;
      gsap.from(panelRef.current, { x: 40, opacity: 0, duration: 0.28, ease: "power2.out", clearProps: "all" });
    },
    { scope: panelRef }
  );

  const dealsValue = deals.reduce((sum, d) => sum + (d.deal_value ?? 0), 0);

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close contact panel"
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
            <h3 className="m-0 font-display text-[20px] font-medium leading-[28px] text-ink">{contact.name}</h3>
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
            {contact.contact_type && <Pill label={contact.contact_type} color="#00a0a0" />}
            {contact.priority && (
              <Pill label={contact.priority} color={PRIORITY_COLORS[contact.priority] ?? "#676879"} />
            )}
            {contact.account_name && <span>· {contact.account_name}</span>}
            {contact.title && <span>· {contact.title}</span>}
          </div>
        </div>

        <div className="flex-1 px-[24px] pb-[32px]">
          {/* details */}
          <SectionTitle>Details</SectionTitle>
          <DetailRow label="Email">
            {contact.email ? (
              <span className="flex items-center gap-[8px]">
                <a href={`mailto:${contact.email}`} className="truncate text-[#0073ea] hover:underline">
                  {contact.email}
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
            {contact.phone ? (
              <a
                href={`tel:${contact.country_code ?? ""}${contact.phone}`}
                className="text-[#0073ea] hover:underline"
              >
                {contact.country_code ? `${contact.country_code} ` : ""}
                {contact.phone}
              </a>
            ) : (
              "—"
            )}
          </DetailRow>
          <DetailRow label="Account">{contact.account_name ?? "—"}</DetailRow>
          <DetailRow label="Title">{contact.title ?? "—"}</DetailRow>
          <DetailRow label="Comments">{contact.comments ?? "—"}</DetailRow>
          {/* everything below came across with the lead on conversion */}
          {(contact.first_name || contact.last_name) && (
            <DetailRow label="Name on file">
              {[contact.first_name, contact.last_name].filter(Boolean).join(" ")}
            </DetailRow>
          )}
          {contact.lead_source && (
            <DetailRow label="Lead source">{sourceLabel(contact.lead_source)}</DetailRow>
          )}
          {contact.lead_date && (
            <DetailRow label="Lead date">{shortDate(contact.lead_date)}</DetailRow>
          )}
          {contact.notes && <DetailRow label="Lead notes">{contact.notes}</DetailRow>}
          <DetailRow label="Last interaction">
            {contact.last_interaction_at ? activityTime(contact.last_interaction_at) : "—"}
          </DetailRow>
          <DetailRow label="Created">{shortDate(contact.created_at)}</DetailRow>

          <DemandSection
            contact={contact}
            canEdit={canEditRow(profile, contact)}
            onToast={onToast}
          />

          {loading ? (
            <p className="pt-[24px] font-sans text-[14px] text-ink-muted">Loading…</p>
          ) : (
            <>
              {/* offers (rows of the Offers board — a deal is an ACCEPTED offer) */}
              <SectionTitle>
                Offers
                {deals.length > 0 && (
                  <span className="pl-[6px] font-sans text-[12px] font-normal text-ink-muted">
                    {deals.length} · {money(dealsValue, deals[0]?.currency ?? "OMR")}
                  </span>
                )}
              </SectionTitle>
              {deals.length === 0 && (
                <p className="m-0 font-sans text-[13px] text-ink-muted">No offers linked yet.</p>
              )}
              {deals.map((d) => (
                <div
                  key={d.id}
                  className="mt-[6px] flex items-center justify-between rounded-[6px] border border-line px-[12px] py-[8px]"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate font-sans text-[14px] leading-[20px] text-ink">{d.name}</p>
                    <p className="m-0 font-sans text-[12px] leading-[16px] text-ink-muted">
                      {money(d.deal_value, d.currency)}
                      {d.expected_close_date ? ` · closes ${shortDate(d.expected_close_date)}` : ""}
                    </p>
                  </div>
                  {d.stage_name && (
                    <Pill label={d.stage_name} color={d.stage_color ?? "#676879"} />
                  )}
                </div>
              ))}

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
                  <Pill
                    label={i.status}
                    color={i.status === "rejected" ? "#e2445c" : i.status === "shortlisted" ? "#579bfc" : "#00c875"}
                  />
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

              {/* per-offer follow-up trails */}
              <TrackingSection offers={deals} onToast={onToast} />
            </>
          )}
        </div>
      </div>
      {composerOpen && contact.email && (
        <EmailComposer
          profile={profile}
          to={[contact.email]}
          target={{ type: "contact", id: contact.id, name: contact.name }}
          onClose={() => setComposerOpen(false)}
          onDone={(message, tone) => onToast?.(message, tone)}
        />
      )}
    </div>
  );
}
