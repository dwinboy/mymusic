"use client";

import { AlertTriangle, RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again in a moment.",
  onRetry,
  variant = "error",
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  variant?: "error" | "offline";
  className?: string;
}) {
  const Icon = variant === "offline" ? WifiOff : AlertTriangle;

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-foreground-muted">{description}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm" className="mt-2">
          <RotateCw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}
