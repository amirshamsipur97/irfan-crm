/**
 * One wording for every crm_claim_membership outcome, shared by the OAuth
 * callback and the denied route so a rejected session always explains itself
 * the same way.
 */
export function claimMessage(claim: unknown, email?: string | null): string {
  const who = email ? ` (${email})` : "";
  switch (claim) {
    case "pending":
      return "Your request is waiting for an administrator to approve it. You'll receive a temporary password to sign in with once it's approved — there is nothing to click before then.";
    case "inactive":
      return "This account has been deactivated. Ask a Developer or the CEO to re-activate it.";
    case "limit":
      return "The CRM agent limit is reached — contact your admin.";
    default:
      return `This account isn't approved for the CRM. Use your company email or ask your admin for an invite.${who}`;
  }
}
