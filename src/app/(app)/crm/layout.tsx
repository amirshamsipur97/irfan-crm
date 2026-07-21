import { WorkspaceSidebar } from "@/components/crm/WorkspaceSidebar";
import { getProfile } from "@/lib/profile";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  return (
    <div className="flex min-w-0 flex-1">
      <WorkspaceSidebar role={profile.role} />
      {children}
    </div>
  );
}
