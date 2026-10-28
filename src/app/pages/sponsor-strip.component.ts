import { Component, input } from '@angular/core';
import { Sponsor } from '../core/models';

@Component({
  selector: 'mp-sponsor-strip',
  template: `
    @if (sponsors().length) {
      <section class="strip">
        <h4>Patrocinadores</h4>
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
    .strip { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--rule); }
    h4 { color: var(--ink-2); font-size: 1rem; }
    .logos { display: flex; flex-wrap: wrap; gap: 28px; align-items: center; }
    a { display: inline-flex; color: var(--ink-2); text-decoration: none; font: 700 1.2rem var(--display); text-transform: uppercase; }
    img { height: 46px; max-width: 160px; object-fit: contain; }
    a.main img { height: 64px; max-width: 220px; }
    a.main span { font-size: 1.5rem; color: var(--ink); }
  `],
})
export class SponsorStripComponent {
  sponsors = input.required<Sponsor[]>();
}
