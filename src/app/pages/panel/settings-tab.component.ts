import { LoadingComponent } from '../../shared/loading.component';
import { Component, OnChanges, OnDestroy, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FORM_KIT } from '../../shared/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Capacity, Club, CourtBand, Day, DurationBand, Tournament, TournamentRequest } from '../../core/models';
import { dayName, hhmm, shortDate } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { ConfirmService } from '../../core/confirm.service';

type Section = 'general' | 'days' | 'courts' | 'bands' | 'courtBands';
const SECTION_LABEL: Record<Section, string> = {
  general: 'Datos del torneo (duración del partido, descanso…)',
  days: 'Días y horario de juego',
  courts: 'Pistas del torneo',
  bands: 'Duración por franjas horarias',
  courtBands: 'Pistas por tramos horarios',
};

/** Ajustes del torneo: datos, días y franjas, pistas, inscripción y normas. */
@Component({
  selector: 'mp-settings-tab',
  imports: [LoadingComponent, FormsModule, FORM_KIT],
  template: `
    <div class="grid-2 top">
      <section class="panel stack">
        <h3>Inscripciones y visibilidad</h3>
        <label class="switch"><input type="checkbox" [(ngModel)]="f.registrationOpen" (change)="saveGeneral()"> Inscripción pública abierta</label>
        <small class="muted">Con la inscripción abierta, las parejas se apuntan desde el enlace del torneo. Llegan como pendientes y tú las confirmas.</small>
        <label class="switch"><input type="checkbox" [(ngModel)]="f.publicVisible" (change)="saveGeneral()"> Torneo visible para invitados</label>
        <label class="switch"><input type="checkbox" disabled [ngModel]="false"> Pago online de la inscripción</label>
        <small class="muted">Próximamente: cobrar la inscripción al apuntarse.</small>
      </section>
      <section class="panel stack">
        <h3>Pistas del torneo</h3>
        @if (club(); as c) {
          <div class="courts">
            @for (ct of c.courts; track ct.id) {
              <label class="check" [class.off]="!ct.active">
                <input type="checkbox" [checked]="courtIds.has(ct.id)" [disabled]="!ct.active" (change)="toggleCourt(ct.id); touch('courts')">
                {{ ct.name }} @if (ct.featured) { <span class="chip ball">Central</span> } @if (!ct.active) { <span class="tiny muted">(inactiva)</span> }
              </label>
            }
          </div>
          <div class="row"><button class="btn ghost sm" (click)="saveCourts()">Guardar pistas</button>@if (isDirty('courts')) { <span class="chip warn">Sin guardar</span> }</div>
        } @else { <mp-loading text="Cargando pistas…" [inline]="true" /> }
      </section>
    </div>

    <section class="panel">
      <h3>Días y horario de juego</h3>
      <p class="small muted">Franja en la que se pueden programar partidos cada día y cuántas pistas dedicas al torneo ese día. Los cuadros se generan dentro de estas franjas sin pasar de esas pistas.</p>
      <div class="days" (input)="touch('days')" (change)="touch('days')">
        <div class="drow head" aria-hidden="true"><span></span><span>Desde</span><span></span><span>Hasta</span><span>Pistas</span><span>Restricciones</span><span></span></div>
        @for (d of days; track d.playDate; let i = $index) {
          <div class="drow">
            <b>{{ label(d.playDate) }}</b>
            <input type="time" [(ngModel)]="d.startTime" [attr.aria-label]="'Inicio ' + d.playDate">
            <span class="muted">a</span>
            <input type="time" [(ngModel)]="d.endTime" [attr.aria-label]="'Fin ' + d.playDate">
            <select [(ngModel)]="d.courtCount" [attr.aria-label]="'Pistas el ' + label(d.playDate)">
              <option [ngValue]="null">Todas ({{ courtsTotal() }})</option>
              @for (n of courtOptions(); track n) { <option [ngValue]="n">{{ n }} {{ n === 1 ? 'pista' : 'pistas' }}</option> }
            </select>
            <label class="check allow" [title]="isLastAndFinals(i) ? 'Con semifinales y finales el último día, ese día no admite restricciones' : 'Las parejas pueden indicar a qué horas no pueden este día'">
              <input type="checkbox" [checked]="d.restrictionsAllowed !== false && !isLastAndFinals(i)" [disabled]="isLastAndFinals(i)"
                     (change)="d.restrictionsAllowed = $any($event.target).checked" [attr.aria-label]="'Admite restricciones el ' + label(d.playDate)">
              <span class="small">Admite</span>
            </label>
            <button class="icon-btn" (click)="removeDay(i); touch('days')" aria-label="Quitar día">✕</button>
          </div>
        }
      </div>
      <label class="switch finals" (change)="touch('days')">
        <input type="checkbox" [(ngModel)]="finalsLastDay"> Semifinales y finales el último día, sí o sí
      </label>
      <small class="muted finals-help">Todas las semifinales y finales (también de consolación y el 3.º/4.º puesto) se jugarán el último día. Ese día
        no admite restricciones de las parejas; el resto de partidos intentará no ocuparlo.</small>
      <div class="row" style="margin-top:12px"><button class="btn ghost sm" (click)="saveDays()">Guardar horario</button>@if (isDirty('days')) { <span class="chip warn">Sin guardar</span> }</div>

      <details class="adv" [open]="bands.length > 0 || isDirty('bands')">
        <summary>
          <span>Duración avanzada por franjas horarias</span>
          <span class="small muted">@if (savedBands()) { {{ savedBands() }} {{ savedBands() === 1 ? 'franja' : 'franjas' }} con otra duración } @else { Opcional: todo el torneo usa {{ t().matchDurationMinutes }} min }</span>
        </summary>
        <p class="small muted">Por ejemplo, el viernes de 16:00 a 19:00 partidos de 45 min y de 19:00 a 23:59 de 60 min. Los partidos que
          <b>empiezan</b> dentro de una franja duran lo que diga la franja, también en categorías con duración propia.
          Fuera de las franjas se usa la duración general (o la de la categoría).</p>
        <div class="bands" (input)="touch('bands')" (change)="touch('bands')">
          @if (bands.length) {
            <div class="brow head" aria-hidden="true"><span>Día</span><span>Desde</span><span></span><span>Hasta</span><span>Duración</span><span></span></div>
          }
          @for (b of bands; track $index; let i = $index) {
            <div class="brow">
              <select [(ngModel)]="b.playDate" aria-label="Día de la franja">
                @for (d of t().days; track d.playDate) { <option [ngValue]="d.playDate">{{ label(d.playDate) }}</option> }
              </select>
              <input type="time" [(ngModel)]="b.fromTime" aria-label="Desde">
              <span class="muted">a</span>
              <input type="time" [(ngModel)]="b.toTime" aria-label="Hasta">
              <span class="mins"><input type="number" min="30" max="240" step="5" [(ngModel)]="b.minutes" aria-label="Duración en minutos"> min</span>
              <button class="icon-btn" (click)="removeBand(i)" aria-label="Quitar franja">✕</button>
            </div>
          }
        </div>
        <div class="row" style="margin-top:12px">
          <button class="btn ghost sm" (click)="addBand()" [disabled]="!t().days.length">+ Añadir franja</button>
          <button class="btn ghost sm" (click)="saveBands()">Guardar franjas</button>
          @if (isDirty('bands')) { <span class="chip warn">Sin guardar</span> }
        </div>
      </details>

      <details class="adv" [open]="courtBands.length > 0 || isDirty('courtBands')">
        <summary>
          <span>Pistas por tramos horarios</span>
          <span class="small muted">@if (savedCourtBands()) { {{ savedCourtBands() }} {{ savedCourtBands() === 1 ? 'tramo' : 'tramos' }} con otro número de pistas } @else { Opcional: cada día usa el número de pistas de arriba }</span>
        </summary>
        <p class="small muted">Por ejemplo, el viernes de 20:00 a 23:59 solo 5 pistas para el torneo. Dentro de un tramo, el horario no pondrá
          más partidos a la vez que esas pistas (tampoco partidos que empiecen antes y sigan en juego). Fuera de los tramos se usa el número
          de pistas del día. En el panel de control seguirás teniendo todas las pistas para elegir.</p>
        <div class="bands" (input)="touch('courtBands')" (change)="touch('courtBands')">
          @if (courtBands.length) {
            <div class="brow head" aria-hidden="true"><span>Día</span><span>Desde</span><span></span><span>Hasta</span><span>Pistas</span><span></span></div>
          }
          @for (b of courtBands; track $index; let i = $index) {
            <div class="brow">
              <select [(ngModel)]="b.playDate" aria-label="Día del tramo">
                @for (d of t().days; track d.playDate) { <option [ngValue]="d.playDate">{{ label(d.playDate) }}</option> }
              </select>
              <input type="time" [(ngModel)]="b.fromTime" aria-label="Desde">
              <span class="muted">a</span>
              <input type="time" [(ngModel)]="b.toTime" aria-label="Hasta">
              <select [(ngModel)]="b.courts" aria-label="Pistas en el tramo">
                @for (n of allCourtOptions(); track n) { <option [ngValue]="n">{{ n }} {{ n === 1 ? 'pista' : 'pistas' }}</option> }
              </select>
              <button class="icon-btn" (click)="removeCourtBand(i)" aria-label="Quitar tramo">✕</button>
            </div>
          }
        </div>
        <div class="row" style="margin-top:12px">
          <button class="btn ghost sm" (click)="addCourtBand()" [disabled]="!t().days.length || !courtsTotal()">+ Añadir tramo</button>
          <button class="btn ghost sm" (click)="saveCourtBands()">Guardar tramos</button>
          @if (isDirty('courtBands')) { <span class="chip warn">Sin guardar</span> }
        </div>
      </details>

      @if (capacity(); as cap) {
        @if (cap.matches > 0) {
          <div class="capacity" [class.bad]="!cap.ok" [class.tight]="cap.tight">
            <div class="cap-head">
              <b>@if (!cap.ok) { Configuración no válida: no caben todos los partidos } @else if (cap.tight) { Caben, pero muy justo } @else { Caben todos los partidos }</b>
              <span class="small">{{ cap.matches }} partidos · caben como máximo {{ cap.maxMatches }}</span>
            </div>
            @if (cap.lastDayMatches != null) {
              <div class="small">Último día: {{ cap.lastDayMatches }} semifinales y finales · caben como máximo {{ cap.lastDayMax }}</div>
            }
            <div class="small cap-hours">
              Horas de pista: @for (d of cap.days; track d.date) { {{ label(d.date) }} {{ hours(d.courtHours) }} h · } <b>total {{ hours(cap.courtHours) }} h</b>
              @if (cap.neededHours != null) { · horas de partido necesarias: <b>{{ hours(cap.neededHours) }} h</b> }
            </div>
            @if (cap.message) { <div class="small cap-msg">{{ cap.message }}</div> }
            <div class="tiny muted">Es un máximo: el orden de las rondas, los descansos y las restricciones de las parejas pueden hacer que quepan algunos menos.</div>
          </div>
        }
      }
    </section>

    <form class="panel stack" #gform="ngForm" mpForm (ngSubmit)="gform.valid ? saveGeneral(true) : advOpen.set(advInvalid(gform))" novalidate
          (input)="touch('general')" (change)="touch('general')">
      <mp-form-errors [form]="gform" />
      <h3>Datos del torneo</h3>
      <label class="field"><span>Nombre</span><input name="n" [(ngModel)]="f.name" #nRef="ngModel" required><mp-error [control]="nRef" /></label>
      <div class="grid-3">
        <label class="field"><span>Empieza</span><input name="s" type="date" [(ngModel)]="f.startDate" #sRef="ngModel" required><mp-error [control]="sRef" /></label>
        <label class="field"><span>Termina</span><input name="e" type="date" [(ngModel)]="f.endDate" #eRef="ngModel" required [mpNotBefore]="f.startDate"><mp-error [control]="eRef" /></label>
        <label class="field"><span>Color</span><input name="c" type="color" [(ngModel)]="f.primaryColor"></label>
      </div>
      <label class="field"><span>Descripción pública</span><textarea name="d" [(ngModel)]="f.description" rows="3"></textarea></label>
      <div class="grid-3">
        <label class="field"><span>Duración del partido (min)</span><input name="du" type="number" min="30" max="240" step="5" [(ngModel)]="f.matchDurationMinutes" #duRef="ngModel" required><mp-error [control]="duRef" />
          @if (savedBands()) { <small>Algunas franjas horarias tienen otra duración (Días y horario de juego).</small> }</label>
        <label class="field"><span>Inscripción (€)</span><input name="fe" type="number" min="0" step="0.5" [(ngModel)]="f.entryFee" #feRef="ngModel"><mp-error [control]="feRef" /></label>
      </div>
      <label class="field"><span>Normas del torneo (públicas)</span><textarea name="r" [(ngModel)]="f.rules" rows="6"></textarea></label>
      <label class="field"><span>Notas del organizador (privadas)</span><textarea name="o" [(ngModel)]="f.organizerNotes" rows="3"
        placeholder="Ajustes pendientes, peticiones de parejas, recordatorios…"></textarea></label>
      <details class="adv" [open]="advOpen()" (toggle)="advOpen.set($any($event.target).open)">
        <summary>
          <span>Opciones avanzadas</span>
          <span class="small muted">Descanso {{ f.minRestMinutes }} min · escalonar {{ f.courtStaggerMinutes || 0 }} min · cuadro A/B desde {{ f.splitThreshold }} parejas</span>
        </summary>
        <div class="grid-3">
          <label class="field"><span>Descanso mínimo (min)</span><input name="re" type="number" min="0" max="600" step="5" [(ngModel)]="f.minRestMinutes" #reRef="ngModel" required><mp-error [control]="reRef" />
            <small>Entre dos partidos de una misma pareja.</small></label>
          <label class="field"><span>Escalonar pistas (min)</span><input name="st" type="number" min="0" max="120" step="5" [(ngModel)]="f.courtStaggerMinutes" #stRef="ngModel"><mp-error [control]="stRef" />
            <small>Las pistas pares empiezan este tiempo más tarde para alternar horas.</small></label>
          <label class="field"><span>Dividir en cuadro A y B desde</span><input name="sp" type="number" min="8" [(ngModel)]="f.splitThreshold" #spRef="ngModel"><mp-error [control]="spRef" />
            <small>parejas (cuando el cuadro no cabe en una hoja)</small></label>
        </div>
        <label class="field"><span>Formato de juego</span><input name="sf" [(ngModel)]="f.scoringFormat"></label>
      </details>
      <div class="row between">
        <button type="button" class="btn danger" (click)="remove()">Eliminar torneo</button>
        <span class="row">@if (isDirty('general')) { <span class="chip warn">Cambios sin guardar</span> }
          <button class="btn" type="submit">Guardar datos</button></span>
      </div>
    </form>
  `,
  styles: [`
    .top { margin-bottom: 16px; }
    .top .panel + .panel { margin-top: 0; }
    .courts { display: flex; flex-direction: column; gap: 8px; }
    .off { opacity: .55; }
    .days { display: grid; gap: 8px; }
    .drow { display: grid; grid-template-columns: 160px 120px 16px 120px 130px 110px 32px; gap: 8px; align-items: center; }
    .allow { display: inline-flex; align-items: center; gap: 6px; }
    .finals { margin-top: 14px; display: flex; }
    .finals-help { display: block; margin-top: 4px; }
    .drow.head span, .brow.head span { font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); }
    .adv { margin-top: 16px; border-top: 1px solid var(--rule-2); padding-top: 12px; }
    .adv > summary { cursor: pointer; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; font-weight: 600; list-style: none; }
    .adv > summary::-webkit-details-marker { display: none; }
    .adv > summary::before { content: '▸'; color: var(--gold-ink); transition: transform .15s; display: inline-block; }
    .adv[open] > summary::before { transform: rotate(90deg); }
    .adv[open] > summary { margin-bottom: 10px; }
    .bands { display: grid; gap: 8px; }
    .brow { display: grid; grid-template-columns: 160px 120px 16px 120px 130px 32px; gap: 8px; align-items: center; }
    .mins { display: inline-flex; align-items: center; gap: 6px; }
    .mins input { width: 80px; }
    .capacity { margin-top: 16px; padding: 12px 14px; border-radius: var(--r-md); border: 1px solid var(--rule); border-left: 3px solid var(--ok); background: #fff; display: grid; gap: 4px; }
    .capacity.tight { border-left-color: var(--gold); }
    .capacity.bad { border-left-color: var(--danger); background: var(--danger-bg); }
    .cap-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; }
    .capacity.bad .cap-head b, .capacity.bad .cap-msg { color: var(--danger); }
    @media (max-width: 600px) {
      .drow, .brow { grid-template-columns: 1fr 1fr; }
      .drow.head, .brow.head { display: none; }
      .drow > span.muted, .brow > span.muted { display: none; }
    }
  `],
})
export class SettingsTabComponent implements OnChanges, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private router = inject(Router);
  t = input.required<Tournament>();
  club = input<Club | null>(null);
  changed = output<void>();
  /** Apartados con cambios sin guardar (para avisar antes de generar o de salir de Ajustes). */
  unsaved = output<string[]>();

  f: TournamentRequest = { name: '', startDate: '', endDate: '' };
  days: Day[] = [];
  /** Franjas con otra duración (borrador; se guardan con «Guardar franjas»). */
  bands: DurationBand[] = [];
  /** Tramos con otro número de pistas (borrador; se guardan con «Guardar tramos»). */
  courtBands: CourtBand[] = [];
  /** Semifinales y finales el último día (borrador; se guarda con «Guardar horario»). */
  finalsLastDay = false;
  /** ¿Caben todos los partidos con la configuración guardada? */
  capacity = signal<Capacity | null>(null);
  /** Desplegable «Opciones avanzadas» de los datos del torneo. */
  advOpen = signal(false);
  courtIds = new Set<string>();
  busy = signal(false);
  /** Apartados editados y aún sin guardar: al recargar el torneo no se pisan. */
  private dirty = signal<ReadonlySet<Section>>(new Set());

  isDirty(s: Section) { return this.dirty().has(s); }
  touch(s: Section) { if (!this.isDirty(s)) this.setDirty(s, true); }
  private setDirty(s: Section, on: boolean) {
    const n = new Set(this.dirty());
    on ? n.add(s) : n.delete(s);
    this.dirty.set(n);
    this.unsaved.emit([...n].map(x => SECTION_LABEL[x]));
  }

  ngOnDestroy() { if (this.dirty().size) this.unsaved.emit([]); }

  ngOnChanges() {
    const t = this.t();
    if (!this.isDirty('general')) this.f = {
      name: t.name, description: t.description, rules: t.rules, organizerNotes: t.organizerNotes, startDate: t.startDate,
      endDate: t.endDate, matchDurationMinutes: t.matchDurationMinutes, minRestMinutes: t.minRestMinutes,
      courtStaggerMinutes: t.courtStaggerMinutes, splitThreshold: t.splitThreshold, entryFee: t.entryFee ?? null,
      scoringFormat: t.scoringFormat, primaryColor: t.primaryColor, registrationOpen: t.registrationOpen,
      publicVisible: t.publicVisible,
    };
    if (!this.isDirty('days')) {
      this.days = t.days.map(d => ({ ...d, startTime: hhmm(d.startTime), endTime: hhmm(d.endTime),
        courtCount: d.courtCount && d.courtCount < t.courtIds.length ? d.courtCount : null, restrictionsAllowed: d.restrictionsAllowed !== false }));
      this.finalsLastDay = !!t.finalsLastDay;
    }
    if (!this.isDirty('courts')) this.courtIds = new Set(t.courtIds);
    if (!this.isDirty('bands')) this.bands = (t.durationBands ?? []).map(b => ({ ...b, fromTime: hhmm(b.fromTime), toTime: hhmm(b.toTime) }));
    if (!this.isDirty('courtBands')) this.courtBands = (t.courtBands ?? []).map(b => ({ ...b, fromTime: hhmm(b.fromTime), toTime: hhmm(b.toTime) }));
    this.api.capacity(t.id).then(c => this.capacity.set(c)).catch(() => this.capacity.set(null));
  }

  savedCourtBands() { return this.t().courtBands?.length ?? 0; }
  /** 1..pistas del torneo (en un tramo puede haber incluso todas). */
  allCourtOptions() { return Array.from({ length: this.courtsTotal() }, (_, i) => i + 1); }
  hours(h: number) { return Number.isInteger(h) ? String(h) : h.toFixed(1).replace('.', ','); }

  addCourtBand() {
    const days = this.t().days;
    const day = days.find(d => !this.courtBands.some(b => b.playDate === d.playDate && b.toTime >= hhmm(d.endTime))) ?? days[0];
    const last = this.courtBands.filter(b => b.playDate === day.playDate).sort((a, b) => a.toTime.localeCompare(b.toTime)).at(-1);
    this.courtBands = [...this.courtBands, { playDate: day.playDate, fromTime: last?.toTime ?? hhmm(day.startTime),
      toTime: hhmm(day.endTime), courts: Math.max(1, Math.min(day.courtCount ?? this.courtsTotal(), this.courtsTotal())) }];
    this.touch('courtBands');
  }

  removeCourtBand(i: number) {
    this.courtBands = this.courtBands.filter((_, k) => k !== i);
    this.touch('courtBands');
  }

  async saveCourtBands() {
    for (const b of this.courtBands) {
      const day = this.t().days.find(d => d.playDate === b.playDate);
      const where = `el tramo del ${this.label(b.playDate)}${b.fromTime ? ' desde las ' + b.fromTime : ''}`;
      const problem = !b.fromTime || !b.toTime ? 'falta la hora de inicio o de fin'
        : b.toTime <= b.fromTime ? 'la hora de fin debe ser posterior a la de inicio (usa 23:59 para medianoche)'
        : day && (b.fromTime < hhmm(day.startTime) || b.toTime > hhmm(day.endTime)) ? `debe estar dentro del horario de ese día (${hhmm(day.startTime)} a ${hhmm(day.endTime)})`
        : !(b.courts >= 1 && b.courts <= this.courtsTotal()) ? `el número de pistas debe estar entre 1 y ${this.courtsTotal()}`
        : '';
      if (problem) { this.toast.error(`Revisa ${where}: ${problem}.`); return; }
    }
    try {
      await this.api.setCourtBands(this.t().id, this.courtBands);
      this.setDirty('courtBands', false);
      this.toast.ok(this.courtBands.length ? 'Tramos guardados' : 'Tramos quitados: cada día usa su número de pistas');
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
  }

  /** Franjas guardadas en el torneo. */
  savedBands() { return this.t().durationBands?.length ?? 0; }

  /** Hay algún error en las opciones avanzadas (para abrir el desplegable al guardar). */
  advInvalid(form: { controls: Record<string, { invalid: boolean }> }) {
    return ['re', 'st', 'sp'].some(k => form.controls[k]?.invalid) || this.advOpen();
  }

  /** Nueva franja: el primer día sin franjas que lleguen al cierre, desde donde acabe la última hasta el cierre. */
  addBand() {
    const days = this.t().days;
    const day = days.find(d => !this.bands.some(b => b.playDate === d.playDate && b.toTime >= hhmm(d.endTime))) ?? days[0];
    const last = this.bands.filter(b => b.playDate === day.playDate).sort((a, b) => a.toTime.localeCompare(b.toTime)).at(-1);
    const from = last?.toTime ?? hhmm(day.startTime);
    this.bands = [...this.bands, { playDate: day.playDate, fromTime: from, toTime: hhmm(day.endTime),
      minutes: this.f.matchDurationMinutes ?? this.t().matchDurationMinutes }];
    this.touch('bands');
  }

  removeBand(i: number) {
    this.bands = this.bands.filter((_, k) => k !== i);
    this.touch('bands');
  }

  async saveBands() {
    for (const b of this.bands) {
      const where = `la franja del ${this.label(b.playDate)}${b.fromTime ? ' desde las ' + b.fromTime : ''}`;
      const problem = !b.fromTime || !b.toTime ? 'falta la hora de inicio o de fin'
        : b.toTime <= b.fromTime ? 'la hora de fin debe ser posterior a la de inicio (usa 23:59 para medianoche)'
        : !(b.minutes >= 30 && b.minutes <= 240) ? 'la duración debe estar entre 30 y 240 minutos'
        : '';
      if (problem) { this.toast.error(`Revisa ${where}: ${problem}.`); return; }
    }
    try {
      await this.api.setDurationBands(this.t().id, this.bands);
      this.setDirty('bands', false);
      this.toast.ok(this.bands.length ? 'Franjas guardadas' : 'Franjas quitadas: todo el torneo usa la duración general');
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
  }

  label(d: string) { return `${dayName(d)} ${shortDate(d)}`; }

  async saveGeneral(notify = false) {
    try {
      await this.api.updateTournament(this.t().id, this.f);
      this.setDirty('general', false);
      this.toast.ok(notify ? 'Datos guardados' : 'Guardado');
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
  }

  toggleCourt(id: string) { this.courtIds.has(id) ? this.courtIds.delete(id) : this.courtIds.add(id); }

  async saveCourts() {
    if (!this.courtIds.size) { this.toast.error('Selecciona al menos una pista'); return; }
    try { await this.api.setCourts(this.t().id, [...this.courtIds]); this.setDirty('courts', false); this.toast.ok('Pistas guardadas'); this.changed.emit(); }
    catch (e) { this.toast.error(e); }
  }

  removeDay(i: number) { this.days.splice(i, 1); }
  /** Pistas del torneo (guardadas): máximo que se puede elegir cada día. */
  courtsTotal() { return this.t().courtIds.length; }
  courtOptions() { return Array.from({ length: Math.max(0, this.courtsTotal() - 1) }, (_, i) => i + 1); }

  /** El último día con «semis y finales el último día» no admite restricciones (no se puede marcar). */
  isLastAndFinals(i: number) {
    if (!this.finalsLastDay) return false;
    const last = [...this.days].sort((a, b) => a.playDate.localeCompare(b.playDate)).at(-1);
    return this.days[i] === last;
  }

  /** Antes de guardar: si se quitarían restricciones de parejas, el club lo confirma viendo a quién afecta. */
  async saveDays() {
    try {
      const losses = await this.api.previewDays(this.t().id, this.days, this.finalsLastDay);
      if (losses.length) {
        const n = losses.reduce((a, l) => a + l.pairs.length, 0);
        const detail = losses.map(l => `${this.label(l.date)}: ${l.pairs.join(', ')}`).join('. ');
        const ok = await this.confirm.ask({
          title: `Se quitarán las restricciones de ${n} ${n === 1 ? 'pareja' : 'parejas'}`,
          message: `Esos días ya no admitirán restricciones. ${detail}. Avísales si hace falta.`,
          ok: 'Guardar y quitarlas', danger: true,
        });
        if (!ok) return;
      }
      await this.api.setDays(this.t().id, this.days, this.finalsLastDay);
      this.setDirty('days', false);
      this.toast.ok(losses.length ? 'Horario guardado y restricciones quitadas' : 'Horario guardado');
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
  }

  async remove() {
    if (!(await this.confirm.ask({ title: `¿Eliminar "${this.t().name}"?`,
      message: 'Irá a la papelera del club: podrás recuperarlo durante 30 días; después se borrará del todo con sus categorías, parejas y resultados.',
      ok: 'Enviar a la papelera', danger: true }))) return;
    try {
      await this.api.deleteTournament(this.t().id);
      this.toast.ok('Torneo enviado a la papelera');
      this.router.navigate(['/panel/club', this.t().clubId]);
    }
    catch (e) { this.toast.error(e); }
  }
}
