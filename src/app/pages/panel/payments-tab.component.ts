import { LoadingComponent } from '../../shared/loading.component';
import { Component, OnChanges, computed, inject, input, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { CategoryPayments, InscriptionCharge, PlayerAccount, PlayerAccounts, PlayerPayment, Tournament } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { saveFile } from '../../shared/files';
import { accountsCsv, euros, paymentsCsv, paymentsFileName } from './payments-export';

type Filter = 'all' | 'unpaid' | 'paid';
type View = 'player' | 'category';

/**
 * Pagos de inscripción (solo un registro, no bloquea nada). Por jugador: lo que debe cada uno según sus inscripciones
 * (1.ª a precio completo, las demás a precio de 2.ª, con tarifa de alumno si lo es) y su desglose; por categoría: el
 * check de cada jugador en cada pareja, como siempre.
 */
@Component({
  selector: 'mp-payments-tab',
  imports: [LoadingComponent],
  template: `
    @if (loading()) { <mp-loading text="Cargando jugadores…" /> }
    @else {
      <div class="row between head">
        <div>
          @if (acc()?.priced) {
            <b class="big num">{{ eur(acc()!.paid) }}</b><span class="muted"> recaudados de {{ eur(acc()!.total) }} · pendiente <b>{{ eur(acc()!.pending) }}</b></span>
            <div class="bar"><span [style.width.%]="acc()!.total ? (acc()!.paid ?? 0) * 100 / acc()!.total! : 0"></span></div>
          } @else {
            <b class="big num">{{ paidCount() }}</b><span class="muted"> de {{ total() }} inscripciones pagadas</span>
            <div class="bar"><span [style.width.%]="total() ? paidCount() * 100 / total() : 0"></span></div>
            <div class="tiny muted" style="margin-top:6px">Pon el precio de inscripción en Ajustes → Datos del torneo para ver los importes.</div>
          }
        </div>
        <div class="row">
          <div class="seg">
            <button [class.on]="view() === 'player'" (click)="view.set('player')">Por jugador</button>
            <button [class.on]="view() === 'category'" (click)="view.set('category')">Por categoría</button>
          </div>
          <button class="btn ghost sm" (click)="exportCsv()" [disabled]="!total()" title="Descarga el estado de los pagos en este momento">Exportar a Excel</button>
          <input class="search" type="search" placeholder="Buscar jugador" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Buscar jugador">
          <div class="seg">
            <button [class.on]="filter() === 'all'" (click)="filter.set('all')">Todos</button>
            <button [class.on]="filter() === 'unpaid'" (click)="filter.set('unpaid')">Sin pagar</button>
            <button [class.on]="filter() === 'paid'" (click)="filter.set('paid')">Pagados</button>
          </div>
        </div>
      </div>

      @if (view() === 'player') {
        <section class="panel">
          <ul class="accounts">
            @for (a of shownAccounts(); track a.playerId) {
              <li>
                <button class="acc" (click)="open.set(a.playerId)">
                  <span class="who">
                    <span class="name">{{ a.fullName }}</span>
                    @if (a.student) { <span class="chip ball">Alumno</span> }
                    <span class="tiny muted">{{ cats(a) }}</span>
                  </span>
                  <span class="money">
                    @if (a.total != null) { <span class="num">{{ eur(a.total) }}</span> }
                    @if (fullyPaid(a)) { <span class="chip ok">Pagado</span> }
                    @else if (a.pending != null) { <span class="chip warn">Debe {{ eur(a.pending) }}</span> }
                    @else { <span class="chip warn">{{ unpaidCount(a) }} sin pagar</span> }
                  </span>
                </button>
              </li>
            } @empty {
              <li class="small muted empty-row">{{ total() ? 'Ningún jugador con este filtro.' : 'Aún no hay jugadores: aparecerán cuando añadas parejas.' }}</li>
            }
          </ul>
        </section>
      } @else {
        @for (c of shown(); track c.categoryId) {
          <section class="panel cat">
            <header class="row between">
              <h3>{{ c.categoryName }}</h3>
              <span class="small muted">{{ paidIn(c) }} / {{ c.players.length }} pagados</span>
            </header>
            @if (!c.rows.length) { <p class="small muted">Ningún jugador con este filtro.</p> }
            <ul>
              @for (p of c.rows; track p.pairId + p.slot) {
                <li [class.paid]="!!p.paidAt" [class.pair-start]="p.slot === 1">
                  <div class="who">
                    <span class="name">{{ p.fullName }}</span>
                    @if (p.student) { <span class="chip ball">Alumno</span> }
                    @if (p.pairStatus === 'PENDING') { <span class="chip warn">Pareja pendiente</span> }
                    @if (p.price != null) { <span class="tiny muted">{{ eur(p.price) }} · {{ p.order === 1 ? '1.ª inscripción' : (p.order + '.ª inscripción') }}</span> }
                    @if (p.phone) { <span class="tiny muted">{{ p.phone }}</span> }
                  </div>
                  <label class="check" [class.on]="!!p.paidAt">
                    <input type="checkbox" [attr.aria-label]="'Pagado: ' + p.fullName" [checked]="!!p.paidAt" [disabled]="busy() === key(p)" (click)="toggle(p, $event)">
                    <span>{{ p.paidAt ? 'Pagado' : 'Sin pagar' }}</span>
                  </label>
                </li>
              }
            </ul>
          </section>
        } @empty {
          <div class="panel empty"><h3>Aún no hay jugadores</h3><p>Aparecerán aquí cuando añadas parejas.</p></div>
        }
      }
    }

    @if (openAccount(); as a) {
      <div class="backdrop" (click)="open.set(null)">
        <div class="modal" style="width:min(560px,100%)" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="acc-title">
          <div class="modal-head">
            <div>
              <h3 id="acc-title">{{ a.fullName }} @if (a.student) { <span class="chip ball">Alumno</span> }</h3>
              @if (a.phone) { <p class="small muted" style="margin:4px 0 0">{{ a.phone }}</p> }
            </div>
            <button class="icon-btn" (click)="open.set(null)" aria-label="Cerrar">✕</button>
          </div>
          <ul class="lines">
            @for (i of a.inscriptions; track i.pairId + i.slot) {
              <li [class.paid]="!!i.paidAt">
                <span class="cat-name">{{ i.categoryName }} <span class="tiny muted">· {{ i.order === 1 ? '1.ª inscripción' : (i.order + '.ª inscripción') }}@if (i.pairStatus === 'PENDING') { · pareja pendiente }</span></span>
                @if (i.price != null) { <span class="num">{{ eur(i.price) }}</span> }
                <label class="check" [class.on]="!!i.paidAt">
                  <input type="checkbox" [attr.aria-label]="'Pagado: ' + i.categoryName" [checked]="!!i.paidAt" [disabled]="!!busy()" (click)="toggleLine(a, i, $event)">
                  <span>{{ i.paidAt ? 'Pagado' : 'Sin pagar' }}</span>
                </label>
              </li>
            }
          </ul>
          @if (a.total != null) {
            <div class="sum">
              <span>Total <b class="num">{{ eur(a.total) }}</b></span>
              <span>Pagado <b class="num">{{ eur(a.paid) }}</b></span>
              <span [class.due]="(a.pending ?? 0) > 0">Pendiente <b class="num">{{ eur(a.pending) }}</b></span>
            </div>
          } @else {
            <p class="small muted">El torneo no tiene precio de inscripción: pon los precios en Ajustes → Datos del torneo para ver el importe.</p>
          }
          <div class="modal-foot">
            @if (fullyPaid(a)) {
              <button class="btn ghost" (click)="payAll(a, false)" [disabled]="!!busy()">Quitar todos los pagos</button>
            } @else {
              <button class="btn" (click)="payAll(a, true)" [disabled]="!!busy()">Marcar todo pagado{{ a.pending ? ' (' + eur(a.pending) + ')' : '' }}</button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .head { margin-bottom: 16px; gap: 14px; flex-wrap: wrap; }
    .big { font-size: 1.6rem; margin-right: 6px; }
    .bar { width: 260px; max-width: 100%; height: 6px; border-radius: 3px; background: var(--rule-2); margin-top: 8px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--ok); transition: width .3s; }
    .search { width: 200px; }
    .cat { margin-bottom: 14px; }
    .cat header { margin-bottom: 6px; }
    .cat h3 { margin: 0; }
    ul { list-style: none; margin: 0; padding: 0; }
    .cat li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 4px; border-top: 1px solid var(--rule-2); }
    .cat li.pair-start { border-top-color: var(--rule); }
    .cat li:first-child { border-top: 0; }
    .cat li:not(.pair-start) { padding-top: 2px; border-top: 0; }
    .who { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; min-width: 0; }
    .name { font-weight: 500; }
    li.paid .name { color: var(--ink-2); }
    .check { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px 5px 8px; border-radius: 999px; border: 1px solid var(--rule);
      cursor: pointer; font: 500 .85rem var(--body); color: var(--ink-2); flex: none; user-select: none; }
    .check input { width: 18px; height: 18px; accent-color: var(--ok); cursor: pointer; margin: 0; }
    .check.on { background: var(--ok-bg, #e8f4ec); border-color: var(--ok); color: var(--ok); }
    .accounts li + li { border-top: 1px solid var(--rule-2); }
    .acc { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 6px; background: none;
      border: 0; text-align: left; cursor: pointer; font: inherit; color: inherit; border-radius: var(--r-md); }
    .acc:hover { background: var(--glass); }
    .money { display: inline-flex; align-items: center; gap: 10px; flex: none; }
    .money .num { font-weight: 600; }
    .chip.ok { background: var(--ok-bg, #e8f4ec); color: var(--ok); }
    .empty-row { padding: 10px 6px; }
    .lines li { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--rule-2); }
    .lines li:first-child { border-top: 0; }
    .cat-name { font-weight: 500; }
    .sum { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px 18px; padding: 12px 0 4px; border-top: 1px solid var(--rule); }
    .sum .due b { color: var(--danger); }
    @media (max-width: 560px) { .search { width: 100%; } .lines li { grid-template-columns: 1fr auto; } }
  `],
})
export class PaymentsTabComponent implements OnChanges {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  t = input.required<Tournament>();
  data = signal<CategoryPayments[]>([]);
  acc = signal<PlayerAccounts | null>(null);
  loading = signal(true);
  busy = signal<string | null>(null);
  filter = signal<Filter>('all');
  view = signal<View>('player');
  q = signal('');
  /** Jugador con el desglose abierto. */
  open = signal<string | null>(null);
  openAccount = computed(() => this.acc()?.players.find(p => p.playerId === this.open()) ?? null);

