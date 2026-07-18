import { notFound } from "next/navigation";
import { Surface } from "@/components/shell/AppChrome";
import { AiFloaty } from "@/components/shell/AiFloaty";
import { WORKSPACE_NAV } from "@/components/crm/WorkspaceSidebar";

/** Placeholder for boards that are built in upcoming steps (Leads, Deals, …). */
export default async function BoardPage({
  params,
}: {
  params: Promise<{ board: string }>;
}) {
  const { board } = await params;
  const item = WORKSPACE_NAV.find((n) => n.href === `/crm/${board}`);
  if (!item) notFound();

  return (
    <Surface>
      <div className="flex h-full flex-col items-center justify-center gap-[8px]">
        <p className="font-display text-[24px] font-medium leading-[30px] tracking-[-0.1px] text-ink">
          {item.label}
        </p>
        <p className="font-sans text-[14px] leading-[20px] text-ink-muted">
          This board is coming in an upcoming build step.
        </p>
      </div>
      <AiFloaty />
    </Surface>
  );
}
