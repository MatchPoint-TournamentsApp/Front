import { Component, ElementRef, computed, input, output, signal, viewChild, effect } from '@angular/core';
import { CategoryBoard, MatchView } from '../core/models';
import { BracketComponent } from './bracket.component';
import { LeagueComponent } from './league.component';

/** Muestra el cuadro o la liguilla de una categoría, con zoom para cuadros grandes. */
@Component({
  selector: 'mp-category-board',
  imports: [BracketComponent, LeagueComponent],
  template: `
    @if (!board().category.drawGenerated) {
      <div class="empty">
        <h3>Cuadro pendiente</h3>
        <p>{{ board().pairs.length }} parejas confirmadas. El cuadro se publicará cuando el club lo genere.</p>
      </div>
    } @else if (board().category.format === 'LEAGUE') {
      <mp-league [board]="board()" [admin]="admin()" (matchClick)="matchClick.emit($event)" />
    } @else {
      @if (!print()) {
        <div class="zoom">
          <button class="icon-btn" (click)="zoomBy(-0.1)" aria-label="Alejar">−</button>
          <span class="tiny muted num">{{ pct() }}%</span>
          <button class="icon-btn" (click)="zoomBy(0.1)" aria-label="Acercar">+</button>
          <button class="btn ghost sm" (click)="fit()">Ver entero</button>
        </div>
      }
      <div class="viewport" #viewport [class.print]="print()">
        <div class="scaler" [style.transform]="'scale(' + scale() + ')'" [style.width.px]="innerW() * scale()" [style.height.px]="innerH() * scale()">
          <div class="inner" #inner>
            <mp-bracket [board]="board()" [admin]="admin()" (matchClick)="matchClick.emit($event)" />
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .zoom { display: flex; gap: 8px; align-items: center; justify-content: flex-end; margin-bottom: 10px; }
    .viewport { overflow: auto; max-height: 78vh; border-radius: 12px; background: #fff; border: 1px solid var(--rule); padding: 18px; }
    .viewport.print { overflow: visible; max-height: none; border: 0; padding: 0; background: transparent; }
    .scaler { transform-origin: 0 0; }
    .inner { width: max-content; }
  `],
})
export class CategoryBoardComponent {
  board = input.required<CategoryBoard>();
  admin = input(false);
  print = input(false);
  matchClick = output<MatchView>();

  viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  inner = viewChild<ElementRef<HTMLElement>>('inner');
  scale = signal(1);
  innerW = signal(0);
  innerH = signal(0);
  pct = computed(() => Math.round(this.scale() * 100));
  private fittedFor = '';

  constructor() {
    effect(() => {
      this.board();
      const el = this.inner()?.nativeElement;
      if (!el) return;
      queueMicrotask(() => {
        this.innerW.set(el.scrollWidth);
        this.innerH.set(el.scrollHeight);
        const id = this.board().category.id;
        if (this.fittedFor !== id && !this.print()) { this.fittedFor = id; this.fit(0.75); }
      });
    });
  }

  zoomBy(d: number) { this.scale.set(Math.min(1.6, Math.max(0.3, +(this.scale() + d).toFixed(2)))); }

  /** Ajusta el cuadro al ancho disponible. Con mínimo, prioriza que se lea (se puede desplazar). */
  fit(min = 0.3) {
    const vp = this.viewport()?.nativeElement;
    if (!vp || !this.innerW()) return;
    const s = (vp.clientWidth - 36) / this.innerW();
    this.scale.set(Math.min(1, Math.max(min, +s.toFixed(2))));
  }
}
