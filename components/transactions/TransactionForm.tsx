/* AI-CONTEXT-NOTE:{"R":"React Hook Form + Zod form for adding and editing transactions (type, amount, category, date, description).","IDD":[{"?":"useWatch (not form.watch) drives the type/category selects — memo-safe for the React Compiler lint"},{"?":"When adding, the first category of the selected type is auto-selected after load"},{"?":"A local TextField helper wraps Input for number/date variants"}],"A":[{"!!!":"components/transactions/TransactionDialog.tsx","CRITICAL":"rendered inside the dialog"}],"AB":[{"?":"lib/validations/transaction.ts","transactionSchema, TransactionInput"},{"?":"lib/db/repository.ts","addTransaction, updateTransaction"},{"?":"lib/hooks/useTransactions.ts","useCategories"},{"?":"lib/format.ts","todayISO default date"},{"?":"components/shared/CategoryIcon.tsx","select option icons"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify edit prefill, auto-select first category, validation errors, and toasts"},{"*":"Editing keeps the existing id; switching type must not lose category selection"}]} */

"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { transactionSchema, type TransactionInput } from "@/lib/validations/transaction";
import { addTransaction, updateTransaction } from "@/lib/db/repository";
import { useCategories } from "@/lib/hooks/useTransactions";
import { todayISO } from "@/lib/format";
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
    try {
      if (editing && id) {
        await updateTransaction(id, data);
        toast.success("Transaction updated");
      } else {
        await addTransaction(data);
        toast.success("Transaction added");
      }
      onDone?.();
    } catch {
      toast.error("Something went wrong saving the transaction");
    }
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