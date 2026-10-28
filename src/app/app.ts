import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from './core/supabase.service';
import { ToastService } from './core/toast.service';
import { LogoComponent } from './shared/logo.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoComponent],
  template: `
    <header class="top">
      <div class="bar">
        <a routerLink="/" class="brand" aria-label="MatchPoint, inicio"><mp-logo [size]="32" /></a>
        <nav>
          <a routerLink="/torneos" routerLinkActive="on">Torneos</a>
          @if (supa.loggedIn()) {
            <a routerLink="/panel" routerLinkActive="on">Mi club</a>
            <button class="btn ghost sm" (click)="logout()">Salir</button>
          } @else {
            <a routerLink="/entrar" routerLinkActive="on">Entrar</a>
            <a routerLink="/registro" class="btn sm">Crear cuenta</a>
          }
        </nav>
      </div>
    </header>
    @if (!supa.configured) {
      <div class="config">Configura la URL y la clave de Supabase en <code>src/environments/environment.ts</code> para activar el registro y el inicio de sesión.</div>
    }
    <main><router-outlet /></main>
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) { <div class="toast" [class.error]="t.kind === 'error'" [class.ok]="t.kind === 'ok'">{{ t.text }}</div> }
    </div>
  `,
  styles: [`
    .top { background: #fff; border-bottom: 1px solid var(--rule); position: sticky; top: 0; z-index: 50; }
    .bar { max-width: 1240px; margin: 0 auto; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .brand { text-decoration: none; display: inline-flex; }
    nav { display: flex; align-items: center; gap: 18px; }
    nav a:not(.btn) { color: var(--ink-2); text-decoration: none; font-weight: 600; font-size: .95rem; }
    nav a:not(.btn):hover, nav a.on { color: var(--court); }
    .config { background: var(--warn-bg); color: #7a4f0f; text-align: center; padding: 8px 16px; font-size: .88rem; }
    @media (max-width: 520px) { nav { gap: 12px; } :host ::ng-deep .word { display: none; } }
  `],
})
export class App {
  supa = inject(SupabaseService);
  toast = inject(ToastService);
  private router = inject(Router);

  async logout() {
    await this.supa.signOut();
    this.router.navigateByUrl('/');
  }
}
