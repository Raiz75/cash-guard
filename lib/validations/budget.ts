/* AI-CONTEXT-NOTE:{"R":"Zod schemas and inferred input types for the monthly budget form (budgetSchema) and the category-breakdown dialog form (categoryBudgetSchema).","IDD":[{"!!":"Blank/NaN amounts yield 'Budget must be greater than 0', never raw Zod nan copy: valueAsNumber blanks arrive as NaN → invalid_type_error; a raw '' coerces to 0 and positive() rejects it with the same message"},{"?":"Keep the plain z.coerce.number() wrapper — wrapping in z.preprocess widens the resolver input type to unknown and breaks useForm<BudgetInput> in BudgetDialog (build-verified regression)"},{"?":"z.coerce.number still coerces numeric strings ('1500' → 1500); z.infer keeps form types and validation in lockstep"},{"!!":"categoryBudgetSchema mirrors the same coerce/positive pattern plus categoryId min(1) so a blank Select pick is rejected before hitting setCategoryBudget"}],"A":[{"!!":"components/budget/BudgetDialog.tsx","resolver + BudgetInput"},{"!!":"components/budget/CategoryBudgetDialog.tsx","resolver + CategoryBudgetInput"},{"!":"tests/budget.test.ts","schema cases incl. blank/NaN friendly-message assertions"}],"AB":[{"?":"zod version","v3 params shape ({ invalid_type_error }) — revisit on a v4 upgrade"}],"E":[{"!!":"npm run build","resolver input type must stay compatible with useForm<BudgetInput> and useForm<CategoryBudgetInput>"},{"!!":"npm test -- tests/budget.test.ts","positive/coerce/reject/blank/NaN cases for both schemas"},{"?":"safeParse({ amount: \"\" }) and { amount: NaN } must fail with 'Budget must be greater than 0'"},{"?":"categoryBudgetSchema must reject blank categoryId and non-positive amounts"}]} */

import { z } from "zod";

export const categoryBudgetSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be greater than 0" })
    .positive("Amount must be greater than 0"),
});

export type CategoryBudgetInput = z.infer<typeof categoryBudgetSchema>;
