import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TournamentSummary } from '../core/models';
import { range, STATUS_LABEL } from '../core/format';

@Component({
  selector: 'mp-tournament-card',
  imports: [RouterLink],
  template: `
    <a class="tc" [routerLink]="link()" [style.--c]="t().primaryColor">
      <div class="logo">@if (t().clubLogoUrl) { <img [src]="t().clubLogoUrl" alt=""> } @else { <span>{{ t().clubName.charAt(0) }}</span> }</div>
      <div class="body">
        <h3>{{ t().name }}</h3>
        <div class="small muted">{{ t().clubName }}@if (t().city) {, {{ t().city }}}</div>
        <div class="small">{{ dates() }}</div>
        <div class="row" style="gap:6px;margin-top:8px">
          <span class="chip" [class.ok]="t().status === 'IN_PROGRESS'" [class.grey]="t().status === 'FINISHED'">{{ status() }}</span>
          @if (t().registrationOpen) { <span class="chip ball">Inscripción abierta</span> }
          <span class="chip grey">{{ t().categories }} categorías</span>
          <span class="chip grey">{{ t().pairs }} parejas</span>
        </div>
      </div>
    </a>
  `,
  styles: [`
    .tc { display: flex; gap: 14px; background: #fff; border: 1px solid var(--rule); border-left: 5px solid var(--c); border-radius: 14px; padding: 16px; color: inherit; text-decoration: none; height: 100%; }
    .tc:hover { border-color: var(--court-2); border-left-color: var(--c); }
    .logo { width: 56px; height: 56px; border-radius: 10px; background: var(--glass); display: grid; place-items: center; overflow: hidden; flex: none; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo span { font: 800 26px var(--display); color: var(--court); }
    h3 { margin: 0 0 2px; font-size: 1.3rem; }
  `],
})
export class TournamentCardComponent {
  t = input.required<TournamentSummary>();
  link = input.required<string>();
  dates() { return range(this.t().startDate, this.t().endDate); }
  status() { return STATUS_LABEL[this.t().status]; }
}
