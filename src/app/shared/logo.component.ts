import { Component, input } from '@angular/core';

/** Logo MatchPoint: un cruce del cuadro que termina en la pelota del punto de partido. */
@Component({
  selector: 'mp-logo',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" [attr.fill]="inverse() ? '#fff' : '#12355B'" />
      <g fill="none" [attr.stroke]="inverse() ? '#12355B' : '#fff'" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8.5 10.5h8v19h-8" />
        <path d="M16.5 20h5" />
      </g>
      <circle cx="28" cy="20" r="6.2" fill="#D9F24A" [attr.stroke]="inverse() ? '#12355B' : '#0b2440'" stroke-width="1.2" />
      <path d="M23.4 16.6c3 .4 5.6 3 6 7.4" fill="none" stroke="#12355B" stroke-width="1.2" stroke-linecap="round" />
    </svg>
    @if (wordmark()) {
      <span class="word" [class.inv]="inverse()">Match<b>Point</b></span>
    }
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; gap: 10px; }
    svg { flex: none; display: block; }
    .word { font: italic 800 1.55rem/1 var(--display); color: var(--court); letter-spacing: -.01em; }
    .word b { font-weight: 800; color: var(--court-2); }
    .word.inv, .word.inv b { color: #fff; }
  `],
})
export class LogoComponent {
  size = input(34);
  wordmark = input(true);
  inverse = input(false);
}
