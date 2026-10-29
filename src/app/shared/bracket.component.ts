import { Component, computed, input, output } from '@angular/core';
import { BoardPair, CategoryBoard, MatchView } from '../core/models';
import { MatchCardComponent } from './match-card.component';

const W = 214;   // ancho tarjeta
const H = 68;    // alto tarjeta
const GAP = 44;  // separación entre columnas
const UNIT = 84; // alto de cada partido de 1ª ronda

interface Placed { m: MatchView; x: number; y: number; col: number; }
interface Column { x: number; title: string; side: 'main' | 'cons' | 'start'; }
interface DrawLayout {
  label?: string;
  width: number;
  height: number;
  cards: Placed[];
  paths: string[];
  columns: Column[];
}

/**
 * Cuadro eliminatorio estilo cartel: la 1ª ronda en el centro, los ganadores avanzan
 * hacia la derecha y los que pierden su primer partido van a la consolación de la izquierda.
 */
@Component({
  selector: 'mp-bracket',
  imports: [MatchCardComponent],
  template: `
    @for (d of draws(); track d.label) {
      <section class="draw">
        @if (d.label) { <h3 class="draw-title">Cuadro {{ d.label }}</h3> }
        <div class="canvas" [style.width.px]="d.width" [style.height.px]="d.height + 34">
          @for (c of d.columns; track c.x) {
            <div class="col-title" [class.cons]="c.side === 'cons'" [class.start]="c.side === 'start'" [style.left.px]="c.x">{{ c.title }}</div>
          }
          <svg class="lines" [attr.width]="d.width" [attr.height]="d.height" [style.top.px]="34">
            @for (p of d.paths; track $index) { <path [attr.d]="p" /> }
          </svg>
          @for (p of d.cards; track p.m.id) {
            <mp-match-card [m]="p.m" [pairs]="pairs()" [admin]="admin()"
              [style.left.px]="p.x" [style.top.px]="p.y + 34" (click)="open(p.m)" />
          }
        </div>
      </section>
    }
    @if (finals().length) {
      <section class="finals">
        @for (f of finals(); track f.id) {
          <div class="final">
            <h4>{{ f.roundName }}</h4>
            <div class="slot"><mp-match-card [m]="f" [pairs]="pairs()" [admin]="admin()" (click)="open(f)" /></div>
            @if (champion(f); as c) { <div class="champ">Campeones: <b>{{ c }}</b></div> }
          </div>
        }
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .draw + .draw { margin-top: 36px; padding-top: 28px; border-top: 1px solid var(--rule); }
    .draw-title { font-size: 1.3rem; font-weight: 400; color: var(--ink); margin-bottom: 8px; }
    .canvas { position: relative; margin: 0 auto; }
    .col-title { position: absolute; top: 0; width: ${W}px; text-align: center; font: 500 11px var(--body); letter-spacing: .2em; color: var(--ink-2); text-transform: uppercase; }
    .col-title.cons { color: var(--gold-ink); }
    .col-title.start { color: var(--ink); }
    .lines { position: absolute; left: 0; pointer-events: none; overflow: visible; }
    .lines path { fill: none; stroke: #b9b0a0; stroke-width: 1.25; }
    .finals { display: flex; gap: 32px; justify-content: center; flex-wrap: wrap; margin-top: 40px; padding-top: 28px; border-top: 1px solid var(--gold); }
    .final { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .final h4 { margin: 0; color: var(--gold-ink); font: 500 .8rem var(--body); text-transform: uppercase; letter-spacing: .3em; }
    .final .slot { position: relative; width: ${W}px; height: ${H}px; }
    .champ { font-size: .9rem; color: var(--ink-2); }
    .champ b { background: var(--gold-grad); color: var(--night); padding: 2px 8px; border-radius: 999px; font-weight: 600; }
  `],
})
export class BracketComponent {
  board = input.required<CategoryBoard>();
  admin = input(false);
  matchClick = output<MatchView>();

  pairs = computed(() => new Map<string, BoardPair>(this.board().pairs.map(p => [p.id, p])));

  finals = computed(() => this.board().matches.filter(m => m.stage === 'FINAL' || m.stage === 'CONSOLATION_FINAL'));

  draws = computed<DrawLayout[]>(() => {
    const ms = this.board().matches.filter(m => m.stage === 'MAIN' || m.stage === 'CONSOLATION');
    const labels = [...new Set(ms.map(m => m.drawLabel ?? ''))].sort();
    return labels.map(l => layout(ms.filter(m => (m.drawLabel ?? '') === l), l || undefined));
  });

  open(m: MatchView) {
    if (this.admin() && m.status !== 'BYE') this.matchClick.emit(m);
  }

  champion(m: MatchView): string | null {
    if (!m.winnerPairId || m.status === 'PENDING') return null;
    const p = this.pairs().get(m.winnerPairId);
    return p ? `${p.player1} - ${p.player2}` : null;
  }
}

function layout(ms: MatchView[], label?: string): DrawLayout {
  const r1 = Math.max(1, ms.filter(m => m.stage === 'MAIN' && m.round === 1).length);
  const placedRaw = ms.map(m => {
    let col: number, yc: number;
    if (m.stage === 'MAIN') {
      col = m.round - 1;
      yc = (m.position + 0.5) * Math.pow(2, m.round - 1) * UNIT;
    } else {
      col = -m.round;
      yc = m.round === 1 ? (m.position + 0.5) * 2 * UNIT : (m.position + 0.5) * Math.pow(2, m.round) * UNIT;
    }
    return { m, col, yc };
  });
  const minCol = Math.min(0, ...placedRaw.map(p => p.col));
  const maxCol = Math.max(0, ...placedRaw.map(p => p.col));
  const xOf = (col: number) => (col - minCol) * (W + GAP);
  const cards: Placed[] = placedRaw.map(p => ({ m: p.m, col: p.col, x: xOf(p.col), y: p.yc - H / 2 }));
  const byId = new Map(cards.map(c => [c.m.id, c]));

  // líneas entre columnas contiguas (ganador ->, perdedor <-)
  const paths: string[] = [];
  for (const t of cards) {
    [t.m.slot1, t.m.slot2].forEach((s, i) => {
      if (!s.sourceMatchId) return;
      const src = byId.get(s.sourceMatchId);
      if (!src || Math.abs(src.col - t.col) !== 1) return;
      if (src.m.status === 'BYE' && src.m.round === 1) return;
      const sy = src.y + H / 2;
      const ty = t.y + H / 2 + (i === 0 ? -H / 5 : H / 5);
      if (t.col > src.col) {
        const sx = src.x + W, tx = t.x, mx = sx + GAP / 2;
        paths.push(`M${sx} ${sy}H${mx}V${ty}H${tx}`);
      } else {
        const sx = src.x, tx = t.x + W, mx = sx - GAP / 2;
        paths.push(`M${sx} ${sy}H${mx}V${ty}H${tx}`);
      }
    });
  }

  const columns: Column[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    const first = cards.find(p => p.col === c && !(p.m.status === 'BYE' && p.m.round === 1)) ?? cards.find(p => p.col === c);
    if (!first) continue;
    const title = c === 0 ? 'Primera ronda' : (first.m.roundName ?? '');
    columns.push({ x: xOf(c), title, side: c === 0 ? 'start' : c < 0 ? 'cons' : 'main' });
  }
  return { label, width: (maxCol - minCol + 1) * (W + GAP) - GAP, height: r1 * UNIT, cards, paths, columns };
}
