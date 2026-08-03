import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimMessage } from "../claim-message";

/**
 * A signed-in session without a USABLE CRM membership lands here. It may
 * still be claimable (invited or approved after signing in) — but a row that
 * exists and is merely inactive must NOT count as success: getProfile sends
 * every inactive session here, so answering "ok" bounced the browser back to
 * "/" and looped (the ERR_TOO_MANY_REDIRECTS seen after clicking the
 * confirm-email link on a not-yet-approved account). crm_claim_membership
 * now reports pending/inactive separately.
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

  await supabase.auth.signOut();
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(claimMessage(claim, user?.email))}`
  );
}
