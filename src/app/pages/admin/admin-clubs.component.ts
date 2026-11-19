import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { AdminClub, ClubRole, VerificationStatus } from '../../core/models';
import { CLUB_ROLE } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { Activity, activity, ago, dateTime } from './admin-format';

const STATUS: Record<VerificationStatus, string> = { PENDING: 'Pendiente', VERIFIED: 'Verificado', REJECTED: 'Rechazado' };

/**
 * Verificación de clubes: comprobar que la entidad existe (CIF en el registro correspondiente) y que quien la da
 * de alta puede representarla (llamando al teléfono público del club), y verificar o rechazar con el motivo.
 */
@Component({
  selector: 'mp-admin-clubs',
  imports: [FormsModule],
  template: `
    <div class="row between head">
      <div class="seg">
        <button [class.on]="filter() === 'PENDING'" (click)="filter.set('PENDING')">Pendientes ({{ count('PENDING') }})</button>
        <button [class.on]="filter() === 'all'" (click)="filter.set('all')">Todos ({{ clubs().length }})</button>
        <button [class.on]="filter() === 'inactive'" (click)="filter.set('inactive')">Sin actividad ({{ inactiveCount() }})</button>
      </div>
      <details class="how small">
        <summary>¿Cómo verificar un club?</summary>
        <ol>
          <li><b>Que la entidad existe:</b> busca el CIF o la razón social en el registro de entidades deportivas o de asociaciones de su comunidad autónoma; si es una sociedad, en el BORME.</li>
          <li><b>Que puede representarla:</b> llama al teléfono público del club (su web o Google Maps, no el que ha puesto el usuario) y pregunta si esa persona está autorizada.</li>
          <li>Si hay dudas, pide por correo un certificado del secretario con el visto bueno del presidente, o un poder.</li>
        </ol>
      </details>
    </div>

    @for (c of shown(); track c.id) {
      <article class="panel club" [class]="c.verificationStatus.toLowerCase()">
        <header>
          <div><b>{{ c.name }}</b> <span class="muted small">{{ c.city }}@if (c.province) { ({{ c.province }}) }</span></div>
          <span class="row tight">
            @if (act(c); as a) { <span class="chip act" [class]="'act ' + a.level" [title]="a.at ? 'Última conexión: ' + when(a.at) + (a.approx ? ' (inicio de sesión)' : '') : ''">{{ a.label }}</span> }
            <span class="chip" [class.ok]="c.verificationStatus === 'VERIFIED'" [class.warn]="c.verificationStatus !== 'VERIFIED'">{{ status(c.verificationStatus) }}</span>
          </span>
        </header>
        @if (act(c); as a) {
          <div class="activity small">
            <span><small>Última conexión</small> <b>{{ a.at ? ago(a.at) : 'Nunca' }}</b>@if (a.approx) { <span class="tiny muted" title="Solo tenemos el último inicio de sesión: la sesión dura semanas"> (aprox.)</span> }</span>
            <span><small>Último cambio</small> <b>{{ c.lastChangeAt ? ago(c.lastChangeAt) : '—' }}</b></span>
            <span><small>Torneos</small> <b>{{ c.tournaments }}</b>@if (c.tournamentsLive) { · <span class="live">{{ c.tournamentsLive }} en juego</span> }@if (c.tournamentsUpcoming) { · {{ c.tournamentsUpcoming }} {{ c.tournamentsUpcoming === 1 ? 'próximo' : 'próximos' }} }</span>
          </div>
        }
        <div class="grid">
          <div>
            <small>Entidad</small>
            <b>{{ c.legalName || '—' }}</b>
            <span>{{ c.taxId || 'Sin CIF/NIF' }}@if (c.taxIdKind) { · {{ c.taxIdKind }} }</span>
            @if (c.sameTaxId) { <span class="chip warn">Hay {{ c.sameTaxId }} {{ c.sameTaxId === 1 ? 'club más' : 'clubes más' }} con este CIF</span> }
            <span class="muted">{{ c.fiscalAddress }}</span>
            @if (c.taxId) {
              <span class="links">
                <a [href]="google(c.legalName + ' ' + c.taxId)" target="_blank" rel="noopener">Buscar CIF</a>
                <a href="https://www.boe.es/diario_borme/" target="_blank" rel="noopener">BORME</a>
              </span>
            }
          </div>
          <div>
            <small>Responsable</small>
            <b>{{ c.ownerName || '—' }}</b>
            <span>{{ role(c.contactRole) }}</span>
            <span class="muted">{{ c.ownerEmail }}@if (c.ownerPhone) { · {{ c.ownerPhone }} }</span>
          </div>
          <div>
            <small>Contacto del club (según el usuario)</small>
            <span>@if (c.phone) { <a [href]="'tel:' + c.phone.replace(' ', '')">{{ c.phone }}</a> } @else { Sin teléfono }</span>
            <span>{{ c.email || 'Sin email' }}</span>
            @if (c.website) { <a [href]="c.website" target="_blank" rel="noopener">{{ c.website }}</a> }
            <span class="links"><a [href]="maps(c.name + ' ' + (c.city || ''))" target="_blank" rel="noopener">Buscar en Google Maps</a></span>
          </div>
        </div>
        <p class="tiny muted meta">Alta: {{ when(c.createdAt) }} · {{ c.tournaments }} {{ c.tournaments === 1 ? 'torneo' : 'torneos' }}
          @if (c.verifiedAt) { · verificado el {{ when(c.verifiedAt) }} }</p>
        @if (c.rejectionReason) { <div class="notice warn small">Rechazado: {{ c.rejectionReason }}</div> }

        @if (rejecting() === c.id) {
          <div class="reject">
            <label class="field"><span>Motivo del rechazo <small class="muted">(se lo enviamos al responsable por correo)</small></span>
              <textarea [(ngModel)]="reason" rows="3" maxlength="500" placeholder="Ej.: No hemos podido confirmar con el club que estás autorizado. Escríbenos a info@…"></textarea></label>
            <div class="row end">
              <button class="btn ghost sm" (click)="rejecting.set(null)">Cancelar</button>
              <button class="btn danger sm" (click)="reject(c)" [disabled]="busy() === c.id || !reason.trim()">Rechazar club</button>
            </div>
          </div>
        } @else {
          <div class="row">
            @if (c.verificationStatus !== 'VERIFIED') { <button class="btn sm" (click)="verify(c)" [disabled]="busy() === c.id">Verificar club</button> }
            @if (c.verificationStatus !== 'REJECTED') { <button class="btn ghost sm" (click)="startReject(c)" [disabled]="busy() === c.id">Rechazar</button> }
          </div>
        }
      </article>
    } @empty {
      <div class="panel empty"><h3>{{ filter() === 'PENDING' ? 'No hay clubes pendientes' : 'Todavía no hay clubes' }}</h3>
        <p>Cuando alguien dé de alta un club, aparecerá aquí y te llegará un aviso a info&#64;.</p></div>
    }
  `,
  styles: [`
    .head { margin-bottom: 14px; gap: 10px; flex-wrap: wrap; align-items: flex-start; }
    .how { max-width: 560px; }
    .how summary { cursor: pointer; color: var(--gold-ink); font-weight: 600; }
    .how ol { margin: 8px 0 0; padding-left: 18px; line-height: 1.5; }
    .club { margin-bottom: 12px; border-left: 3px solid var(--gold); display: grid; gap: 10px; }
    .club.verified { border-left-color: var(--ok); }
    .club.rejected { border-left-color: var(--danger); }
    .tight { gap: 6px; }
    .chip.act.active { background: var(--ok-bg, #e8f4ec); color: var(--ok); }
    .chip.act.low { background: #fdf3dc; color: #8a6100; }
    .chip.act.inactive { background: var(--danger-bg); color: var(--danger); }
    .chip.act.never { background: var(--rule-2); color: var(--ink-3); }
    .activity { display: flex; flex-wrap: wrap; gap: 6px 22px; padding: 8px 12px; border-radius: var(--r-md); background: var(--glass); }
    .activity small { color: var(--ink-3); font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; margin-right: 4px; }
    .club header { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; flex-wrap: wrap; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .grid > div { display: grid; gap: 3px; align-content: start; font-size: .92rem; min-width: 0; word-break: break-word; }
    .grid small { color: var(--ink-3); font-size: .74rem; letter-spacing: .12em; text-transform: uppercase; }
    .links { display: flex; gap: 12px; font-size: .85rem; }
    .meta { margin: 0; }
    .reject { display: grid; gap: 8px; border-top: 1px solid var(--rule-2); padding-top: 10px; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  `],
})
export class AdminClubsComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  clubs = input.required<AdminClub[]>();
  changed = output<void>();
  filter = signal<'PENDING' | 'all' | 'inactive'>('PENDING');
  busy = signal<string | null>(null);
  rejecting = signal<string | null>(null);
  reason = '';

  /** Pendientes primero (como llegan); en «Todos» y «Sin actividad», los más recientes en conectarse primero. */
  shown = computed(() => {
    const f = this.filter();
    if (f === 'PENDING') return this.clubs().filter(c => c.verificationStatus === 'PENDING');
    const list = f === 'inactive' ? this.clubs().filter(c => ['inactive', 'never'].includes(this.act(c).level)) : [...this.clubs()];
    return list.sort((a, b) => (this.act(b).at ?? '').localeCompare(this.act(a).at ?? ''));
  });
  inactiveCount = computed(() => this.clubs().filter(c => ['inactive', 'never'].includes(this.act(c).level)).length);
  act(c: AdminClub): Activity { return activity(c.lastSeenAt, c.lastSignInAt); }
  ago(s: string) { return ago(s); }
  count(s: VerificationStatus) { return this.clubs().filter(c => c.verificationStatus === s).length; }
  status(s: VerificationStatus) { return STATUS[s]; }
  role(r?: ClubRole | null) { return r ? CLUB_ROLE[r] : 'Cargo sin indicar'; }
  when(s: string) { return dateTime(s); }
  google(q: string) { return 'https://www.google.com/search?q=' + encodeURIComponent(q); }
  maps(q: string) { return 'https://www.google.com/maps/search/' + encodeURIComponent(q); }

  async verify(c: AdminClub) {
    if (!(await this.confirm.ask({ title: `¿Verificar ${c.name}?`, message: 'Podrá publicar torneos, abrir inscripciones y pedir la activación. Le avisaremos por correo.', ok: 'Verificar club' }))) return;
    this.busy.set(c.id);
    try { await this.api.adminVerifyClub(c.id); this.toast.ok('Club verificado'); this.changed.emit(); }
    catch (e) { this.toast.error(e); }
    finally { this.busy.set(null); }
  }

  startReject(c: AdminClub) { this.reason = ''; this.rejecting.set(c.id); }

  async reject(c: AdminClub) {
    this.busy.set(c.id);
    try { await this.api.adminRejectClub(c.id, this.reason.trim()); this.toast.ok('Club rechazado'); this.rejecting.set(null); this.changed.emit(); }
    catch (e) { this.toast.error(e); }
    finally { this.busy.set(null); }
  }
}
