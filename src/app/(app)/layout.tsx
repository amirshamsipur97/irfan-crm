import { AppChrome } from "@/components/shell/AppChrome";
import { StaleTabGuard } from "@/components/shell/StaleTabGuard";
import { FirstLoginPassword } from "@/components/auth/FirstLoginPassword";
import { getProfile } from "@/lib/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return (
    <AppChrome profile={profile}>
      {/* a tab left open across a deploy recovers itself instead of dying */}
      <StaleTabGuard />
      {children}
      {/* accounts still on the emailed temporary password cannot proceed */}
      {profile.must_change_password && (
        <FirstLoginPassword fullName={profile.full_name} />
      )}
    </AppChrome>
  );
}
