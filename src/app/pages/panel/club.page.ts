import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Club, TournamentSummary } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { TournamentCardComponent } from '../tournament-card.component';

@Component({
  selector: 'mp-club',
  imports: [RouterLink, TournamentCardComponent],
  template: `
    <div class="page">
      @if (club(); as c) {
        <div class="head">
          <div class="logo">@if (c.logoUrl) { <img [src]="c.logoUrl" alt=""> } @else { <span>{{ c.name.charAt(0) }}</span> }</div>
          <div class="info">
            <h1>{{ c.name }}</h1>
            <div class="muted">{{ c.address }}@if (c.city) { , {{ c.city }} } <span class="chip grey">{{ c.courts.length }} pistas</span></div>
          </div>
          <div class="row">
            <a class="btn ghost" [routerLink]="['/panel/club', c.id, 'editar']">Datos, horario y pistas</a>
            <a class="btn ball" [routerLink]="['/panel/club', c.id, 'torneo', 'nuevo']">Nuevo torneo</a>
          </div>
        </div>
        <div class="section"><span class="eyebrow">Torneos del club</span></div>
        @if (!tournaments().length) {
          <div class="panel empty">
            <h3>Todavía no hay torneos</h3>
            <p>Crea el primero: fechas, categorías y en unos minutos tendrás el enlace para que se apunten las parejas.</p>
            <a class="btn" [routerLink]="['/panel/club', c.id, 'torneo', 'nuevo']">Crear torneo</a>
          </div>
        } @else {
          <div class="cards">
            @for (t of tournaments(); track t.id) { <mp-tournament-card [t]="t" [link]="'/panel/torneo/' + t.id" /> }
          </div>
        }
      } @else { <p class="muted">Cargando…</p> }
    </div>
  `,
  styles: [`
    .head { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin-bottom: 36px; }
    .info { flex: 1; min-width: 240px; }
    .info h1 { margin: 0 0 6px; }
    .info .chip { margin-left: 8px; }
    .logo { width: 88px; height: 88px; border-radius: 18px; background: #fff; border: 1px solid var(--rule); display: grid; place-items: center; overflow: hidden; padding: 8px; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo span { font: 300 40px var(--body); color: var(--gold-ink); text-transform: uppercase; }
    .section { margin-bottom: 16px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr)); gap: 16px; }
  `],
})
export class ClubPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  id = input.required<string>();
  club = signal<Club | null>(null);
  tournaments = signal<TournamentSummary[]>([]);

  async ngOnInit() {
    try {
      const [c, t] = await Promise.all([this.api.club(this.id()), this.api.clubTournaments(this.id())]);
      this.club.set(c);
      this.tournaments.set(t);
    } catch (e) { this.toast.error(e); }
  }
}
