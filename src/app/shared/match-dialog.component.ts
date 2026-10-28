import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { Board, BoardPair, MatchView } from '../core/models';
import { dayName, hhmm, shortDate } from '../core/format';

/** Ventana del organizador para un partido: resultado (avanza el cuadro) y pista/hora. */
@Component({
  selector: 'mp-match-dialog',
  imports: [FormsModule],
  template: `
    <div class="backdrop" (click)="closed.emit(false)">
      <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div>
            <h3>P{{ m().number }} <span class="muted small">{{ m().roundName }}</span></h3>
            <div class="small muted">{{ categoryName() }}</div>
          </div>
          <button class="icon-btn" (click)="closed.emit(false)" aria-label="Cerrar">✕</button>
        </div>
        <div class="seg" style="margin-bottom:18px">
          <button [class.on]="tab() === 'result'" (click)="tab.set('result')">Resultado</button>
          <button [class.on]="tab() === 'schedule'" (click)="tab.set('schedule')">Pista y hora</button>
        </div>

        @if (tab() === 'result') {
          @if (!p1() || !p2()) {
            <div class="notice">Todavía no se conocen las dos parejas de este partido.</div>
          } @else {
            <div style="margin-bottom:14px"><label class="switch"><input type="checkbox" [(ngModel)]="walkover"> Victoria por W.O. (no presentado)</label></div>
            @if (walkover) {
              <div class="stack">
                <label class="check"><input type="radio" name="wo" [value]="p1()!.id" [(ngModel)]="woWinner"> Gana {{ label(p1()) }}</label>
                <label class="check"><input type="radio" name="wo" [value]="p2()!.id" [(ngModel)]="woWinner"> Gana {{ label(p2()) }}</label>
              </div>
            } @else {
              <table class="score">
                <thead><tr><th></th><th>Set 1</th><th>Set 2</th><th>Super TB</th></tr></thead>
                <tbody>
                  <tr>
                    <td class="pn">{{ label(p1()) }}</td>
                    @for (i of [0, 1, 2]; track i) { <td><input type="number" min="0" max="30" inputmode="numeric" [(ngModel)]="sets[i][0]" [attr.aria-label]="'Set ' + (i + 1) + ' pareja 1'"></td> }
                  </tr>
                  <tr>
                    <td class="pn">{{ label(p2()) }}</td>
                    @for (i of [0, 1, 2]; track i) { <td><input type="number" min="0" max="30" inputmode="numeric" [(ngModel)]="sets[i][1]" [attr.aria-label]="'Set ' + (i + 1) + ' pareja 2'"></td> }
                  </tr>
                </tbody>
              </table>
              <p class="tiny muted" style="margin-top:8px">Deja el super tie-break vacío si el partido acabó en dos sets.</p>
            }
            <div class="modal-foot">
              @if (m().status === 'PLAYED' || m().status === 'WALKOVER') {
                <button class="btn danger" (click)="clear()" [disabled]="busy()">Borrar resultado</button>
              }
              <span class="spacer"></span>
              <button class="btn ghost" (click)="closed.emit(false)">Cancelar</button>
              <button class="btn" (click)="saveResult()" [disabled]="busy()">Guardar resultado</button>
            </div>
          }
        } @else {
          <div class="grid-3">
            <label class="field"><span>Día</span>
              <select [(ngModel)]="date">
                <option [ngValue]="null">Sin horario</option>
                @for (d of board().tournament.days; track d.playDate) { <option [ngValue]="d.playDate">{{ dayLabel(d.playDate) }}</option> }
              </select>
            </label>
            <label class="field"><span>Hora</span><input type="time" step="300" [(ngModel)]="time"></label>
            <label class="field"><span>Pista</span>
              <select [(ngModel)]="court">
                @for (c of board().courts; track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
              </select>
            </label>
          </div>
          <div style="margin-top:14px"><label class="switch"><input type="checkbox" [(ngModel)]="locked"> Fijar este horario (no lo cambia "Reprogramar")</label></div>
          @if (m().warning) { <div class="notice warn" style="margin-top:14px">{{ m().warning }}</div> }
          <div class="modal-foot">
            <button class="btn ghost" (click)="closed.emit(false)">Cancelar</button>
            <button class="btn" (click)="saveSchedule()" [disabled]="busy()">Guardar horario</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .score { width: 100%; border-collapse: collapse; }
    .score th { font-size: .8rem; color: var(--ink-2); font-weight: 600; padding: 4px; }
    .score td { padding: 4px; }
    .score td.pn { font-weight: 600; font-size: .9rem; width: 46%; }
    .score input { text-align: center; font: 700 1.2rem var(--display); padding: 6px; }
  `],
})
export class MatchDialogComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  m = input.required<MatchView>();
  board = input.required<Board>();
  closed = output<boolean>();

  tab = signal<'result' | 'schedule'>('result');
  busy = signal(false);
  sets: (number | null)[][] = [[null, null], [null, null], [null, null]];
  walkover = false;
  woWinner: string | null = null;
  date: string | null = null;
  time = '';
  court: string | null = null;
  locked = true;

  private cat = computed(() => this.board().categories.find(c => c.matches.some(x => x.id === this.m().id)));
  categoryName = computed(() => this.cat()?.category.name ?? '');
  private pairs = computed(() => new Map<string, BoardPair>((this.cat()?.pairs ?? []).map(p => [p.id, p])));
  p1 = computed(() => this.m().slot1.pairId ? this.pairs().get(this.m().slot1.pairId!) : undefined);
  p2 = computed(() => this.m().slot2.pairId ? this.pairs().get(this.m().slot2.pairId!) : undefined);

  ngOnInit() {
    const m = this.m();
    (m.score ?? []).forEach((s, i) => { if (i < 3) this.sets[i] = [s[0], s[1]]; });
    this.walkover = m.status === 'WALKOVER';
    this.woWinner = m.winnerPairId ?? null;
    this.date = m.playDate ?? null;
    this.time = hhmm(m.startTime) || '';
    this.court = m.courtId ?? this.board().courts[0]?.id ?? null;
    this.locked = m.locked || !m.playDate;
    if (!this.p1() || !this.p2()) this.tab.set('schedule');
  }

  label(p?: BoardPair) { return p ? `${p.player1} - ${p.player2}` : ''; }
  dayLabel(d: string) { return `${dayName(d)} ${shortDate(d)}`; }

  async saveResult() {
    let body: { sets?: number[][]; walkover: boolean; winnerPairId?: string };
    if (this.walkover) {
      if (!this.woWinner) { this.toast.error('Elige qué pareja gana por W.O.'); return; }
      body = { walkover: true, winnerPairId: this.woWinner };
    } else {
      const sets = this.sets.filter(s => s[0] !== null && s[0] !== undefined && s[1] !== null && s[1] !== undefined && (s[0] as unknown) !== '' && (s[1] as unknown) !== '')
        .map(s => [Number(s[0]), Number(s[1])]);
      body = { walkover: false, sets };
    }
    await this.run(() => this.api.saveResult(this.m().id, body), 'Resultado guardado');
  }

  async clear() {
    if (!confirm('¿Borrar el resultado de este partido?')) return;
    await this.run(() => this.api.clearResult(this.m().id), 'Resultado borrado');
  }

  async saveSchedule() {
    const empty = !this.date || !this.time || !this.court;
    await this.run(() => this.api.scheduleMatch(this.m().id, empty
      ? { courtId: null, playDate: null, startTime: null, locked: false }
      : { courtId: this.court, playDate: this.date, startTime: this.time, locked: this.locked }), 'Horario guardado');
  }

  private async run(fn: () => Promise<unknown>, ok: string) {
    this.busy.set(true);
    try { await fn(); this.toast.ok(ok); this.closed.emit(true); }
    catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }
}
