import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from './core/supabase.service';
import { ToastService } from './core/toast.service';
import { LogoComponent } from './shared/logo.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoComponent],
  template: `
    <header class="top on-dark">
      <div class="bar">
        <a routerLink="/" class="brand" aria-label="MatchZone, inicio"><mp-logo [size]="34" [inverse]="true" /></a>
        <button class="burger" type="button" (click)="menu.set(!menu())" [attr.aria-expanded]="menu()" aria-controls="mp-nav" aria-label="Menú">
          <span></span><span></span>
        </button>
        <nav id="mp-nav" [class.open]="menu()">
          <a routerLink="/torneos" routerLinkActive="on">Torneos</a>
          @if (supa.loggedIn()) {
            <a routerLink="/panel" routerLinkActive="on">Mi club</a>
            <button class="btn ghost sm" (click)="logout()">Salir</button>
          } @else {
            <a routerLink="/entrar" routerLinkActive="on">Entrar</a>
            <a routerLink="/registro" class="btn ball sm">Crear cuenta</a>
          }
        </nav>
      </div>
      <hr class="gold-rule">
    </header>
    @if (!supa.configured) {
      <div class="config">Configura la URL y la clave de Supabase en <code>src/environments/environment.ts</code> para activar el registro y el inicio de sesión.</div>
    }
    <main><router-outlet /></main>
    <footer class="foot on-dark">
      <div class="inner">
        <mp-logo [size]="40" [inverse]="true" [tagline]="true" />
        <nav>
          <a routerLink="/torneos">Torneos</a>
          <a [routerLink]="supa.loggedIn() ? '/panel' : '/registro'">Organizar un torneo</a>
        </nav>
        <span class="copy">© {{ year }} MatchZone</span>
      </div>
    </footer>
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) { <div class="toast" [class.error]="t.kind === 'error'" [class.ok]="t.kind === 'ok'">{{ t.text }}</div> }
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    main { flex: 1; }
    .top { background: rgba(10, 17, 26, .96); backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 50; }
    .bar { max-width: 1200px; margin: 0 auto; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .brand { text-decoration: none; display: inline-flex; }
    nav { display: flex; align-items: center; gap: 26px; }
    nav a:not(.btn) { color: var(--cream-2); text-decoration: none; font-size: .92rem; letter-spacing: .04em; position: relative; padding: 4px 0; transition: color .2s; }
    nav a:not(.btn)::after { content: ''; position: absolute; left: 0; right: 0; bottom: -2px; height: 1px; background: var(--gold); transform: scaleX(0); transition: transform .25s var(--ease); }
    nav a:not(.btn):hover, nav a.on { color: var(--cream); }
    nav a.on::after, nav a:not(.btn):hover::after { transform: scaleX(1); }
    .burger { display: none; width: 40px; height: 40px; border: 1px solid var(--night-3); border-radius: 999px; background: none; cursor: pointer; flex-direction: column; justify-content: center; align-items: center; gap: 6px; }
    .burger span { display: block; width: 16px; height: 1px; background: var(--cream); transition: transform .2s; }
    .burger[aria-expanded=true] span:first-child { transform: translateY(3.5px) rotate(45deg); }
    .burger[aria-expanded=true] span:last-child { transform: translateY(-3.5px) rotate(-45deg); }
    @media (max-width: 680px) {
      .bar { flex-wrap: wrap; }
      .burger { display: inline-flex; }
      nav { display: none; width: 100%; flex-direction: column; align-items: stretch; gap: 4px; padding: 8px 0 6px; }
      nav.open { display: flex; }
      nav a:not(.btn) { padding: 12px 2px; border-top: 1px solid var(--night-3); }
      nav a:not(.btn)::after { display: none; }
      nav .btn { margin-top: 10px; height: 44px; }
    }
    .config { background: var(--warn-bg); color: #6e4a12; text-align: center; padding: 8px 16px; font-size: .88rem; }
    .foot { background: var(--night); color: var(--cream-2); margin-top: 40px; border-top: 1px solid var(--night-3); }
    .foot .inner { max-width: 1200px; margin: 0 auto; padding: 36px 20px; display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
    .foot nav { gap: 22px; flex: 1; justify-content: center; }
    .copy { font-size: .8rem; letter-spacing: .08em; }
    @media (max-width: 680px) {
      .foot .inner { flex-direction: column; align-items: flex-start; }
      .foot nav { display: flex; flex-direction: row; width: auto; padding: 0; justify-content: flex-start; }
      .foot nav a:not(.btn) { border: 0; padding: 4px 0; }
    }
  `],
})
export class App {
  supa = inject(SupabaseService);
  toast = inject(ToastService);
  private router = inject(Router);
  menu = signal(false);
  year = new Date().getFullYear();

  constructor() {
    this.router.events.subscribe(e => { if (e instanceof NavigationEnd) this.menu.set(false); });
  }

  async logout() {
    await this.supa.signOut();
    this.router.navigateByUrl('/');
  }
}
