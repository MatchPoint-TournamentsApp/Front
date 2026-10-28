import { Component, computed, input, output, signal } from '@angular/core';
import { Board, BoardPair, MatchView } from '../core/models';
import { categoryColor, dayName, hhmm, shortDate } from '../core/format';

interface Item { m: MatchView; cat: string; color: string; p1: string; p2: string; }

/** Horario del torneo por día: filas = horas, columnas = pistas. */
@Component({
  selector: 'mp-schedule',
  template: `
    @if (!days().length) {
      <div class="empty"><h3>Aún no hay horarios</h3><p>Aparecerán aquí cuando se generen los cuadros.</p></div>
    } @else {
      <div class="seg">
        @for (d of days(); track d) {
          <button [class.on]="d === day()" (click)="selected.set(d)">{{ dayLabel(d) }}</button>
        }
      </div>
      <div class="table-wrap grid">
        <table>
          <thead><tr><th class="time"></th>@for (c of courts(); track c.id) { <th [class.center]="c.featured">{{ c.name }}</th> }</tr></thead>
          <tbody>
            @for (t of times(); track t) {
              <tr>
                <th class="time num">{{ t }}</th>
                @for (c of courts(); track c.id) {
                  <td>
                    @for (it of cell(t, c.id); track it.m.id) {
                      <button class="item" [class.done]="it.m.status === 'PLAYED' || it.m.status === 'WALKOVER'" [class.warn]="admin() && !!it.m.warning"
                              [style.border-left-color]="it.color" [disabled]="!admin()" (click)="matchClick.emit(it.m)">
                        <span class="cat" [style.color]="it.color">{{ it.cat }} <b>P{{ it.m.number }}</b></span>
                        <span class="vs">{{ it.p1 }}</span>
                        <span class="vs">{{ it.p2 }}</span>
                        <span class="round">{{ it.m.roundName }}</span>
                      </button>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (unscheduled().length && admin()) {
        <div class="notice warn" style="margin-top:14px">
          {{ unscheduled().length }} partidos sin horario. Pulsa sobre uno en el cuadro para asignarle pista y hora, o amplía el horario y reprograma.
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .grid { margin-top: 14px; background: #fff; border: 1px solid var(--rule); border-radius: 12px; }
    table { border-collapse: collapse; width: 100%; min-width: 640px; }
    th, td { border-bottom: 1px solid var(--rule-2); padding: 6px; vertical-align: top; }
    td + td, th + th { border-left: 1px solid var(--rule-2); }
    thead th { font: 700 15px var(--display); color: var(--court); text-transform: uppercase; padding: 10px 6px; text-align: left; }
    thead th.center::after { content: 'Central'; margin-left: 6px; font-size: 10px; background: var(--ball); color: var(--ink); padding: 1px 5px; border-radius: 3px; vertical-align: middle; }
    th.time { width: 64px; font-size: 16px; color: var(--ink-2); text-align: right; padding-right: 10px; }
    .item { display: flex; flex-direction: column; gap: 1px; width: 100%; text-align: left; background: var(--glass); border: 0; border-left: 4px solid; border-radius: 6px; padding: 6px 8px; font: inherit; cursor: pointer; color: var(--ink); }
    .item + .item { margin-top: 6px; }
    .item:disabled { cursor: default; opacity: 1; }
    .item.done { opacity: .6; }
    .item.warn { box-shadow: inset 0 0 0 1.5px var(--warn); }
    .cat { font: 700 12px var(--display); text-transform: uppercase; letter-spacing: .03em; }
    .vs { font-size: 12.5px; font-weight: 600; line-height: 1.25; }
    .round { font-size: 11px; color: var(--ink-3); }
  `],
})
export class ScheduleComponent {
  board = input.required<Board>();
  admin = input(false);
  matchClick = output<MatchView>();
  selected = signal<string | null>(null);

  private items = computed<Item[]>(() => {
    const out: Item[] = [];
    for (const cb of this.board().categories) {
      const pairs = new Map<string, BoardPair>(cb.pairs.map(p => [p.id, p]));
      const name = (s: MatchView['slot1']) => s.pairId ? fmt(pairs.get(s.pairId)) : s.empty ? '—' : (s.placeholder ?? '');
      for (const m of cb.matches) {
        if (m.status === 'BYE') continue;
        out.push({ m, cat: cb.category.name, color: categoryColor(cb.category), p1: name(m.slot1), p2: name(m.slot2) });
      }
    }
    return out;
  });

  days = computed(() => [...new Set(this.items().filter(i => i.m.playDate).map(i => i.m.playDate!))].sort());
  day = computed(() => this.selected() && this.days().includes(this.selected()!) ? this.selected()! : this.days()[0]);
  courts = computed(() => this.board().courts.filter(c => c.active));
  times = computed(() => [...new Set(this.items().filter(i => i.m.playDate === this.day()).map(i => hhmm(i.m.startTime)))].sort());
  unscheduled = computed(() => this.items().filter(i => !i.m.playDate));

  cell(t: string, courtId: string) {
    return this.items().filter(i => i.m.playDate === this.day() && hhmm(i.m.startTime) === t && i.m.courtId === courtId);
  }
  dayLabel(d: string) { return `${dayName(d)} ${shortDate(d)}`; }
}

function fmt(p?: BoardPair) { return p ? `${p.player1} - ${p.player2}` : '?'; }
