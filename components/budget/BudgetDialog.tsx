/* AI-CONTEXT-NOTE:{"R":"Dialog (RHF + Zod) to set or edit the overall monthly budget amount.","IDD":[{"?":"form.reset on open re-syncs defaults without remount tricks; open/close controlled by parent"},{"?":"Save calls repository.setBudget which upserts the single overall row"}],"A":[{"!!":"components/budget/BudgetView.tsx","opens this dialog"}],"AB":[{"?":"lib/validations/budget.ts","budgetSchema, BudgetInput"},{"?":"lib/db/repository.ts","setBudget"},{"?":"components/ui/dialog.tsx, input, label, button","shadcn primitives"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Success toast + close; failure keeps dialog open with error toast"},{"*":"Blank amount must show 'Budget must be greater than 0'"}]} */

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { budgetSchema, type BudgetInput } from "@/lib/validations/budget";
import { setBudget } from "@/lib/db/repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: number;
}

export function BudgetDialog({ open, onOpenChange, initial }: Props) {
  const form = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { amount: initial },
  });

  useEffect(() => {
    if (open) form.reset({ amount: initial });
  }, [open, initial, form]);

  const onSubmit = async (data: BudgetInput) => {
    try {
      await setBudget(data.amount);
      toast.success("Monthly budget saved");
      onOpenChange(false);
    } catch {
      toast.error("Could not save the budget");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Monthly budget</DialogTitle>
          <DialogDescription>
            Applies to every calendar month and resets automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Amount (₱)</Label>
            <Input
              id="budget-amount"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.amount.message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
