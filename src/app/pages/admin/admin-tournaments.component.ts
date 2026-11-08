import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AdminTournament, PaymentRequest } from '../../core/models';
import { range, STATUS_LABEL } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { euros } from './accounting';
import { dateTime } from './admin-format';
import { PaymentDialogComponent } from './payment-dialog.component';

type Filter = 'pending' | 'inactive' | 'active' | 'all';

/** Solicitudes de activación y todos los torneos, con los arreglos del administrador. */
@Component({
  selector: 'mp-admin-tournaments',
  imports: [RouterLink, PaymentDialogComponent],
  template: `
    <div class="row between head">
      <div class="seg" role="tablist" aria-label="Filtrar torneos">
        <button [class.on]="filter() === 'pending'" (click)="filter.set('pending')">Solicitudes <span class="count">{{ count('pending') }}</span></button>
        <button [class.on]="filter() === 'inactive'" (click)="filter.set('inactive')">Sin activar <span class="count">{{ count('inactive') }}</span></button>
        <button [class.on]="filter() === 'active'" (click)="filter.set('active')">Activados <span class="count">{{ count('active') }}</span></button>
        <button [class.on]="filter() === 'all'" (click)="filter.set('all')">Todos <span class="count">{{ count('all') }}</span></button>
      </div>
      <input class="search" type="search" placeholder="Buscar torneo, club o email" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Buscar torneo">
    </div>

    @for (t of shown(); track t.id) {
      <article class="panel item" [class.req]="isPending(t)">
        <div class="main">
          <div class="title">
            <h3>{{ t.name }}</h3>
            @if (isPending(t)) { <span class="chip warn">Solicitud enviada · {{ when(t.generationRequestedAt) }}</span> }
            @else if (t.generationApprovedAt) { <span class="chip ok">Activado · {{ when(t.generationApprovedAt) }}</span> }
            @else { <span class="chip grey">Sin solicitar</span> }
            @if (!t.publicVisible) { <span class="chip grey">Oculto</span> }
          </div>
          <div class="meta small muted">
            <span><b>{{ t.clubName }}</b>{{ t.city ? ' · ' + t.city : '' }}</span>
            <span>{{ dates(t) }}</span>
            <span>{{ t.confirmedPairs }} parejas</span>
            <span>{{ status(t) }}{{ t.generatedCategories ? ' · ' + t.generatedCategories + ' cuadros generados' : '' }}</span>
            @if (t.paid > 0) { <span>Cobrado: <b class="num">{{ eur(t.paid) }}</b></span> }
          </div>
          <div class="contact small">
            <span>{{ t.ownerName || 'Sin nombre' }}</span>
            @if (t.ownerEmail) { <a [href]="'mailto:' + t.ownerEmail">{{ t.ownerEmail }}</a> }
            @if (t.ownerPhone || t.clubPhone; as phone) { <a [href]="'tel:' + phone.replace(' ', '')">{{ phone }}</a> }
          </div>
        </div>
        <div class="actions">
          @if (!t.generationApprovedAt) {
            <button class="btn ball sm" (click)="dialog.set({ t, mode: 'approve' })">Activar</button>
          } @else {
            <button class="btn ghost sm" (click)="dialog.set({ t, mode: 'payment' })">Apuntar cobro</button>
          }
          <a class="btn ghost sm" [routerLink]="['/panel/torneo', t.id]">Abrir</a>
          <details class="more">
            <summary class="btn ghost sm" aria-label="Más acciones">···</summary>
            <div class="menu">
              @if (t.publicVisible) { <a [href]="'/t/' + t.slug" target="_blank" rel="noopener">Ver página pública</a> }
              <button (click)="visibility(t)">{{ t.publicVisible ? 'Ocultar de la web pública' : 'Publicar en la web pública' }}</button>
              @if (t.generatedCategories) { <button (click)="resetDraws(t)">Borrar los cuadros generados</button> }
              @if (t.generationApprovedAt) { <button class="danger" (click)="revoke(t)">Quitar la activación</button> }
            </div>
          </details>
        </div>
      </article>
    } @empty {
      <div class="panel empty"><p class="muted">{{ emptyText() }}</p></div>
    }

    @if (dialog(); as d) {
      <mp-payment-dialog [t]="d.t" [mode]="d.mode" [busy]="busy()" (done)="saveDialog(d.t, d.mode, $event)" />
    }
  `,
  styles: [`
    .head { margin-bottom: 16px; }
    .seg .count { font-family: var(--display); color: var(--ink-3); margin-left: 4px; }
    .seg button.on .count { color: inherit; }
    .search { max-width: 280px; }
    .item { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; padding: 18px 20px; }
    .item.req { border-left: 3px solid var(--gold); }
    .main { flex: 1; min-width: 260px; display: flex; flex-direction: column; gap: 6px; }
    .title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .title h3 { margin: 0; font-weight: 500; }
    .meta, .contact { display: flex; flex-wrap: wrap; gap: 4px 16px; }
    .contact { color: var(--ink-2); }
    .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .more { position: relative; }
    .more summary { list-style: none; }
    .more summary::-webkit-details-marker { display: none; }
    .menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 5; min-width: 240px; background: #fff; border: 1px solid var(--rule);
      border-radius: var(--r-md); box-shadow: var(--shadow); padding: 6px; display: flex; flex-direction: column; }
    .menu a, .menu button { text-align: left; padding: 9px 10px; border-radius: var(--r-sm); border: 0; background: none; font: inherit; font-size: .9rem; color: var(--ink); cursor: pointer; text-decoration: none; }
    .menu a:hover, .menu button:hover { background: var(--glass); }
    .menu .danger { color: var(--danger); }
    @media (max-width: 560px) { .search { max-width: none; width: 100%; } .actions { width: 100%; } }
  `],
})
export class AdminTournamentsComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  tournaments = input.required<AdminTournament[]>();
  changed = output<void>();

  filter = signal<Filter>('pending');
  q = signal('');
  dialog = signal<{ t: AdminTournament; mode: 'approve' | 'payment' } | null>(null);
  busy = signal(false);

  eur = euros;
  when = (s?: string | null) => dateTime(s);

  isPending(t: AdminTournament) { return !!t.generationRequestedAt && !t.generationApprovedAt; }

  private matches(t: AdminTournament, f: Filter) {
    switch (f) {
      case 'pending': return this.isPending(t);
      case 'inactive': return !t.generationApprovedAt;
      case 'active': return !!t.generationApprovedAt;
      case 'all': return true;
    }
  }

  count(f: Filter) { return this.tournaments().filter(t => this.matches(t, f)).length; }

  shown = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.tournaments().filter(t => this.matches(t, this.filter()))
      .filter(t => !q || [t.name, t.clubName, t.city, t.ownerEmail, t.ownerName].some(v => v?.toLowerCase().includes(q)));
  });

  emptyText = computed(() => this.q() ? 'Ningún torneo coincide con la búsqueda.'
    : this.filter() === 'pending' ? 'No hay solicitudes pendientes.' : 'No hay torneos en esta lista.');

  dates(t: AdminTournament) { return range(t.startDate, t.endDate); }
  status(t: AdminTournament) { return STATUS_LABEL[t.status]; }

  async saveDialog(t: AdminTournament, mode: 'approve' | 'payment', payment: PaymentRequest | null | undefined) {
    if (payment === undefined) { this.dialog.set(null); return; }
    this.busy.set(true);
    try {
      if (mode === 'approve') await this.api.adminApprove(t.id, payment);
      else if (payment) await this.api.adminAddPayment(t.id, payment);
      this.toast.ok(mode === 'approve' ? 'Torneo activado: el club ya puede generar los cuadros' : 'Cobro guardado');
      this.dialog.set(null);
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }

  revoke(t: AdminTournament) {
    if (!confirm(`¿Quitar la activación de "${t.name}"? El club no podrá generar ni regenerar cuadros. Los cobros apuntados se conservan.`)) return;
    this.run(() => this.api.adminRevoke(t.id), 'Activación retirada');
  }

  resetDraws(t: AdminTournament) {
    if (!confirm(`Se borrarán todos los partidos y resultados de "${t.name}" (${t.generatedCategories} cuadros). No se puede deshacer. ¿Continuar?`)) return;
    this.run(() => this.api.adminResetDraws(t.id), 'Cuadros borrados');
  }

  visibility(t: AdminTournament) {
    this.run(() => this.api.adminVisibility(t.id, !t.publicVisible), t.publicVisible ? 'Torneo oculto' : 'Torneo publicado');
  }

  private async run(call: () => Promise<unknown>, ok: string) {
    try { await call(); this.toast.ok(ok); this.changed.emit(); }
    catch (e) { this.toast.error(e); }
  }
}
