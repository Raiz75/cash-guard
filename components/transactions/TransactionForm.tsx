/* AI-CONTEXT-NOTE:{"R":"React Hook Form + Zod form for adding and editing transactions (type, amount, category, date, description) with monthly-budget overspend warning toasts — overall-budget toast first, then a labeled per-category breakdown toast when the saved expense crosses that category's own thresholds.","IDD":[{"?":"useWatch (not form.watch) drives the type/category selects — memo-safe for the React Compiler lint"},{"?":"When adding, the first category of the selected type is auto-selected after load"},{"?":"A local TextField helper wraps Input for number/date variants"},{"!!":"Best-effort budget warnings: the pre-write snapshot (getBudget/getMonthlySpent + getCategoryBudgets/getMonthlySpentByCategory) and both post-save recomputes are individually try/catch-wrapped so a failure there NEVER fires the save-error toast — only addTransaction/updateTransaction failures surface 'Something went wrong saving the transaction'; onDone always runs after a successful write"},{"?":"Category snapshot resolves the row via categories.find(name) then getCategoryBudgets().find(categoryBudgetId(cat.id)) so only categories with an existing breakdown warn"}],"A":[{"!!!":"components/transactions/TransactionDialog.tsx","CRITICAL":"rendered inside the dialog"},{"!!":"tests/transactionFormToast.test.ts","asserts overall-then-category toast order and best-effort rejection path"}],"AB":[{"?":"lib/validations/transaction.ts","transactionSchema, TransactionInput"},{"?":"lib/db/repository.ts","addTransaction, updateTransaction, getBudget, getMonthlySpent, getCategoryBudgets, getMonthlySpentByCategory"},{"?":"lib/db/schema.ts","categoryBudgetId keys the cat:<id> breakdown lookup"},{"?":"lib/budget.ts","crossedTier + BUDGET_TIER_MESSAGES + budgetTierMessage(label) for overspend toasts"},{"?":"lib/hooks/useTransactions.ts","useCategories"},{"?":"lib/format.ts","todayISO default date, monthRange current-month window"},{"?":"components/shared/CategoryIcon.tsx","select option icons"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"!!":"npm test -- tests/transactionFormToast.test.ts — one save must fire overall warning Nth(1) then category warning Nth(2); lookup rejections keep the save successful with zero error/warning toasts"},{"!!":"saving a current-month expense crossing 50/75/90/100% fires the matching warning toast"},{"!!":"Warnings are best-effort: if getBudget/getMonthlySpent/getCategoryBudgets/getMonthlySpentByCategory/recompute throw, no save-error toast appears and onDone still runs after a successful save; write failures alone show the error toast"},{"?":"Verify edit prefill, auto-select first category, validation errors, and toasts"},{"*":"Editing keeps the existing id; switching type must not lose category selection"},{"*":"Income saves and non-current-month expenses must not fire budget toasts"}]} */

"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { transactionSchema, type TransactionInput } from "@/lib/validations/transaction";
import {
  addTransaction,
  updateTransaction,
  getBudget,
  getMonthlySpent,
  getCategoryBudgets,
  getMonthlySpentByCategory,
} from "@/lib/db/repository";
import { crossedTier, BUDGET_TIER_MESSAGES, budgetTierMessage } from "@/lib/budget";
import { categoryBudgetId } from "@/lib/db/schema";
import { useCategories } from "@/lib/hooks/useTransactions";
import { todayISO, monthRange } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Props {
  id?: string;
  initial?: TransactionInput;
  onDone?: () => void;
}

