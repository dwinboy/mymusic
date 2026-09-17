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

function detectIos() {
  const ua = navigator.userAgent;
  const iOS = /iphone|ipod|ipad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const inAppBrowser = /FBAN|FBAV|Instagram|Line\/|TikTok|Snapchat|GSA\//i.test(ua);
  return iOS && !inAppBrowser;
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
  const [platform, setPlatform] = useState<{ ios: boolean; standalone: boolean } | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPlatform({ ios: detectIos(), standalone: isStandalone() }));
    return () => cancelAnimationFrame(id);
  }, []);

  let method: InstallMethod = null;
  if (platform && !platform.standalone) {
    if (hasPrompt) method = "prompt";
    else if (platform.ios) method = "ios";
  }

  async function promptInstall() {
    if (!deferred) return;
    const event = deferred;
    await event.prompt();
    await event.userChoice;
    deferred = null;
    notify();
  }

  return { method, promptInstall };
}
