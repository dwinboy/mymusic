import { sendEmail } from "@/lib/email/send";
import { formatPrice } from "./status";

/**
 * The emails a commission sends.
 *
 * Every one of these is fire-and-forget from the caller's point of view: the
 * state change has already been committed, and a mail that fails must not
 * undo it. sendEmail swallows its own errors, so these just await it and move
 * on.
 */

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://vibebanger.com").replace(/\/$/, "");
}

function requestUrl(id: string): string {
  return `${siteUrl()}/requests/${id}`;
}

interface Recipient {
  email: string;
  name?: string | null;
}

/** First name where we have one, so the mail doesn't open with a full name. */
function greet(to: Recipient): string {
  const first = to.name?.trim().split(/\s+/)[0];
  return first ? `Hi ${first},` : "Hi,";
}

export async function emailRequestReceived(to: Recipient, request: { id: string; reference: string }) {
  await sendEmail({
    to: to.email,
    subject: `We've got your song request (${request.reference})`,
    heading: "Your brief is with us",
    body: [
      greet(to),
      "Thanks for telling us about the song you want made. We'll read the brief properly and come back to you with a price and a timeline.",
      "You can add anything you forgot, or reply to us, on the request page.",
    ],
    action: { label: "View your request", url: requestUrl(request.id) },
    footer: `Reference ${request.reference} — quote it if you get in touch.`,
  });
}

export async function emailQuoteSent(
  to: Recipient,
  request: { id: string; reference: string },
  price: { amount: number; currency: string },
  note?: string | null
) {
  await sendEmail({
    to: to.email,
    subject: `Your song quote: ${formatPrice(price.amount, price.currency)} (${request.reference})`,
    heading: `We can make this for ${formatPrice(price.amount, price.currency)}`,
    body: [
      greet(to),
      "We've read your brief and we'd like to make it.",
      ...(note ? [note] : []),
      "Open the request to accept and see how to pay. Nothing starts until you do.",
    ],
    action: { label: "See the quote", url: requestUrl(request.id) },
    footer: `Reference ${request.reference}`,
  });
}

export async function emailInProduction(to: Recipient, request: { id: string; reference: string }) {
  await sendEmail({
    to: to.email,
    subject: `Your song is being made (${request.reference})`,
    heading: "We've started on your song",
    body: [greet(to), "Your commission is in production now. We'll email you the moment it's ready to hear."],
    action: { label: "Follow along", url: requestUrl(request.id) },
    footer: `Reference ${request.reference}`,
  });
}

export async function emailDelivered(
  to: Recipient,
  request: { id: string; reference: string },
  song: { title: string }
) {
  await sendEmail({
    to: to.email,
    subject: `"${song.title}" is ready (${request.reference})`,
    heading: "Your song is ready",
    body: [
      greet(to),
      `"${song.title}" is finished and waiting for you. Play it, download it, and keep it.`,
      "It's private to your account unless you told us it could be published.",
    ],
    action: { label: "Listen to it", url: requestUrl(request.id) },
    footer: `Reference ${request.reference}`,
  });
}

export async function emailDeclined(
  to: Recipient,
  request: { id: string; reference: string },
  reason?: string | null
) {
  await sendEmail({
    to: to.email,
    subject: `About your song request (${request.reference})`,
    heading: "We can't take this one on",
    body: [
      greet(to),
      "We've looked at your brief and we're not able to make this one.",
      ...(reason ? [reason] : []),
      "You're welcome to send another request any time.",
    ],
    action: { label: "Start another request", url: `${siteUrl()}/request` },
    footer: `Reference ${request.reference}`,
  });
}

/** Tells the admin something needs looking at, when a notify address is set. */
export async function emailAdminNewRequest(request: {
  id: string;
  reference: string;
  occasion: string;
  recipientName?: string | null;
  neededBy?: Date | null;
}) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return;

  await sendEmail({
    to,
    subject: `New song request: ${request.occasion} (${request.reference})`,
    heading: "A new commission came in",
    body: [
      `Occasion: ${request.occasion}`,
      request.recipientName ? `For: ${request.recipientName}` : "No recipient named.",
      request.neededBy ? `Needed by: ${request.neededBy.toISOString().slice(0, 10)}` : "No deadline given.",
    ],
    action: { label: "Open in admin", url: `${siteUrl()}/admin/requests/${request.id}` },
    footer: `Reference ${request.reference}`,
  });
}
