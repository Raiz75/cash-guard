/* AI-CONTEXT-NOTE:{"R":"Dialog (RHF + Zod) to add or edit one category breakdown budget, calling repository.setCategoryBudget and showing its allocation-cap errors inline instead of a toast.","IDD":[{"!!":"Editing locks the Select (disabled={Boolean(editing)}) because the row id is cat:<categoryId> — changing category would be a different row"},{"?":"form.reset on open re-syncs defaults from props.editing without remount tricks; open/close controlled by parent"},{"!!":"Repository errors (e.g. 'Exceeds the monthly budget — only ₱X left unallocated') go to form.setError('root') and render as an inline destructive paragraph — never a toast"},{"?":"Parent passes only unallocated expense categories; in edit mode watchCategory still displays via the Select value"},{"!!":"items map on Select Root (editing id→name prepended, then categories) lets Base UI resolve SelectValue labels — omitting it renders the raw categoryId/UUID in the trigger"}],"A":[{"!!!":"components/budget/BudgetView.tsx","opens this dialog for Add breakdown and per-row Edit; supplies categories + editing"}],"AB":[{"!!":"lib/validations/budget.ts","categoryBudgetSchema + CategoryBudgetInput drive resolver and types"},{"!!":"lib/db/repository.ts","setCategoryBudget throws allocation-guard messages surfaced verbatim inline"},{"?":"components/ui/dialog.tsx + select","Base UI primitives; Select value/onValueChange coerced with ?? \"\"/?? null guards"},{"?":"lib/db/schema.ts","Category type shapes the select options"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"!!":"npm test -- tests/categoryBudgetView.test.ts","BudgetView gating + dialog select-label cases (add-mode pick and edit-mode preset show the name, never an id) around this dialog's mount"},{"?":"Over-allocation attempt must render the repository message inline and keep the dialog open"},{"*":"Success path: toast 'Category budget saved' + close; blank category shows 'Choose a category'"}]} */
"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  categoryBudgetSchema,
  type CategoryBudgetInput,
} from "@/lib/validations/budget";
import { setCategoryBudget } from "@/lib/db/repository";
import type { Category } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/shared/CategoryIcon";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editing?: { categoryId: string; name: string } | null;
}

export function CategoryBudgetDialog({ open, onOpenChange, categories, editing }: Props) {
  const form = useForm<CategoryBudgetInput>({
    resolver: zodResolver(categoryBudgetSchema),
    defaultValues: {
      categoryId: editing?.categoryId ?? "",
      amount: undefined as unknown as number,
    },
  });

  useEffect(() => {
    if (open)
      form.reset({
        categoryId: editing?.categoryId ?? "",
        amount: undefined as unknown as number,
      });
  }, [open, editing, form]);

  const watchCategory = useWatch({ control: form.control, name: "categoryId" }) ?? "";

  const items = Object.fromEntries([
    ...(editing ? [[editing.categoryId, editing.name] as const] : []),
    ...categories.map((c) => [c.id, c.name] as const),
  ]);

  const onSubmit = async (data: CategoryBudgetInput) => {
    try {
      await setCategoryBudget(data.categoryId, data.amount);
      toast.success("Category budget saved");
      onOpenChange(false);
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Could not save",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit breakdown" : "Add breakdown"}</DialogTitle>
          <DialogDescription>
            Monthly limit for one category. Breakdowns cannot exceed your overall
            budget.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cb-category">Category</Label>
            <Select
              items={items}
              value={watchCategory}
              disabled={Boolean(editing)}
              onValueChange={(v) => form.setValue("categoryId", v ?? "")}
            >
              <SelectTrigger id="cb-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-flex items-center gap-1.5">
                      <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.categoryId.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cb-amount">Amount (₱)</Label>
            <Input
              id="cb-amount"
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
          {form.formState.errors.root ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
