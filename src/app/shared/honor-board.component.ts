import { Component, computed, input } from '@angular/core';
import { Board, CategoryBoard } from '../core/models';
import { categoryColor } from '../core/format';
import { Podium, podium } from './honor';

interface Row { cb: CategoryBoard; p: Podium; fem: boolean; }

/** Cuadro de honor: campeones, subcampeones y tercer puesto (o campeones de consolación) de cada categoría. */
@Component({
  selector: 'mp-honor-board',
  template: `
    @if (!rows().length) {
      <div class="empty-honor">
        <h3>Cuadro de honor</h3>
        <p>Aparecerá aquí cuando se jueguen las finales.</p>
      </div>
    } @else {
      <div class="list">
        @for (r of rows(); track r.cb.category.id) {
          <section class="cat" [style.--cat]="color(r.cb)">
            <h4><span class="dot"></span>{{ r.cb.category.name }}</h4>
            <div class="podium">
              <div class="place first">
                <span class="medal">1</span>
                <div><small>{{ r.fem ? 'Campeonas' : 'Campeones' }}</small><b>{{ r.p.first ?? 'Por decidir' }}</b></div>
              </div>
              <div class="place second">
                <span class="medal">2</span>
                <div><small>{{ r.fem ? 'Subcampeonas' : 'Subcampeones' }}</small><b>{{ r.p.second ?? 'Por decidir' }}</b></div>
              </div>
              @if (r.p.consolation || r.p.third) {
                <div class="place third">
                  <span class="medal">3</span>
                  <div>
                    <small>{{ r.p.consolation ? (r.fem ? 'Campeonas de consolación' : 'Campeones de consolación') : '3.er puesto' }}</small>
                    <b>{{ r.p.third ?? 'Por decidir' }}</b>
                  </div>
                </div>
              }
            </div>
          </section>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .empty-honor { text-align: center; padding: 40px 16px; color: var(--ink-2); }
    .empty-honor h3 { margin: 0 0 6px; }
    .list { display: grid; gap: 14px; }
    .cat { border: 1px solid var(--rule); border-radius: 12px; overflow: hidden; background: #fff; }
    .cat h4 { margin: 0; background: var(--night); color: var(--gold); padding: 9px 16px; font: 500 14px var(--body);
      text-transform: uppercase; letter-spacing: .22em; display: flex; align-items: center; gap: 10px; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--cat); box-shadow: 0 0 0 2px rgba(255,255,255,.18); }
    .podium { display: grid; grid-template-columns: 1.25fr 1fr 1fr; }
    .place { display: flex; gap: 12px; align-items: center; padding: 14px 16px; min-width: 0; }
    .place + .place { border-left: 1px solid var(--rule-2); }
    .place small { display: block; font: 500 11px var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 3px; }
    .place b { font: 500 15px/1.25 var(--body); color: var(--ink); text-transform: uppercase; letter-spacing: .03em; }
    .medal { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font: 600 15px var(--display); }
    .first .medal { width: 38px; height: 38px; font-size: 19px; background: var(--gold-grad); color: var(--night); box-shadow: 0 0 0 3px rgba(201,164,106,.25); }
    .first small { color: var(--gold-ink); }
    .first b { font-size: 17px; font-weight: 600; }
    .second .medal { background: linear-gradient(135deg, #b9bec5, #e6e9ec 50%, #a9afb7); color: #2c2f33; }
    .third .medal { background: linear-gradient(135deg, #b9774a, #e3b48d 50%, #a8673d); color: #3b1d0c; }
    @media (max-width: 640px) {
      .podium { grid-template-columns: 1fr; }
      .place + .place { border-left: 0; border-top: 1px solid var(--rule-2); }
    }
    :host(.print) .podium { grid-template-columns: 1.25fr 1fr 1fr; }
    :host(.print) .place + .place { border-left: 1px solid var(--rule-2); border-top: 0; }
  `],
})
export class HonorBoardComponent {
  board = input.required<Board>();

  rows = computed<Row[]>(() => this.board().categories
    .map(cb => ({ cb, p: podium(cb), fem: cb.category.gender === 'FEMENINA' }))
    .filter(r => r.p.done));

  color(cb: CategoryBoard) { return categoryColor(cb.category); }
}
