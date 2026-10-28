import { Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Board, MatchView } from '../core/models';
import { categoryColor, dayName, hhmm, shortDate } from '../core/format';

interface Row { m: MatchView; cat: string; color: string; me: string; rival: string; }

/** Buscador para jugadores: escribe tu apellido y ve tus partidos, rivales, pista y hora. */
@Component({
  selector: 'mp-my-matches',
  imports: [FormsModule],
  template: `
    <div class="box">
      <label class="field"><span>Busca tus partidos</span>
        <input type="search" placeholder="Escribe tu apellido" [ngModel]="q()" (ngModelChange)="q.set($event)" autocomplete="off"></label>
      @if (q().trim().length >= 3) {
        @for (r of rows(); track r.m.id) {
          <div class="row-m" [style.border-left-color]="r.color">
            <div class="when">
              @if (r.m.playDate) { <b>{{ day(r.m) }}</b> <span class="num">{{ time(r.m) }}</span> } @else { <span class="muted">Sin horario</span> }
              @if (r.m.courtName) { <span class="court" [class.center]="r.m.courtFeatured">{{ r.m.courtName }}</span> }
            </div>
            <div class="who"><span class="muted small">{{ r.cat }}, {{ r.m.roundName }}</span><br>{{ r.me }} <span class="muted">contra</span> {{ r.rival }}</div>
            @if (r.m.score?.length) { <div class="res num">{{ score(r.m) }}</div> }
          </div>
        } @empty { <p class="small muted" style="margin:8px 0 0">No hay partidos con ese nombre.</p> }
      }
    </div>
  `,
  styles: [`
    .box { background: #fff; border: 1px solid var(--rule); border-radius: 14px; padding: 16px; margin-bottom: 18px; }
    .row-m { display: grid; grid-template-columns: 170px 1fr auto; gap: 12px; align-items: center; border-left: 4px solid; padding: 8px 12px; margin-top: 10px; background: var(--glass); border-radius: 8px; }
    @media (max-width: 560px) { .row-m { grid-template-columns: 1fr; gap: 4px; } }
    .when { display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }
    .court { font-size: .8rem; color: var(--ink-2); }
    .court.center { background: var(--ball); color: var(--ink); padding: 0 5px; border-radius: 3px; font-weight: 700; }
    .res { font-size: 1.05rem; color: var(--court); font-weight: 700; }
  `],
})
export class MyMatchesComponent {
  board = input.required<Board>();
  q = signal('');

  rows = computed<Row[]>(() => {
    const q = norm(this.q());
    if (q.length < 3) return [];
    const out: Row[] = [];
    for (const cb of this.board().categories) {
      const names = new Map(cb.pairs.map(p => [p.id, `${p.player1} - ${p.player2}`]));
      const mine = new Set(cb.pairs.filter(p => norm(`${p.player1} ${p.player2}`).includes(q)).map(p => p.id));
      for (const m of cb.matches) {
        if (m.status === 'BYE') continue;
        const side = mine.has(m.slot1.pairId ?? '') ? 1 : mine.has(m.slot2.pairId ?? '') ? 2 : 0;
        if (!side) continue;
        const me = side === 1 ? m.slot1 : m.slot2, other = side === 1 ? m.slot2 : m.slot1;
        out.push({ m, cat: cb.category.name, color: categoryColor(cb.category), me: names.get(me.pairId!) ?? '',
          rival: other.pairId ? names.get(other.pairId) ?? '' : other.placeholder ?? 'Por decidir' });
      }
    }
    return out.sort((a, b) => `${a.m.playDate ?? 'z'}${a.m.startTime ?? ''}`.localeCompare(`${b.m.playDate ?? 'z'}${b.m.startTime ?? ''}`));
  });

  day(m: MatchView) { return `${dayName(m.playDate!)} ${shortDate(m.playDate!)}`; }
  time(m: MatchView) { return hhmm(m.startTime); }
  score(m: MatchView) { return (m.score ?? []).map(s => `${s[0]}-${s[1]}`).join(' '); }
}

function norm(s: string) { return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim(); }
