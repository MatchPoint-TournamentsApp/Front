import { BoardPair, CategoryBoard, MatchView } from '../core/models';

/** Podio de una categoría para el cuadro de honor (nombres de pareja «Jugador 1 / Jugador 2»). */
export interface Podium {
  first?: string;
  second?: string;
  third?: string;
  /** El 3.º es el campeón de consolación (si no, el ganador del 3.º y 4.º puesto o el 3.º de la liguilla). */
  consolation: boolean;
  /** Hay al menos campeón. */
  done: boolean;
}

const played = (m?: MatchView) => !!m && (m.status === 'PLAYED' || m.status === 'WALKOVER') && !!m.winnerPairId;
const loser = (m: MatchView) => (m.slot1.pairId === m.winnerPairId ? m.slot2.pairId : m.slot1.pairId);

/** Último partido de una fase (la ronda más alta del cuadro principal, sin cuadros A/B). */
function last(matches: MatchView[], stage: MatchView['stage']) {
  const ms = matches.filter(m => m.stage === stage);
  if (!ms.length) return undefined;
  const top = Math.max(...ms.map(m => m.round));
  const finals = ms.filter(m => m.round === top);
  return finals.length === 1 ? finals[0] : undefined;
}

/**
 * Campeón y subcampeón: la final (o el último partido del cuadro único). Tercero: el campeón de consolación;
 * si no hay consolación, el ganador del 3.º y 4.º puesto; en una liguilla de un grupo, la clasificación
 * cuando se han jugado todos los partidos.
 */
export function podium(cb: CategoryBoard): Podium {
  const names = new Map<string, BoardPair>(cb.pairs.map(p => [p.id, p]));
  const name = (id?: string) => { const p = id ? names.get(id) : undefined; return p ? `${p.player1} / ${p.player2}` : undefined; };
  const ms = cb.matches;
  const out: Podium = { consolation: false, done: false };
  if (!cb.category.drawGenerated || !ms.length) return out;

  const final = ms.find(m => m.stage === 'FINAL') ?? (cb.category.format === 'LEAGUE' ? undefined : last(ms, 'MAIN'));
  if (final) {
    if (played(final)) { out.first = name(final.winnerPairId); out.second = name(loser(final)); }
  } else if (cb.category.format === 'LEAGUE') {
    const groups = Object.values(cb.standings ?? {});
    const groupMatches = ms.filter(m => m.stage === 'GROUP' && m.status !== 'BYE');
    if (groups.length === 1 && groupMatches.length && groupMatches.every(m => played(m))) {
      const s = groups[0];
      out.first = name(s[0]?.pairId); out.second = name(s[1]?.pairId); out.third = name(s[2]?.pairId);
    }
  }

  const cons = ms.find(m => m.stage === 'CONSOLATION_FINAL') ?? last(ms, 'CONSOLATION');
  const third = ms.find(m => m.stage === 'THIRD_PLACE');
  if (cons) {
    out.consolation = true;
    if (played(cons)) out.third = name(cons.winnerPairId);
  } else if (third && played(third)) {
    out.third = name(third.winnerPairId);
  }
  out.done = !!out.first;
  return out;
}
