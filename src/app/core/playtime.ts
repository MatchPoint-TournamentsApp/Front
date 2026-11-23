// Días de juego que cruzan medianoche (p. ej. viernes 16:00–01:00): los partidos de la madrugada son del viernes
// (misma fecha) con su hora real (00:30). Para ordenar y mostrar hay que contar esa madrugada después de las 23:59.
// Es el mismo criterio que el planificador del Back (Scheduler.Day.minuteOf).

/** Horario de un día: lo mínimo que necesitan estas funciones. */
export interface DayHours { playDate?: string; startTime: string; endTime: string; }

/** Cierre más tardío de la madrugada (igual que el Back). */
export const LATEST_LATE_CLOSE = '06:00';

/** Minutos del reloj de "HH:mm" o "HH:mm:ss". */
export function clockMinutes(t?: string | null): number {
  if (!t) return 0;
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

/** El día termina después de medianoche (00:00 como fin sigue siendo «hasta medianoche»). */
export function crossesMidnight(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  const e = clockMinutes(end);
  return e > 0 && e < clockMinutes(start);
}

/** Esa hora es de la madrugada de ese día (de 00:00 al cierre de un día que cruza medianoche). */
export function isLate(day: DayHours | null | undefined, time?: string | null): boolean {
  return !!day && !!time && crossesMidnight(day.startTime, day.endTime) && clockMinutes(time) <= clockMinutes(day.endTime);
}

/** Minuto dentro del día de juego: la madrugada cuenta 24 h más (00:30 → 1470). En días normales, el del reloj. */
export function dayMinute(day: DayHours | null | undefined, time?: string | null): number {
  const m = clockMinutes(time);
  return isLate(day, time) ? m + 1440 : m;
}

/** Inicio y fin de una franja o tramo dentro del día de juego (23:59 o 00:00 como fin = medianoche). */
export function dayRange(day: DayHours | null | undefined, from: string, to: string): [number, number] {
  const f = dayMinute(day, from);
  const tm = clockMinutes(to);
  const t = day && crossesMidnight(day.startTime, day.endTime) && tm <= clockMinutes(day.endTime) ? tm + 1440
    : tm === 0 || tm >= 1439 ? 1440 : tm;
  return [f, t];
}

/** Clave para ordenar partidos por día de juego y hora (la madrugada va al final de su día). */
export function playKey(days: DayHours[] | null | undefined, date?: string | null, time?: string | null): string {
  if (!date) return 'z';
  const day = days?.find(d => d.playDate === date);
  return `${date} ${String(dayMinute(day, time)).padStart(4, '0')}`;
}

/** Problema con el horario de un día (o '' si está bien): para avisar antes de guardar. */
export function dayHoursProblem(day: DayHours): string {
  if (!day.startTime || !day.endTime) return 'falta la hora de inicio o de fin';
  if (day.startTime.slice(0, 5) === day.endTime.slice(0, 5)) return 'la hora de fin debe ser distinta de la de inicio (usa 23:59 para medianoche)';
  if (crossesMidnight(day.startTime, day.endTime) && clockMinutes(day.endTime) > clockMinutes(LATEST_LATE_CLOSE))
    return `termina a las ${day.endTime.slice(0, 5)} del día siguiente; si se juega de madrugada, el cierre puede ser como mucho a las ${LATEST_LATE_CLOSE}`;
  return '';
}
