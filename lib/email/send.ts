/**
 * Transactional email, through Resend's HTTP API.
 *
 * Called rather than imported as a package: the API is one POST, and a
 * dependency for that is a dependency to keep updated for no benefit.
 *
 * Two rules hold everywhere email is used here:
 *
 *   - It never throws. A commission that was accepted must stay accepted even
 *     if the mail never leaves; the caller's work is already done and an
 *     exception would undo it.
 *   - It is optional. With no RESEND_API_KEY the app runs exactly as before,
 *     which is what makes this safe to deploy before the key exists and in
 *     every local and test environment.
 */

const ENDPOINT = "https://api.resend.com/emails";

export interface EmailAction {
  label: string;
  url: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  /** Large line at the top. Usually the subject said warmly. */
  heading: string;
  /** One string per paragraph. */
  body: string[];
  action?: EmailAction;
  /** Small print under the button — a reference code, say. */
  footer?: string;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

/** Returns whether it was actually sent, for callers that want to say so. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [message.to],
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        subject: message.subject,
        html: renderHtml(message),
        text: renderText(message),
      }),
      // A hanging mail API must not hold a request open.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(`[email] ${message.subject}: ${response.status} ${await response.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[email] ${message.subject}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/** Email clients don't do stylesheets, so every rule is inline and simple. */
function renderHtml({ heading, body, action, footer }: EmailMessage): string {
  const paragraphs = body
    .map((line) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46">${escapeHtml(line)}</p>`)
    .join("");

  const button = action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
         <tr><td style="border-radius:999px;background:#e3a857">
           <a href="${escapeAttribute(action.url)}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#1a1a1a;text-decoration:none">${escapeHtml(action.label)}</a>
         </td></tr>
       </table>`
    : "";

  const small = footer
    ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a">${escapeHtml(footer)}</p>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7">
    <tr><td style="padding:32px">
      <p style="margin:0 0 24px;font-size:13px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#e3a857">Vibe Banger</p>
      <h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;color:#18181b">${escapeHtml(heading)}</h1>
      ${paragraphs}${button}${small}
    </td></tr>
  </table>
</body></html>`;
}

function renderText({ heading, body, action, footer }: EmailMessage): string {
  return [heading, "", ...body, action ? `\n${action.label}: ${action.url}` : "", footer ? `\n${footer}` : ""]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** URLs go in an attribute, where a stray quote would break out of it. */
function escapeAttribute(value: string): string {
  return value.replace(/["<>]/g, (c) => ({ '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c]!);
}
