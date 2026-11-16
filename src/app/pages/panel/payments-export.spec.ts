import { paymentsCsv, paymentsFileName } from './payments-export';

describe('exportar pagos', () => {
  const data = [{
    categoryId: 'c', categoryName: '1ª Masculina', players: [
      { pairId: 'p1', slot: 1 as const, fullName: 'Ana Gil', phone: '+34 600000001', pairStatus: 'CONFIRMED' as const, paidAt: '2026-11-15T09:30:00Z' },
      { pairId: 'p1', slot: 2 as const, fullName: 'Eva Ruiz', pairStatus: 'CONFIRMED' as const, paidAt: null },
    ],
  }];

  it('una fila por jugador con su compañero y el estado del pago', () => {
    const lines = paymentsCsv(data).replace('﻿', '').split('\r\n');
    expect(lines[0]).toBe('Categoría;Jugador;Compañero/a;Teléfono;Estado del pago;Fecha del pago;Pareja');
    expect(lines[1]).toBe('1ª Masculina;Ana Gil;Eva Ruiz;+34 600000001;Pagado;15/11/2026 10:30;Confirmada');
    expect(lines[2]).toBe('1ª Masculina;Eva Ruiz;Ana Gil;;Sin pagar;;Confirmada');
  });

  it('nombre del archivo con la fecha', () => {
    expect(paymentsFileName('open-otono', new Date('2026-11-16T10:00:00Z'))).toBe('pagos-open-otono-16-11-2026.csv');
  });
});
