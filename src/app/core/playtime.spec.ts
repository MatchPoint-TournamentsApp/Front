import { crossesMidnight, dayHoursProblem, dayMinute, dayRange, isLate, playKey } from './playtime';

describe('días que cruzan medianoche', () => {
  const fri = { playDate: '2026-12-04', startTime: '16:00:00', endTime: '01:00:00' };
  const sat = { playDate: '2026-12-05', startTime: '09:00', endTime: '23:59' };

  it('sabe qué días cruzan medianoche (23:59 y 00:00 no)', () => {
    expect(crossesMidnight('16:00', '01:00')).toBe(true);
    expect(crossesMidnight('16:00', '23:59')).toBe(false);
    expect(crossesMidnight('16:00', '00:00')).toBe(false);
  });

  it('la madrugada cuenta después de las 23:59 del mismo día', () => {
    expect(isLate(fri, '00:30')).toBe(true);
    expect(isLate(fri, '23:00')).toBe(false);
    expect(isLate(sat, '00:30')).toBe(false);
    expect(dayMinute(fri, '00:30')).toBe(1470);
    expect(dayMinute(sat, '10:00')).toBe(600);
  });

  it('ordena la madrugada al final de su día y antes del día siguiente', () => {
    const days = [fri, sat];
    const keys = [['2026-12-04', '00:30'], ['2026-12-05', '09:00'], ['2026-12-04', '16:00'], ['2026-12-04', '23:00']]
      .map(([d, t]) => playKey(days, d, t)).sort();
    expect(keys).toEqual([playKey(days, '2026-12-04', '16:00'), playKey(days, '2026-12-04', '23:00'),
      playKey(days, '2026-12-04', '00:30'), playKey(days, '2026-12-05', '09:00')]);
  });

  it('franjas que cruzan medianoche', () => {
    expect(dayRange(fri, '23:00', '01:00')).toEqual([1380, 1500]);
    expect(dayRange(sat, '20:00', '23:59')).toEqual([1200, 1440]);
  });

  it('avisa de cierres de madrugada demasiado tarde', () => {
    expect(dayHoursProblem({ startTime: '16:00', endTime: '01:00' })).toBe('');
    expect(dayHoursProblem({ startTime: '09:00', endTime: '08:00' })).toContain('06:00');
    expect(dayHoursProblem({ startTime: '16:00', endTime: '16:00' })).not.toBe('');
  });
});
