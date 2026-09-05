/* AI-CONTEXT-NOTE:{"R":"Pure formatting/date helpers — PHP currency formatting, ISO date helpers, flexible DateFilter type, and a browser downloadFile() utility.","IDD":[{"?":"Currency uses Intl.NumberFormat with en-PH / PHP and fixed 2 decimals."},{"?":"All dates are ISO strings (YYYY-MM-DD) so lexicographic comparison works for ranges."},{"?":"DateFilter replaces the old DateRange union — supports all/today/bydate/daterange with optional date/startDate/endDate fields."},{"?":"rangeStartISO and rangeEndDateISO accept DateFilter and return nullable ISO strings for range filtering."}],"A":[{"?":"components/transactions/TransactionList.tsx","Uses formatPeso, formatDisplayDate"},{"?":"components/dashboard/DashboardView.tsx","Uses formatPeso, rangeStartISO, rangeEndDateISO, DateFilter"},{"?":"components/settings/SettingsView.tsx","Uses downloadFile, todayISO"},{"?":"components/transactions/TransactionForm.tsx","Uses todayISO"},{"?":"components/transactions/TransactionFilters.tsx","Uses rangeStartISO, rangeEndDateISO, DateFilter"},{"?":"components/shared/RangeFilter.tsx","Uses DateFilter type"}],"AB":[{"?":"Browser Intl support / locale data for en-PH"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify rangeStartISO/rangeEndDateISO handle all four ranges correctly"},{"*":"toISODate must produce zero-padded values or date-range comparisons break"}]} */

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

export function formatPeso(amount: number): string {
  return phpFormatter.format(amount);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function monthRange(anchor = new Date()): { start: string; end: string } {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const start = toISODate(new Date(y, m, 1));
  const end = toISODate(new Date(y, m + 1, 0));
  return { start, end };
}

export type DateRange = "all" | "today" | "bydate" | "daterange";

export type DateFilter = {
  range: DateRange;
  date?: string;
  startDate?: string;
  endDate?: string;
};

export function rangeStartISO(filter: DateFilter): string | null {
  if (filter.range === "all") return null;
  if (filter.range === "today") return toISODate(new Date());
  if (filter.range === "bydate") return filter.date ?? null;
  if (filter.range === "daterange") return filter.startDate ?? null;
  return null;
}

export function rangeEndDateISO(filter: DateFilter): string | null {
  if (filter.range === "daterange") return filter.endDate ?? null;
  return null;
}

export function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}