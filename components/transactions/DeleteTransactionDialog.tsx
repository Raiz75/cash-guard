/* AI-CONTEXT-NOTE:{"R":"Confirmation dialog for deleting a transaction, with success/error toasts.","IDD":[{"?":"Calls deleteTransaction and always closes via onOpenChange(false) afterward"}],"A":[{"?":"components/transactions/TransactionsView.tsx","rendered with the tx to delete"}],"AB":[{"?":"lib/db/repository.ts","deleteTransaction"},{"?":"lib/db/schema.ts","Transaction type"},{"?":"components/ui/dialog.tsx, components/ui/button.tsx, sonner","UI and toast dependencies"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify toast on success and error; dialog closes in both cases"}]} */

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