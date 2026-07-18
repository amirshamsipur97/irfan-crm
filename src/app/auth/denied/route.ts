import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const NOT_APPROVED =
  "Your account isn't approved for the CRM. Use your company email or ask your admin for an invite.";

/**
 * A signed-in session without CRM membership lands here. First try to claim
 * membership (the user may have been invited/approved after signing in);
 * otherwise sign the session out with a clear message.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  const { data: claim } = await supabase.rpc("crm_claim_membership");
  if (claim === "ok") {
    return NextResponse.redirect(`${origin}/`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ? ` (${user.email})` : "";

  await supabase.auth.signOut();
  const msg =
    claim === "limit"
      ? "The CRM agent limit is reached — contact your admin."
      : `${NOT_APPROVED}${email}`;
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
}
