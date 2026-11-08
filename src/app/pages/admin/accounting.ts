// Cálculos de la contabilidad del panel de administración (cobros por activar torneos).
import { AdminPayment, PaymentMethod } from '../../core/models';
import { isoDate, parseDate } from '../../core/format';

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  BIZUM: 'Bizum', EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', OTRO: 'Otro',
};
export const METHODS = Object.keys(METHOD_LABEL) as PaymentMethod[];
export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
export function euros(n: number) { return eur.format(n); }

export type Period = 'week' | 'month' | 'year' | 'all';

/** Intervalo [desde, hasta] (fechas ISO) del periodo que contiene `today`. La semana va de lunes a domingo. */
export function periodRange(period: Period, today: Date, year = today.getFullYear()): [string, string] {
  switch (period) {
    case 'week': {
      const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      return [isoDate(monday), isoDate(sunday)];
    }
    case 'month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return [isoDate(first), isoDate(last)];
    }
    case 'year': return [`${year}-01-01`, `${year}-12-31`];
    case 'all': return ['0000-01-01', '9999-12-31'];
  }
}

export function inPeriod(payments: AdminPayment[], period: Period, today: Date, year?: number) {
  const [from, to] = periodRange(period, today, year);
  return payments.filter(p => p.paidOn >= from && p.paidOn <= to);
}

export function sum(payments: AdminPayment[]) {
  // Se suma en céntimos para no arrastrar decimales de coma flotante
  return payments.reduce((a, p) => a + Math.round(Number(p.amount) * 100), 0) / 100;
}

/** Ingresos de cada mes del año (12 valores). */
export function byMonth(payments: AdminPayment[], year: number): number[] {
  const cents = Array(12).fill(0);
  for (const p of payments) {
    const d = parseDate(p.paidOn);
    if (d.getFullYear() === year) cents[d.getMonth()] += Math.round(Number(p.amount) * 100);
  }
  return cents.map(c => c / 100);
}

export function byMethod(payments: AdminPayment[]): { method: PaymentMethod; total: number; count: number }[] {
  return METHODS.map(method => {
    const of = payments.filter(p => p.method === method);
    return { method, total: sum(of), count: of.length };
  }).filter(r => r.count > 0);
}

/** Años con cobros, más el actual, de más reciente a más antiguo. */
export function years(payments: AdminPayment[], today: Date): number[] {
  const set = new Set([today.getFullYear(), ...payments.map(p => parseDate(p.paidOn).getFullYear())]);
  return [...set].sort((a, b) => b - a);
}

/** CSV para Excel en español: separador ";", coma decimal y BOM para que respete las tildes. */
export function toCsv(payments: AdminPayment[]): string {
  const esc = (v: string) => /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const rows = payments.map(p => [
    p.paidOn, p.clubName, p.tournamentName, Number(p.amount).toFixed(2).replace('.', ','), METHOD_LABEL[p.method], p.note ?? '',
  ].map(v => esc(String(v))).join(';'));
  return '﻿' + ['Fecha;Club;Torneo;Importe (€);Forma de pago;Nota', ...rows].join('\r\n');
}
