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
import type { Category } from "@/lib/db/types";
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
            Monthly limit for one category.
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