"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog, useConfirm } from "@/components/ui/ConfirmDialog";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { canAnimate } from "@/lib/motion";
import { money, offerNumbers } from "@/components/crm/deals/deals-config";
import { shortDate, sourceLabel } from "@/components/crm/leads/board-config";
import { canEditRow } from "@/lib/permissions";
import { DemandSection } from "./demand-section";
import { TrackingSection } from "./tracking-section";
import { countryFlag } from "@/components/crm/country-cell";
import { ageLabel, genderLabel } from "@/lib/person-fields";
import { TemperaturePill } from "@/components/crm/temperature-pill";
import { activityTime } from "@/components/crm/activities/activities-config";
import type { CrmContact, CrmDeal, CrmOfferFloorPlan, CrmUser } from "@/lib/types";
import { EmailComposer } from "@/components/crm/email/EmailComposer";
import {
  getContactRelations,
  type ContactFeedItem,
} from "@/app/(app)/crm/contacts/drawer-actions";
import {
  deleteFloorPlan,
  registerFloorPlan,
  trackingFileUrl,
} from "@/app/(app)/crm/contacts/tracking-actions";
import { MAX_DOC_BYTES, humanSize } from "./demand-config";
import { createClient } from "@/lib/supabase/client";

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
  const { pending: planToDelete, ask: askPlan, close: closePlan } = useConfirm<CrmOfferFloorPlan>();
  const [composerOpen, setComposerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [deals, setDeals] = useState<DrawerDeal[]>([]);
  const [activities, setActivities] = useState<ContactFeedItem[]>([]);
  const [floorPlans, setFloorPlans] = useState<CrmOfferFloorPlan[]>([]);
  const [planUploading, setPlanUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // silent after the first load, so a doc upload or follow-up refreshes the
  // activity feed without blanking the whole lower half of the drawer
  const load = async () => {
    const data = await getContactRelations(contact.id);
    setDeals(data.deals as DrawerDeal[]);
    setActivities(data.activities);
    setFloorPlans(data.floorPlans);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  const uploadPlan = async (deal: DrawerDeal, file: File) => {
    if (file.size > MAX_DOC_BYTES) {
      onToast?.(`"${file.name}" is larger than 25 MB`, "alert");
      return;
    }
    setPlanUploading(deal.id);
    // straight to the private bucket, like tracking attachments
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `floorplans/${deal.id}/${crypto.randomUUID()}-${safe}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("crm-documents")
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadError) {
      setPlanUploading(null);
      onToast?.(uploadError.message, "alert");
      return;
    }
    const result = await registerFloorPlan({
      dealId: deal.id,
      name: file.name,
      storagePath: path,
      mimeType: file.type || null,
      sizeBytes: file.size,
    });
    setPlanUploading(null);
    if (result.error || !result.plan) {
      onToast?.(result.error ?? "could not save the floor plan", "alert");
      return;
    }
    setFloorPlans((prev) => [...prev, result.plan as CrmOfferFloorPlan]);
    onToast?.(`"${file.name}" attached as a floor plan`);
    load();
  };

  const openPlan = async (plan: CrmOfferFloorPlan) => {
    const result = await trackingFileUrl(plan.storage_path);
    if (result.error || !result.url) {
      onToast?.(result.error ?? "could not open the floor plan", "alert");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  const removePlan = async (plan: CrmOfferFloorPlan) => {
    const prev = floorPlans;
    setFloorPlans((p) => p.filter((x) => x.id !== plan.id));
    const result = await deleteFloorPlan(plan.id, plan.storage_path);
    if (result.error) {
      setFloorPlans(prev);
      onToast?.(result.error, "alert");
      return;
    }
    load();
  };

  useGSAP(
    () => {
      if (!canAnimate() || !panelRef.current) return;
      gsap.from(panelRef.current, { x: 40, opacity: 0, duration: 0.28, ease: "power2.out", clearProps: "all" });
    },
    { scope: panelRef }
  );

  const dealsValue = deals.reduce((sum, d) => sum + (d.deal_value ?? 0), 0);
  // stable per-client numbering: the list arrives newest-first, so a number
  // taken from the position would move under the client every time they get
  // another offer
  const offerNo = offerNumbers(deals);

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
          <DetailRow label="Country">
            {contact.country ? (
              <>
                <span aria-hidden>{countryFlag(contact.country)}</span> {contact.country}
              </>
            ) : (
              "—"
            )}
          </DetailRow>
          <DetailRow label="Status">
            <TemperaturePill value={contact.temperature} />
          </DetailRow>
          <DetailRow label="Gender">{genderLabel(contact.gender)}</DetailRow>
          <DetailRow label="Age">{ageLabel(contact.age)}</DetailRow>
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
          <DetailRow label="First negotiation">
            {contact.first_negotiation_at ? shortDate(contact.first_negotiation_at) : "—"}
          </DetailRow>
          <DetailRow label="Last interaction">
            {contact.last_interaction_at ? activityTime(contact.last_interaction_at) : "—"}
          </DetailRow>
          <DetailRow label="Created">{shortDate(contact.created_at)}</DetailRow>

          {/* the full note, untruncated — a DetailRow would clip it to one line */}
          {contact.first_negotiation_note && (
            <>
              <SectionTitle>First negotiation notes</SectionTitle>
              <p className="m-0 whitespace-pre-wrap rounded-[6px] border border-line bg-canvas px-[12px] py-[10px] font-sans text-[13px] leading-[19px] text-ink">
                {contact.first_negotiation_note}
              </p>
            </>
          )}

          <DemandSection
            contact={contact}
            canEdit={canEditRow(profile, contact)}
            onToast={onToast}
            onChanged={load}
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
              {deals.map((d) => {
                const plans = floorPlans.filter((p) => p.deal_id === d.id);
                const editable = canEditRow(profile, d);
                return (
                  <div
                    key={d.id}
                    className="mt-[6px] rounded-[6px] border border-line px-[12px] py-[8px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        {/* every offer of one client is stored under the same
                            name ("Offer — <client>"), which says nothing inside
                            that client's own drawer — the number and the project
                            are what tell them apart */}
                        <p className="m-0 truncate font-sans text-[14px] leading-[20px] text-ink">
                          Offer {offerNo.get(d.id) ?? 1}
                          {d.project_name ? (
                            <span className="pl-[6px] text-ink-muted">{d.project_name}</span>
                          ) : null}
                        </p>
                        <p className="m-0 font-sans text-[12px] leading-[16px] text-ink-muted">
                          {money(d.deal_value, d.currency)}
                          {d.expected_close_date ? ` · closes ${shortDate(d.expected_close_date)}` : ""}
                        </p>
                      </div>
                      {d.stage_name && (
                        <Pill label={d.stage_name} color={d.stage_color ?? "#676879"} />
                      )}
                    </div>

                    {/* floor plans sent to the client for THIS offer */}
                    <div className="mt-[8px] border-t border-line-soft pt-[6px]">
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.3px] text-ink-muted">
                          Floor plans sent
                        </span>
                        {editable && (
                          <label className="cursor-pointer rounded-[4px] border border-dashed border-line-strong px-[8px] py-[1px] font-sans text-[11px] text-ink transition-colors hover:bg-[var(--hover-ghost)]">
                            {planUploading === d.id ? "Uploading…" : "+ Upload"}
                            <input
                              type="file"
                              className="hidden"
                              disabled={planUploading === d.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (file) uploadPlan(d, file);
                              }}
                            />
                          </label>
                        )}
                      </div>
                      {plans.length === 0 ? (
                        <p className="m-0 pt-[3px] font-sans text-[12px] text-ink-muted">
                          None yet — attach the plans that were sent to the client.
                        </p>
                      ) : (
                        plans.map((p) => (
                          <div key={p.id} className="flex items-center gap-[8px] pt-[4px]">
                            <button
                              type="button"
                              onClick={() => openPlan(p)}
                              className="min-w-0 flex-1 truncate text-left font-sans text-[12.5px] text-[#0073ea] hover:underline"
                              title={p.file_name}
                            >
                              {p.file_name}
                            </button>
                            <span className="shrink-0 font-sans text-[11px] text-ink-muted">
                              {humanSize(p.size_bytes)}
                            </span>
                            {editable && (
                              <button
                                type="button"
                                aria-label={`Remove ${p.file_name}`}
                                onClick={() => askPlan(p)}
                                className="shrink-0 rounded-[4px] px-[4px] font-sans text-[12px] text-alert transition-colors hover:bg-[#ffe9ec]"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}

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
              <TrackingSection offers={deals} onToast={onToast} onChanged={load} />
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

      {/* floor plans are real files in the private bucket */}
      {planToDelete &&
        createPortal(
          <ConfirmDialog
            title={`Remove "${planToDelete.file_name}"?`}
            message="The floor plan is deleted from storage as well. This cannot be undone."
            confirmLabel="Yes, remove"
            onCancel={closePlan}
            onConfirm={() => {
              const plan = planToDelete;
              closePlan();
              removePlan(plan);
            }}
          />,
          document.body
        )}
    </div>
  );
}
