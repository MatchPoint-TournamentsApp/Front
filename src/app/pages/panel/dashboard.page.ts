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
          <div><h1>Hola{{ p.fullName ? ', ' + first(p.fullName) : '' }}</h1><p class="muted">Gestiona tus clubes y sus torneos.</p></div>
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
                <div><h3>{{ c.name }}</h3><span class="muted small">{{ c.city || 'Ver torneos' }}</span></div>
              </a>
            }
          </div>
        }
      } @else { <p class="muted">Cargando…</p> }
    </div>
  `,
  styles: [`
    .clubs { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .club { display: flex; gap: 16px; align-items: center; background: #fff; border: 1px solid var(--rule); border-radius: 14px; padding: 18px; color: inherit; text-decoration: none; }
    .club:hover { border-color: var(--court-2); }
    .club h3 { margin: 0; }
    .logo { width: 64px; height: 64px; border-radius: 12px; background: var(--glass); display: grid; place-items: center; overflow: hidden; flex: none; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo span { font: 800 30px var(--display); color: var(--court); }
  `],
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  me = signal<Profile | null>(null);
  ngOnInit() { this.api.me().then(p => this.me.set(p)).catch(e => this.toast.error(e)); }
  first(n: string) { return n.split(' ')[0]; }
}
