import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Board, CategoryBoard } from '../core/models';
import { categoryColor, range } from '../core/format';
import { ToastService } from '../core/toast.service';
import { CategoryBoardComponent } from './category-board.component';
import { HonorBoardComponent } from './honor-board.component';
import { LogoComponent } from './logo.component';
import { exportToPdf, exportToPng } from './pdf';

/**
 * Cartel imprimible de una categoría o del cuadro de honor (sin categoría), como los que se cuelgan
 * en el club: patrocinadores principales en la cabecera, colaboradores abajo y MatchZone como marca de agua.
 * Se descarga en PDF (A4/A3) o en imagen PNG.
 */
@Component({
  selector: 'mp-poster',
  imports: [CategoryBoardComponent, HonorBoardComponent, LogoComponent],
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <div class="modal wide" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="poster-title">
        <div class="modal-head">
          <h3 id="poster-title">{{ kind() === 'png' ? 'Descargar imagen' : 'Descargar PDF' }}</h3>
          <div class="row">
            @if (kind() === 'pdf') {
              <div class="seg">
                <button [class.on]="size() === 'a4'" (click)="size.set('a4')">A4</button>
                <button [class.on]="size() === 'a3'" (click)="size.set('a3')">A3</button>
              </div>
              <button class="btn" (click)="download('pdf')" [disabled]="busy()">{{ busy() ? 'Generando…' : 'Descargar PDF' }}</button>
            } @else {
              <button class="btn" (click)="download('png')" [disabled]="busy()">{{ busy() ? 'Generando…' : 'Descargar PNG' }}</button>
            }
            <button class="icon-btn" (click)="closed.emit()" aria-label="Cerrar">✕</button>
          </div>
        </div>
        <div class="preview">
          <div class="poster" #poster [class.fixed]="fixed()" [style.--accent]="color()">
            <header>
              <div class="club">
                @if (board().club.logoUrl) { <img [src]="board().club.logoUrl" crossorigin="anonymous" alt=""> }
                @else { <mp-logo [size]="64" [wordmark]="false" /> }
              </div>
              <div class="title">
                <h1>{{ category()?.category?.name ?? 'Cuadro de honor' }}</h1>
                <span class="accent"></span>
                <div class="sub">{{ board().tournament.name }} <span>{{ dates() }}</span> <span>{{ board().club.name }}</span></div>
              </div>
              @if (principal().length) {
                <div class="main-sponsors">
                  @for (s of principal(); track s.id) {
                    @if (s.logoUrl) { <img [src]="s.logoUrl" crossorigin="anonymous" [alt]="s.name"> }
                    @else { <span class="sname">{{ s.name }}</span> }
                  }
                </div>
              }
            </header>
            <div class="divider"></div>
            <main>
              @if (category(); as c) { <mp-category-board [board]="c" [print]="true" /> }
              @else { <mp-honor-board class="print" [board]="board()" /> }
            </main>
            @if (collaborators().length) {
              <section class="collab">
                <span class="label">Colaboradores</span>
                <div class="logos">
                  @for (s of collaborators(); track s.id) {
                    @if (s.logoUrl) { <img [src]="s.logoUrl" crossorigin="anonymous" [alt]="s.name"> }
                    @else { <span class="sname">{{ s.name }}</span> }
                  }
                </div>
              </section>
            }
            <footer>
              <div class="rules">
                @if (category()) { Todos los partidos se jugarán a {{ board().tournament.scoringFormat }} }
                @else { Enhorabuena a todas las parejas participantes }
              </div>
              <div class="watermark"><mp-logo [size]="30" /></div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .preview { overflow: auto; background: var(--glass); border-radius: 12px; padding: 16px; max-height: 72vh; }
    .poster { background: #fff; padding: 40px 44px 26px; width: max-content; min-width: 1050px; margin: 0 auto; }
    /* Liguillas y cuadro de honor ocupan el ancho disponible: sin ancho fijo el cartel crecería sin límite. */
    .poster.fixed { width: 1240px; min-width: 0; }
    header { display: flex; gap: 28px; align-items: center; }
    .club { width: 110px; height: 110px; border: 1px solid var(--rule); border-radius: 20px; display: grid; place-items: center; padding: 10px; flex: none; }
    .club img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .title { flex: 1; min-width: 0; }
    .title h1 { font: 300 64px/0.95 var(--body); color: var(--ink); text-transform: uppercase; margin: 0; letter-spacing: .08em; }
    /* Elemento real y no ::after: html2canvas colocaba el pseudoelemento encima del título. */
    .title .accent { display: block; width: 120px; height: 3px; margin-top: 14px; background: var(--accent); border-radius: 2px; }
    .sub { font: 500 16px var(--body); color: var(--ink-2); margin-top: 14px; text-transform: uppercase; letter-spacing: .18em; display: flex; gap: 22px; flex-wrap: wrap; }
    .sub span { color: var(--ink-3); }
    .main-sponsors { flex: none; display: flex; gap: 26px; align-items: center; padding-left: 28px; border-left: 1px solid var(--rule); max-width: 46%; flex-wrap: wrap; justify-content: flex-end; }
    .main-sponsors img { height: 96px; max-width: 260px; object-fit: contain; }
    .main-sponsors .sname { font: 400 28px var(--body); text-transform: uppercase; letter-spacing: .14em; color: var(--ink); }
    .divider { height: 2px; margin: 30px 0 34px; background: linear-gradient(90deg, var(--gold) 0%, var(--gold) 60%, transparent); opacity: .8; }
    main { margin-bottom: 34px; }
    .collab { text-align: center; padding: 22px 0 26px; }
    .collab .label { font: 500 12px var(--body); letter-spacing: .32em; text-transform: uppercase; color: var(--gold-ink); }
    .collab .logos { display: flex; gap: 44px; align-items: center; justify-content: center; flex-wrap: wrap; margin-top: 18px; }
    .collab img { height: 54px; max-width: 180px; object-fit: contain; }
    .collab .sname { font: 400 18px var(--body); text-transform: uppercase; letter-spacing: .14em; color: var(--ink-2); }
    footer { display: flex; align-items: center; justify-content: space-between; gap: 28px; border-top: 1px solid var(--gold); padding-top: 16px; }
    .rules { font: 400 17px/1.3 var(--body); color: var(--ink-2); }
    .watermark { opacity: .32; filter: grayscale(1); }
  `],
})
export class PosterComponent {
  private toast = inject(ToastService);
  board = input.required<Board>();
  /** Categoría del cartel; null = cuadro de honor. */
  category = input<CategoryBoard | null>(null);
  /** Formato pedido desde el botón: PDF o imagen. */
  kind = input<'pdf' | 'png'>('pdf');
  closed = output<void>();
  poster = viewChild<ElementRef<HTMLElement>>('poster');
  busy = signal(false);
  size = signal<'a4' | 'a3'>('a4');

  color = computed(() => { const c = this.category(); return c ? categoryColor(c.category) : 'var(--gold)'; });
  dates = computed(() => range(this.board().tournament.startDate, this.board().tournament.endDate));
  fixed = computed(() => !this.category() || this.category()!.category.format === 'LEAGUE');
  principal = computed(() => this.board().tournament.sponsors.filter(s => s.tier === 'PRINCIPAL'));
  collaborators = computed(() => this.board().tournament.sponsors.filter(s => s.tier !== 'PRINCIPAL'));

  async download(kind: 'pdf' | 'png') {
    const el = this.poster()?.nativeElement;
    if (!el) return;
    this.busy.set(true);
    try {
      const what = this.category()?.category?.name ?? 'cuadro-de-honor';
      const name = `${this.board().tournament.slug}-${what}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
      if (kind === 'pdf') await exportToPdf(el, `${name}.pdf`, this.size());
      else await exportToPng(el, `${name}.png`);
    } catch (e) {
      this.toast.error(`No se pudo generar ${kind === 'pdf' ? 'el PDF' : 'la imagen'}. Si usas logos externos, súbelos de nuevo desde MatchZone.`);
      console.error(e);
    } finally { this.busy.set(false); }
  }
}
