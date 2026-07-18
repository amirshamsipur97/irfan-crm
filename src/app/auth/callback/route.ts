import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const NOT_APPROVED =
  "This Google account isn't approved for the CRM. Use your company email or ask your admin for an invite.";

/** OAuth (Google) redirect target — exchanges the code for a session. */
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
    if (claim !== "ok") {
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

    return NextResponse.redirect(`${origin}/`);
  }

  const desc = searchParams.get("error_description") ?? "Google sign-in failed";
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(desc)}`);
}
