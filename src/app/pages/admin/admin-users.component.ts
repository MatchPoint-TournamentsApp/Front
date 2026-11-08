import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AdminUser, Role } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { dateTime } from './admin-format';

const ROLE_LABEL: Record<Role, string> = { USER: 'Usuario', CLUB_ADMIN: 'Club', SUPERADMIN: 'Superadmin' };

/** Cuentas registradas: buscar, bloquear y desbloquear. */
@Component({
  selector: 'mp-admin-users',
  template: `
    <div class="row between head">
      <span class="muted small">{{ shown().length }} de {{ users().length }} cuentas</span>
      <input class="search" type="search" placeholder="Buscar por nombre o email" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Buscar cuenta">
    </div>
    <div class="panel table-wrap">
      <table class="table">
        <thead><tr><th>Cuenta</th><th>Tipo</th><th>Clubes</th><th>Torneos</th><th>Alta</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          @for (u of shown(); track u.id) {
            <tr>
              <td><b>{{ u.fullName || 'Sin nombre' }}</b><div class="tiny muted">{{ u.email }}{{ u.phone ? ' · ' + u.phone : '' }}</div></td>
              <td><span class="chip" [class.ball]="u.role === 'SUPERADMIN'" [class.grey]="u.role !== 'SUPERADMIN'">{{ role(u.role) }}</span></td>
              <td class="num">{{ u.clubs }}</td>
              <td class="num">{{ u.tournaments }}</td>
              <td class="nowrap small">{{ when(u.createdAt) }}</td>
              <td>
                @if (u.blockedAt) {
                  <span class="chip danger">Bloqueada</span>
                  @if (u.blockedReason) { <div class="tiny muted">{{ u.blockedReason }}</div> }
                } @else { <span class="chip ok">Activa</span> }
              </td>
              <td class="r">
                @if (u.role !== 'SUPERADMIN') {
                  @if (u.blockedAt) { <button class="btn ghost sm" (click)="unblock(u)">Desbloquear</button> }
                  @else { <button class="btn danger sm" (click)="block(u)">Bloquear</button> }
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="muted">Ninguna cuenta coincide con la búsqueda.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .head { margin-bottom: 16px; }
    .search { max-width: 280px; }
    .panel { padding: 6px 10px; }
    .r { text-align: right; }
    @media (max-width: 560px) { .search { max-width: none; width: 100%; } }
  `],
})
export class AdminUsersComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  users = input.required<AdminUser[]>();
  changed = output<void>();
  q = signal('');

  shown = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.users().filter(u => !q || [u.fullName, u.email].some(v => v?.toLowerCase().includes(q)));
  });

  role(r: Role) { return ROLE_LABEL[r]; }
  when(s?: string) { return dateTime(s).split(',')[0]; }

  async block(u: AdminUser) {
    const reason = prompt(`Bloquear ${u.email}. No podrá usar su panel (sí ver torneos públicos).\n\nMotivo (opcional, lo verá el usuario):`);
    if (reason === null) return;
    try { await this.api.adminBlock(u.id, reason.trim()); this.toast.ok('Cuenta bloqueada'); this.changed.emit(); }
    catch (e) { this.toast.error(e); }
  }

  async unblock(u: AdminUser) {
    try { await this.api.adminUnblock(u.id); this.toast.ok('Cuenta desbloqueada'); this.changed.emit(); }
    catch (e) { this.toast.error(e); }
  }
}
