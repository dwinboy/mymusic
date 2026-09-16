"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { audioEngine } from "@/lib/audio/engine";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";

function AudioEngineBootstrap() {
  useEffect(() => {
    audioEngine.init();
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AudioEngineBootstrap />
      <ServiceWorkerRegister />
      {children}
    </SessionProvider>
  );
}
