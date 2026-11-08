import { AdminPayment } from '../../core/models';
import { byMethod, byMonth, inPeriod, periodRange, sum, toCsv } from './accounting';

const pay = (paidOn: string, amount: number, method: AdminPayment['method'] = 'BIZUM'): AdminPayment =>
  ({ id: paidOn + amount, tournamentName: 'Torneo; de prueba', clubName: 'Club', amount, method, paidOn });

// Domingo 8 de noviembre de 2026
const today = new Date(2026, 10, 8);
const payments = [pay('2026-11-02', 40), pay('2026-11-08', 25.5, 'EFECTIVO'), pay('2026-10-31', 0.1), pay('2025-12-31', 30)];

describe('contabilidad', () => {
  it('la semana va de lunes a domingo', () => {
    expect(periodRange('week', today)).toEqual(['2026-11-02', '2026-11-08']);
    expect(sum(inPeriod(payments, 'week', today))).toBe(65.5);
  });

  it('suma mes, año y todo sin errores de decimales', () => {
    expect(sum(inPeriod(payments, 'month', today))).toBe(65.5);
    expect(sum(inPeriod(payments, 'year', today))).toBe(65.6);
    expect(sum(inPeriod(payments, 'year', today, 2025))).toBe(30);
    expect(sum(inPeriod(payments, 'all', today))).toBe(95.6);
  });

  it('reparte por mes y por forma de pago', () => {
    const months = byMonth(payments, 2026);
    expect(months[10]).toBe(65.5);
    expect(months[9]).toBe(0.1);
    expect(byMethod(payments)).toEqual([
      { method: 'BIZUM', total: 70.1, count: 3 },
      { method: 'EFECTIVO', total: 25.5, count: 1 },
    ]);
  });

  it('genera un CSV para Excel en español', () => {
    const csv = toCsv([payments[1]]);
    expect(csv.startsWith('﻿Fecha;Club;Torneo')).toBe(true);
    expect(csv).toContain('2026-11-08;Club;"Torneo; de prueba";25,50;Efectivo;');
  });
});
