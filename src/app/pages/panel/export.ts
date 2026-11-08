// Exportar un torneo: copia completa (JSON) y listados para Excel (CSV).
import { Board, Category, PairStatus, PairView, Tournament, Unavailability } from '../../core/models';
import { hhmm, pairLabel, scoreText, shortDate } from '../../core/format';
import { csvText } from '../../shared/files';

const PAIR_STATUS: Record<PairStatus, string> = { CONFIRMED: 'Confirmada', PENDING: 'Pendiente', WITHDRAWN: 'Retirada' };
const MATCH_STATUS: Record<string, string> = { PENDING: 'Pendiente', PLAYED: 'Jugado', WALKOVER: 'W.O.', BYE: 'Exento' };

export interface TournamentExport {
  app: 'MatchZone';
  version: 1;
  exportedAt: string;
  tournament: Tournament;
  pairs: { category: string; categoryId: string; pairs: PairView[] }[];
  board: Board;
}

/** Copia completa: datos del torneo, parejas con contacto y restricciones, cuadros, horarios y resultados. */
export function exportJson(t: Tournament, pairs: Map<string, PairView[]>, board: Board, now = new Date()): string {
  const data: TournamentExport = {
    app: 'MatchZone', version: 1, exportedAt: now.toISOString(), tournament: t,
    pairs: t.categories.map(c => ({ category: c.name, categoryId: c.id, pairs: pairs.get(c.id) ?? [] })),
    board,
  };
  return JSON.stringify(data, null, 2);
}

function restrictions(list: Unavailability[]) {
  return list.map(u => {
    const day = shortDate(u.playDate);
    const span = u.fromTime || u.toTime ? ` ${hhmm(u.fromTime) || 'inicio'}-${hhmm(u.toTime) || 'fin'}` : ' todo el día';
    return `No ${day}${span}${u.note ? ` (${u.note})` : ''}`;
  }).join(' | ');
}

/** Parejas de todas las categorías, con contacto y restricciones. */
export function pairsCsv(categories: Category[], pairs: Map<string, PairView[]>): string {
  const rows = categories.flatMap(c => (pairs.get(c.id) ?? []).map(p => [
    c.name, PAIR_STATUS[p.status], p.player1.fullName, p.player1.phone, p.player1.email,
    p.player2.fullName, p.player2.phone, p.player2.email, p.seed ?? '', p.groupLabel ?? '',
    restrictions(p.unavailabilities), p.notes, p.source === 'PUBLIC' ? 'Inscripción web' : 'Organizador',
  ]));
  return csvText(['Categoría', 'Estado', 'Jugador 1', 'Teléfono 1', 'Email 1', 'Jugador 2', 'Teléfono 2', 'Email 2',
    'Cabeza de serie', 'Grupo', 'Restricciones', 'Notas', 'Origen'], rows);
}

/** Todos los partidos (sin los exentos) con horario, pista y resultado. */
export function matchesCsv(board: Board): string {
  const rows = board.categories.flatMap(cb => {
    const byId = new Map(cb.pairs.map(p => [p.id, p]));
    const side = (s: { pairId?: string; empty: boolean; placeholder?: string }) =>
      s.pairId ? pairLabel(byId.get(s.pairId)) : s.empty ? 'Exento' : s.placeholder ?? 'Por decidir';
    return cb.matches.filter(m => m.status !== 'BYE').map(m => [
      cb.category.name, m.number, m.roundName ?? m.groupLabel ?? '', side(m.slot1), side(m.slot2),
      m.playDate ?? '', hhmm(m.startTime), m.courtName ?? '', MATCH_STATUS[m.status] ?? m.status,
      scoreText(m.score), m.winnerPairId ? pairLabel(byId.get(m.winnerPairId)) : '',
    ]);
  });
  return csvText(['Categoría', 'Partido', 'Ronda', 'Pareja 1', 'Pareja 2', 'Día', 'Hora', 'Pista', 'Estado',
    'Resultado', 'Ganador'], rows);
}
