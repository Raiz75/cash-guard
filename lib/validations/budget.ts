/* AI-CONTEXT-NOTE:{"R":"Zod schema and inferred input type for the monthly budget form.","IDD":[{"!!":"Blank/NaN amounts yield 'Budget must be greater than 0', never raw Zod nan copy: valueAsNumber blanks arrive as NaN → invalid_type_error; a raw '' coerces to 0 and positive() rejects it with the same message"},{"?":"Keep the plain z.coerce.number() wrapper — wrapping in z.preprocess widens the resolver input type to unknown and breaks useForm<BudgetInput> in BudgetDialog (build-verified regression)"},{"?":"z.coerce.number still coerces numeric strings ('1500' → 1500); z.infer keeps form types and validation in lockstep"}],"A":[{"!!":"components/budget/BudgetDialog.tsx","resolver + BudgetInput"},{"!":"tests/budget.test.ts","schema cases incl. blank/NaN friendly-message assertions"}],"AB":[{"?":"zod version","v3 params shape ({ invalid_type_error }) — revisit on a v4 upgrade"}],"E":[{"!!":"npm run build","resolver input type must stay compatible with useForm<BudgetInput>"},{"!!":"npm test -- tests/budget.test.ts","positive/coerce/reject/blank/NaN cases"},{"?":"safeParse({ amount: \"\" }) and { amount: NaN } must fail with 'Budget must be greater than 0'"}]} */

import { z } from "zod";

export const budgetSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Budget must be greater than 0" })
    .positive("Budget must be greater than 0"),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
