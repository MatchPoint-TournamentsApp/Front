import { CategoryPayments, PlayerAccount } from '../../core/models';
import { csvText } from '../../shared/files';

const when = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid',
});

/** Importe para Excel con coma decimal ("18" o "17,5"); vacío si no hay precio. */
export function euros(v: number | null | undefined): string {
  if (v == null) return '';
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
}

/**
 * Pagos de inscripción en CSV para Excel (separador ";", tildes correctas): una fila por inscripción con su
 * categoría, compañero, teléfono, si es 1.ª o 2.ª inscripción del jugador, si es alumno, importe y si ha pagado.
 * Refleja el estado en el momento de exportar.
 */
export function paymentsCsv(data: CategoryPayments[]): string {
  const rows: (string | number | null)[][] = [];
  for (const c of data) {
    const byPair = new Map<string, string[]>();
    c.players.forEach(p => byPair.set(p.pairId, [...(byPair.get(p.pairId) ?? []), p.fullName]));
    for (const p of c.players) {
      const partner = (byPair.get(p.pairId) ?? []).find(n => n !== p.fullName) ?? '';
      rows.push([
        c.categoryName, p.fullName, partner, p.phone ?? '',
        p.order ? (p.order === 1 ? '1.ª' : `${p.order}.ª`) : '', p.student ? 'Sí' : 'No', euros(p.price),
        p.paidAt ? 'Pagado' : 'Sin pagar',
        p.paidAt ? when.format(new Date(p.paidAt)).replace(',', '') : '',
        p.pairStatus === 'PENDING' ? 'Pendiente de confirmar' : 'Confirmada',
      ]);
    }
  }
  return csvText(['Categoría', 'Jugador', 'Compañero/a', 'Teléfono', 'Inscripción', 'Alumno', 'Importe (€)', 'Estado del pago',
    'Fecha del pago', 'Pareja'], rows);
}

/** Resumen por jugador: categorías, total, pagado y pendiente. */
export function accountsCsv(players: PlayerAccount[]): string {
  const rows = players.map(p => [
    p.fullName, p.phone ?? '', p.student ? 'Sí' : 'No',
    p.inscriptions.map(i => i.categoryName).join(', '), p.inscriptions.length,
    euros(p.total), euros(p.paid), euros(p.pending),
  ]);
  return csvText(['Jugador', 'Teléfono', 'Alumno', 'Categorías', 'Inscripciones', 'Total (€)', 'Pagado (€)', 'Pendiente (€)'], rows);
}

/** «pagos-open-de-otono-2026-16-11-2026.csv». */
export function paymentsFileName(slug: string, now = new Date(), suffix = '') {
  const d = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' })
    .format(now).replaceAll('/', '-');
  return `pagos${suffix}-${slug}-${d}.csv`;
}
