import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Board, CategoryBoard } from '../core/models';
import { categoryColor, range } from '../core/format';
import { ToastService } from '../core/toast.service';
import { CategoryBoardComponent } from './category-board.component';
import { LogoComponent } from './logo.component';
import { exportToPdf } from './pdf';

/** Cartel imprimible de una categoría (como los que se cuelgan en el club), con patrocinadores. */
@Component({
  selector: 'mp-poster',
  imports: [CategoryBoardComponent, LogoComponent],
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <div class="modal wide" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h3>Cartel en PDF</h3>
          <div class="row">
            <div class="seg">
              <button [class.on]="size() === 'a4'" (click)="size.set('a4')">A4</button>
              <button [class.on]="size() === 'a3'" (click)="size.set('a3')">A3</button>
            </div>
            <button class="btn" (click)="download()" [disabled]="busy()">{{ busy() ? 'Generando…' : 'Descargar PDF' }}</button>
            <button class="icon-btn" (click)="closed.emit()" aria-label="Cerrar">✕</button>
          </div>
        </div>
        <div class="preview">
          <div class="poster" #poster [style.--accent]="color()">
            <header>
              <div class="club">
                @if (board().club.logoUrl) { <img [src]="board().club.logoUrl" crossorigin="anonymous" alt=""> }
                @else { <mp-logo [size]="64" [wordmark]="false" /> }
              </div>
              <div class="title">
                <h1>{{ category().category.name }}</h1>
                <div class="sub">{{ board().tournament.name }} <span>{{ dates() }}</span> <span>{{ board().club.name }}</span></div>
              </div>
            </header>
            <main><mp-category-board [board]="category()" [print]="true" /></main>
            <footer>
              <div class="rules">Todos los partidos se jugarán a {{ board().tournament.scoringFormat }}</div>
              @if (board().tournament.sponsors.length) {
                <div class="sponsors">
                  @for (s of board().tournament.sponsors; track s.id) {
                    @if (s.logoUrl) { <img [src]="s.logoUrl" crossorigin="anonymous" [alt]="s.name" [class.main]="s.tier === 'PRINCIPAL'"> }
                    @else { <span class="sname" [class.main]="s.tier === 'PRINCIPAL'">{{ s.name }}</span> }
                  }
                </div>
              }
              <div class="brand"><mp-logo [size]="26" /></div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .preview { overflow: auto; background: var(--glass); border-radius: 12px; padding: 16px; max-height: 72vh; }
    .poster { background: #fff; padding: 36px 40px 28px; width: max-content; min-width: 1050px; margin: 0 auto; }
    header { display: flex; gap: 26px; align-items: center; margin-bottom: 28px; }
    .club { width: 110px; height: 110px; border: 1px solid var(--rule); border-radius: 20px; display: grid; place-items: center; padding: 10px; flex: none; }
    .club img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .title h1 { font: 300 68px/0.95 var(--body); color: var(--ink); text-transform: uppercase; margin: 0; letter-spacing: .08em; }
    .title h1::after { content: ''; display: block; width: 120px; height: 3px; margin-top: 14px; background: var(--accent); border-radius: 2px; }
    .sub { font: 500 17px var(--body); color: var(--ink-2); margin-top: 14px; text-transform: uppercase; letter-spacing: .18em; display: flex; gap: 22px; }
    .sub span { color: var(--ink-3); }
    main { margin-bottom: 24px; }
    footer { display: flex; align-items: center; gap: 28px; border-top: 1px solid var(--gold); padding-top: 18px; }
    .rules { font: 400 18px/1.3 var(--body); max-width: 520px; color: var(--ink-2); }
    .sponsors { display: flex; gap: 26px; align-items: center; flex: 1; justify-content: flex-end; flex-wrap: wrap; }
    .sponsors img { height: 48px; max-width: 170px; object-fit: contain; }
    .sponsors img.main { height: 66px; max-width: 230px; }
    .sname { font: 400 18px var(--body); text-transform: uppercase; letter-spacing: .14em; color: var(--ink-2); }
    .sname.main { font-size: 24px; color: var(--ink); }
    .brand { opacity: .85; }
  `],
})
export class PosterComponent {
  private toast = inject(ToastService);
  board = input.required<Board>();
  category = input.required<CategoryBoard>();
  closed = output<void>();
  poster = viewChild<ElementRef<HTMLElement>>('poster');
  busy = signal(false);
  size = signal<'a4' | 'a3'>('a4');

  color = computed(() => categoryColor(this.category().category));
  dates = computed(() => range(this.board().tournament.startDate, this.board().tournament.endDate));

  async download() {
    const el = this.poster()?.nativeElement;
    if (!el) return;
    this.busy.set(true);
    try {
      const name = `${this.board().tournament.slug}-${this.category().category.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await exportToPdf(el, `${name}.pdf`, this.size());
    } catch (e) {
      this.toast.error('No se pudo generar el PDF. Si usas logos externos, súbelos de nuevo desde MatchPoint.');
      console.error(e);
    } finally { this.busy.set(false); }
  }
}
