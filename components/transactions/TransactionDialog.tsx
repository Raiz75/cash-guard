/**
 * FILE NAME: TransactionDialog.tsx
 *
 * ROLE: Dialog wrapper for TransactionForm, used for both add and edit modes.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Pure presentation: open/onOpenChange/title/id/initial are passed through; the form
 *     closes the dialog via onDone → onOpenChange(false).
 *
 * AFFECTS:
 * ? - components/transactions/TransactionsView.tsx (renders it twice: add + edit)
 *
 * AFFECTED BY:
 * ? - components/transactions/TransactionForm.tsx
 * ? - components/ui/dialog.tsx
 * ? - lib/validations/transaction.ts (TransactionInput)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify both add and edit dialogs open/close correctly
 */

"use client";

import type { TransactionInput } from "@/lib/validations/transaction";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TransactionDialog({
  open,
  onOpenChange,
  title,
  id,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  id?: string;
  initial?: TransactionInput;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <TransactionForm id={id} initial={initial} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}