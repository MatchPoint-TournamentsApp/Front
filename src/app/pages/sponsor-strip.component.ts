import { Component, input } from '@angular/core';
import { Sponsor } from '../core/models';

@Component({
  selector: 'mp-sponsor-strip',
  template: `
    @if (sponsors().length) {
      <section class="strip">
        <span class="eyebrow">Con el apoyo de</span>
        <div class="logos">
          @for (s of sponsors(); track s.id) {
            <a [href]="s.website || null" target="_blank" rel="noopener" [class.main]="s.tier === 'PRINCIPAL'" [title]="s.name">
              @if (s.logoUrl) { <img [src]="s.logoUrl" [alt]="s.name"> } @else { <span>{{ s.name }}</span> }
            </a>
          }
        </div>
      </section>
    }
  `,
  styles: [`
    .strip { margin-top: 48px; padding-top: 26px; border-top: 1px solid var(--rule); }
    .logos { display: flex; flex-wrap: wrap; gap: 32px; align-items: center; margin-top: 18px; }
    a { display: inline-flex; color: var(--ink-2); text-decoration: none; font: 400 1.05rem var(--body); letter-spacing: .14em; text-transform: uppercase; transition: opacity .2s, filter .2s; }
    a:hover { opacity: 1; filter: none; }
    img { height: 46px; max-width: 160px; object-fit: contain; filter: grayscale(.25); opacity: .9; }
    a:hover img { filter: none; opacity: 1; }
    a.main img { height: 64px; max-width: 220px; }
    a.main span { font-size: 1.5rem; color: var(--ink); }
  `],
})
export class SponsorStripComponent {
  sponsors = input.required<Sponsor[]>();
}
