import { Board, Category, PairView, Tournament } from '../../core/models';
import { exportJson, matchesCsv, pairsCsv } from './export';

const cat = { id: 'c1', name: '4ª masculina' } as Category;
const pair: PairView = {
  id: 'p1', categoryId: 'c1', status: 'CONFIRMED', source: 'PUBLIC', paymentStatus: 'NOT_REQUIRED', seed: 1,
  player1: { id: 'j1', fullName: 'Ana López', phone: '+34 612345678', email: 'ana@example.com' },
  player2: { id: 'j2', fullName: 'Eva; Ruiz' },
  notes: 'Llega tarde', unavailabilities: [{ playDate: '2026-11-13', fromTime: '10:00:00', toTime: '14:00:00' }],
};
const board = {
  categories: [{
    category: cat, standings: {},
    pairs: [{ id: 'p1', player1: 'A. López', player2: 'E. Ruiz' }, { id: 'p2', player1: 'B. Gil', player2: 'C. Sanz' }],
    matches: [
      { id: 'm1', number: 1, roundName: 'Final', status: 'PLAYED', slot1: { pairId: 'p1', empty: false }, slot2: { pairId: 'p2', empty: false },
        playDate: '2026-11-15', startTime: '18:00:00', courtName: 'Pista 1', score: [[6, 3], [6, 4]], winnerPairId: 'p1' },
      { id: 'm2', number: 2, status: 'BYE', slot1: { pairId: 'p1', empty: false }, slot2: { empty: true } },
    ],
  }],
} as unknown as Board;
const pairs = new Map([['c1', [pair]]]);

describe('exportar torneo', () => {
  it('lista las parejas con contacto y restricciones', () => {
    const csv = pairsCsv([cat], pairs);
    expect(csv).toContain('4ª masculina;Confirmada;Ana López;+34 612345678;ana@example.com;"Eva; Ruiz";;;1;;No 13 nov 10:00-14:00;Llega tarde;Inscripción web');
  });

  it('lista los partidos con resultado y sin los exentos', () => {
    const lines = matchesCsv(board).split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('4ª masculina;1;Final;A. López - E. Ruiz;B. Gil - C. Sanz;2026-11-15;18:00;Pista 1;;Jugado;6-3  6-4;A. López - E. Ruiz');
  });

  it('la copia completa lleva el torneo, las parejas y los cuadros', () => {
    const t = { id: 't1', name: 'Torneo', categories: [cat] } as Tournament;
    const data = JSON.parse(exportJson(t, pairs, board, new Date('2026-11-08T12:00:00Z')));
    expect(data.app).toBe('MatchZone');
    expect(data.exportedAt).toBe('2026-11-08T12:00:00.000Z');
    expect(data.pairs[0].pairs[0].player1.email).toBe('ana@example.com');
    expect(data.board.categories[0].matches).toHaveLength(2);
  });
});
