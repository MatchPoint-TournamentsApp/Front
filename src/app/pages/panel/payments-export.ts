import { CategoryPayments } from '../../core/models';
import { csvText } from '../../shared/files';

const when = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid',
});

/**
 * Pagos de inscripción en CSV para Excel (separador ";", tildes correctas): una fila por jugador con su
 * categoría, compañero, teléfono, si ha pagado y cuándo. Refleja el estado en el momento de exportar.
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
        p.paidAt ? 'Pagado' : 'Sin pagar',
        p.paidAt ? when.format(new Date(p.paidAt)).replace(',', '') : '',
        p.pairStatus === 'PENDING' ? 'Pendiente de confirmar' : 'Confirmada',
      ]);
    }
  }
  return csvText(['Categoría', 'Jugador', 'Compañero/a', 'Teléfono', 'Estado del pago', 'Fecha del pago', 'Pareja'], rows);
}

/** «pagos-open-de-otono-2026-16-11-2026.csv». */
export function paymentsFileName(slug: string, now = new Date()) {
  const d = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' })
    .format(now).replaceAll('/', '-');
  return `pagos-${slug}-${d}.csv`;
}
