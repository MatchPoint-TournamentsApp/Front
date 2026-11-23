import { LoadingComponent } from './loading.component';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { UnpaidCheckService } from '../core/unpaid-check.service';
import { ConfirmService } from '../core/confirm.service';
import { Board, BoardPair, MatchFormat, MatchView, PairView, Player, Unavailability } from '../core/models';
import { dayName, hhmm, MATCH_FORMAT_LABEL, shortDate } from '../core/format';
import { crossesMidnight, isLate } from '../core/playtime';

/**
 * Ventana del organizador para un partido: pista (se elige al empezar a jugarlo),
 * resultado (avanza el cuadro), día/hora e información de contacto de las dos parejas.
 */
@Component({
  selector: 'mp-match-dialog',
  imports: [LoadingComponent, FormsModule],
  template: `
    <div class="backdrop" (click)="closed.emit(formatChanged)">
      <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div>
            <h3>P{{ m().number }} <span class="muted small">{{ m().roundName }}</span></h3>
            <div class="small muted">{{ categoryName() }}@if (m().playDate) { · {{ dayLabel(m().playDate!) }} {{ hhmm(m().startTime) }}@if (lateMatch()) { (madrugada)} }@if (m().note) { · <span class="mnote"><span>{{ m().note }}</span></span> }</div>
          </div>
          <button class="icon-btn" (click)="closed.emit(formatChanged)" aria-label="Cerrar">✕</button>
        </div>

        @if (m().warning) {
          <div class="notice warn conflict-note">
            <span>{{ m().warning }}</span>
            <button class="btn ghost sm" (click)="conflicts.emit(m().id)">Ver parejas con problemas</button>
          </div>
        }
        @if (m().status === 'PENDING' && p1() && p2()) {
          <div class="court-box" [class.on]="m().live">
            @if (m().live) {
              <div class="row-c">
                <span class="live">En juego · {{ m().courtName }}</span>
                @if (m().startTime) { <span class="tiny muted">previsto a las {{ hhmm(m().startTime) }}</span> }
                @if (m().startedAt) { <span class="tiny muted">desde las {{ since() }}</span> }
              </div>
              <div class="row-c">
                <select [(ngModel)]="court" aria-label="Cambiar de pista">
                  @for (c of courts(); track c.id) { <option [ngValue]="c.id" [disabled]="c.busy && c.id !== m().courtId">{{ c.name }}{{ c.busy && c.id !== m().courtId ? ' (ocupada)' : '' }}</option> }
                </select>
                <button class="btn ghost sm" (click)="start()" [disabled]="busy() || court === m().courtId">Cambiar pista</button>
                <button class="btn danger sm" (click)="stop()" [disabled]="busy()">Quitar de pista</button>
              </div>
            } @else {
              <div class="row-c">
                <b class="small">¿Empieza ahora?</b>
                <select [(ngModel)]="court" aria-label="Pista">
                  @for (c of courts(); track c.id) { <option [ngValue]="c.id" [disabled]="c.busy">{{ c.name }}{{ c.busy ? ' (ocupada)' : '' }}</option> }
                </select>
                <button class="btn sm" (click)="start()" [disabled]="busy() || !court">Empezar partido</button>
              </div>
              @if (!freeCourts()) { <p class="tiny muted" style="margin:6px 0 0">Todas las pistas están ocupadas: mete el resultado de un partido en juego para liberar la suya.</p> }
            }
          </div>
        } @else if (m().courtName && m().status !== 'PENDING') {
          <p class="small muted" style="margin:0 0 14px">Jugado en {{ m().courtName }}.</p>
        }

        <div class="note-box">
          <label class="field"><span>Comentario</span>
            <div class="row-c">
              <input type="text" maxlength="60" list="mp-match-notes" [(ngModel)]="note" placeholder="Ej.: Sede Norte" aria-describedby="note-help">
              <button class="btn ghost sm" (click)="saveNote()" [disabled]="busy() || note.trim() === (m().note ?? '')">Guardar comentario</button>
            </div>
          </label>
          <datalist id="mp-match-notes">@for (n of usedNotes(); track n) { <option [value]="n"></option> }</datalist>
          <p id="note-help" class="tiny muted" style="margin:6px 0 0">Lo verán los jugadores junto a la hora del partido. Déjalo vacío para quitarlo.</p>
        </div>
        <div class="seg" style="margin-bottom:18px">
          <button [class.on]="tab() === 'result'" (click)="tab.set('result')">Resultado</button>
          <button [class.on]="tab() === 'schedule'" (click)="tab.set('schedule')">Día y hora</button>
          <button [class.on]="tab() === 'info'" (click)="openInfo()">Información</button>
        </div>

        @if (tab() === 'info') {
          @if (infoLoading()) { <mp-loading text="Cargando datos de las parejas…" [inline]="true" /> }
          @else {
            <div class="info">
              @for (slot of [m().slot1, m().slot2]; track $index) {
                <section class="pair-info">
                  @if (slot.pairId && info().get(slot.pairId); as pv) {
                    @for (pl of [pv.player1, pv.player2]; track pl.id) {
                      <div class="player">
                        <b>{{ pl.fullName }}</b>
                        @if (pl.phone) {
                          <div class="row-c contact">
                            <span class="num">{{ pl.phone }}</span>
                            <a class="btn sm" [href]="'tel:' + digits(pl.phone)">Llamar</a>
                            <a class="btn ghost sm" [href]="whatsapp(pl)" target="_blank" rel="noopener">WhatsApp</a>
                          </div>
                        } @else { <span class="tiny muted">Sin teléfono</span> }
                        @if (pl.email) { <a class="small" [href]="'mailto:' + pl.email">{{ pl.email }}</a> }
                      </div>
                    }
                    @if (pv.notes) { <p class="small notes"><b>Comentarios:</b> {{ pv.notes }}</p> }
                    @if (pv.unavailabilities.length) {
                      <p class="small muted notes"><b>No pueden:</b> {{ unavText(pv.unavailabilities) }}</p>
                    }
                  } @else {
                    <span class="muted small">{{ slot.placeholder || 'Pareja por decidir' }}</span>
                  }
                </section>
              }
            </div>
            <p class="tiny muted" style="margin:10px 0 0">Datos de contacto privados: solo los ve el club. Se editan en la pestaña «Parejas».</p>
          }
        } @else if (tab() === 'result') {
          <div class="format-row">
              <label class="field"><span>Formato de este partido</span>
                <select [ngModel]="format() ?? ''" (ngModelChange)="setFormat($event)" [disabled]="busy()" aria-label="Formato de este partido">
                  <option value="">Como el torneo ({{ formatLabel(tournamentFormat()) }})</option>
                  <option value="SUPER_TIEBREAK">2 sets + super tie-break</option>
                  <option value="THREE_SETS">3 sets</option>
                </select></label>
            </div>
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
                <thead><tr><th></th><th>Set 1</th><th>Set 2</th><th>{{ threeSets() ? 'Set 3' : 'Super TB' }}</th></tr></thead>
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
              <p class="tiny muted" style="margin-top:8px">{{ threeSets() ? 'Deja el set 3 vacío si el partido acabó en dos sets.' : 'Deja el super tie-break vacío si el partido acabó en dos sets.' }}</p>
            }
            <div class="modal-foot">
              @if (m().status === 'PLAYED' || m().status === 'WALKOVER') {
                <button class="btn danger" (click)="clear()" [disabled]="busy()">Borrar resultado</button>
              }
              <span class="spacer"></span>
              <button class="btn ghost" (click)="closed.emit(formatChanged)">Cancelar</button>
              <button class="btn" (click)="saveResult()" [disabled]="busy()">Guardar resultado</button>
            </div>
          }
        } @else {
          <div class="grid-2">
            <label class="field"><span>Día</span>
              <select [(ngModel)]="date" (ngModelChange)="warnings.set(null)">
                <option [ngValue]="null">Sin horario</option>
                @for (d of board().tournament.days; track d.playDate) { <option [ngValue]="d.playDate">{{ dayLabel(d.playDate) }}</option> }
              </select>
            </label>
            <label class="field"><span>Hora</span><input type="time" step="300" [(ngModel)]="time" (ngModelChange)="warnings.set(null)"></label>
          </div>
          @if (lateDay(); as ld) {
            <p class="tiny muted" style="margin:8px 0 0">Ese día se juega de {{ hhmm(ld.startTime) }} a {{ hhmm(ld.endTime) }} de la madrugada:
              para un partido de madrugada elige este mismo día y la hora (por ejemplo, 00:30).</p>
          }
          <p class="tiny muted" style="margin:8px 0 0">La pista se elige cuando el partido empieza.</p>
          <div style="margin-top:14px"><label class="switch"><input type="checkbox" [(ngModel)]="locked"> Fijar este horario (no lo cambia "Reprogramar")</label></div>
          @if (warnings(); as w) {
            <div class="notice warn" style="margin-top:14px">
              <b>Este horario tiene avisos:</b>
              <ul>@for (x of w; track x) { <li>{{ x }}</li> }</ul>
              Puede retrasar el torneo. ¿Quieres guardarlo igualmente?
            </div>
            <div class="modal-foot">
              <button class="btn ghost" (click)="warnings.set(null)">Cancelar</button>
              <button class="btn" (click)="saveSchedule(true)" [disabled]="busy()">Continuar</button>
            </div>
          } @else {
            @if (m().warning) { <div class="notice warn" style="margin-top:14px">{{ m().warning }}</div> }
            <div class="modal-foot">
              <button class="btn ghost" (click)="closed.emit(formatChanged)">Cancelar</button>
              <button class="btn" (click)="saveSchedule()" [disabled]="busy()">Guardar horario</button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .format-row { margin-bottom: 12px; }
    .format-row .field { max-width: 320px; }
    .score { width: 100%; border-collapse: collapse; }
    .score th { font-size: .8rem; color: var(--ink-2); font-weight: 600; padding: 4px; }
    .score td { padding: 4px; }
    .score td.pn { font-weight: 600; font-size: .9rem; width: 46%; }
    .score input { text-align: center; font: 700 1.2rem var(--display); padding: 6px; }
    .court-box { border: 1px solid var(--rule); border-radius: var(--r-md); padding: 12px 14px; margin-bottom: 16px; background: var(--glass); }
    .court-box.on { border-color: #f1cdc5; border-left: 3px solid var(--live); background: #fff4f2; }
    .row-c { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .row-c + .row-c { margin-top: 10px; }
    .row-c select { width: auto; min-width: 130px; flex: 1; max-width: 220px; }
    ul { margin: 6px 0; padding-left: 18px; }
    .conflict-note { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 14px; }
    .note-box { padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px solid var(--rule-2); }
    .note-box .row-c input { flex: 1; min-width: 160px; }
    .info { display: grid; gap: 12px; }
    .pair-info { border: 1px solid var(--rule); border-radius: var(--r-md); padding: 12px 14px; display: grid; gap: 12px; }
    .player { display: grid; gap: 4px; }
    .player + .player { border-top: 1px solid var(--rule-2); padding-top: 10px; }
    .contact .num { font-family: var(--display); font-size: 1.05rem; min-width: 120px; }
    .notes { margin: 0; max-width: none; }
  `],
})
export class MatchDialogComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private unpaid = inject(UnpaidCheckService);

  m = input.required<MatchView>();
  board = input.required<Board>();
  closed = output<boolean>();
  /** Abrir las parejas con problemas de este partido. */
  conflicts = output<string>();

  tab = signal<'result' | 'schedule' | 'info'>('result');
  /** Datos completos de las parejas de la categoría (nombre, teléfono, email), cargados al abrir «Información». */
  info = signal(new Map<string, PairView>());
  infoLoading = signal(false);
  private infoLoaded = false;
  busy = signal(false);
  /** Avisos del horario elegido, pendientes de que el club confirme. */
  warnings = signal<string[] | null>(null);
  hhmm = hhmm;
  sets: (number | null)[][] = [[null, null], [null, null], [null, null]];
  walkover = false;
  woWinner: string | null = null;
  date: string | null = null;
  time = '';
  court: string | null = null;
  locked = true;
  note = '';
  /** Formato propio del partido (null = el del torneo). Se guarda al elegirlo, sin cerrar la ventana. */
  format = signal<MatchFormat | null>(null);
  formatChanged = false;
  tournamentFormat = computed<MatchFormat>(() => this.board().tournament.matchFormat ?? 'SUPER_TIEBREAK');
  threeSets = computed(() => (this.format() ?? this.tournamentFormat()) === 'THREE_SETS');
  formatLabel(f: MatchFormat) { return MATCH_FORMAT_LABEL[f]; }

  private cat = computed(() => this.board().categories.find(c => c.matches.some(x => x.id === this.m().id)));
  categoryName = computed(() => this.cat()?.category.name ?? '');
  private pairs = computed(() => new Map<string, BoardPair>((this.cat()?.pairs ?? []).map(p => [p.id, p])));
  p1 = computed(() => this.m().slot1.pairId ? this.pairs().get(this.m().slot1.pairId!) : undefined);
  p2 = computed(() => this.m().slot2.pairId ? this.pairs().get(this.m().slot2.pairId!) : undefined);

  /** Pistas del torneo, marcando las que ya tienen un partido en juego. */
  courts = computed(() => {
    const busy = new Set(this.board().categories.flatMap(c => c.matches).filter(x => x.live && x.courtId).map(x => x.courtId!));
    return this.board().courts.filter(c => c.active).map(c => ({ id: c.id, name: c.name, busy: busy.has(c.id) }));
  });
  freeCourts = computed(() => this.courts().filter(c => !c.busy).length);
  since = computed(() => {
    const s = this.m().startedAt;
    return s ? new Date(s).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }) : '';
  });

  ngOnInit() {
    const m = this.m();
    (m.score ?? []).forEach((s, i) => { if (i < 3) this.sets[i] = [s[0], s[1]]; });
    this.walkover = m.status === 'WALKOVER';
    this.woWinner = m.winnerPairId ?? null;
    this.date = m.playDate ?? null;
    this.time = hhmm(m.startTime) || '';
    this.court = m.courtId ?? this.courts().find(c => !c.busy)?.id ?? null;
    this.locked = m.locked || !m.playDate;
    this.note = m.note ?? '';
    this.format.set(m.matchFormat ?? null);
    if (!this.p1() || !this.p2()) this.tab.set('schedule');
  }

  /** Pestaña «Información»: carga una vez las parejas de la categoría con sus datos de contacto. */
  async openInfo() {
    this.tab.set('info');
    const catId = this.cat()?.category.id;
    if (this.infoLoaded || !catId) return;
    this.infoLoading.set(true);
    try {
      const list = await this.api.pairs(catId);
      this.info.set(new Map(list.map(p => [p.id, p])));
      this.infoLoaded = true;
    } catch (e) { this.toast.error(e); }
    finally { this.infoLoading.set(false); }
  }

  digits(phone: string) { return phone.replace(/[^\d+]/g, ''); }
  whatsapp(pl: Player) {
    const when = this.m().playDate ? ` (${this.dayLabel(this.m().playDate!)} a las ${hhmm(this.m().startTime)})` : '';
    const text = `Hola ${pl.fullName.split(' ')[0]}, te escribimos del torneo «${this.board().tournament.name}» por vuestro partido de ${this.categoryName()}${when}.`;
    return `https://wa.me/${this.digits(pl.phone!).replace('+', '')}?text=${encodeURIComponent(text)}`;
  }
  /** «Viernes 13 nov: hasta las 10:00 · Sábado 14 nov: todo el día». */
  unavText(list: Unavailability[]) {
    return list.map(u => {
      const d = this.dayLabel(u.playDate);
      if (!u.fromTime && !u.toTime) return `${d}: todo el día`;
      if (!u.fromTime) return `${d}: hasta las ${hhmm(u.toTime)}`;
      if (!u.toTime) return `${d}: desde las ${hhmm(u.fromTime)}`;
      return `${d}: de ${hhmm(u.fromTime)} a ${hhmm(u.toTime)}`;
    }).join(' · ');
  }

  label(p?: BoardPair) { return p ? `${p.player1} - ${p.player2}` : ''; }
  dayLabel(d: string) { return `${dayName(d)} ${shortDate(d)}`; }
  /** El partido es de la madrugada de su día (el día cruza medianoche). */
  lateMatch() { return isLate(this.board().tournament.days.find(d => d.playDate === this.m().playDate), this.m().startTime); }
  /** Día elegido en «Día y hora» si termina de madrugada. */
  lateDay() {
    const d = this.board().tournament.days.find(x => x.playDate === this.date);
    return d && crossesMidnight(d.startTime, d.endTime) ? d : null;
  }

  /** Comentarios ya usados en el torneo (sugerencias al escribir). */
  usedNotes = computed(() => [...new Set(this.board().categories.flatMap(c => c.matches).map(x => x.note).filter((n): n is string => !!n))].sort());

  /** Cambia el formato del partido sin cerrar la ventana (para meter después el resultado). */
  async setFormat(v: string) {
    const f = (v || null) as MatchFormat | null;
    const prev = this.format();
    this.format.set(f);
    this.busy.set(true);
    try {
      await this.api.setMatchFormat(this.m().id, f);
      this.formatChanged = true;
      this.toast.ok(f ? `P${this.m().number}: ${this.formatLabel(f)}` : `P${this.m().number}: como el torneo`);
    } catch (e) { this.format.set(prev); this.toast.error(e); }
    finally { this.busy.set(false); }
  }

  async saveNote() {
    const note = this.note.trim();
    await this.run(() => this.api.setMatchNote(this.m().id, note), note ? 'Comentario guardado' : 'Comentario quitado');
  }

  async start() {
    if (!this.court) return;
    if (!(await this.unpaid.okToStart(this.board().tournament.id, [this.m().slot1.pairId, this.m().slot2.pairId]))) return;
    const name = this.courts().find(c => c.id === this.court)?.name ?? 'la pista';
    await this.run(() => this.api.startMatch(this.m().id, this.court!), `P${this.m().number} en juego en ${name}`);
  }

  async stop() {
    await this.run(() => this.api.stopMatch(this.m().id), 'Partido quitado de la pista');
  }

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
    if (!(await this.confirm.ask({ title: '¿Borrar el resultado de este partido?',
      message: 'Si el ganador ya había avanzado, se quitará de su siguiente partido.', ok: 'Borrar resultado', danger: true }))) return;
    await this.run(() => this.api.clearResult(this.m().id), 'Resultado borrado');
  }

  /** Guarda día y hora. Si hay avisos (más partidos que pistas, pareja no disponible…) pide confirmación. */
  async saveSchedule(confirmed = false) {
    const empty = !this.date || !this.time;
    if (empty) {
      await this.run(() => this.api.scheduleMatch(this.m().id, { playDate: null, startTime: null, locked: false }), 'Horario quitado');
      return;
    }
    if (!confirmed) {
      this.busy.set(true);
      try {
        const w = await this.api.previewSchedule(this.m().id, { playDate: this.date!, startTime: this.time });
        if (w.length) { this.warnings.set(w); return; }
      } catch (e) { this.toast.error(e); return; }
      finally { this.busy.set(false); }
    }
    await this.run(() => this.api.scheduleMatch(this.m().id, { playDate: this.date, startTime: this.time, locked: this.locked }), 'Horario guardado');
  }

  private async run(fn: () => Promise<unknown>, ok: string) {
    this.busy.set(true);
    try { await fn(); this.toast.ok(ok); this.closed.emit(true); }
    catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }
}
