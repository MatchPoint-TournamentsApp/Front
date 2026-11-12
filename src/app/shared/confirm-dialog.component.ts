import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { ConfirmService } from '../core/confirm.service';

/** Ventana de confirmación global (Continuar / Cancelar). Se monta una sola vez en la raíz de la app. */
@Component({
  selector: 'mp-confirm-dialog',
  host: { '(document:keydown.escape)': 'c.current() && c.answer(false)' },
  template: `
    @if (c.current(); as q) {
      <div class="backdrop" (click)="c.answer(false)">
        <div class="modal confirm" (click)="$event.stopPropagation()" role="alertdialog" aria-modal="true"
             aria-labelledby="confirm-title" [attr.aria-describedby]="q.message ? 'confirm-msg' : null">
          <h3 id="confirm-title">{{ q.title }}</h3>
          @if (q.message) { <p id="confirm-msg">{{ q.message }}</p> }
          <div class="modal-foot">
            <button class="btn ghost" (click)="c.answer(false)">Cancelar</button>
            <button #okBtn class="btn" [class.danger-solid]="q.danger" (click)="c.answer(true)">{{ q.ok ?? 'Continuar' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .confirm { width: min(460px, 100%); }
    .confirm h3 { margin: 0 0 10px; font-size: 1.2rem; }
    .confirm p { margin: 0; color: var(--ink-2); line-height: 1.5; white-space: pre-line; }
    .danger-solid { background: var(--danger); border-color: var(--danger); color: #fff; }
    .danger-solid:hover { filter: brightness(1.08); }
  `],
})
export class ConfirmDialogComponent {
  c = inject(ConfirmService);
  private okBtn = viewChild<ElementRef<HTMLButtonElement>>('okBtn');

  constructor() {
    // Al abrirse, el foco va al botón principal (Intro confirma, Escape cancela)
    effect(() => { if (this.c.current()) queueMicrotask(() => this.okBtn()?.nativeElement.focus()); });
  }
}
