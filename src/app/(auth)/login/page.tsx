import { AuthShell } from "@/components/auth/AuthShell";
import { LoginCard } from "@/components/auth/LoginCard";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthShell>
      <LoginCard oauthError={error ?? null} />
    </AuthShell>
  );
}
