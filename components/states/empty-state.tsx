import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-foreground-subtle">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-base font-medium text-foreground">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-foreground-muted">{description}</p>}
      </div>
      {actionLabel && actionHref && (
        <Button asChild variant="secondary" size="sm" className="mt-2">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="secondary" size="sm" className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
