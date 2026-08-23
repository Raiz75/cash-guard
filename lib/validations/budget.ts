/* AI-CONTEXT-NOTE:{"R":"Zod schema and inferred input type for the monthly budget form.","IDD":[{"?":"Coerces the number input (valueAsNumber yields NaN for blanks — coercion + positive() produce a friendly error)"},{"?":"z.infer keeps form types and validation in lockstep"}],"A":[{"!!":"components/budget/BudgetDialog.tsx","resolver + BudgetInput"},{"!":"tests/budget.test.ts","schema cases"}],"AB":[{"?":"zod version"}],"E":[{"!!":"npm test -- tests/budget.test.ts","positive/coerce/reject cases"}]} */

import { z } from "zod";

export const budgetSchema = z.object({
  amount: z.coerce.number().positive("Budget must be greater than 0"),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
