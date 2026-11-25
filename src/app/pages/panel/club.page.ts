import { LoadingComponent } from '../../shared/loading.component';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Club, TournamentSummary, TrashedTournament } from '../../core/models';
import { range, shortDate } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { TournamentCardComponent } from '../tournament-card.component';
import { AssetPipe } from '../../core/asset-url';

@Component({
  selector: 'mp-club',
  imports: [AssetPipe, LoadingComponent, RouterLink, TournamentCardComponent],
  template: `
    <div class="page">
      @if (club(); as c) {
        <div class="head">
          <div class="logo">@if (c.logoUrl) { <img [src]="c.logoUrl | asset" alt=""> } @else { <span>{{ c.name.charAt(0) }}</span> }</div>
          <div class="info">
            <h1>{{ c.name }}</h1>
            <div class="muted">{{ c.address }}@if (c.city) { , {{ c.city }} } <span class="chip grey">{{ c.courts.length }} pistas</span></div>
          </div>
          <div class="row">
            <a class="btn ghost" [routerLink]="['/panel/club', c.id, 'editar']">Datos, horario y pistas</a>
            <a class="btn ball" [routerLink]="['/panel/club', c.id, 'torneo', 'nuevo']">Nuevo torneo</a>
          </div>
        </div>
        @if (c.verificationStatus === 'PENDING') {
          <div class="notice verify"><b>Club pendiente de verificación.</b> Estamos comprobando los datos de la entidad (normalmente en 24–48 h).
            Mientras tanto puedes crear y preparar tus torneos; cuando lo verifiquemos podrás publicarlos, abrir inscripciones y generar los cuadros.</div>
        } @else if (c.verificationStatus === 'REJECTED') {
          <div class="notice warn verify"><b>No hemos podido verificar el club.</b> {{ c.rejectionReason }}
            <a [routerLink]="['/panel/club', c.id, 'editar']">Corrige los datos de la entidad</a> y lo revisaremos de nuevo.</div>
        }
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
        @if (trash().length) {
          <details class="trash">
            <summary><span class="eyebrow">Papelera</span> <span class="chip grey">{{ trash().length }}</span></summary>
            <p class="small muted">Los torneos eliminados se pueden recuperar durante 30 días. Después se borran del todo.</p>
            @for (t of trash(); track t.id) {
              <div class="trash-row">
                <div><b>{{ t.name }}</b><div class="tiny muted">{{ dates(t) }} · se borra el {{ day(t.purgeAt) }}</div></div>
                <button class="btn ghost sm" (click)="restore(t)" [disabled]="busy()">Recuperar</button>
              </div>
            }
          </details>
        }
      } @else { <mp-loading text="Cargando el club…" /> }
    </div>
  `,
  styles: [`
    .verify { margin: 0 0 20px; }
    .head { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin-bottom: 36px; }
    .info { flex: 1; min-width: 240px; }
    .info h1 { margin: 0 0 6px; }
    .info .chip { margin-left: 8px; }
    .logo { width: 88px; height: 88px; border-radius: 18px; background: #fff; border: 1px solid var(--rule); display: grid; place-items: center; overflow: hidden; padding: 8px; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo span { font: 300 40px var(--body); color: var(--gold-ink); text-transform: uppercase; }
    .section { margin-bottom: 16px; }
    .trash { margin-top: 36px; border-top: 1px solid var(--rule); padding-top: 18px; }
    .trash summary { cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
    .trash-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: #fff;
      border: 1px solid var(--rule); border-radius: var(--r-md); margin-top: 8px; flex-wrap: wrap; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr)); gap: 16px; }
  `],
})
export class ClubPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  id = input.required<string>();
  club = signal<Club | null>(null);
  tournaments = signal<TournamentSummary[]>([]);
  trash = signal<TrashedTournament[]>([]);
  busy = signal(false);

  ngOnInit() { this.load(); }

  async load() {
    try {
      const [c, t, d] = await Promise.all([this.api.club(this.id()), this.api.clubTournaments(this.id()), this.api.trash(this.id()).catch(() => [])]);
      this.club.set(c);
      this.tournaments.set(t);
      this.trash.set(d);
    } catch (e) { this.toast.error(e); }
  }

  dates(t: TrashedTournament) { return range(t.startDate, t.endDate); }
  day(instant: string) { return shortDate(instant.slice(0, 10)); }

  async restore(t: TrashedTournament) {
    this.busy.set(true);
    try { await this.api.restoreTournament(t.id); this.toast.ok(`"${t.name}" recuperado`); await this.load(); }
    catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }
}
