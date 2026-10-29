import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Profile } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'mp-dashboard',
  imports: [RouterLink],
  template: `
    <div class="page">
      @if (me(); as p) {
        <div class="page-head">
          <div><span class="eyebrow">Tu panel</span><h1>Hola{{ p.fullName ? ', ' + first(p.fullName) : '' }}</h1><p class="muted">Gestiona tus clubes y sus torneos.</p></div>
          @if (p.clubs.length) { <a class="btn ghost" routerLink="/panel/club/nuevo">Añadir otro club</a> }
        </div>
        @if (!p.clubs.length) {
          <div class="panel empty">
            <h3>Da de alta tu club para organizar torneos</h3>
            <p>Necesitamos el nombre, el logo, la dirección, el horario y las pistas. Te lleva un par de minutos.</p>
            <a class="btn lg ball" routerLink="/panel/club/nuevo">Dar de alta mi club</a>
          </div>
        } @else {
          <div class="clubs">
            @for (c of p.clubs; track c.id) {
              <a class="club" [routerLink]="['/panel/club', c.id]">
                <div class="logo">@if (c.logoUrl) { <img [src]="c.logoUrl" alt=""> } @else { <span>{{ c.name.charAt(0) }}</span> }</div>
                <div class="who"><h3>{{ c.name }}</h3><span class="muted small">{{ c.city || 'Ver torneos' }}</span></div>
                <span class="go" aria-hidden="true">→</span>
              </a>
            }
          </div>
        }
      } @else if (error()) {
        <div class="panel empty">
          <h3>No hemos podido cargar tu panel</h3>
          <p>{{ error() }}</p>
          <button class="btn" (click)="load()">Reintentar</button>
        </div>
      } @else { <p class="muted">Cargando…</p> }
    </div>
  `,
  styles: [`
    h1 { margin-top: 12px; }
    .clubs { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: 16px; }
    .club { display: flex; gap: 16px; align-items: center; background: #fff; border: 1px solid var(--rule); border-radius: var(--r-lg); padding: 18px 20px; color: inherit; text-decoration: none; transition: border-color .2s var(--ease), box-shadow .2s var(--ease), transform .2s var(--ease); }
    .club:hover { border-color: rgba(201, 164, 106, .7); box-shadow: var(--shadow); transform: translateY(-2px); }
    .club h3 { margin: 0; font-weight: 500; }
    .who { flex: 1; min-width: 0; }
    .go { color: var(--gold); font-size: 1.2rem; transition: transform .2s var(--ease); }
    .club:hover .go { transform: translateX(3px); }
    .logo { width: 60px; height: 60px; border-radius: 14px; background: var(--glass); display: grid; place-items: center; overflow: hidden; flex: none; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo span { font: 300 28px var(--body); color: var(--gold-ink); text-transform: uppercase; }
  `],
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  me = signal<Profile | null>(null);
  error = signal('');
  ngOnInit() { this.load(); }

  load() {
    this.error.set('');
    this.api.me().then(p => this.me.set(p)).catch(e => { this.error.set(e.message); this.toast.error(e); });
  }
  first(n: string) { return n.split(' ')[0]; }
}
