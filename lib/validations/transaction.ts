import { z } from "zod";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(dateStr: string): boolean {
  if (!YYYY_MM_DD.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export const transactionSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().trim().max(200, "Keep it under 200 characters").optional(),
  date: z.string().min(1, "Date is required"),
});

export const csvRowSchema = transactionSchema.refine(
  (data) => isValidCalendarDate(data.date),
  { message: "Date must be a valid calendar date in YYYY-MM-DD format", path: ["date"] }
);

export type TransactionInput = z.infer<typeof transactionSchema>;
export type CsvRowInput = z.infer<typeof csvRowSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["income", "expense"]),
});

export type CategoryInput = z.infer<typeof categorySchema>;