import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { Board, BoardPair, MatchView } from '../core/models';
import { categoryColor, dayName, hhmm, shortDate } from '../core/format';

interface Item { m: MatchView; cat: string; color: string; p1: string; p2: string; }

/**
 * Horario del torneo por día y hora. La pista no se decide al generar: la elige el club al
 * empezar cada partido, y entonces aparece arriba en "En juego ahora".
 */
@Component({
  selector: 'mp-schedule',
  template: `
    @if (live().length) {
      <div class="now">
        <span class="live">En juego ahora</span>
        <div class="list">
          @for (it of live(); track it.m.id) { <ng-container [ngTemplateOutlet]="card" [ngTemplateOutletContext]="{ $implicit: it }" /> }
        </div>
      </div>
    }
    @if (!days().length) {
      <div class="empty"><h3>Aún no hay horarios</h3><p>Aparecerán aquí cuando se generen los cuadros.</p></div>
    } @else {
      <div class="seg">
        @for (d of days(); track d) {
          <button [class.on]="d === day()" (click)="selected.set(d)">{{ dayLabel(d) }}</button>
        }
      </div>
      <div class="hours">
        @for (t of times(); track t) {
          @let row = at(t);
          <div class="hour">
            <div class="time num">{{ t }}<span class="count" [class.over]="row.length > courts()">{{ row.length }}/{{ courts() }}</span></div>
            <div class="list">
              @for (it of row; track it.m.id) { <ng-container [ngTemplateOutlet]="card" [ngTemplateOutletContext]="{ $implicit: it }" /> }
            </div>
          </div>
        }
      </div>
      @if (unscheduled().length && admin()) {
        <div class="notice warn" style="margin-top:14px">
          {{ unscheduled().length }} partidos sin horario. Pulsa sobre uno en el cuadro para darle día y hora, o amplía el horario y reprograma.
        </div>
      }
    }

    <ng-template #card let-it>
      <button class="item" [class.done]="it.m.status === 'PLAYED' || it.m.status === 'WALKOVER'" [class.warn]="admin() && !!it.m.warning"
              [class.is-live]="it.m.live" [style.border-left-color]="it.color" [disabled]="!admin()" (click)="matchClick.emit(it.m)">
        <span class="top">
          <span class="cat" [style.color]="it.color">{{ it.cat }} <b>P{{ it.m.number }}</b></span>
          @if (it.m.live) { <span class="live">{{ it.m.courtName }}</span> }
          @else if (it.m.courtName) { <span class="court">{{ it.m.courtName }}</span> }
        </span>
        <span class="vs">{{ it.p1 }}</span>
        <span class="vs">{{ it.p2 }}</span>
        <span class="round">{{ it.m.roundName }}@if (it.m.live && it.m.playDate !== day()) { · {{ dayLabel(it.m.playDate) }} {{ hhmm(it.m.startTime) }} }</span>
      </button>
    </ng-template>
  `,
  imports: [NgTemplateOutlet],
  styles: [`
    :host { display: block; }
    .now { margin-bottom: 18px; padding: 14px; border: 1px solid #f1cdc5; border-left: 3px solid var(--live); border-radius: var(--r-lg); background: #fff; }
    .now > .live { font-size: 12px; margin-bottom: 10px; }
    .hours { margin-top: 14px; background: #fff; border: 1px solid var(--rule); border-radius: var(--r-lg); }
    .hour { display: grid; grid-template-columns: 72px 1fr; border-bottom: 1px solid var(--rule-2); }
    .hour:last-child { border-bottom: 0; }
    .time { padding: 10px 10px 10px 8px; font: 500 15px var(--display); color: var(--ink-2); text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .count { font: 500 10.5px var(--body); color: var(--ink-3); letter-spacing: .04em; }
    .count.over { color: var(--danger); font-weight: 700; }
    .list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(190px, 100%), 1fr)); gap: 6px; padding: 6px; }
    .item { display: flex; flex-direction: column; gap: 1px; width: 100%; text-align: left; background: var(--glass); border: 0; border-left: 3px solid; border-radius: 6px; padding: 6px 8px; font: inherit; cursor: pointer; color: var(--ink); transition: background .15s; }
    .item:not(:disabled):hover { background: var(--court-3); }
    .item:disabled { cursor: default; opacity: 1; }
    .item.done { opacity: .6; }
    .item.warn { box-shadow: inset 0 0 0 1.5px var(--warn); }
    .item.is-live { background: #fff4f2; box-shadow: inset 0 0 0 1.5px rgba(225, 45, 45, .45); }
    .top { display: flex; align-items: center; gap: 6px; justify-content: space-between; }
    .top .live, .top .court { font-size: 10.5px; }
    .top .court { color: var(--ink-2); font-weight: 600; }
    .cat { font: 600 12px var(--display); text-transform: uppercase; letter-spacing: .05em; }
    .vs { font-size: 12.5px; font-weight: 600; line-height: 1.25; }
    .round { font-size: 11px; color: var(--ink-3); }
    @media (max-width: 560px) { .hour { grid-template-columns: 52px 1fr; } }
  `],
})
export class ScheduleComponent {
  board = input.required<Board>();
  admin = input(false);
  matchClick = output<MatchView>();
  selected = signal<string | null>(null);
  hhmm = hhmm;

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

  private order = computed(() => new Map(this.board().courts.map(c => [c.id, c.position])));
  live = computed(() => this.items().filter(i => i.m.live)
    .sort((a, b) => (this.order().get(a.m.courtId!) ?? 0) - (this.order().get(b.m.courtId!) ?? 0)));
  days = computed(() => [...new Set(this.items().filter(i => i.m.playDate).map(i => i.m.playDate!))].sort());
  day = computed(() => this.selected() && this.days().includes(this.selected()!) ? this.selected()! : this.days()[0]);
  /** Pistas del torneo (el tablero ya trae solo las suyas). */
  courts = computed(() => this.board().courts.filter(c => c.active).length);
  times = computed(() => [...new Set(this.items().filter(i => i.m.playDate === this.day()).map(i => hhmm(i.m.startTime)))].sort());
  unscheduled = computed(() => this.items().filter(i => !i.m.playDate));

  at(t: string) {
    return this.items().filter(i => i.m.playDate === this.day() && hhmm(i.m.startTime) === t);
  }
  dayLabel(d?: string) { return d ? `${dayName(d)} ${shortDate(d)}` : ''; }
}

function fmt(p?: BoardPair) { return p ? `${p.player1} - ${p.player2}` : '?'; }
