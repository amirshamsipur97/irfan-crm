import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimMessage } from "../claim-message";

/**
 * Redirect target for Google OAuth and for the address-confirmation link.
 * A confirmed address is NOT an approved member: self-signups stay inactive
 * until an admin approves them on /crm/team, so anything other than "ok"
 * ends the session with an explanation instead of being handed to "/"
 * (which would bounce straight back here and loop).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    // claim / verify CRM membership (also heals users invited after their
    // first google sign-in — the signup trigger only runs once)
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

  // GoTrue reports link failures in the URL FRAGMENT, which never reaches the
  // server — /login reads that client-side. Anything in the query is passed on.
  const desc = searchParams.get("error_description");
  return NextResponse.redirect(
    desc ? `${origin}/login?error=${encodeURIComponent(desc)}` : `${origin}/login`
  );
}
