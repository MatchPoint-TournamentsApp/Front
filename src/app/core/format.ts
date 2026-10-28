// Utilidades de formato en español
import { BoardPair, CategoryFormat, Gender, MatchView, TournamentStatus } from './models';

const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'long' });
const dayMonth = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
const full = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

export function parseDate(d: string): Date { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); }
export function cap(s: string) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
export function dayName(d: string) { return cap(weekday.format(parseDate(d))); }
export function shortDate(d: string) { return dayMonth.format(parseDate(d)).replace('.', ''); }
export function longDate(d: string) { return cap(full.format(parseDate(d))); }
export function hhmm(t?: string | null) { return t ? t.slice(0, 5) : ''; }
export function range(a: string, b: string) {
  return a === b ? longDate(a) : `${shortDate(a)} – ${shortDate(b)} ${parseDate(b).getFullYear()}`;
}
export function when(m: MatchView) {
  return m.playDate ? `${dayName(m.playDate)} ${hhmm(m.startTime)}` : 'Sin horario';
}
export function pairLabel(p?: BoardPair) { return p ? `${p.player1} - ${p.player2}` : ''; }
export function scoreText(score?: number[][]) { return (score ?? []).map(s => `${s[0]}-${s[1]}`).join('  '); }
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  DRAFT: 'Borrador', REGISTRATION: 'Inscripciones', DRAW_READY: 'Cuadros listos', IN_PROGRESS: 'En juego', FINISHED: 'Finalizado',
};
export const FORMAT_LABEL: Record<CategoryFormat, string> = {
  KNOCKOUT: 'Eliminatoria', KNOCKOUT_CONSOLATION: 'Cuadro + consolación', LEAGUE: 'Liguilla',
};
export const GENDER_LABEL: Record<Gender, string> = { MASCULINA: 'Masculina', FEMENINA: 'Femenina', MIXTA: 'Mixta', OPEN: 'Open' };
export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** Colores por categoría (si el organizador no elige uno). */
export const CATEGORY_COLORS = ['#1f5fa8', '#2f7d5b', '#8a5a3c', '#7a3e9d', '#c2412d', '#0f7c8c', '#b7791f', '#3c4f76'];
export function categoryColor(c: { color?: string; position: number }) {
  return c.color || CATEGORY_COLORS[Math.abs(c.position - 1) % CATEGORY_COLORS.length];
}
