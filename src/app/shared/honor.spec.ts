import { CategoryBoard, MatchView, Stage } from '../core/models';
import { podium } from './honor';

const pair = (id: string) => ({ id, player1: id + '1', player2: id + '2' });
let n = 0;
function match(stage: Stage, round: number, p1: string, p2: string, winner?: string): MatchView {
  return {
    id: 'm' + ++n, number: n, stage, round, position: 0, courtFeatured: false, locked: false, live: false,
    slot1: { pairId: p1, empty: false, sourceType: 'ENTRY' }, slot2: { pairId: p2, empty: false, sourceType: 'ENTRY' },
    status: winner ? 'PLAYED' : 'PENDING', winnerPairId: winner,
  };
}
function board(format: CategoryBoard['category']['format'], matches: MatchView[], standings = {}): CategoryBoard {
  return {
    category: { id: 'c', name: '1ª', gender: 'MASCULINA', format, groupCount: 1, position: 0, drawGenerated: true, confirmedPairs: 4, pendingPairs: 0 },
    pairs: ['a', 'b', 'c', 'd'].map(pair), matches, standings,
  };
}

describe('cuadro de honor', () => {
  it('cuadro con consolación: campeón, subcampeón y campeón de consolación', () => {
    const p = podium(board('KNOCKOUT_CONSOLATION', [
      match('MAIN', 1, 'a', 'b', 'a'), match('MAIN', 1, 'c', 'd', 'c'), match('MAIN', 2, 'a', 'c', 'c'),
      match('CONSOLATION', 1, 'b', 'd', 'd'),
    ]));
    expect(p).toEqual({ first: 'c1 / c2', second: 'a1 / a2', third: 'd1 / d2', consolation: true, done: true });
  });

  it('sin final jugada no hay campeón', () => {
    const p = podium(board('KNOCKOUT', [match('MAIN', 1, 'a', 'b', 'a'), match('MAIN', 1, 'c', 'd'), match('MAIN', 2, 'a', 'c')]));
    expect(p.done).toBe(false);
  });

  it('liguilla de dos grupos: final y 3.º y 4.º puesto', () => {
    const p = podium(board('LEAGUE', [
      match('GROUP', 1, 'a', 'b', 'a'), match('FINAL', 1, 'a', 'c', 'a'), match('THIRD_PLACE', 1, 'b', 'd', 'd'),
    ]));
    expect(p).toEqual({ first: 'a1 / a2', second: 'c1 / c2', third: 'd1 / d2', consolation: false, done: true });
  });

  it('liguilla de un grupo: la clasificación cuando se han jugado todos los partidos', () => {
    const st = { A: ['b', 'a', 'c', 'd'].map(pairId => ({ pairId, played: 3, won: 0, lost: 0, setsFor: 0, setsAgainst: 0, gamesFor: 0, gamesAgainst: 0 })) };
    const done = podium(board('LEAGUE', [match('GROUP', 1, 'a', 'b', 'b')], st));
    expect([done.first, done.second, done.third]).toEqual(['b1 / b2', 'a1 / a2', 'c1 / c2']);
    const pending = podium(board('LEAGUE', [match('GROUP', 1, 'a', 'b', 'b'), match('GROUP', 1, 'c', 'd')], st));
    expect(pending.done).toBe(false);
  });
});
