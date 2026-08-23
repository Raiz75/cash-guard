/* AI-CONTEXT-NOTE:{"R":"Pure array paginator returning the rows for a page plus total page count, used by the transactions list.","IDD":[{"?":"Clamps page into [1, totalPages] and floors size to >=1 so callers never slice out of bounds or divide by zero"},{"?":"Generic + pure so it is unit-testable without DOM"}],"A":[{"!!":"components/transactions/TransactionsView.tsx","slices the filtered list via paginate"},{"?":"tests/paginate.test.ts","covers boundaries"}],"AB":[{"?":"None — standalone pure module"}],"E":[{"!!!":"npm test -- tests/paginate.test.ts","exact-multiple and clamp cases must pass"}]} */

export function paginate<T>(
  items: T[],
  page: number,
  size: number
): { rows: T[]; totalPages: number } {
  const safeSize = Math.max(1, Math.floor(size));
  const totalPages = Math.max(1, Math.ceil(items.length / safeSize));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * safeSize;
  return { rows: items.slice(start, start + safeSize), totalPages };
}
