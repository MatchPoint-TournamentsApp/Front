import { Component, ElementRef, inject, input, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { Board, PairView, Tournament } from '../../core/models';
import { isoDate } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { saveFile } from '../../shared/files';
import { exportJson, matchesCsv, pairsCsv } from './export';

/** Botón "Exportar" del torneo: copia completa y listados para Excel. */
@Component({
  selector: 'mp-export-menu',
  template: `
    <details class="export" #menu>
      <summary class="btn ghost">{{ busy() ? 'Preparando…' : 'Exportar' }}</summary>
      <div class="menu" role="menu">
        <button role="menuitem" (click)="run('json')" [disabled]="busy()"><b>Copia completa</b><span>Todo el torneo en un archivo (JSON). Guárdala antes de cada torneo.</span></button>
        <button role="menuitem" (click)="run('pairs')" [disabled]="busy()"><b>Parejas (Excel)</b><span>Jugadores, contacto, estado y restricciones.</span></button>
        <button role="menuitem" (click)="run('matches')" [disabled]="busy()"><b>Partidos y resultados (Excel)</b><span>Horario, pista y resultado de cada partido.</span></button>
      </div>
    </details>
  `,
  styles: [`
    .export { position: relative; }
    summary { list-style: none; }
    summary::-webkit-details-marker { display: none; }
    .menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 20; width: min(320px, 90vw); background: #fff; border: 1px solid var(--rule);
      border-radius: var(--r-md); box-shadow: var(--shadow); padding: 6px; display: flex; flex-direction: column; }
    .menu button { text-align: left; padding: 10px 12px; border: 0; background: none; border-radius: var(--r-sm); cursor: pointer; font: inherit;
      display: flex; flex-direction: column; gap: 2px; color: var(--ink); }
    .menu button:hover { background: var(--glass); }
    .menu button span { font-size: .8rem; color: var(--ink-2); }
    .menu button:disabled { opacity: .5; cursor: wait; }
  `],
})
export class ExportMenuComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  t = input.required<Tournament>();
  board = input<Board | null>(null);
  busy = signal(false);

  async run(kind: 'json' | 'pairs' | 'matches') {
    const t = this.t();
    const name = `${t.slug}-${isoDate(new Date())}`;
    this.busy.set(true);
    try {
      const board = this.board() ?? await this.api.board(t.id);
      if (kind === 'matches') {
        saveFile(`${name}-partidos.csv`, matchesCsv(board), 'text/csv;charset=utf-8');
      } else {
        const lists = await Promise.all(t.categories.map(c => this.api.pairs(c.id)));
        const pairs = new Map<string, PairView[]>(t.categories.map((c, i) => [c.id, lists[i]]));
        if (kind === 'pairs') saveFile(`${name}-parejas.csv`, pairsCsv(t.categories, pairs), 'text/csv;charset=utf-8');
        else saveFile(`${name}-copia.json`, exportJson(t, pairs, board), 'application/json');
      }
      this.host.nativeElement.querySelector('details')?.removeAttribute('open');
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }
}
