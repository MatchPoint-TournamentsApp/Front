import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { Board, BoardPair, MatchView, SlotView } from '../../core/models';
import { categoryColor, dayName, hhmm, pairLabel, shortDate } from '../../core/format';
import { ToastService } from '../../core/toast.service';

/** Partido con los datos ya resueltos para pintarlo. */
interface Row {
  m: MatchView; cat: string; color: string; p1: string; p2: string; ready: boolean;
}
interface Slot { key: string; date: string; time: string; rows: Row[]; }

/**
 * Panel del club durante el torneo: todas las pistas (libres u ocupadas) y los siguientes
 * partidos por hora, para empezarlos o meter el resultado sin buscar por categorías.
 */
@Component({
  selector: 'mp-courts-tab',
  template: `
    <section aria-labelledby="courts-title">
      <div class="head">
        <h2 id="courts-title">Pistas</h2>
        <span class="small muted">{{ free() }} libres de {{ courts().length }}</span>
      </div>
      <div class="courts">
        @for (c of courts(); track c.id) {
          @if (c.row; as r) {
            <button class="court busy" (click)="matchClick.emit(r.m)" [style.--cat]="r.color"
                    [attr.aria-label]="c.name + ', en juego: ' + r.p1 + ' contra ' + r.p2 + '. Pulsa para meter el resultado'">
              <span class="c-top"><b class="c-name">{{ c.name }}</b><span class="live">En juego</span></span>
              <span class="c-cat">{{ r.cat }}@if (r.m.roundName) { · {{ r.m.roundName }} }</span>
              <span class="c-pair">{{ r.p1 }}</span>
              <span class="c-vs">contra</span>
              <span class="c-pair">{{ r.p2 }}</span>
              <span class="c-foot">
                @if (since(r.m); as s) { <span class="tiny muted">Desde las {{ s }}</span> }
                <span class="c-action">Resultado →</span>
              </span>
            </button>
          } @else {
            <div class="court free">
              <b class="c-name">{{ c.name }}</b>
              <span class="c-free">Libre</span>
            </div>
          }
        }
      </div>
    </section>

    <section aria-labelledby="next-title" class="next">
      <div class="head">
        <h2 id="next-title">Siguientes partidos</h2>
      </div>
      @for (s of shown(); track s.key) {
        <div class="slot">
          <div class="when">
            <span class="time num">{{ s.time }}</span>
            @if (s.date !== today()) { <span class="tiny muted">{{ dayLabel(s.date) }}</span> }
          </div>
          <div class="rows">
            @for (r of s.rows; track r.m.id) {
              <div class="row-m" [class.wait]="!r.ready" [style.--cat]="r.color">
                <div class="info">
                  <span class="cat">{{ r.cat }}@if (r.m.roundName) { <span class="muted"> · {{ r.m.roundName }}</span> }</span>
                  <span class="pairs"><span>{{ r.p1 }}</span> <span class="muted vs">contra</span> <span>{{ r.p2 }}</span></span>
                </div>
                <div class="act">
                  @if (!r.ready) {
                    <span class="tiny muted">Esperando parejas</span>
                  } @else if (choosing() === r.m.id) {
                    <div class="pick" role="group" [attr.aria-label]="'Elige pista para ' + r.p1 + ' contra ' + r.p2">
                      <span class="tiny muted">¿En qué pista?</span>
                      @for (c of freeCourts(); track c.id) {
                        <button class="btn ghost sm court-btn" (click)="start(r, c.id, c.name)" [disabled]="busy()">{{ c.name }}</button>
                      } @empty { <span class="tiny muted">No hay pistas libres</span> }
                      <button class="btn ghost sm" (click)="choosing.set(null)">Cancelar</button>
                    </div>
                  } @else {
                    <button class="btn sm" (click)="choosing.set(r.m.id)" [disabled]="!freeCourts().length">Empezar</button>
                    <button class="icon-btn" (click)="matchClick.emit(r.m)" [attr.aria-label]="'Más opciones: ' + r.p1 + ' contra ' + r.p2" title="Resultado, día y hora">⋯</button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      } @empty {
        <div class="empty"><h3>No quedan partidos por jugar</h3><p>Cuando haya partidos pendientes con día y hora aparecerán aquí.</p></div>
      }
      @if (slots().length > limit()) {
        <button class="btn ghost more" (click)="limit.set(limit() + 2)">Ver más horas</button>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 0 0 12px; }
    h2 { font-size: 1.15rem; margin: 0; }
    .courts { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(210px, 100%), 1fr)); gap: 12px; }
    .court { display: flex; flex-direction: column; gap: 3px; min-height: 92px; padding: 12px 14px; border-radius: var(--r-md);
      border: 1px solid var(--rule); background: #fff; text-align: left; font: inherit; color: var(--ink); }
    .court.free { background: #fbfaf7; align-items: flex-start; }
    .c-free { margin: auto 0; align-self: center; display: inline-flex; align-items: center; gap: 6px; font-weight: 600;
      font-size: .82rem; letter-spacing: .08em; text-transform: uppercase; color: var(--ok); }
    .c-free::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--ok); }
    .court.busy { cursor: pointer; border-color: #f1cdc5; border-left: 4px solid var(--live); background: #fff7f5;
      box-shadow: var(--shadow); transition: transform .12s, box-shadow .12s; }
    .court.busy:hover { transform: translateY(-1px); box-shadow: 0 0 0 3px rgba(225, 45, 45, .14), var(--shadow); }
    .court.busy:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
    .c-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .c-name { font: 600 1.05rem var(--display); letter-spacing: .02em; }
    .c-top .live { font-size: .72rem; }
    .c-cat { font: 600 .74rem var(--display); text-transform: uppercase; letter-spacing: .05em; color: var(--cat); }
    .c-pair { font-weight: 600; font-size: .9rem; line-height: 1.25; }
    .c-vs { font-size: .72rem; color: var(--ink-3); }
    .c-foot { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 6px; }
    .c-action { font-size: .8rem; font-weight: 600; color: var(--danger); }

    .next { margin-top: 32px; }
    .slot { display: grid; grid-template-columns: 76px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--rule); }
    .when { display: flex; flex-direction: column; align-items: flex-end; padding-top: 10px; }
    .time { font: 500 1.35rem var(--display); color: var(--ink); }
    .rows { display: flex; flex-direction: column; gap: 8px; }
    .row-m { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 12px; background: #fff;
      border: 1px solid var(--rule); border-left: 4px solid var(--cat); border-radius: var(--r-md); }
    .row-m.wait { opacity: .6; }
    .info { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 2px; }
    .cat { font: 600 .76rem var(--display); text-transform: uppercase; letter-spacing: .05em; color: var(--cat); }
    .cat .muted { text-transform: none; letter-spacing: 0; font-family: var(--body); font-weight: 400; }
    .pairs { font-weight: 600; font-size: .92rem; line-height: 1.3; }
    .vs { font-weight: 400; margin: 0 4px; }
    .act { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .pick { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .court-btn { border-color: var(--ok); color: var(--ok); background: var(--ok-bg); }
    .court-btn:hover { background: var(--ok); color: #fff; }
    .more { margin-top: 14px; }
    @media (max-width: 560px) {
      .courts { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .court.free { min-height: 64px; }
      .court.busy { grid-column: span 2; }
      .slot { grid-template-columns: 1fr; gap: 6px; }
      .when { flex-direction: row; align-items: baseline; gap: 8px; padding-top: 0; }
      .act { width: 100%; }
      .act > .btn:first-child { flex: 1; }
    }
  `],
})
export class CourtsTabComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  board = input.required<Board>();
  /** Abre la ventana del partido (resultado, día y hora). */
  matchClick = output<MatchView>();
  /** Tras empezar un partido: recargar. */
  changed = output<void>();

  busy = signal(false);
  /** Partido para el que se está eligiendo pista. */
  choosing = signal<string | null>(null);
  /** Cuántas horas de "Siguientes partidos" se ven. */
  limit = signal(2);

  private rows = computed<Row[]>(() => {
    const out: Row[] = [];
    for (const cb of this.board().categories) {
      const pairs = new Map<string, BoardPair>(cb.pairs.map(p => [p.id, p]));
      const name = (s: SlotView) => s.pairId ? pairLabel(pairs.get(s.pairId)) : s.empty ? '—' : (s.placeholder ?? 'Por decidir');
      for (const m of cb.matches) {
        if (m.status !== 'PENDING') continue;
        out.push({ m, cat: cb.category.name, color: categoryColor(cb.category), p1: name(m.slot1), p2: name(m.slot2),
          ready: !!m.slot1.pairId && !!m.slot2.pairId });
      }
    }
    return out;
  });

  courts = computed(() => {
    const live = new Map(this.rows().filter(r => r.m.live && r.m.courtId).map(r => [r.m.courtId!, r]));
    return this.board().courts.filter(c => c.active)
      .map(c => ({ id: c.id, name: c.name, row: live.get(c.id) }));
  });
  freeCourts = computed(() => this.courts().filter(c => !c.row));
  free = computed(() => this.freeCourts().length);

  /** Partidos pendientes con día y hora que aún no están en pista, agrupados por hora. */
  slots = computed<Slot[]>(() => {
    const groups = new Map<string, Slot>();
    const pending = this.rows().filter(r => !r.m.live && r.m.playDate && r.m.startTime)
      .sort((a, b) => (a.m.playDate! + a.m.startTime!).localeCompare(b.m.playDate! + b.m.startTime!) || a.m.number - b.m.number);
    for (const r of pending) {
      const key = r.m.playDate + ' ' + hhmm(r.m.startTime);
      let g = groups.get(key);
      if (!g) groups.set(key, g = { key, date: r.m.playDate!, time: hhmm(r.m.startTime), rows: [] });
      g.rows.push(r);
    }
    return [...groups.values()];
  });
  shown = computed(() => this.slots().slice(0, this.limit()));
  today = computed(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date()));

  dayLabel(d: string) { return `${dayName(d)} ${shortDate(d)}`; }
  since(m: MatchView) {
    return m.startedAt ? new Date(m.startedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }) : '';
  }

  async start(r: Row, courtId: string, courtName: string) {
    this.busy.set(true);
    try {
      await this.api.startMatch(r.m.id, courtId);
      this.toast.ok(`${r.cat}: en juego en ${courtName}`);
      this.choosing.set(null);
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }
}
