import { accountsCsv, euros, paymentsCsv, paymentsFileName } from './payments-export';

describe('exportar pagos', () => {
  const data = [{
    categoryId: 'c', categoryName: '1ª Masculina', players: [
      { pairId: 'p1', slot: 1 as const, fullName: 'Ana Gil', phone: '+34 600000001', pairStatus: 'CONFIRMED' as const, paidAt: '2026-11-15T09:30:00Z', order: 1, price: 20, student: false },
      { pairId: 'p1', slot: 2 as const, fullName: 'Eva Ruiz', pairStatus: 'CONFIRMED' as const, paidAt: null, order: 2, price: 16, student: true },
    ],
  }];

  it('una fila por inscripción con compañero, 1.ª o 2.ª, alumno, importe y estado del pago', () => {
    const lines = paymentsCsv(data).replace('﻿', '').split('\r\n');
    expect(lines[0]).toBe('Categoría;Jugador;Compañero/a;Teléfono;Inscripción;Alumno;Importe (€);Estado del pago;Fecha del pago;Pareja');
    expect(lines[1]).toBe('1ª Masculina;Ana Gil;Eva Ruiz;+34 600000001;1.ª;No;20;Pagado;15/11/2026 10:30;Confirmada');
    expect(lines[2]).toBe('1ª Masculina;Eva Ruiz;Ana Gil;;2.ª;Sí;16;Sin pagar;;Confirmada');
  });

  it('resumen por jugador con total, pagado y pendiente', () => {
    const lines = accountsCsv([{
      playerId: 'x', fullName: 'Mario Garrido', student: true, total: 34, paid: 18, pending: 16,
      inscriptions: [
        { pairId: 'a', slot: 1, categoryId: 'c1', categoryName: '4ª Masculina', order: 1, price: 18, pairStatus: 'CONFIRMED' },
        { pairId: 'b', slot: 2, categoryId: 'c2', categoryName: 'Mixta', order: 2, price: 16, pairStatus: 'CONFIRMED' },
      ],
    }]).replace('﻿', '').split('\r\n');
    expect(lines[1]).toBe('Mario Garrido;;Sí;4ª Masculina, Mixta;2;34;18;16');
  });

  it('importes con coma decimal', () => {
    expect(euros(17.5)).toBe('17,50');
    expect(euros(null)).toBe('');
  });

  it('nombre del archivo con la fecha', () => {
    expect(paymentsFileName('open-otono', new Date('2026-11-16T10:00:00Z'))).toBe('pagos-open-otono-16-11-2026.csv');
  });
});