  total = computed(() => this.data().reduce((a, c) => a + c.players.length, 0));
  paidCount = computed(() => this.data().reduce((a, c) => a + this.paidIn(c), 0));
  shown = computed(() => {
    const f = this.filter(), q = norm(this.q());
    return this.data().filter(c => c.players.length).map(c => ({
      ...c,
      rows: c.players.filter(p => (f === 'all' || (f === 'paid') === !!p.paidAt) && (!q || norm(p.fullName).includes(q))),
    })).filter(c => c.rows.length || (!q && f === 'all'));
  });
  shownAccounts = computed(() => {
    const f = this.filter(), q = norm(this.q());
    return (this.acc()?.players ?? []).filter(a => (f === 'all' || (f === 'paid') === this.fullyPaid(a)) && (!q || norm(a.fullName).includes(q)));
  });

  ngOnChanges() { this.load(); }

  async load() {
    try {
      const [d, a] = await Promise.all([this.api.payments(this.t().id), this.api.paymentsByPlayer(this.t().id)]);
      this.data.set(d);
      this.acc.set(a);
    } catch (e) { this.toast.error(e); }
    finally { this.loading.set(false); }
  }

  eur(v: number | null | undefined) { return v == null ? '—' : euros(v) + ' €'; }
  cats(a: PlayerAccount) { return a.inscriptions.map(i => i.categoryName).join(' · '); }
  fullyPaid(a: PlayerAccount) { return a.inscriptions.length > 0 && a.inscriptions.every(i => !!i.paidAt); }
  unpaidCount(a: PlayerAccount) { return a.inscriptions.filter(i => !i.paidAt).length; }

