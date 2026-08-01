"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { type IconName } from "@/lib/figma-icons";
import { canAnimate } from "@/lib/motion";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Surface } from "@/components/shell/AppChrome";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { saveHomeLayout } from "@/app/(app)/home-actions";

export interface HomeData {
  firstName: string;
  fullName: string;
  avatarUrl: string | null;
  dateLabel: string;
  greeting: string;
  /** open offers = proposals the client has not accepted yet */
  openOffersValueLabel: string;
  openOffersChip: string;
  /** accepted offers — rows on the Deals board */
  dealsValueLabel: string;
  dealsChip: string;
  /** part payments collected toward all deals' downpayments */
  dpCollectedLabel: string;
  dpChip: string;
  invoicesPending: number;
  leadsNewCount: number;
  leadsConvertedCount: number;
  leadSources: { source: string; count: number }[];
  viewingsUpcoming: { id: string; name: string; when: string | null; status: string | null }[];
  accountsTotal: number;
  accountsContacted: number;
  contactsTotal: number;
  contactsEngaged: number;
}

/** Widget registry — drives rendering, the Widget Center and layout persistence. */
export const HOME_WIDGETS: {
  key: string;
  title: string;
  badge: string;
  description: string;
}[] = [
  { key: "pipeline", title: "Sales pipeline", badge: "Metrics", description: "Open offers, accepted deals and collected downpayments — live." },
  { key: "leads", title: "Leads", badge: "Metrics", description: "New leads over the last 30 days, where they came from, and conversions." },
  { key: "viewings", title: "Upcoming viewings", badge: "Schedule", description: "The next scheduled property viewings from the Viewings board." },
  { key: "recents", title: "Recently visited", badge: "Navigation", description: "Jump back into the boards you use the most." },
  { key: "accounts", title: "Accounts", badge: "Metrics", description: "See your total accounts and which ones were actively contacted this month." },
  { key: "contacts", title: "Contacts", badge: "Metrics", description: "See your total contacts and who's been actively engaged this month." },
];

const DEFAULT_LAYOUT = ["pipeline", "leads", "recents"];

const RECENT_BOARDS: { title: string; icon: IconName }[] = [
  { title: "Leads", icon: "boardLeads" },
  { title: "Deals", icon: "boardDeals" },
  { title: "Contacts", icon: "boardContacts" },
  { title: "Activities", icon: "boardActivities" },
  { title: "Sales Dashboard", icon: "boardDashboard" },
];

function WidgetCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`home-widget w-full rounded-[16px] border border-line bg-white p-px shadow-[0px_167px_67px_0px_rgba(222,222,222,0.01),0px_94px_56px_0px_rgba(222,222,222,0.05),0px_42px_42px_0px_rgba(222,222,222,0.09),0px_10px_23px_0px_rgba(222,222,222,0.1)] ${className}`}
    >
      <div className="flex h-full flex-col px-[16px] pb-[16px] pt-[20px]">{children}</div>
    </section>
  );
}

function WidgetHeader({
  icon,
  title,
  right,
}: {
  icon: IconName;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-[16px] flex h-[24px] w-full items-center justify-between">
      <div className="flex items-center gap-[8px]">
        <Icon name={icon} size={20} />
        <h3 className="font-display text-[18px] font-medium leading-[24px] tracking-[-0.1px] text-ink">
          {title}
        </h3>
      </div>
      {right}
    </div>
  );
}

