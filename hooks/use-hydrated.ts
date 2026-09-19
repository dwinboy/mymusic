"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * False while the server's HTML is being hydrated, true afterwards.
 *
 * Anything that renders from the clock, the locale, or storage the server
 * cannot see has to give the server's answer until hydration is done —
 * otherwise React finds the two disagree and throws the tree away.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false
  );
}
