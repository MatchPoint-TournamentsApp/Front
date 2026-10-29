import { Component, input } from '@angular/core';

/**
 * Logo MatchPoint: monograma dorado (public/brand/icon-512.png) y el nombre
 * en fino y espaciado. `inverse` = sobre fondo noche (texto crema).
 */
@Component({
  selector: 'mp-logo',
  template: `
    <img class="mark" src="brand/icon-512.png" alt="" [style.width.px]="size()" [style.height.px]="size()" [class.framed]="!inverse()">
    @if (wordmark()) {
      <span class="word" [class.inv]="inverse()" [style.font-size.px]="size() * .5">
        Matchpoint
        @if (tagline()) { <small>Torneos de pádel</small> }
      </span>
    }
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; gap: 12px; }
    .mark { flex: none; display: block; border-radius: 22%; object-fit: cover; }
    .mark.framed { box-shadow: 0 0 0 1px rgba(201, 164, 106, .35), 0 2px 6px rgba(10, 17, 26, .18); }
    .word {
      display: flex; flex-direction: column; gap: .45em;
      font-family: var(--body); font-weight: 400; line-height: 1;
      text-transform: uppercase; letter-spacing: .3em; color: var(--ink);
      min-width: 12px;
    }
    .word.inv { color: var(--cream); font-weight: 300; }
    small { font-size: .42em; font-weight: 500; letter-spacing: .34em; color: var(--gold-ink); }
    .word.inv small { color: var(--gold); }
  `],
})
export class LogoComponent {
  size = input(34);
  wordmark = input(true);
  inverse = input(false);
  tagline = input(false);
}
