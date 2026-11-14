import { Component, OnChanges, computed, inject, input, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { CategoryPayments, PlayerPayment, Tournament } from '../../core/models';
import { ToastService } from '../../core/toast.service';

type Filter = 'all' | 'unpaid' | 'paid';

/** Pagos de inscripción: jugadores por categoría con su check de pagado (solo un registro, no bloquea nada). */
@Component({
  selector: 'mp-payments-tab',
  template: `
    @if (loading()) { <p class="muted">Cargando jugadores…</p> }
    @else {
      <div class="row between head">
        <div>
          <b class="big num">{{ paidCount() }}</b><span class="muted"> de {{ total() }} jugadores han pagado</span>
          <div class="bar"><span [style.width.%]="total() ? paidCount() * 100 / total() : 0"></span></div>
        </div>
        <div class="row">
          <input class="search" type="search" placeholder="Buscar jugador" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Buscar jugador">
          <div class="seg">
            <button [class.on]="filter() === 'all'" (click)="filter.set('all')">Todos</button>
            <button [class.on]="filter() === 'unpaid'" (click)="filter.set('unpaid')">Sin pagar</button>
            <button [class.on]="filter() === 'paid'" (click)="filter.set('paid')">Pagados</button>
          </div>
        </div>
      </div>

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
                  @if (p.pairStatus === 'PENDING') { <span class="chip warn">Pareja pendiente</span> }
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
    li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 4px; border-top: 1px solid var(--rule-2); }
    li.pair-start { border-top-color: var(--rule); }
    li:first-child { border-top: 0; }
    li:not(.pair-start) { padding-top: 2px; border-top: 0; }
    .who { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; min-width: 0; }
    .name { font-weight: 500; }
    li.paid .name { color: var(--ink-2); }
    .check { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px 5px 8px; border-radius: 999px; border: 1px solid var(--rule);
      cursor: pointer; font: 500 .85rem var(--body); color: var(--ink-2); flex: none; user-select: none; }
    .check input { width: 18px; height: 18px; accent-color: var(--ok); cursor: pointer; margin: 0; }
    .check.on { background: var(--ok-bg, #e8f4ec); border-color: var(--ok); color: var(--ok); }
    @media (max-width: 560px) { .search { width: 100%; } }
  `],
})
export class PaymentsTabComponent implements OnChanges {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  t = input.required<Tournament>();
  data = signal<CategoryPayments[]>([]);
  loading = signal(true);
  busy = signal<string | null>(null);
  filter = signal<Filter>('all');
  q = signal('');

  total = computed(() => this.data().reduce((a, c) => a + c.players.length, 0));
  paidCount = computed(() => this.data().reduce((a, c) => a + this.paidIn(c), 0));
  shown = computed(() => {
    const f = this.filter(), q = norm(this.q());
    return this.data().filter(c => c.players.length).map(c => ({
      ...c,
      rows: c.players.filter(p => (f === 'all' || (f === 'paid') === !!p.paidAt) && (!q || norm(p.fullName).includes(q))),
    })).filter(c => c.rows.length || (!q && f === 'all'));
  });

  ngOnChanges() { this.load(); }

  async load() {
    try { this.data.set(await this.api.payments(this.t().id)); }
    catch (e) { this.toast.error(e); }
    finally { this.loading.set(false); }
  }

  paidIn(c: CategoryPayments) { return c.players.filter(p => p.paidAt).length; }
  key(p: PlayerPayment) { return p.pairId + p.slot; }

  /** El check no cambia hasta confirmar en la ventana. */
  async toggle(p: PlayerPayment, ev: Event) {
    ev.preventDefault();
    const paid = !p.paidAt;
    const ok = await this.confirm.ask(paid
      ? { title: `¿Marcar a ${p.fullName} como pagado?`, message: 'Quedará registrado que ha pagado su inscripción en esta categoría. Podrás quitarlo si te equivocas.', ok: 'Confirmar' }
      : { title: `¿Quitar el pago de ${p.fullName}?`, message: 'Volverá a aparecer como «Sin pagar».', ok: 'Quitar pago', danger: true });
    if (!ok) return;
    this.busy.set(this.key(p));
    try {
      const r = await this.api.setPlayerPaid(p.pairId, p.slot, paid);
      this.data.update(list => list.map(c => ({ ...c, players: c.players.map(x => x.pairId === r.pairId && x.slot === r.slot ? r : x) })));
      this.toast.ok(paid ? 'Marcado como pagado' : 'Pago quitado');
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(null); }
  }
}

function norm(s: string) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
