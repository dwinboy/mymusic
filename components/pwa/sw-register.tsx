"use client";

import { useEffect } from "react";
import { warmOfflinePages } from "@/lib/offline/warm";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    // Not from inside an embedded player on someone else's site.
    if (window.self !== window.top) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => warmOfflinePages())
      .catch(() => {
        // Registration failing (unsupported browser, blocked, etc.) shouldn't break the app.
      });
  }, []);

  return null;
}
