"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmRequest {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

/**
 * Replaces window.confirm for destructive admin actions — the native dialog
 * is unstyled, unbrandable, and can't say what is about to be deleted with
 * any emphasis.
 */
export function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!request) return;
    setBusy(true);
    try {
      await request.onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  }

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
        </DialogHeader>
        {request?.description && <p className="mt-2 text-sm text-foreground-muted">{request.description}</p>}
        <div className="mt-6 flex items-center gap-2">
          <Button variant="danger" onClick={confirm} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {request?.confirmLabel ?? "Delete"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
