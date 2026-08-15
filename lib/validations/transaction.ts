/**
 * FILE NAME: transaction.ts
 *
 * ROLE: Zod schemas (transactionSchema, categorySchema) and their inferred input types used by every form and by CSV import validation.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - transactionSchema coerces amount to a positive number and allows an optional id, so the same schema validates both forms and imported CSV rows.
 * ? - TransactionInput / CategoryInput are inferred (z.infer) so validation and types can never drift apart.
 *
 * AFFECTS:
 * ! - components/transactions/TransactionForm.tsx (CRITICAL: resolver + TransactionInput)
 * ! - lib/db/repository.ts (CRITICAL: safeParse gates every imported row)
 * ? - components/settings/SettingsView.tsx (categorySchema + CategoryInput)
 * ? - components/settings/CategoryEditDialog.tsx (categorySchema)
 *
 * AFFECTED BY:
 * ? - zod version
 * ? - lib/db/schema.ts (field shapes should mirror these)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Changing a field must be reflected in forms, repository writes, and import parsing
 * * - description max length (200) and amount positivity are user-facing messages — keep them
 *
 * AI INSTRUCTIONS
 * - When editing this file, ALWAYS check the AFFECTS list first
 * - After changes, run ALL tests listed under ON FILE EDIT
 * - If AFFECTED BY files change, verify this file still works
 * - KEEP THIS HEADER CURRENT: whenever you edit this file, update ROLE, decisions, AFFECTS, AFFECTED BY, and ON FILE EDIT to match the change
 * - Keep every entry on one line (no wrapped continuations) so Better Comments highlights the full line
 * - Red (!) items are CRITICAL and cannot be skipped
 * - Blue (?) items are important but not blocking
 * - Green (*) items are nice-to-have; skip if not applicable
 */

import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string().min(1).optional(),
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