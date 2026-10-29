import { Component, computed, input, output } from '@angular/core';
import { BoardPair, CategoryBoard, MatchView } from '../core/models';
import { dayName, hhmm } from '../core/format';
import { MatchCardComponent } from './match-card.component';

interface Group { label: string; pairs: BoardPair[]; cells: Map<string, MatchView>; }

/** Liguilla: tabla de cruces (como el cartel) + clasificación + finales si hay dos grupos. */
@Component({
  selector: 'mp-league',
  imports: [MatchCardComponent],
  template: `
    <div class="groups" [class.two]="groups().length > 1">
      @for (g of groups(); track g.label) {
        <section class="group">
          @if (groups().length > 1) { <div class="glabel">{{ g.label }}</div> }
          <div class="table-wrap">
            <table class="cross">
              <thead>
                <tr>
                  <th class="corner">{{ groups().length > 1 ? 'Grupo ' + g.label : '' }}</th>
                  @for (p of g.pairs; track p.id) { <th>{{ p.player1 }} -<br>{{ p.player2 }}</th> }
                </tr>
              </thead>
              <tbody>
                @for (row of g.pairs; track row.id; let i = $index) {
                  <tr>
                    <th>{{ row.player1 }} -<br>{{ row.player2 }}</th>
                    @for (col of g.pairs; track col.id; let j = $index) {
                      @if (j <= i) { <td class="off"></td> }
                      @else {
                        @let m = g.cells.get(row.id + '|' + col.id);
                        <td [class.click]="admin() && !!m" [class.played]="isPlayed(m)" [class.warn]="admin() && !!m?.warning" (click)="m && open(m)">
                          @if (m) {
                            @if (isPlayed(m)) {
                              <span class="score">{{ scoreFor(m, row.id) }}</span>
                            } @else if (m.playDate) {
                              <span class="when">{{ day(m) }} {{ time(m) }}</span>
                              @if (m.courtName) { <span class="court" [class.center]="m.courtFeatured">{{ m.courtName }}</span> }
                            } @else { <span class="muted">Sin horario</span> }
                          }
                        </td>
                      }
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (standings(g.label).length) {
            <table class="standings">
              <thead><tr><th>#</th><th>Pareja</th><th title="Jugados">PJ</th><th title="Ganados">PG</th><th title="Perdidos">PP</th><th title="Sets">Sets</th><th title="Juegos a favor">JF</th><th title="Juegos en contra">JC</th></tr></thead>
              <tbody>
                @for (s of standings(g.label); track s.pairId; let i = $index) {
                  <tr [class.lead]="i === 0 && s.played > 0">
                    <td class="num">{{ i + 1 }}</td>
                    <td>{{ name(s.pairId) }}</td>
                    <td class="num">{{ s.played }}</td><td class="num b">{{ s.won }}</td><td class="num">{{ s.lost }}</td>
                    <td class="num">{{ s.setsFor }}-{{ s.setsAgainst }}</td><td class="num">{{ s.gamesFor }}</td><td class="num">{{ s.gamesAgainst }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }
    </div>
    @if (finals().length) {
      <section class="finals">
        @for (f of finals(); track f.id) {
          <div class="final">
            <h4>{{ f.roundName }}</h4>
            <div class="slot"><mp-match-card [m]="f" [pairs]="pairMap()" [admin]="admin()" (click)="open(f)" /></div>
          </div>
        }
      </section>
    }
    <p class="tiny muted rule">Clasificación: victorias; en caso de empate, menos juegos en contra y después el enfrentamiento directo. El super tie-break cuenta como un juego.</p>
  `,
  styles: [`
    :host { display: block; }
    .groups { display: grid; gap: 28px; }
    .group { position: relative; }
    .glabel { position: absolute; left: -6px; top: -14px; width: 40px; height: 40px; border-radius: 50%; background: var(--night); color: var(--gold); display: grid; place-items: center; font: 300 22px var(--body); z-index: 1; box-shadow: 0 0 0 2px #fff, 0 0 0 3px rgba(201, 164, 106, .6); }
    .cross { border-collapse: collapse; width: 100%; min-width: 560px; table-layout: fixed; }
    .cross th, .cross td { border: 1px solid #d6cebf; padding: 8px 6px; text-align: center; height: 62px; }
    .cross thead th, .cross tbody th { background: var(--night); color: var(--cream); font: 500 12.5px/1.25 var(--body); text-transform: uppercase; letter-spacing: .06em; border-color: var(--night-3); }
    .cross th.corner { background: var(--night); color: var(--gold); font-size: 16px; }
    .cross td { background: #fff; font: 500 14px var(--display); text-transform: uppercase; }
    .cross td.off { background: repeating-linear-gradient(135deg, var(--rule-2) 0 6px, #f6f2ea 6px 12px); }
    .cross td.click { cursor: pointer; transition: background .15s; }
    .cross td.click:hover { background: var(--court-3); }
    .cross td.played { background: #fbf8f2; }
    .cross td.warn { box-shadow: inset 0 0 0 2px var(--warn); }
    .when { display: block; }
    .court { display: inline-block; margin-top: 2px; font-size: 11px; color: var(--ink-2); }
    .court.center { background: var(--gold-grad); color: var(--night); padding: 0 5px; border-radius: 3px; font-weight: 600; }
    .score { font-size: 16px; color: var(--ink); letter-spacing: .06em; font-weight: 600; }
    .standings { border-collapse: collapse; width: 100%; margin-top: 14px; font-size: 14px; background: #fff; border-radius: 10px; overflow: hidden; }
    .standings th { text-align: left; font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); padding: 8px; border-bottom: 1px solid var(--rule); }
    .standings td { padding: 8px; border-bottom: 1px solid var(--rule-2); }
    .standings .num { font-family: var(--display); font-size: 15px; }
    .standings .b { font-weight: 700; color: var(--ink); }
    .standings tr.lead td { background: var(--court-3); }
    .finals { display: flex; gap: 32px; justify-content: center; flex-wrap: wrap; margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--gold); }
    .final { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .final h4 { margin: 0; color: var(--gold-ink); font: 500 .8rem var(--body); text-transform: uppercase; letter-spacing: .3em; }
    .final .slot { position: relative; width: 214px; height: 68px; }
    .rule { margin-top: 16px; }
  `],
})
export class LeagueComponent {
  board = input.required<CategoryBoard>();
  admin = input(false);
  matchClick = output<MatchView>();

