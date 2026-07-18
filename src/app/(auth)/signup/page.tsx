import { AuthShell } from "@/components/auth/AuthShell";
import { SignupCard } from "@/components/auth/SignupCard";

export default function SignupPage() {
  return (
    <AuthShell>
      <SignupCard />
    </AuthShell>
  );
}
