import { WorkspaceSidebar } from "@/components/crm/WorkspaceSidebar";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1">
      <WorkspaceSidebar />
      {children}
    </div>
  );
}