  pairMap = computed(() => new Map(this.board().pairs.map(p => [p.id, p])));
  finals = computed(() => this.board().matches.filter(m => m.stage !== 'GROUP'));

  groups = computed<Group[]>(() => {
    const b = this.board();
    const groupMatches = b.matches.filter(m => m.stage === 'GROUP');
    const labels = [...new Set(groupMatches.map(m => m.groupLabel ?? 'A'))].sort();
    if (!labels.length) labels.push('A');
    return labels.map(label => {
      const ms = groupMatches.filter(m => (m.groupLabel ?? 'A') === label);
      const ids = new Set<string>();
      ms.forEach(m => { if (m.slot1.pairId) ids.add(m.slot1.pairId); if (m.slot2.pairId) ids.add(m.slot2.pairId); });
      const pairs = ms.length ? b.pairs.filter(p => ids.has(p.id)) : b.pairs;
      const cells = new Map<string, MatchView>();
      ms.forEach(m => {
        const a = m.slot1.pairId!, c = m.slot2.pairId!;
        cells.set(a + '|' + c, m);
        cells.set(c + '|' + a, m);
      });
      return { label, pairs, cells };
    });
  });

  standings(g: string) { return this.board().standings?.[g] ?? []; }
  name(id: string) { const p = this.pairMap().get(id); return p ? `${p.player1} - ${p.player2}` : ''; }
  isPlayed(m?: MatchView) { return !!m && (m.status === 'PLAYED' || m.status === 'WALKOVER'); }
  day(m: MatchView) { return dayName(m.playDate!); }
  time(m: MatchView) { return hhmm(m.startTime); }
  open(m: MatchView) { if (this.admin()) this.matchClick.emit(m); }

  /** Resultado visto desde la pareja de la fila. */
  scoreFor(m: MatchView, rowPair: string) {
    if (m.status === 'WALKOVER') return m.winnerPairId === rowPair ? 'Gana W.O.' : 'Pierde W.O.';
    const flip = m.slot1.pairId !== rowPair;
    return (m.score ?? []).map(s => flip ? `${s[1]}-${s[0]}` : `${s[0]}-${s[1]}`).join(' ');
  }
}
