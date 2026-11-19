import { activity, ago } from './admin-format';

describe('actividad de los clubes', () => {
  const now = new Date('2026-11-19T12:00:00Z').getTime();
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

  it('activo hasta 7 días, poco activo hasta 30, inactivo después y «nunca» sin datos', () => {
    expect(activity(daysAgo(2), null, now).level).toBe('active');
    expect(activity(daysAgo(15), null, now).level).toBe('low');
    expect(activity(daysAgo(40), null, now).level).toBe('inactive');
    expect(activity(null, null, now)).toEqual({ level: 'never', label: 'Nunca ha entrado', at: null, approx: false });
  });

  it('manda la última conexión registrada; el inicio de sesión solo si no hay otra (aproximado)', () => {
    expect(activity(daysAgo(1), daysAgo(20), now)).toMatchObject({ level: 'active', approx: false });
    expect(activity(null, daysAgo(3), now)).toMatchObject({ level: 'active', approx: true });
  });

  it('«hace…» legible', () => {
    expect(ago(new Date(now - 5 * 60000).toISOString(), now)).toBe('hace 5 min');
    expect(ago(new Date(now - 3 * 3600000).toISOString(), now)).toBe('hace 3 h');
    expect(ago(daysAgo(1), now)).toBe('hace 1 día');
    expect(ago(daysAgo(12), now)).toBe('hace 12 días');
    expect(ago(daysAgo(65), now)).toBe('hace 2 meses');
  });
});
