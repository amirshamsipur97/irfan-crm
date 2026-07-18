import { AppChrome } from "@/components/shell/AppChrome";
import { getProfile } from "@/lib/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return <AppChrome profile={profile}>{children}</AppChrome>;
}
