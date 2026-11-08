import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AdminAction, AdminOverview, AdminPayment, AdminTournament, AdminUser } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { AdminAccountingComponent } from './admin-accounting.component';
import { ACTION_LABEL, dateTime } from './admin-format';
import { AdminTournamentsComponent } from './admin-tournaments.component';
import { AdminUsersComponent } from './admin-users.component';

type Tab = 'tournaments' | 'accounting' | 'users' | 'log';

/** Panel de administración de MatchZone (solo SUPERADMIN). */
@Component({
  selector: 'mp-admin',
  imports: [AdminTournamentsComponent, AdminAccountingComponent, AdminUsersComponent],
  template: `
    <div class="page">
      <div class="page-head">
        <div><span class="eyebrow">MatchZone</span><h1>Administración</h1>
          <p class="muted">Activa torneos tras el pago, lleva las cuentas y gestiona las cuentas de usuario.</p></div>
        <button class="btn ghost" (click)="load()" [disabled]="loading()">Actualizar</button>
      </div>

      @if (overview(); as o) {
        <div class="stats">
          <button class="stat" [class.hot]="o.pendingRequests > 0" (click)="tab.set('tournaments')">
            <b class="num">{{ o.pendingRequests }}</b><span>{{ o.pendingRequests === 1 ? 'solicitud pendiente' : 'solicitudes pendientes' }}</span></button>
          <div class="stat"><b class="num">{{ o.tournaments }}</b><span>torneos</span></div>
          <div class="stat"><b class="num">{{ o.clubs }}</b><span>clubes</span></div>
          <div class="stat"><b class="num">{{ o.users }}</b><span>cuentas{{ o.blockedUsers ? ' · ' + o.blockedUsers + ' bloqueadas' : '' }}</span></div>
        </div>
      }

      <div class="tabs" role="tablist">
        <button [class.on]="tab() === 'tournaments'" (click)="tab.set('tournaments')">Solicitudes y torneos</button>
        <button [class.on]="tab() === 'accounting'" (click)="tab.set('accounting')">Contabilidad</button>
        <button [class.on]="tab() === 'users'" (click)="tab.set('users')">Usuarios</button>
        <button [class.on]="tab() === 'log'" (click)="tab.set('log')">Registro</button>
      </div>

      @if (error()) {
        <div class="panel empty"><h3>No se ha podido cargar el panel</h3><p>{{ error() }}</p><button class="btn" (click)="load()">Reintentar</button></div>
      } @else if (loading() && !overview()) {
        <p class="muted">Cargando…</p>
      } @else {
        @switch (tab()) {
          @case ('tournaments') { <mp-admin-tournaments [tournaments]="tournaments()" (changed)="load()" /> }
          @case ('accounting') { <mp-admin-accounting [payments]="payments()" (changed)="load()" /> }
          @case ('users') { <mp-admin-users [users]="users()" (changed)="load()" /> }
          @case ('log') {
            <div class="panel table-wrap log">
              <table class="table">
                <thead><tr><th>Cuándo</th><th>Acción</th><th>Detalle</th><th>Quién</th></tr></thead>
                <tbody>
                  @for (a of actions(); track a.id) {
                    <tr><td class="nowrap small">{{ when(a.createdAt) }}</td><td>{{ label(a.action) }}</td><td>{{ a.detail }}</td><td class="small muted">{{ a.adminEmail }}</td></tr>
                  } @empty { <tr><td colspan="4" class="muted">Todavía no hay acciones registradas.</td></tr> }
                </tbody>
              </table>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    h1 { margin-top: 12px; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 26px; }
    .stat { background: #fff; border: 1px solid var(--rule); border-radius: var(--r-lg); padding: 14px 18px; display: flex; flex-direction: column; gap: 2px; text-align: left; font: inherit; color: inherit; }
    button.stat { cursor: pointer; transition: border-color .2s; }
    button.stat:hover { border-color: var(--gold); }
    .stat b { font-size: 1.9rem; font-weight: 500; line-height: 1.1; }
    .stat span { font-size: .85rem; color: var(--ink-2); }
    .stat.hot { border-color: var(--gold); background: linear-gradient(135deg, var(--court-3), #fff 70%); }
    @media (max-width: 760px) { .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .log { padding: 6px 10px; }
  `],
})
export class AdminPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  tab = signal<Tab>('tournaments');
  loading = signal(false);
  error = signal('');
  overview = signal<AdminOverview | null>(null);
  tournaments = signal<AdminTournament[]>([]);
  payments = signal<AdminPayment[]>([]);
  users = signal<AdminUser[]>([]);
  actions = signal<AdminAction[]>([]);

  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [o, t, p, u, a] = await Promise.all([this.api.adminOverview(), this.api.adminTournaments(),
        this.api.adminPayments(), this.api.adminUsers(), this.api.adminActions()]);
      this.overview.set(o);
      this.tournaments.set(t);
      this.payments.set(p);
      this.users.set(u);
      this.actions.set(a);
    } catch (e) {
      this.error.set((e as Error).message);
      this.toast.error(e);
    } finally { this.loading.set(false); }
  }

  when(s: string) { return dateTime(s); }
  label(a: string) { return ACTION_LABEL[a] ?? a; }
}
