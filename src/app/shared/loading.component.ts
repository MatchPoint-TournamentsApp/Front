import { Component, input } from '@angular/core';

/**
 * Indicador de carga: una pelota dorada botando con su sombra y el texto debajo.
 * `inline` = versión pequeña en una línea (para cargas dentro de una ventana o un recuadro).
 */
@Component({
  selector: 'mp-loading',
  template: `
    <div class="loading" [class.inline]="inline()" role="status" aria-live="polite">
      <div class="stage" aria-hidden="true">
        <div class="ball"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18"/><path d="M6 11c7 3 9 15 4 22M34 9c-6 4-8 15-2 23"/></svg></div>
        <div class="shadow"></div>
      </div>
      <span class="text">{{ text() }}</span>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .loading { display: grid; justify-items: center; gap: 14px; padding: 48px 16px; color: var(--ink-2); }
    .stage { position: relative; width: 44px; height: 64px; }
    .ball { position: absolute; left: 50%; top: 0; width: 26px; height: 26px; margin-left: -13px; transform-origin: 50% 100%;
      animation: mp-bounce .8s cubic-bezier(.45, 0, .55, 1) infinite; }
    .ball svg { width: 100%; height: 100%; display: block; }
    .ball circle { fill: var(--gold); stroke: var(--gold-lo); stroke-width: 1.5; }
    .ball path { fill: none; stroke: var(--night); stroke-width: 2.2; stroke-linecap: round; opacity: .5; }
    .shadow { position: absolute; left: 50%; bottom: 0; width: 26px; height: 5px; margin-left: -13px; border-radius: 50%;
      background: rgba(10, 17, 26, .25); animation: mp-shadow .8s cubic-bezier(.45, 0, .55, 1) infinite; }
    .text { font-size: .95rem; letter-spacing: .02em; }
    .inline { grid-auto-flow: column; justify-content: start; align-items: center; padding: 10px 0; gap: 12px; }
    .inline .stage { width: 22px; height: 30px; }
    .inline .ball { width: 14px; height: 14px; margin-left: -7px; }
    .inline .shadow { width: 14px; height: 3px; margin-left: -7px; }
    .inline .text { font-size: .9rem; }
    @keyframes mp-bounce {
      0%, 100% { transform: translateY(0); }
      45% { transform: translateY(calc(var(--drop, 36px))); }
      50% { transform: translateY(calc(var(--drop, 36px) + 2px)) scale(1.15, .85); }
      55% { transform: translateY(var(--drop, 36px)); }
    }
    .inline .ball { --drop: 14px; }
    @keyframes mp-shadow { 0%, 100% { transform: scale(.45); opacity: .4; } 50% { transform: scale(1.1); opacity: .9; } }
    @media (prefers-reduced-motion: reduce) { .ball, .shadow { animation: none; } }
  `],
})
export class LoadingComponent {
  text = input('Cargando…');
  inline = input(false);
}
