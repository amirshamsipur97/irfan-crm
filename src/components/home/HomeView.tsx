"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ICONS, type IconName } from "@/lib/figma-icons";
import { canAnimate } from "@/lib/motion";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { Surface } from "@/components/shell/AppChrome";

export interface HomeData {
  firstName: string;
  fullName: string;
  avatarUrl: string | null;
  dateLabel: string;
  greeting: string;
  totalPipelineLabel: string;
  openDealsLabel: string;
  closedWonLabel: string;
}

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

export function HomeView({ data }: { data: HomeData }) {
  const rootRef = useRef<HTMLDivElement>(null);

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

  return (
    <Surface>
      <div ref={rootRef} className="thin-scroll h-full overflow-y-auto">
        <div className="mx-auto w-[960px] max-w-full px-[16px] xl:px-0">
          {/* sticky page header */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-[rgba(255,255,255,0.7)] pb-[4px] pt-[48px] backdrop-blur-[10px]">
            <p className="font-sans text-[14px] leading-[20px] text-ink-muted">{data.dateLabel}</p>
            <div className="flex items-center gap-[8px]">
              <IconButton icon="add" size={32} outlined label="Add widget" />
              <Button variant="outline" icon="customize">
                Customize
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-[32px] pb-[40px]">
            <h2 className="home-greeting font-display text-[24px] font-medium leading-[30px] tracking-[-0.1px] text-ink">
              {data.greeting}, {data.firstName}
            </h2>

            <div className="flex flex-col pt-[16px]">
              {/* Sales pipeline */}
              <div className="pb-[16px]">
                <WidgetCard>
                  <WidgetHeader
                    icon="widgetPipeline"
                    title="Sales pipeline"
                    right={
                      <div className="flex items-center gap-[8px]">
                        <Button variant="outline" size={24} icon="filterAll">
                          All
                        </Button>
                        <Button variant="outline" size={24} icon="filterDeals">
                          Deals
                        </Button>
                        <IconButton icon="expand" size={24} label="Expand" />
                      </div>
                    }
                  />
                  <div className="flex w-full flex-1 items-stretch gap-[16px]">
                    <KpiCard
                      title="Total pipeline value"
                      value={data.totalPipelineLabel}
                      chip={data.openDealsLabel}
                    />
                    <KpiCard title="Closed won (this month)" value={data.closedWonLabel} />
                  </div>
                </WidgetCard>
              </div>

              {/* Meetings */}
              <div className="pb-[16px]">
                <WidgetCard>
                  <WidgetHeader
                    icon="widgetMeetings"
                    title="Meetings"
                    right={
                      <p className="font-sans text-[14px] leading-[20px] text-ink-muted">
                        Not connected
                      </p>
                    }
                  />
                  <div className="flex w-full overflow-hidden rounded-[8px] border border-line p-px">
                    <div className="flex w-[380px] shrink-0 flex-col justify-center gap-[24px] px-[24px] py-[34px]">
                      <div className="flex flex-col gap-[4px]">
                        <p className="font-sans text-[16px] font-semibold leading-[22px] text-ink">
                          Turn meetings into opportunities
                        </p>
                        <p className="max-w-[307px] font-sans text-[14px] leading-[20px] text-ink-muted">
                          Connect your calendar to get automatic meeting prep, AI summaries, and
                          more.
                        </p>
                      </div>
                      <div className="flex items-center gap-[8px]">
                        <Button variant="outline" iconImage={ICONS.googleLogo}>
                          Google
                        </Button>
                        <Button variant="outline" iconImage={ICONS.outlookLogo}>
                          Outlook
                        </Button>
                      </div>
                    </div>
                    <div className="flex min-w-[259px] flex-1 items-stretch justify-end">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ICONS.calendarPreview}
                        alt=""
                        className="block h-[190px] w-[259px] object-cover"
                      />
                    </div>
                  </div>
                </WidgetCard>
              </div>

              {/* Recently visited */}
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
            </div>
          </div>
        </div>
      </div>
      <AiFloaty />
    </Surface>
  );
}
