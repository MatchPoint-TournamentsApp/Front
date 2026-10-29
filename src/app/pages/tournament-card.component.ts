import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TournamentSummary } from '../core/models';
import { range, STATUS_LABEL } from '../core/format';

@Component({
  selector: 'mp-tournament-card',
  imports: [RouterLink],
  template: `
    <a class="tc" [routerLink]="link()" [style.--c]="t().primaryColor">
      <div class="head">
        <div class="logo">@if (t().clubLogoUrl) { <img [src]="t().clubLogoUrl" alt=""> } @else { <span>{{ t().clubName.charAt(0) }}</span> }</div>
        <div class="who">
          <h3>{{ t().name }}</h3>
          <div class="small muted">{{ t().clubName }}@if (t().city) { · {{ t().city }}}</div>
        </div>
      </div>
      <div class="date">{{ dates() }}</div>
      <div class="row tags">
        <span class="chip" [class.ok]="t().status === 'IN_PROGRESS'">{{ status() }}</span>
        @if (t().registrationOpen) { <span class="chip ball">Inscripción abierta</span> }
        <span class="count">{{ t().categories }} cat. · {{ t().pairs }} parejas</span>
      </div>
    </a>
  `,
  styles: [`
    .tc {
      position: relative; display: flex; flex-direction: column; gap: 14px; height: 100%;
      background: #fff; border: 1px solid var(--rule); border-radius: var(--r-lg); padding: 20px;
      color: inherit; text-decoration: none;
      transition: border-color .2s var(--ease), box-shadow .2s var(--ease), transform .2s var(--ease);
    }
    .tc::before { content: ''; position: absolute; top: -1px; left: 20px; width: 32px; height: 2px; border-radius: 2px; background: var(--c, var(--gold)); }
    .tc:hover { border-color: rgba(201, 164, 106, .7); box-shadow: var(--shadow); transform: translateY(-2px); }
    .head { display: flex; gap: 14px; align-items: center; }
    .logo { width: 52px; height: 52px; border-radius: 12px; background: var(--glass); display: grid; place-items: center; overflow: hidden; flex: none; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo span { font: 300 26px var(--body); color: var(--gold-ink); text-transform: uppercase; }
    .who { min-width: 0; }
    h3 { margin: 0 0 2px; font-size: 1.15rem; font-weight: 500; }
    .date { font-family: var(--display); font-weight: 500; font-size: 1.05rem; letter-spacing: .02em; color: var(--ink); }
    .tags { gap: 6px; margin-top: auto; }
    .count { font-size: .8rem; color: var(--ink-3); margin-left: auto; }
  `],
})
export class TournamentCardComponent {
  t = input.required<TournamentSummary>();
  link = input.required<string>();
  dates() { return range(this.t().startDate, this.t().endDate); }
  status() { return STATUS_LABEL[this.t().status]; }
}
