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