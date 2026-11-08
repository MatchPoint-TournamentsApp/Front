import { Component, input, signal } from '@angular/core';

/**
 * Botón de ojo para mostrar u ocultar una contraseña. Se coloca junto al input dentro de
 * un `<span class="pw">`:  `<span class="pw"><input #p type="password"><mp-reveal [for]="p" /></span>`
 */
@Component({
  selector: 'mp-reveal',
  template: `
    <button type="button" class="reveal" (click)="toggle()" [attr.aria-label]="shown() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
      [attr.aria-pressed]="shown()" [title]="shown() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
      @if (shown()) {
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.6 6.6C4.4 8 2.8 10.2 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.6 4.8-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
      } @else {
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
      }
    </button>
  `,
  styles: [`
    :host { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); }
    .reveal { width: 36px; height: 34px; display: grid; place-items: center; border: 0; background: none; border-radius: 8px;
      color: var(--ink-3); cursor: pointer; transition: color .15s, background .15s; }
    .reveal:hover { color: var(--ink); background: var(--rule-2); }
    svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
  `],
})
export class RevealPasswordComponent {
  for = input.required<HTMLInputElement>();
  shown = signal(false);

  toggle() {
    const el = this.for();
    this.shown.update(v => !v);
    el.type = this.shown() ? 'text' : 'password';
    el.focus();
  }
}
