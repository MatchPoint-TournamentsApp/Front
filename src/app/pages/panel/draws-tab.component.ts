import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { Board, CategoryBoard, DrawSummary, MatchView, Tournament } from '../../core/models';
import { categoryColor, FORMAT_LABEL } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { CategoryBoardComponent } from '../../shared/category-board.component';
import { PosterComponent } from '../../shared/poster.component';

/** Generar cuadros, verlos, meter resultados y descargar carteles. */
@Component({
  selector: 'mp-draws-tab',
  imports: [CategoryBoardComponent, PosterComponent],
  template: `
    <section class="panel gen">
      <div>
        <h3>Generar cuadros y horarios</h3>
        <p class="small muted">Se colocan las parejas confirmadas teniendo en cuenta sus restricciones, los jugadores que están en varias categorías y las pistas libres. Tarda unos segundos.</p>
        @if (pendingCats().length) {
          <div class="row" style="gap:6px">
            @for (c of pendingCats(); track c.id) { <span class="chip">{{ c.name }}: {{ c.confirmedPairs }} parejas</span> }
          </div>
        }
      </div>
      <div class="row">
        <button class="btn ghost" (click)="reschedule()" [disabled]="busy() || !anyGenerated()">Reprogramar horarios</button>
        <button class="btn ball" (click)="generate()" [disabled]="busy() || !pendingCats().length">{{ busy() ? 'Calculando…' : 'Generar cuadros' }}</button>
      </div>
    </section>

    @if (summary(); as s) {
      <div class="notice" [class.warn]="s.unscheduled > 0 || s.warnings > 0" style="margin-top:12px">
        <b>{{ s.matches }} partidos, {{ s.scheduled }} con pista y hora.</b>
        @for (m of s.messages; track $index) { <div>{{ m }}</div> }
      </div>
    }

    @if (board().categories.length) {
      <div class="row between bar">
        <div class="seg">
          @for (c of board().categories; track c.category.id) {
            <button [class.on]="c.category.id === current()?.category?.id" (click)="catId.set(c.category.id)">
              <span class="dot" [style.background]="color(c)"></span>{{ c.category.name }}
            </button>
          }
        </div>
        @if (current(); as c) {
          @if (c.category.drawGenerated) {
            <div class="row">
              <span class="small muted">{{ format(c) }}. Pulsa un partido para meter el resultado.</span>
              <button class="btn ghost sm" (click)="poster.set(true)">Cartel PDF</button>
              <button class="btn danger sm" (click)="reset(c)">Reiniciar cuadro</button>
            </div>
          }
        }
      </div>
      @if (current(); as c) { <mp-category-board [board]="c" [admin]="true" (matchClick)="matchClick.emit($event)" /> }
    }
    @if (poster() && current(); as c) { <mp-poster [board]="board()" [category]="c" (closed)="poster.set(false)" /> }
  `,
  styles: [`
    .gen { display: flex; gap: 20px; justify-content: space-between; align-items: center; flex-wrap: wrap; }
    .gen > div:first-child { flex: 1; min-width: 280px; }
    .gen p { margin-bottom: 10px; }
    .bar { margin: 24px 0 14px; }
    .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }
  `],
})
export class DrawsTabComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  t = input.required<Tournament>();
  board = input.required<Board>();
  changed = output<void>();
  matchClick = output<MatchView>();

  catId = signal<string | null>(null);
  busy = signal(false);
  poster = signal(false);
  summary = signal<DrawSummary | null>(null);

  current = computed(() => this.board().categories.find(c => c.category.id === this.catId()) ?? this.board().categories[0]);
  pendingCats = computed(() => this.t().categories.filter(c => !c.drawGenerated && c.confirmedPairs >= 2));
  anyGenerated = computed(() => this.t().categories.some(c => c.drawGenerated));

  color(c: CategoryBoard) { return categoryColor(c.category); }
  format(c: CategoryBoard) { return FORMAT_LABEL[c.category.format]; }

  async generate() {
    const without = this.t().categories.filter(c => !c.drawGenerated && c.pendingPairs > 0);
    if (without.length && !confirm(`Hay inscripciones pendientes en ${without.map(c => c.name).join(', ')} que no entrarán en el cuadro. ¿Generar igualmente?`)) return;
    this.busy.set(true);
    try {
      this.summary.set(await this.api.generate(this.t().id));
      this.toast.ok('Cuadros generados');
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }

  async reschedule() {
    if (!confirm('Se recalcularán pista y hora de los partidos pendientes (no los jugados ni los fijados a mano). ¿Continuar?')) return;
    this.busy.set(true);
    try {
      this.summary.set(await this.api.reschedule(this.t().id));
      this.toast.ok('Horarios recalculados');
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }

  async reset(c: CategoryBoard) {
    const played = c.matches.some(m => m.status === 'PLAYED' || m.status === 'WALKOVER');
    if (!confirm(`¿Reiniciar el cuadro de ${c.category.name}?${played ? ' Se perderán los resultados ya introducidos.' : ''}`)) return;
    try { await this.api.resetDraw(c.category.id); this.toast.ok('Cuadro reiniciado'); this.changed.emit(); }
    catch (e) { this.toast.error(e); }
  }
}
