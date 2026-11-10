/** CSV per Excel italiano: separatore ";", BOM UTF-8, protezione dalle formule (=, +, -, @). */
export function csvCell(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  // Evita che Excel esegua formule; i telefoni "+39 333..." restano come sono.
  if (/^[=+\-@\t\r]/.test(s) && !/^\+[\d ]+$/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(head: string[], rows: unknown[][]) {
  return "﻿" + [head.map(csvCell).join(";"), ...rows.map((r) => r.map(csvCell).join(";"))].join("\r\n");
}
