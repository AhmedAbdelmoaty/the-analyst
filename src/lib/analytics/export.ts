/** Admin exports: Excel-friendly CSV (UTF-8 BOM) and real .xlsx (library loaded on demand). */
export type Cell = string | number | boolean | null | undefined | Date;
export interface Sheet { name: string; columns: { key: string; header: string; text?: boolean; date?: boolean }[]; rows: Record<string, Cell>[] }

/** Neutralises spreadsheet formulas in text a user could have typed (=, +, -, @, tab, CR). */
export function safeText(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

const CAIRO = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
export function cairoDateTime(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return CAIRO.format(d).replace(",", "");
}

const PHONE = /^\+?\d{3,20}$/;
function cellText(v: Cell, col: Sheet["columns"][number]): string {
  if (v == null) return "";
  if (col.date) return cairoDateTime(v as string);
  if (typeof v === "string") return col.text && PHONE.test(v) ? v : safeText(v);
  return String(v);
}

export function toCsv(sheet: Sheet): string {
  const esc = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [sheet.columns.map(c => esc(c.header)).join(",")];
  for (const r of sheet.rows) {
    lines.push(sheet.columns.map(c => {
      const t = cellText(r[c.key], c);
      // Keep phone numbers as text in Excel (preserves + and leading zeros).
      return esc(c.text && PHONE.test(t) ? `="${t}"` : t);
    }).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(sheet: Sheet, filename: string) {
  download(new Blob([toCsv(sheet)], { type: "text/csv;charset=utf-8" }), filename);
}

export async function buildXlsx(sheets: Sheet[]): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "The Analyst";
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31), { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
    ws.columns = s.columns.map(c => ({ header: c.header, key: c.key, width: Math.max(12, c.header.length + 4) }));
    ws.getRow(1).font = { bold: true, name: "Arial" };
    for (const r of s.rows) {
      const row: Record<string, string | number | boolean> = {};
      for (const c of s.columns) {
        const v = r[c.key];
        row[c.key] = typeof v === "number" || typeof v === "boolean" ? v : cellText(v, c);
      }
      ws.addRow(row);
    }
    s.columns.forEach((c, i) => { if (c.text) ws.getColumn(i + 1).numFmt = "@"; });
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export async function downloadXlsx(sheets: Sheet[], filename: string) {
  const buf = await buildXlsx(sheets);
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}
