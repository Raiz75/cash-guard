/**
 * FILE NAME: DeleteTransactionDialog.tsx
 *
 * ROLE: Confirmation dialog for deleting a transaction, with success/error toasts.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Calls deleteTransaction and always closes via onOpenChange(false) afterward.
 *
 * AFFECTS:
 * ? - components/transactions/TransactionsView.tsx (rendered with the tx to delete)
 *
 * AFFECTED BY:
 * ? - lib/db/repository.ts (deleteTransaction)
 * ? - lib/db/schema.ts (Transaction type)
 * ? - components/ui/dialog.tsx, components/ui/button.tsx, sonner
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify toast on success and error; dialog closes in both cases
 *
 * AI INSTRUCTIONS
 * - When editing this file, ALWAYS check the AFFECTS list first
 * - After changes, run ALL tests listed under ON FILE EDIT
 * - If AFFECTED BY files change, verify this file still works
 * - KEEP THIS HEADER CURRENT: whenever you edit this file, update ROLE, decisions, AFFECTS, AFFECTED BY, and ON FILE EDIT to match the change
 * - Keep every entry on one line (no wrapped continuations) so Better Comments highlights the full line
 * - Red (!) items are CRITICAL and cannot be skipped
 * - Blue (?) items are important but not blocking
 * - Green (*) items are nice-to-have; skip if not applicable
 */

"use client";

import { toast } from "sonner";
import { deleteTransaction } from "@/lib/db/repository";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/lib/db/schema";

export function DeleteTransactionDialog({
  tx,
  open,
  onOpenChange,
}: {
  tx: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const handleDelete = async () => {
    if (!tx) return;
    try {
      await deleteTransaction(tx.id);
      toast.success("Transaction deleted");
    } catch {
      toast.error("Could not delete transaction");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete transaction?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}