import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AdminPayment } from '../../core/models';
import { parseDate, shortDate } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { ConfirmService } from '../../core/confirm.service';
import { saveFile } from '../../shared/files';
import { byMethod, byMonth, euros, inPeriod, METHOD_LABEL, MONTHS, Period, sum, toCsv, years } from './accounting';

/** Contabilidad: lo cobrado por activar torneos, por semana, mes y año. */
@Component({
  selector: 'mp-admin-accounting',
  template: `
    <div class="tiles">
      <div class="tile"><span>Esta semana</span><b class="num">{{ eur(totals().week) }}</b></div>
      <div class="tile"><span>Este mes</span><b class="num">{{ eur(totals().month) }}</b></div>
      <div class="tile"><span>Este año</span><b class="num">{{ eur(totals().year) }}</b></div>
      <div class="tile"><span>Total</span><b class="num">{{ eur(totals().all) }}</b></div>
    </div>

    <section class="panel">
      <div class="row between">
        <h3>Ingresos por mes</h3>
        <label class="year">Año
          <select [value]="year()" (change)="year.set(+$any($event.target).value)">
            @for (y of yearList(); track y) { <option [value]="y">{{ y }}</option> }
          </select>
        </label>
      </div>
      <div class="chart" role="img" [attr.aria-label]="chartLabel()">
        @for (v of months(); track $index) {
          <div class="col" tabindex="0" [attr.aria-label]="monthNames[$index] + ': ' + eur(v)">
            <span class="tip num">{{ monthNames[$index] }} {{ year() }} · {{ eur(v) }}</span>
            <div class="bar-area">
              @if (v > 0) { <div class="bar" [style.height.%]="v / maxMonth() * 100"></div> }
            </div>
            <span class="m">{{ monthNames[$index] }}</span>
          </div>
        }
      </div>
      <p class="tiny muted">Total {{ year() }}: <b class="num">{{ eur(yearTotal()) }}</b>@if (bestMonth(); as b) { · Mejor mes: {{ b }}}</p>
    </section>

    <section class="panel">
      <div class="row between">
        <h3>Cobros</h3>
        <div class="row">
          <div class="seg" role="tablist" aria-label="Periodo">
            <button [class.on]="period() === 'week'" (click)="period.set('week')">Semana</button>
            <button [class.on]="period() === 'month'" (click)="period.set('month')">Mes</button>
            <button [class.on]="period() === 'year'" (click)="period.set('year')">Año {{ year() }}</button>
            <button [class.on]="period() === 'all'" (click)="period.set('all')">Todo</button>
          </div>
          <button class="btn ghost sm" (click)="download()" [disabled]="!list().length">Descargar Excel (CSV)</button>
        </div>
      </div>
      <div class="sumrow">
        <span><b class="num">{{ eur(listTotal()) }}</b> en {{ list().length }} {{ list().length === 1 ? 'cobro' : 'cobros' }}</span>
        @for (m of methods(); track m.method) { <span class="chip grey">{{ methodLabel[m.method] }}: {{ eur(m.total) }}</span> }
      </div>
      @if (list().length) {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Fecha</th><th>Club</th><th>Torneo</th><th>Forma</th><th class="r">Importe</th><th></th></tr></thead>
            <tbody>
              @for (p of list(); track p.id) {
                <tr>
                  <td class="nowrap">{{ day(p.paidOn) }}</td>
                  <td>{{ p.clubName }}</td>
                  <td>{{ p.tournamentName }}@if (p.note) { <div class="tiny muted">{{ p.note }}</div> }</td>
                  <td>{{ methodLabel[p.method] }}</td>
                  <td class="r num">{{ eur(p.amount) }}</td>
                  <td class="r"><button class="icon-btn" (click)="remove(p)" [attr.aria-label]="'Borrar cobro de ' + p.tournamentName" title="Borrar cobro">✕</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="muted">No hay cobros en este periodo. Se apuntan al activar un torneo o con "Apuntar cobro".</p>
      }
    </section>
  `,
  styles: [`
    .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
    .tile { background: #fff; border: 1px solid var(--rule); border-radius: var(--r-lg); padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
    .tile span { font-size: .78rem; color: var(--ink-3); letter-spacing: .08em; text-transform: uppercase; }
    .tile b { font-size: 1.9rem; font-weight: 500; color: var(--ink); }
    @media (max-width: 760px) { .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    h3 { margin: 0; }
    .year { display: inline-flex; align-items: center; gap: 8px; font-size: .88rem; color: var(--ink-2); }
    .year select { width: auto; }
    .chart { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 2px; height: 220px; margin: 18px 0 8px;
      border-bottom: 1px solid var(--rule); background: repeating-linear-gradient(to top, var(--rule-2) 0 1px, transparent 1px 25%); }
    .col { position: relative; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; min-width: 0; outline: none; cursor: default; }
    .bar-area { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
    .bar { width: min(28px, 70%); min-height: 2px; background: var(--court); border-radius: 4px 4px 0 0; transition: background .15s; }
    .col:hover .bar, .col:focus-visible .bar { background: var(--gold-ink); }
    .col:hover, .col:focus-visible { background: rgba(201, 164, 106, .08); }
    .m { position: absolute; bottom: -22px; font-size: .72rem; color: var(--ink-3); }
    .tip { position: absolute; bottom: calc(100% - 4px); left: 50%; transform: translateX(-50%); white-space: nowrap; pointer-events: none;
      background: var(--night); color: var(--cream); font-size: .8rem; padding: 5px 9px; border-radius: 6px; opacity: 0; transition: opacity .12s; z-index: 2; }
    .col:hover .tip, .col:focus-visible .tip { opacity: 1; }
    .col:first-child .tip { left: 0; transform: none; }
    .col:last-child .tip { left: auto; right: 0; transform: none; }
    .chart + p { margin-top: 30px; }
    .sumrow { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; margin: 14px 0; }
    .r { text-align: right; }
  `],
})
export class AdminAccountingComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  payments = input.required<AdminPayment[]>();
  changed = output<void>();

  private today = new Date();
  year = signal(this.today.getFullYear());
  period = signal<Period>('month');

  eur = euros;
  methodLabel = METHOD_LABEL;
  monthNames = MONTHS;

  totals = computed(() => {
    const p = this.payments();
    return {
      week: sum(inPeriod(p, 'week', this.today)),
      month: sum(inPeriod(p, 'month', this.today)),
      year: sum(inPeriod(p, 'year', this.today)),
      all: sum(p),
    };
  });

  yearList = computed(() => years(this.payments(), this.today));
  months = computed(() => byMonth(this.payments(), this.year()));
  maxMonth = computed(() => Math.max(...this.months(), 0.01));
  yearTotal = computed(() => sum(inPeriod(this.payments(), 'year', this.today, this.year())));
  bestMonth = computed(() => {
    const m = this.months();
    const max = Math.max(...m);
    return max > 0 ? `${MONTHS[m.indexOf(max)]} (${euros(max)})` : '';
  });
  chartLabel = computed(() => `Ingresos por mes en ${this.year()}: ` + this.months().map((v, i) => `${MONTHS[i]} ${euros(v)}`).join(', '));

  list = computed(() => inPeriod(this.payments(), this.period(), this.today, this.year()));
  listTotal = computed(() => sum(this.list()));
  methods = computed(() => byMethod(this.list()));

  day(d: string) { return `${shortDate(d)} ${parseDate(d).getFullYear()}`; }

  download() {
    const names: Record<Period, string> = { week: 'semana', month: 'mes', year: String(this.year()), all: 'todo' };
    saveFile(`matchzone-cobros-${names[this.period()]}.csv`, toCsv(this.list()), 'text/csv;charset=utf-8');
  }

  async remove(p: AdminPayment) {
    if (!(await this.confirm.ask({ title: `¿Borrar el cobro de ${euros(p.amount)}?`,
      message: `De "${p.tournamentName}". Solo para corregir errores: no se puede deshacer.`, ok: 'Borrar cobro', danger: true }))) return;
    try { await this.api.adminDeletePayment(p.id); this.toast.ok('Cobro borrado'); this.changed.emit(); }
    catch (e) { this.toast.error(e); }
  }
}
