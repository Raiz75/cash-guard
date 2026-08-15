/**
 * FILE NAME: format.ts
 *
 * ROLE: Pure formatting/date helpers — PHP currency formatting, ISO date helpers,
 * quick date-range math, and a browser downloadFile() utility.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Currency uses Intl.NumberFormat with en-PH / PHP and fixed 2 decimals.
 * ? - All dates are ISO strings (YYYY-MM-DD) so lexicographic comparison works for ranges.
 * ? - rangeStartISO maps DateRange ("all" | "today" | "7d" | "1m") to a start date; "all" → null.
 *
 * AFFECTS:
 * ? - components/transactions/TransactionList.tsx (formatPeso, formatDisplayDate)
 * ? - components/dashboard/DashboardView.tsx (formatPeso, rangeStartISO, DateRange)
 * ? - components/settings/SettingsView.tsx (downloadFile, todayISO)
 * ? - components/transactions/TransactionForm.tsx (todayISO)
 * ? - components/transactions/TransactionFilters.tsx (rangeStartISO, DateRange)
 * ? - components/shared/RangeFilter.tsx (DateRange type)
 *
 * AFFECTED BY:
 * ? - Browser Intl support / locale data for en-PH
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify PHP peso format (₱, 2 decimals) and en-PH display dates
 * * - toISODate must produce zero-padded values or date-range comparisons break
 *
 * AI INSTRUCTIONS
 * - When editing this file, ALWAYS check the AFFECTS list first
 * - After changes, run ALL tests listed under ON FILE EDIT
 * - If AFFECTED BY files change, verify this file still works
 * - KEEP THIS HEADER CURRENT: whenever you edit this file, update ROLE,
 *   decisions, AFFECTS, AFFECTED BY, and ON FILE EDIT to match the change
 * - Red (!) items are CRITICAL and cannot be skipped
 * - Blue (?) items are important but not blocking
 * - Green (*) items are nice-to-have; skip if not applicable
 */

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

export type DateRange = "all" | "today" | "7d" | "1m";

export function rangeStartISO(range: DateRange): string | null {
  if (range === "all") return null;
  const now = new Date();
  const days = range === "today" ? 0 : range === "7d" ? 6 : 29;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  return toISODate(start);
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