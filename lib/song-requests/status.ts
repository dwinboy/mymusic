import type { SongRequestStatus } from "@/lib/generated/prisma/client";

/**
 * What each state means, who moves it on, and what may follow.
 *
 * Keeping the transitions in one table rather than scattered `if` statements
 * is what stops a request going from DECLINED back to IN_PRODUCTION because
 * one route forgot to check.
 */
export const REQUEST_STATUS_LABELS: Record<SongRequestStatus, string> = {
  SUBMITTED: "Submitted",
  QUOTED: "Quote sent",
  ACCEPTED: "Accepted",
  IN_PRODUCTION: "Being made",
  DELIVERED: "Delivered",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

/** Said to the person who asked, in the second person. */
export const REQUEST_STATUS_BLURB: Record<SongRequestStatus, string> = {
  SUBMITTED: "We've got your brief and will come back to you with a price.",
  QUOTED: "There's a price waiting for you to accept.",
  ACCEPTED: "Payment confirmed. Your song is in the queue.",
  IN_PRODUCTION: "Your song is being made right now.",
  DELIVERED: "Your song is ready.",
  DECLINED: "We weren't able to take this one on.",
  CANCELLED: "This request was cancelled.",
};

/**
 * Allowed next states, from the admin side. The requester's own actions —
 * cancelling, accepting a quote — are checked separately because they are
 * permitted from a different set of states.
 */
const ADMIN_TRANSITIONS: Record<SongRequestStatus, SongRequestStatus[]> = {
  SUBMITTED: ["QUOTED", "ACCEPTED", "DECLINED"],
  // ACCEPTED from QUOTED is how payment arranged off-platform gets recorded.
  QUOTED: ["ACCEPTED", "DECLINED", "QUOTED"],
  ACCEPTED: ["IN_PRODUCTION", "DELIVERED", "DECLINED"],
  IN_PRODUCTION: ["DELIVERED", "DECLINED"],
  // A delivered song can be re-opened if it needs another pass.
  DELIVERED: ["IN_PRODUCTION"],
  DECLINED: [],
  CANCELLED: [],
};

export function canAdminMove(from: SongRequestStatus, to: SongRequestStatus): boolean {
  return ADMIN_TRANSITIONS[from].includes(to);
}

/** The requester may pull out until work has been paid for. */
export function canRequesterCancel(status: SongRequestStatus): boolean {
  return status === "SUBMITTED" || status === "QUOTED";
}

/** Whether this state means nothing further will happen. */
export function isClosed(status: SongRequestStatus): boolean {
  return status === "DELIVERED" || status === "DECLINED" || status === "CANCELLED";
}

/** Open requests, for the admin queue's default view. */
export const OPEN_STATUSES: SongRequestStatus[] = ["SUBMITTED", "QUOTED", "ACCEPTED", "IN_PRODUCTION"];

/**
 * Prices are stored in minor units so no float ever touches money.
 * Currency is whatever was quoted; XAF has no minor unit, which is why the
 * divisor is per-currency rather than a flat 100.
 */
const ZERO_DECIMAL = new Set(["XAF", "XOF", "JPY", "KRW", "VND", "CLP", "ISK", "UGX", "RWF", "GNF", "KMF", "DJF"]);

export function formatPrice(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const value = ZERO_DECIMAL.has(code) ? amount : amount / 100;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: ZERO_DECIMAL.has(code) ? 0 : 2,
    }).format(value);
  } catch {
    // An unknown code shouldn't hide the number.
    return `${value.toLocaleString("en")} ${code}`;
  }
}

export function priceToMinorUnits(input: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? Math.round(input) : Math.round(input * 100);
}
