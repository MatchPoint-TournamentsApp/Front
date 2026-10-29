import { Component, computed, input, output, signal } from '@angular/core';
import { Board, CategoryBoard, MatchView, Tournament } from '../../core/models';
import { categoryColor, FORMAT_LABEL } from '../../core/format';
import { CategoryBoardComponent } from '../../shared/category-board.component';
import { PosterComponent } from '../../shared/poster.component';

/** Ver los cuadros, meter resultados y descargar carteles (generar está en la cabecera del torneo). */
@Component({
  selector: 'mp-draws-tab',
  imports: [CategoryBoardComponent, PosterComponent],
  template: `
    @if (!anyGenerated()) {
      <div class="panel empty"><h3>Aún no hay cuadros</h3><p>Genéralos con el botón de arriba cuando tengas las parejas.</p></div>
    }
    @if (board().categories.length && anyGenerated()) {
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
            </div>
          }
        }
      </div>
      @if (current(); as c) { <mp-category-board [board]="c" [admin]="true" (matchClick)="matchClick.emit($event)" /> }
    }
    @if (poster() && current(); as c) { <mp-poster [board]="board()" [category]="c" (closed)="poster.set(false)" /> }
  `,
  styles: [`
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
  poster = signal(false);

  current = computed(() => this.board().categories.find(c => c.category.id === this.catId()) ?? this.board().categories[0]);
  anyGenerated = computed(() => this.t().categories.some(c => c.drawGenerated));

  color(c: CategoryBoard) { return categoryColor(c.category); }
  format(c: CategoryBoard) { return FORMAT_LABEL[c.category.format]; }

  /* Generar, regenerar y reprogramar están en la cabecera del torneo (DrawStatusComponent). */
}
