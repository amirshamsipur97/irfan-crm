import nodemailer from "nodemailer";

/**
 * Sends the "your account is ready" email carrying the one-time temporary
 * password, over the company's own Zoho mailbox.
 *
 * Deliberately degrades instead of throwing: when SMTP is not configured the
 * approval still succeeds and the admin hands the password over directly, so
 * onboarding is never blocked on mail setup.
 *
 * Required server env (never NEXT_PUBLIC_):
 *   SMTP_HOST      smtp.zoho.com
 *   SMTP_PORT      465
 *   SMTP_USER      the sending mailbox, e.g. crm@irfaninvest.com
 *   SMTP_PASSWORD  an app-specific password from Zoho, not the login password
 *   SMTP_FROM      optional display sender, defaults to SMTP_USER
 */
export async function sendTempPasswordEmail(input: {
  to: string;
  fullName: string;
  tempPassword: string;
}): Promise<{ sent: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return { sent: false, error: "SMTP is not configured on the server" };
  }

  const port = Number(process.env.SMTP_PORT ?? 465);
  const from = process.env.SMTP_FROM ?? `Irfan CRM <${user}>`;
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crm.irfaninvest.com";
  const firstName = input.fullName.trim().split(/\s+/)[0] || "there";

  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 is implicit TLS; 587 upgrades with STARTTLS
      auth: { user, pass },
    });

    await transport.sendMail({
      from,
      to: input.to,
      subject: "Your Irfan CRM account is ready",
      text: [
        `Hi ${firstName},`,
        "",
        "Your Irfan CRM account has been approved.",
        "",
        `Sign in at: ${appUrl}/login`,
        `Email:      ${input.to}`,
        `Temporary password: ${input.tempPassword}`,
        "",
        "You will be asked to choose your own password the first time you sign in.",
        "The temporary password stops working at that point.",
        "",
        "If you did not request this account, tell your administrator.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#323338;max-width:520px">
          <p>Hi ${escapeHtml(firstName)},</p>
          <p>Your Irfan CRM account has been approved.</p>
          <table style="border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:4px 16px 4px 0;color:#676879">Sign in</td>
                <td style="padding:4px 0"><a href="${appUrl}/login" style="color:#00a0a0">${appUrl}/login</a></td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#676879">Email</td>
                <td style="padding:4px 0">${escapeHtml(input.to)}</td></tr>
            <tr><td style="padding:4px 16px 4px 0;color:#676879">Temporary password</td>
                <td style="padding:4px 0"><code style="background:#f5f6f8;border:1px solid #d0d4e4;border-radius:4px;padding:4px 8px;font-size:15px;letter-spacing:0.5px">${escapeHtml(input.tempPassword)}</code></td></tr>
          </table>
          <p>You will be asked to choose your own password the first time you sign in. The temporary password stops working at that point.</p>
          <p style="color:#676879;font-size:12px">If you did not request this account, tell your administrator.</p>
        </div>`,
    });

    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "SMTP send failed" };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}
