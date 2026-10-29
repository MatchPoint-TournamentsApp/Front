import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { DrawSummary, Tournament } from '../../core/models';
import { dayName, shortDate } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { LoadingOverlayComponent } from '../../shared/loading-overlay.component';

type State = 'empty' | 'pending' | 'outdated' | 'ready' | 'locked';

/**
 * Estado de los cuadros y acción principal del torneo, siempre visible en la cabecera.
 * Hasta que empieza el torneo se pueden volver a generar tantas veces como haga falta.
 */
@Component({
  selector: 'mp-draw-status',
  imports: [LoadingOverlayComponent],
  template: `
    <section class="status" [class]="'s-' + state()">
      <span class="icon" aria-hidden="true">{{ icon() }}</span>
      <div class="text">
        <b>{{ title() }}</b>
        <span>{{ detail() }}</span>
      </div>
      <div class="actions">
        @switch (state()) {
          @case ('pending') { <button class="btn ball" (click)="regenerate()">Generar cuadros</button> }
          @case ('outdated') {
            @if (onlyTiming()) { <button class="btn ghost" (click)="reschedule()">Solo reprogramar horarios</button> }
            <button class="btn ball" (click)="regenerate()">Regenerar cuadros</button>
          }
          @case ('ready') { <button class="btn ghost" (click)="regenerate()">Volver a generar</button> }
          @case ('locked') {
            @if (t().drawsOutdated) { <button class="btn ghost" (click)="reschedule()">Reprogramar horarios</button> }
          }
        }
      </div>
    </section>
    @if (summary(); as s) {
      <div class="notice summary" [class.warn]="s.unscheduled > 0 || s.warnings > 0">
        <b>{{ s.matches }} partidos, {{ s.scheduled }} con pista y hora.</b>
        @for (m of s.messages; track $index) { <div>{{ m }}</div> }
        <button class="icon-btn close" (click)="summary.set(null)" aria-label="Cerrar resumen">✕</button>
      </div>
    }
    @if (busy(); as b) { <mp-loading-overlay [title]="b" /> }
  `,
  styles: [`
    .status { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 16px 20px; margin-bottom: 18px;
      border-radius: var(--r-lg); border: 1px solid var(--rule); background: #fff; border-left: 3px solid var(--rule); }
    .status.s-pending, .status.s-outdated { border-left-color: var(--gold); background: linear-gradient(90deg, var(--court-3), #fff 60%); }
    .status.s-ready { border-left-color: var(--ok); }
    .status.s-locked { border-left-color: var(--night); background: #fbfaf7; }
    .icon { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; flex: none; font-size: .95rem;
      background: var(--rule-2); color: var(--ink-2); }
    .s-pending .icon, .s-outdated .icon { background: var(--gold-grad); color: var(--night); }
    .s-ready .icon { background: var(--ok-bg); color: var(--ok); }
    .s-locked .icon { background: var(--night); color: var(--gold); }
    .text { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 2px; }
    .text b { font-weight: 600; }
    .text span { font-size: .88rem; color: var(--ink-2); }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .summary { position: relative; margin: -6px 0 18px; padding-right: 44px; }
    .close { position: absolute; top: 8px; right: 8px; }
    @media (max-width: 560px) { .actions { width: 100%; } .actions .btn { flex: 1; } }
  `],
})
export class DrawStatusComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  t = input.required<Tournament>();
  /** Tras generar o reprogramar: recargar el torneo. */
  changed = output<void>();
  /** Tras generar: ir a ver los cuadros. */
  generated = output<void>();

  busy = signal<string | null>(null);
  summary = signal<DrawSummary | null>(null);

  private playable = computed(() => this.t().categories.filter(c => c.confirmedPairs >= 2));
  private generatedCats = computed(() => this.t().categories.filter(c => c.drawGenerated));
  private pendingCats = computed(() => this.playable().filter(c => !c.drawGenerated));

  state = computed<State>(() => {
    const t = this.t();
    if (t.started) return 'locked';
    if (!this.playable().length) return 'empty';
    if (!this.generatedCats().length) return 'pending';
    if (this.pendingCats().length || t.drawsOutdated) return 'outdated';
    return 'ready';
  });

  /** Solo han cambiado horarios (días, pistas, restricciones): basta con reprogramar sin volver a sortear. */
  onlyTiming = computed(() => this.t().drawsOutdated && !this.pendingCats().length);

  icon = computed(() => ({ empty: '·', pending: '▶', outdated: '↻', ready: '✓', locked: '●' })[this.state()]);

  title = computed(() => ({
    empty: 'Todavía no se pueden generar los cuadros',
    pending: 'Cuadros sin generar',
    outdated: 'Has hecho cambios desde la última generación',
    ready: 'Cuadros generados y al día',
    locked: 'Torneo en juego: cuadros bloqueados',
  })[this.state()]);

  detail = computed(() => {
    const starts = this.startsText();
    switch (this.state()) {
      case 'empty': return 'Crea las categorías y añade al menos 2 parejas confirmadas en alguna.';
      case 'pending': {
        const n = this.playable().reduce((a, c) => a + c.confirmedPairs, 0);
        return `${n} parejas en ${this.playable().length} categorías. Se colocan según su disponibilidad.`;
      }
      case 'outdated': {
        const cats = this.pendingCats().map(c => c.name);
        const what = cats.length ? `Pendientes de generar: ${cats.join(', ')}.` : 'Han cambiado horarios, pistas o disponibilidad.';
        return `${what} Puedes regenerar ${starts ? 'hasta el ' + starts : 'hasta que empiece el torneo'}.`;
      }
      case 'ready': return `Puedes editar y volver a generar ${starts ? 'hasta el ' + starts : 'hasta que empiece el torneo'}.`;
      case 'locked': return this.t().drawsOutdated
        ? 'Hay cambios de horario: puedes reprogramar pista y hora de los partidos pendientes.'
        : 'Ya no se pueden cambiar los cuadros. Puedes mover pista y hora de un partido desde el cuadro o el horario.';
    }
  });

  private startsText() {
    const s = this.t().startsAt;
    if (!s) return '';
    const [d, time] = s.split('T');
    return `${dayName(d).toLowerCase()} ${shortDate(d)} a las ${time.slice(0, 5)}`;
  }

  async regenerate() {
    const t = this.t();
    const pendingInscriptions = t.categories.filter(c => c.pendingPairs > 0).map(c => c.name);
    if (this.generatedCats().length && !confirm('Se volverán a colocar todas las parejas y a calcular todos los horarios desde cero. ¿Continuar?')) return;
    if (pendingInscriptions.length && !confirm(`Hay inscripciones sin confirmar en ${pendingInscriptions.join(', ')}: no entrarán en los cuadros. ¿Generar igualmente?`)) return;
    await this.run(this.generatedCats().length ? 'Regenerando cuadros y horarios…' : 'Generando cuadros y horarios…',
      () => this.api.regenerate(t.id), 'Cuadros generados', true);
  }

  async reschedule() {
    await this.run('Recalculando pistas y horarios…', () => this.api.reschedule(this.t().id), 'Horarios recalculados', false);
  }

  private async run(label: string, call: () => Promise<DrawSummary>, ok: string, wasGenerate: boolean) {
    this.busy.set(label);
    this.summary.set(null);
    try {
      this.summary.set(await call());
      this.toast.ok(ok);
      this.changed.emit();
      if (wasGenerate) this.generated.emit();
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(null); }
  }
}
