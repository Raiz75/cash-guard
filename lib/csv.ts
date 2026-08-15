/**
 * FILE NAME: csv.ts
 *
 * ROLE: Parses an uploaded CSV of transactions into CsvRow[] (with quoted-field
 * handling, BOM stripping, and header-column mapping) for the import flow.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Hand-rolled parser (no dependency): handles quoted fields with "" escapes,
 *     skips blank lines and # comment lines, strips a leading BOM.
 * ? - Unknown/missing rows are skipped by importTransactions; missing required columns
 *     return an error string instead.
 *
 * AFFECTS:
 * ! - components/settings/SettingsView.tsx (CRITICAL: CSV import calls parseTransactionsCSV)
 * ? - lib/db/repository.ts (consumes CsvRow via importTransactions)
 *
 * AFFECTED BY:
 * ? - lib/db/schema.ts (row shape must map to Transaction)
 * ? - lib/validations/transaction.ts (rows are validated after parsing)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify quoted commas, "" escapes, BOM, and CRLF are handled
 * * - Header names are lowercased/trimmed — a renamed column silently stops importing
 */
export interface CsvRow {
  id?: string;
  date: string;
  type: string;
  amount: number;
  category: string;
  description?: string;
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

export function parseTransactionsCSV(text: string): {
  rows: CsvRow[];
  error: string | null;
} {
  text = text.replace(/^\uFEFF/, "");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => {
    const t = l.trim();
    return t.length > 0 && !t.startsWith("#");
  });
  if (nonEmpty.length === 0) return { rows: [], error: "CSV is empty" };

  const header = parseCSVLine(nonEmpty[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const dateIdx = idx("date");
  const typeIdx = idx("type");
  const amountIdx = idx("amount");
  const categoryIdx = idx("category");
  const descIdx = idx("description");
  const idIdx = idx("id");

  if (dateIdx === -1 || typeIdx === -1 || amountIdx === -1 || categoryIdx === -1) {
    return { rows: [], error: "CSV must have date, type, amount, category columns" };
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < nonEmpty.length; i++) {
    const cols = parseCSVLine(nonEmpty[i]);
    const get = (n: number) => (n === -1 ? "" : (cols[n] ?? "").trim());
    const date = get(dateIdx);
    const type = get(typeIdx);
    const category = get(categoryIdx);
    const amount = Number(get(amountIdx));
    if (!date || !type || !category || Number.isNaN(amount)) continue;
    const row: CsvRow = { date, type, amount, category };
    const id = get(idIdx);
    if (id) row.id = id;
    const description = get(descIdx);
    if (description) row.description = description;
    rows.push(row);
  }
  return { rows, error: null };
}