export function TransactionForm({ id, initial, onDone }: Props) {
  const categories = useCategories();
  const editing = Boolean(id);

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initial ?? {
      type: "expense",
      amount: undefined as unknown as number,
      category: "",
      description: "",
      date: todayISO(),
    },
  });

  const watchType = useWatch({ control: form.control, name: "type" }) ?? "expense";
  const watchCategory = useWatch({ control: form.control, name: "category" }) ?? "";
  const typeCategories = (categories ?? []).filter((c) => c.type === watchType);

  useEffect(() => {
    if (!editing && typeCategories.length > 0 && !form.getValues("category")) {
      form.setValue("category", typeCategories[0].name);
    }
  }, [typeCategories, editing, form]);

  const onSubmit = async (data: TransactionInput) => {
    let limit: number | null = null;
    let spentBefore: number | null = null;
    let catLimit: number | null = null;
    let catSpentBefore: number | null = null;
    let catLabel: string | null = null;

    if (data.type === "expense") {
      const { start, end } = monthRange();
      const inCurrentMonth = data.date >= start && data.date <= end;
      if (inCurrentMonth) {
        try {
          const budget = await getBudget();
          if (budget) {
            limit = budget.amount;
            spentBefore = await getMonthlySpent();
          }
          const cat = (categories ?? []).find((c) => c.name === data.category);
          if (cat) {
            const row = (await getCategoryBudgets()).find(
              (r) => r.id === categoryBudgetId(cat.id)
            );
            if (row) {
              catLimit = row.amount;
              catSpentBefore = (await getMonthlySpentByCategory())[cat.name] ?? 0;
              catLabel = cat.name;
            }
          }
        } catch {
          limit = null;
          spentBefore = null;
          catLimit = null;
          catSpentBefore = null;
          catLabel = null;
        }
      }
    }

    try {
      if (editing && id) {
        await updateTransaction(id, data);
        toast.success("Transaction updated");
      } else {
        await addTransaction(data);
        toast.success("Transaction added");
      }
    } catch {
      toast.error("Something went wrong saving the transaction");
      return;
    }

    try {
      if (limit !== null && spentBefore !== null) {
        const spentAfter = await getMonthlySpent();
        const crossed = crossedTier(
          (spentBefore / limit) * 100,
          (spentAfter / limit) * 100
        );
        if (crossed) {
          toast.warning(BUDGET_TIER_MESSAGES[crossed]);
        }
      }
    } catch {
      // Budget warnings are best-effort — a failure here must not look like a save error.
    }

    try {
      if (catLimit !== null && catSpentBefore !== null && catLabel) {
        const catSpentAfter =
          (await getMonthlySpentByCategory())[catLabel] ?? 0;
        const crossed = crossedTier(
          (catSpentBefore / catLimit) * 100,
          (catSpentAfter / catLimit) * 100
        );
        if (crossed) {
          toast.warning(budgetTierMessage(crossed, catLabel));
        }
      }
    } catch {
      // Category warnings are best-effort like the overall ones.
    }

    onDone?.();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={watchType === "income" ? "default" : "outline"}
          onClick={() => form.setValue("type", "income")}
        >
          Income
        </Button>
        <Button
          type="button"
          variant={watchType === "expense" ? "default" : "outline"}
          onClick={() => form.setValue("type", "expense")}
          className={watchType === "expense" ? "bg-destructive hover:bg-destructive/90" : ""}
        >
          Expense
        </Button>
      </div>

      <TextField
        label="Amount (₱)"
        id="amount"
        variant="number"
        register={form.register("amount", { valueAsNumber: true })}
        error={form.formState.errors.amount?.message}
      />

      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select
          value={watchCategory}
          onValueChange={(v) => form.setValue("category", v ?? "")}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {typeCategories.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                <span className="inline-flex items-center gap-1.5">
                  <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.category ? (
          <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
        ) : null}
      </div>

      <TextField
        label="Date"
        id="date"
        variant="date"
        register={form.register("date")}
        error={form.formState.errors.date?.message}
      />

      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="What was this for?"
          {...form.register("description")}
        />
      </div>

      <Button type="submit" className="w-full">
        {editing ? "Save changes" : "Add transaction"}
      </Button>
    </form>
  );
}

interface TextFieldProps {
  label: string;
  id: string;
  variant: "number" | "date";
  register: unknown;
  error?: string;
}

function TextField({ label, id, variant, register, error }: TextFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={variant}
        step={variant === "number" ? "0.01" : undefined}
        inputMode={variant === "number" ? "decimal" : undefined}
        placeholder={variant === "number" ? "0.00" : undefined}
        {...(register as Record<string, unknown>)}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}