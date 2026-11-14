import { Component, computed, input, output, signal } from '@angular/core';
import { Board, CategoryBoard, MatchView, Tournament } from '../../core/models';
import { categoryColor, FORMAT_LABEL } from '../../core/format';
import { CategoryBoardComponent } from '../../shared/category-board.component';
import { PosterComponent } from '../../shared/poster.component';
import { HonorBoardComponent } from '../../shared/honor-board.component';
import { podium } from '../../shared/honor';

/** Ver los cuadros, meter resultados y descargar carteles (generar está en la cabecera del torneo). */
@Component({
  selector: 'mp-draws-tab',
  imports: [CategoryBoardComponent, HonorBoardComponent, PosterComponent],
  template: `
    @if (!anyGenerated()) {
      <div class="panel empty"><h3>Aún no hay cuadros</h3><p>Genéralos con el botón de arriba cuando tengas las parejas.</p></div>
    }
    @if (board().categories.length && anyGenerated()) {
      <div class="row between bar">
        <div class="seg">
          @for (c of board().categories; track c.category.id) {
            <button [class.on]="!honor() && c.category.id === current()?.category?.id" (click)="catId.set(c.category.id)">
              <span class="dot" [style.background]="color(c)"></span>{{ c.category.name }}
              @if (liveIn(c)) { <span class="live cat-live" [title]="liveIn(c) + ' en juego'"></span> }
            </button>
          }
          @if (hasHonor()) { <button class="honor-chip" [class.on]="honor()" (click)="catId.set('honor')">🏆 Cuadro de honor</button> }
        </div>
        @if (!honor() && current(); as c) {
          @if (c.category.drawGenerated) { <span class="small muted">{{ format(c) }}. Pulsa un partido para meter el resultado.</span> }
        }
      </div>
      @if (honor()) {
        <mp-honor-board [board]="board()" />
        <div class="dl">
                <span class="tiny muted">Descargar</span>
                <button class="dl-btn" (click)="openPoster('pdf')">PDF</button>
                <button class="dl-btn" (click)="openPoster('png')">Imagen</button>
              </div>
      } @else if (current(); as c) {
        <mp-category-board [board]="c" [admin]="true" (matchClick)="matchClick.emit($event)" />
        @if (c.category.drawGenerated) {
        <div class="dl">
                <span class="tiny muted">Descargar</span>
                <button class="dl-btn" (click)="openPoster('pdf')">PDF</button>
                <button class="dl-btn" (click)="openPoster('png')">Imagen</button>
              </div>
        }
      }
    }
    @if (poster(); as kind) { <mp-poster [board]="board()" [category]="honor() ? null : current() ?? null" [kind]="kind" (closed)="poster.set(null)" /> }
  `,
  styles: [`
    .honor-chip { color: var(--gold-ink); font-weight: 600; }
    .dl { display: flex; justify-content: flex-end; align-items: center; gap: 4px; margin-top: 10px; }
    .dl-btn { background: none; border: 0; padding: 4px 8px; border-radius: 6px; font: 500 .82rem var(--body); color: var(--ink-2); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--rule); }
    .dl-btn:hover { color: var(--ink); background: var(--glass); }
    .cat-live { margin-left: 6px; }
    .bar { margin: 0 0 14px; }
    .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }
  `],
})
export class DrawsTabComponent {
  t = input.required<Tournament>();
  board = input.required<Board>();
  changed = output<void>();
  matchClick = output<MatchView>();

  catId = signal<string | null>(null);
  /** Ventana de descarga abierta (PDF o imagen). */
  poster = signal<'pdf' | 'png' | null>(null);
  honor = computed(() => this.catId() === 'honor' && this.hasHonor());
  /** Alguna categoría tiene ya campeón. */
  hasHonor = computed(() => this.board().categories.some(c => podium(c).done));

  current = computed(() => this.board().categories.find(c => c.category.id === this.catId()) ?? this.board().categories[0]);
  anyGenerated = computed(() => this.t().categories.some(c => c.drawGenerated));

  openPoster(kind: 'pdf' | 'png') { this.poster.set(kind); }
  color(c: CategoryBoard) { return categoryColor(c.category); }
  /** Partidos en juego de la categoría (punto rojo en su botón). */
  liveIn(c: CategoryBoard) { return c.matches.filter(m => m.live).length; }
  format(c: CategoryBoard) { return FORMAT_LABEL[c.category.format]; }

  /* Generar, regenerar y reprogramar están en la cabecera del torneo (DrawStatusComponent). */
}
