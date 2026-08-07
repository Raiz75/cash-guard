import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().trim().max(200, "Keep it under 200 characters").optional(),
  date: z.string().min(1, "Date is required"),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["income", "expense"]),
});

export type CategoryInput = z.infer<typeof categorySchema>;