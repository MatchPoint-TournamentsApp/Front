import { Component, OnChanges, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FORM_KIT } from '../../shared/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Club, Day, Tournament, TournamentRequest } from '../../core/models';
import { dayName, hhmm, shortDate } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { ConfirmService } from '../../core/confirm.service';

/** Ajustes del torneo: datos, días y franjas, pistas, inscripción y normas. */
@Component({
  selector: 'mp-settings-tab',
  imports: [FormsModule, FORM_KIT],
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
                <input type="checkbox" [checked]="courtIds.has(ct.id)" [disabled]="!ct.active" (change)="toggleCourt(ct.id)">
                {{ ct.name }} @if (ct.featured) { <span class="chip ball">Central</span> } @if (!ct.active) { <span class="tiny muted">(inactiva)</span> }
              </label>
            }
          </div>
          <div><button class="btn ghost sm" (click)="saveCourts()">Guardar pistas</button></div>
        } @else { <p class="muted small">Cargando pistas…</p> }
      </section>
    </div>

    <section class="panel">
      <h3>Días y horario de juego</h3>
      <p class="small muted">Franja en la que se pueden programar partidos cada día y cuántas pistas dedicas al torneo ese día. Los cuadros se generan dentro de estas franjas sin pasar de esas pistas.</p>
      <div class="days">
        <div class="drow head" aria-hidden="true"><span></span><span>Desde</span><span></span><span>Hasta</span><span>Pistas</span><span></span></div>
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
            <button class="icon-btn" (click)="removeDay(i)" aria-label="Quitar día">✕</button>
          </div>
        }
      </div>
      <div class="row" style="margin-top:12px"><button class="btn ghost sm" (click)="saveDays()">Guardar horario</button></div>
    </section>

    <form class="panel stack" #gform="ngForm" mpForm (ngSubmit)="gform.valid && saveGeneral(true)" novalidate>
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
        <label class="field"><span>Duración del partido (min)</span><input name="du" type="number" min="30" max="240" step="5" [(ngModel)]="f.matchDurationMinutes" #duRef="ngModel" required><mp-error [control]="duRef" /></label>
        <label class="field"><span>Descanso mínimo (min)</span><input name="re" type="number" min="0" max="600" step="5" [(ngModel)]="f.minRestMinutes" #reRef="ngModel" required><mp-error [control]="reRef" /></label>
        <label class="field"><span>Inscripción (€)</span><input name="fe" type="number" min="0" step="0.5" [(ngModel)]="f.entryFee" #feRef="ngModel"><mp-error [control]="feRef" /></label>
        <label class="field"><span>Escalonar pistas (min)</span><input name="st" type="number" min="0" max="120" step="5" [(ngModel)]="f.courtStaggerMinutes" #stRef="ngModel"><mp-error [control]="stRef" />
          <small>Las pistas pares empiezan este tiempo más tarde para alternar horas.</small></label>
        <label class="field"><span>Dividir en cuadro A y B desde</span><input name="sp" type="number" min="8" [(ngModel)]="f.splitThreshold" #spRef="ngModel"><mp-error [control]="spRef" />
          <small>parejas (cuando el cuadro no cabe en una hoja)</small></label>
      </div>
      <label class="field"><span>Formato de juego</span><input name="sf" [(ngModel)]="f.scoringFormat"></label>
      <label class="field"><span>Normas del torneo (públicas)</span><textarea name="r" [(ngModel)]="f.rules" rows="6"></textarea></label>
      <label class="field"><span>Notas del organizador (privadas)</span><textarea name="o" [(ngModel)]="f.organizerNotes" rows="3"
        placeholder="Ajustes pendientes, peticiones de parejas, recordatorios…"></textarea></label>
      <div class="row between">
        <button type="button" class="btn danger" (click)="remove()">Eliminar torneo</button>
        <button class="btn" type="submit">Guardar datos</button>
      </div>
    </form>
  `,
  styles: [`
    .top { margin-bottom: 16px; }
    .top .panel + .panel { margin-top: 0; }
    .courts { display: flex; flex-direction: column; gap: 8px; }
    .off { opacity: .55; }
    .days { display: grid; gap: 8px; }
    .drow { display: grid; grid-template-columns: 160px 120px 16px 120px 130px 32px; gap: 8px; align-items: center; }
    .drow.head span { font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); }
    @media (max-width: 600px) {
      .drow { grid-template-columns: 1fr 1fr; }
      .drow.head { display: none; }
      .drow > span.muted { display: none; }
    }
  `],
})
export class SettingsTabComponent implements OnChanges {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private router = inject(Router);
  t = input.required<Tournament>();
  club = input<Club | null>(null);
  changed = output<void>();

  f: TournamentRequest = { name: '', startDate: '', endDate: '' };
  days: Day[] = [];
  courtIds = new Set<string>();
  busy = signal(false);

  ngOnChanges() {
    const t = this.t();
    this.f = {
      name: t.name, description: t.description, rules: t.rules, organizerNotes: t.organizerNotes, startDate: t.startDate,
      endDate: t.endDate, matchDurationMinutes: t.matchDurationMinutes, minRestMinutes: t.minRestMinutes,
      courtStaggerMinutes: t.courtStaggerMinutes, splitThreshold: t.splitThreshold, entryFee: t.entryFee ?? null,
      scoringFormat: t.scoringFormat, primaryColor: t.primaryColor, registrationOpen: t.registrationOpen,
      publicVisible: t.publicVisible,
    };
    this.days = t.days.map(d => ({ ...d, startTime: hhmm(d.startTime), endTime: hhmm(d.endTime),
      courtCount: d.courtCount && d.courtCount < t.courtIds.length ? d.courtCount : null }));
    this.courtIds = new Set(t.courtIds);
  }

  label(d: string) { return `${dayName(d)} ${shortDate(d)}`; }

  async saveGeneral(notify = false) {
    try {
      await this.api.updateTournament(this.t().id, this.f);
      this.toast.ok(notify ? 'Datos guardados' : 'Guardado');
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
  }

  toggleCourt(id: string) { this.courtIds.has(id) ? this.courtIds.delete(id) : this.courtIds.add(id); }

  async saveCourts() {
    if (!this.courtIds.size) { this.toast.error('Selecciona al menos una pista'); return; }
    try { await this.api.setCourts(this.t().id, [...this.courtIds]); this.toast.ok('Pistas guardadas'); this.changed.emit(); }
    catch (e) { this.toast.error(e); }
  }

  removeDay(i: number) { this.days.splice(i, 1); }
  /** Pistas del torneo (guardadas): máximo que se puede elegir cada día. */
  courtsTotal() { return this.t().courtIds.length; }
  courtOptions() { return Array.from({ length: Math.max(0, this.courtsTotal() - 1) }, (_, i) => i + 1); }

  async saveDays() {
    try { await this.api.setDays(this.t().id, this.days); this.toast.ok('Horario guardado'); this.changed.emit(); }
    catch (e) { this.toast.error(e); }
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
