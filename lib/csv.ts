export interface CsvRow {
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
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return { rows: [], error: "CSV is empty" };

  const header = parseCSVLine(nonEmpty[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const dateIdx = idx("date");
  const typeIdx = idx("type");
  const amountIdx = idx("amount");
  const categoryIdx = idx("category");
  const descIdx = idx("description");

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
    const description = get(descIdx);
    if (description) row.description = description;
    rows.push(row);
  }
  return { rows, error: null };
}
