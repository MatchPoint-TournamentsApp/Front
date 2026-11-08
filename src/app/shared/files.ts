// Descargas de archivos generados en el navegador (CSV para Excel, JSON).

/** CSV para Excel en español: separador ";", BOM para las tildes y saltos de línea de Windows. */
export function csvText(header: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [header, ...rows].map(r => r.map(esc).join(';')).join('\r\n');
}

/** Importe con coma decimal, como lo espera Excel en español. */
export function excelNumber(n: number) { return n.toFixed(2).replace('.', ','); }

export function saveFile(name: string, content: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