function KpiCard({
  title,
  value,
  chip,
}: {
  title: string;
  value: string;
  chip?: string;
}) {
  return (
    <div className="flex min-h-[134px] flex-1 flex-col rounded-[8px] border border-line bg-white pb-[17px]">
      <div className="flex items-center justify-between px-[24px] pb-[8px] pt-[20px]">
        <p className="font-sans text-[14px] font-semibold leading-[20px] text-ink">{title}</p>
        <Icon name="info" size={16} />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-[4px] px-[24px]">
        <p className="font-display text-[32px] font-light leading-[40px] tracking-[-0.5px] text-ink">
          {value}
        </p>
        <div className="flex min-h-[24px] items-center">
          {chip && (
            <span className="flex h-[24px] items-center rounded-[4px] bg-cyan-tint px-[8px] font-sans text-[14px] leading-[20px] text-ink">
              {chip}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function HomeView({ data, layout }: { data: HomeData; layout: string[] | null }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const known = new Set(HOME_WIDGETS.map((w) => w.key));
  const [sections, setSections] = useState<string[]>(
    (layout ?? DEFAULT_LAYOUT).filter((k) => known.has(k))
  );
  const [customize, setCustomize] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone?: "success" | "alert" } | null>(null);

  const persist = async (next: string[]) => {
    const result = await saveHomeLayout(next);
    if (result.error) setToast({ message: result.error, tone: "alert" });
  };

  const removeSection = (key: string) => {
    setSections((prev) => {
      const next = prev.filter((k) => k !== key);
      persist(next);
      return next;
    });
  };

  const addSection = (key: string) => {
    setSections((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      persist(next);
      return next;
    });
    setToast({
      message: `"${HOME_WIDGETS.find((w) => w.key === key)?.title}" added to your homepage`,
    });
  };

  /** pointer-based section reorder — live reflow while dragging the handle */
  const startDrag = (e: React.PointerEvent, key: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragKey(key);
    document.body.style.cursor = "grabbing";
    const onMove = (ev: PointerEvent) => {
      const el = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest("[data-home-section]") as HTMLElement | null;
      const overKey = el?.getAttribute("data-home-section");
      if (!overKey || overKey === key) return;
      setSections((prev) => {
        const from = prev.indexOf(key);
        const to = prev.indexOf(overKey);
        if (from === -1 || to === -1 || from === to) return prev;
        const next = [...prev];
        next.splice(from, 1);
        next.splice(to, 0, key);
        return next;
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      setDragKey(null);
      setSections((prev) => {
        persist(prev);
        return prev;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  useGSAP(
    () => {
      if (!canAnimate()) return;
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.from(".home-greeting", { y: 14, opacity: 0, duration: 0.4 }).from(
        ".home-widget",
        { y: 24, opacity: 0, duration: 0.45, stagger: 0.09, clearProps: "transform" },
        "-=0.15"
      );
    },
    { scope: rootRef }
  );

  const metricWidget = (
    title: string,
    totalLabel: string,
    total: number,
    activeLabel: string,
    active: number
  ) => (
    <WidgetCard>
      <WidgetHeader icon="widgetPipeline" title={title} />
      <div className="flex w-full flex-1 items-stretch gap-[16px]">
        <KpiCard title={totalLabel} value={String(total)} />
        <KpiCard title={activeLabel} value={String(active)} />
      </div>
    </WidgetCard>
  );

  const SECTION_RENDER: Record<string, () => React.ReactNode> = {
    pipeline: () => (
      <WidgetCard>
        <WidgetHeader
          icon="widgetPipeline"
          title="Sales pipeline"
          right={
            data.invoicesPending > 0 ? (
              <span className="flex h-[24px] items-center rounded-[4px] bg-[#fdab3d]/20 px-[8px] font-sans text-[13px] leading-[20px] text-[#b97416]">
                {data.invoicesPending} invoice{data.invoicesPending > 1 ? "s" : ""} to send
              </span>
            ) : undefined
          }
        />
        <div className="flex w-full flex-1 items-stretch gap-[16px]">
          <KpiCard
            title="Open offers"
            value={data.openOffersValueLabel}
            chip={data.openOffersChip}
          />
          <KpiCard title="Deals (accepted)" value={data.dealsValueLabel} chip={data.dealsChip} />
          <KpiCard
            title="Downpayments collected"
            value={data.dpCollectedLabel}
            chip={data.dpChip}
          />
        </div>
      </WidgetCard>
    ),
    leads: () => (
      <WidgetCard>
        <WidgetHeader icon="widgetPipeline" title="Leads" />
        <div className="flex w-full flex-1 items-stretch gap-[16px]">
          <KpiCard
            title="New leads (30 days)"
            value={String(data.leadsNewCount)}
            chip={
              data.leadSources.length > 0
                ? data.leadSources.map((s) => `${s.source} ${s.count}`).join(" · ")
                : undefined
            }
          />
          <KpiCard title="Converted to contacts" value={String(data.leadsConvertedCount)} />
        </div>
      </WidgetCard>
    ),
    viewings: () => (
      <WidgetCard>
        <WidgetHeader icon="widgetRecent" title="Upcoming viewings" />
        {data.viewingsUpcoming.length === 0 ? (
          <p className="m-0 rounded-[8px] border border-line bg-canvas px-[16px] py-[18px] font-sans text-[13.5px] leading-[20px] text-ink-muted">
            No upcoming viewings — schedule one on the Viewings board and it appears here.
          </p>
        ) : (
          <div className="flex flex-col">
            {data.viewingsUpcoming.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-[10px] border-b border-line-soft py-[9px] last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate font-sans text-[14px] leading-[20px] text-ink">
                  {v.name}
                </span>
                {v.status && (
                  <span className="shrink-0 rounded-[10px] bg-cyan-soft px-[8px] py-[2px] font-sans text-[12px] leading-[18px] text-ink">
                    {v.status}
                  </span>
                )}
                <span className="shrink-0 font-sans text-[13px] leading-[20px] text-ink-muted">
                  {v.when
                    ? new Date(v.when).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </WidgetCard>
    ),
    recents: () => (
      <WidgetCard>
        <WidgetHeader
          icon="widgetRecent"
          title="Recently visited"
          right={
            <div className="flex items-center gap-[8px]">
              <IconButton icon="chevronLeft" size={24} label="Previous" />
              <IconButton icon="chevronRight" size={24} label="Next" />
            </div>
          }
        />
        <div className="thin-scroll flex h-[126px] w-full gap-[16px] overflow-x-auto">
          {RECENT_BOARDS.map((board) => (
            <div
              key={board.title}
              className="flex h-full w-[232px] shrink-0 cursor-pointer flex-col gap-[8px] rounded-[12px] border border-line bg-white p-[13px] transition-shadow duration-150 hover:shadow-[0px_6px_20px_rgba(0,0,0,0.1)]"
            >
              <div className="flex min-h-0 flex-1 flex-col gap-[2px] rounded-[8px] bg-cyan-soft p-[12px]">
                <div className="flex items-center gap-[4px]">
                  <Icon name={board.icon} size={20} />
                  <span className="font-sans text-[16px] font-semibold leading-[22px] text-ink">
                    {board.title}
                  </span>
                </div>
                <span className="pl-[24px] font-sans text-[14px] leading-[20px] text-ink-muted">
                  CRM
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-[4px]">
                  <Avatar name={data.fullName} src={data.avatarUrl} size={20} />
                  <span className="font-sans text-[14px] leading-[20px] text-ink-muted">
                    {data.fullName}
                  </span>
                </span>
                <IconButton icon="star" size={24} label="Favorite" />
              </div>
            </div>
          ))}
        </div>
      </WidgetCard>
    ),
    accounts: () =>
      metricWidget(
        "Accounts",
        "Total accounts",
        data.accountsTotal,
        "Contacted this month",
        data.accountsContacted
      ),
    contacts: () =>
      metricWidget(
        "Contacts",
        "Total contacts",
        data.contactsTotal,
        "Engaged this month",
        data.contactsEngaged
      ),
  };

  return (
    <Surface>
      <div ref={rootRef} className="thin-scroll h-full overflow-y-auto">
        <div className="mx-auto w-[960px] max-w-full px-[16px] xl:px-0">
          {/* sticky page header */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-[rgba(255,255,255,0.7)] pb-[4px] pt-[48px] backdrop-blur-[10px]">
            <p className="font-sans text-[14px] leading-[20px] text-ink-muted">{data.dateLabel}</p>
            <div className="flex items-center gap-[8px]">
              <span onClick={() => setCenterOpen(true)}>
                <IconButton icon="add" size={32} outlined label="Add widget" />
              </span>
              {customize ? (
                <button
                  type="button"
                  onClick={() => {
                    setCustomize(false);
                    persist(sections);
                  }}
                  className="flex h-[32px] items-center gap-[6px] rounded-[4px] bg-teal-deep px-[14px] font-sans text-[14px] text-white transition-colors hover:bg-[#006e87]"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2 7l3 3 6-7" />
                  </svg>
                  Done
                </button>
              ) : (
                <span onClick={() => setCustomize(true)}>
                  <Button variant="outline" icon="customize">
                    Customize
                  </Button>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-[32px] pb-[40px]">
            <h2 className="home-greeting font-display text-[24px] font-medium leading-[30px] tracking-[-0.1px] text-ink">
              {data.greeting}, {data.firstName}
            </h2>

            <div className="flex flex-col pt-[16px]">
              {sections.length === 0 && (
                <p className="py-[48px] text-center font-sans text-[14px] text-ink-muted">
                  Your homepage is empty — add widgets with the “+” button.
                </p>
              )}
              {sections.map((key) => {
                const render = SECTION_RENDER[key];
                if (!render) return null;
                const meta = HOME_WIDGETS.find((w) => w.key === key);
                return (
                  <div
                    key={key}
                    data-home-section={key}
                    className={`pb-[16px] ${dragKey === key ? "opacity-60" : ""}`}
                  >
                    {customize ? (
                      <div className="rounded-[20px] border border-dashed border-[#9aa0b5] p-[8px]">
                        <div className="mb-[6px] flex items-center justify-between px-[4px]">
                          <button
                            type="button"
                            aria-label={`Reorder ${meta?.title}`}
                            onPointerDown={(e) => startDrag(e, key)}
                            style={{ touchAction: "none" }}
                            className="flex h-[24px] w-[24px] cursor-grab items-center justify-center rounded-[4px] text-ink-muted hover:bg-[var(--hover-ghost)] active:cursor-grabbing"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                              <circle cx="3.5" cy="2" r="1.1" />
                              <circle cx="8.5" cy="2" r="1.1" />
                              <circle cx="3.5" cy="6" r="1.1" />
                              <circle cx="8.5" cy="6" r="1.1" />
                              <circle cx="3.5" cy="10" r="1.1" />
                              <circle cx="8.5" cy="10" r="1.1" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSection(key)}
                            className="rounded-[4px] px-[8px] py-[2px] font-sans text-[12px] text-ink-muted transition-colors hover:bg-[var(--hover-ghost)] hover:text-alert"
                          >
                            ✕ Remove
                          </button>
                        </div>
                        {render()}
                      </div>
                    ) : (
                      render()
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Widget Center */}
      {centerOpen && (
        <div className="fixed inset-0 z-[92]">
          <button
            type="button"
            aria-label="Close widget center"
            onClick={() => setCenterOpen(false)}
            className="absolute inset-0 cursor-default bg-black/25"
          />
          <div className="thin-scroll absolute right-0 top-0 h-full w-[440px] overflow-y-auto bg-white p-[20px] shadow-[-8px_0_32px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between pb-[16px]">
              <h3 className="m-0 font-display text-[20px] font-semibold leading-[28px] text-ink">
                Widget Center
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setCenterOpen(false)}
                className="flex size-[28px] items-center justify-center rounded-[4px] transition-colors hover:bg-[var(--hover-ghost)]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M3 3l8 8M11 3l-8 8" stroke="#323338" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-[12px]">
              {HOME_WIDGETS.map((w) => {
                const added = sections.includes(w.key);
                return (
                  <div
                    key={w.key}
                    className="flex min-h-[190px] flex-col rounded-[12px] border border-line p-[14px]"
                  >
                    <span className="w-fit rounded-[10px] bg-cyan-tint px-[8px] py-[2px] font-sans text-[11px] leading-[16px] text-ink">
                      {w.badge}
                    </span>
                    <p className="m-0 pt-[10px] font-display text-[16px] font-semibold leading-[22px] text-ink">
                      {w.title}
                    </p>
                    <p className="m-0 flex-1 pt-[4px] font-sans text-[12.5px] leading-[18px] text-ink-muted">
                      {w.description}
                    </p>
                    <div className="flex justify-end pt-[8px]">
                      {added ? (
                        <span className="flex items-center gap-[4px] font-sans text-[12px] text-brand">
                          <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="#00c875" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M2 7l3 3 6-7" />
                          </svg>
                          Added
                        </span>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Add ${w.title}`}
                          onClick={() => addSection(w.key)}
                          className="flex size-[28px] items-center justify-center rounded-[6px] border border-line-strong text-ink transition-colors hover:bg-[var(--hover-ghost)]"
                        >
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#323338" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                            <path d="M7 2v10M2 7h10" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <SuccessToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      )}
      <AiFloaty />
    </Surface>
  );
}
