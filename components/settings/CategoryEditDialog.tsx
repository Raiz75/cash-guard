"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { categorySchema, type CategoryInput } from "@/lib/validations/transaction";
import { updateCategory } from "@/lib/db/repository";
import type { Category } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CategoryEditDialog({
  category,
  inUse,
  open,
  onOpenChange,
}: {
  category: Category;
  inUse: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category.name, type: category.type },
  });

  const watchType = useWatch({ control: form.control, name: "type" }) ?? "expense";

  const onSubmit = async (data: CategoryInput) => {
    try {
      await updateCategory(category.id, data);
      toast.success("Category updated");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update category");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
          <DialogDescription>
            Renaming moves existing transactions to the new name.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={watchType === "income" ? "default" : "outline"}
              disabled={inUse > 0}
              onClick={() => form.setValue("type", "income")}
            >
              Income
            </Button>
            <Button
              type="button"
              variant={watchType === "expense" ? "default" : "outline"}
              disabled={inUse > 0}
              className={watchType === "expense" ? "bg-destructive hover:bg-destructive/90" : ""}
              onClick={() => form.setValue("type", "expense")}
            >
              Expense
            </Button>
          </div>
          {inUse > 0 ? (
            <p className="text-xs text-muted-foreground">
              Used by {inUse} transaction(s) — type can&apos;t be changed.
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Category name</Label>
            <Input id="edit-name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
