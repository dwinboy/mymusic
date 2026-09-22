"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * How this browser can install the app:
 *  - "prompt": Chrome/Edge/Android offer a real install dialog.
 *  - "ios": Safari on iPhone/iPad has no install API; the listener adds it
 *    from the Share menu, so we can only explain how.
 *  - null: already installed, unsupported, or an in-app browser (Instagram,
 *    Facebook…) that can't add to the home screen at all.
 */
export type InstallMethod = "prompt" | "ios" | null;

const DISMISSED_KEY = "vibebanger:install-prompt-dismissed";
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;

// beforeinstallprompt can fire before any component mounts, so it's captured
// at module load and shared by every component that offers installation.
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Enough about where the page is running to explain installation honestly.
 *
 * The in-app browsers matter more than they look: a shared link opened from
 * Instagram, Facebook, TikTok or WhatsApp lands in a webview that cannot add
 * anything to the home screen at all, and a large share of arrivals from a
 * shared song come through one. The only useful thing to say there is how to
 * get out of it.
 */
export type InstallContext = {
  ios: boolean;
  android: boolean;
  /** A webview inside another app, where installing is impossible. */
  inApp: boolean;
  standalone: boolean;
};

function detectContext(): InstallContext {
  const ua = navigator.userAgent;
  const ios = /iphone|ipod|ipad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  const inApp = /FBAN|FBAV|Instagram|Line\/|TikTok|Snapchat|GSA\/|WhatsApp|Twitter|Pinterest/i.test(ua);
  return { ios, android, inApp, standalone: isStandalone() };
}

export function isInstallDismissed() {
  try {
    const value = window.localStorage.getItem(DISMISSED_KEY);
    if (!value) return false;
    // Older builds stored "true" with no expiry.
    if (value === "true") return true;
    return Date.now() - Number(value) < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

export function dismissInstall() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Non-critical preference.
  }
}

export function useInstallAvailability() {
  const hasPrompt = useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false
  );
  // Platform checks need the browser; resolved after mount to keep the
  // server render and first client render identical.
  const [context, setContext] = useState<InstallContext | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setContext(detectContext()));
    return () => cancelAnimationFrame(id);
  }, []);

  let method: InstallMethod = null;
  if (context && !context.standalone && !context.inApp) {
    if (hasPrompt) method = "prompt";
    else if (context.ios) method = "ios";
  }

  async function promptInstall() {
    if (!deferred) return;
    const event = deferred;
    await event.prompt();
    await event.userChoice;
    deferred = null;
    notify();
  }

  return { method, promptInstall, context };
}
