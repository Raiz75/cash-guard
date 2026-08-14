"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteCategory, reassignCategory } from "@/lib/db/repository";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export function DeleteCategoryDialog({
  category,
  count,
  candidates,
  open,
  onOpenChange,
}: {
  category: Category;
  count: number;
  candidates: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [target, setTarget] = useState("");
  const needTarget = count > 0;

  const handleDelete = async () => {
    try {
      if (needTarget) {
        if (!target) return;
        await reassignCategory(category.name, target);
      }
      await deleteCategory(category.id);
      toast.success("Category deleted");
      onOpenChange(false);
    } catch {
      toast.error("Could not delete category");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete category?</DialogTitle>
          <DialogDescription>
            {needTarget
              ? `${count} transaction(s) use this category. Move them to another category first.`
              : "This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        {needTarget ? (
          <div className="space-y-1.5">
            <Label htmlFor="reassign">Move transactions to</Label>
            <Select value={target || null} onValueChange={(v) => setTarget(v ?? "")}>
              <SelectTrigger id="reassign" className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={needTarget && !target}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