  /** Excel (CSV) de la vista actual, tal como está ahora (sin filtros ni búsqueda). */
  exportCsv() {
    if (this.view() === 'player') saveFile(paymentsFileName(this.t().slug, new Date(), '-por-jugador'), accountsCsv(this.acc()?.players ?? []), 'text/csv;charset=utf-8');
    else saveFile(paymentsFileName(this.t().slug), paymentsCsv(this.data()), 'text/csv;charset=utf-8');
    this.toast.ok('Pagos exportados');
  }

  paidIn(c: CategoryPayments) { return c.players.filter(p => p.paidAt).length; }
  key(p: { pairId: string; slot: number }) { return p.pairId + p.slot; }

  /** El check no cambia hasta confirmar en la ventana. */
  async toggle(p: PlayerPayment, ev: Event) {
    ev.preventDefault();
    await this.setOne(p.fullName, p.pairId, p.slot, !p.paidAt, p.price);
  }

  async toggleLine(a: PlayerAccount, i: InscriptionCharge, ev: Event) {
    ev.preventDefault();
    await this.setOne(`${a.fullName} (${i.categoryName})`, i.pairId, i.slot, !i.paidAt, i.price);
  }

  private async setOne(who: string, pairId: string, slot: 1 | 2, paid: boolean, price?: number | null) {
    const amount = price != null ? ` (${this.eur(price)})` : '';
    const ok = await this.confirm.ask(paid
      ? { title: `¿Marcar a ${who} como pagado${amount}?`, message: 'Quedará registrado que ha pagado esta inscripción. Podrás quitarlo si te equivocas.', ok: 'Confirmar' }
      : { title: `¿Quitar el pago de ${who}?`, message: 'Volverá a aparecer como «Sin pagar».', ok: 'Quitar pago', danger: true });
    if (!ok) return;
    this.busy.set(pairId + slot);
    try {
      await this.api.setPlayerPaid(pairId, slot, paid);
      this.toast.ok(paid ? 'Marcado como pagado' : 'Pago quitado');
      await this.load();
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(null); }
  }

  /** Todas las inscripciones del jugador de una vez. */
  async payAll(a: PlayerAccount, paid: boolean) {
    const ok = await this.confirm.ask(paid
      ? { title: `¿Marcar todo pagado a ${a.fullName}?`, message: `Sus ${a.inscriptions.length} inscripciones quedarán como pagadas${a.pending ? ' (' + this.eur(a.pending) + ' pendientes)' : ''}.`, ok: 'Marcar todo pagado' }
      : { title: `¿Quitar todos los pagos de ${a.fullName}?`, message: 'Todas sus inscripciones volverán a «Sin pagar».', ok: 'Quitar pagos', danger: true });
    if (!ok) return;
    this.busy.set(a.playerId);
    try {
      await this.api.setPlayerAllPaid(a.playerId, paid);
      this.toast.ok(paid ? 'Todo pagado' : 'Pagos quitados');
      await this.load();
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(null); }
  }
}

function norm(s: string) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
