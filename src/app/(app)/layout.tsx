import { AppChrome } from "@/components/shell/AppChrome";
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
      {children}
      {/* accounts still on the emailed temporary password cannot proceed */}
      {profile.must_change_password && (
        <FirstLoginPassword fullName={profile.full_name} />
      )}
    </AppChrome>
  );
}
