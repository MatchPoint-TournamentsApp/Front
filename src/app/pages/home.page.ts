import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../core/supabase.service';

/** Portada: solo la marca, un eslogan y los accesos principales. */
@Component({
  selector: 'mp-home',
  imports: [RouterLink],
  template: `
    <section class="hero on-dark">
      <div class="inner">
        <img class="mark" src="brand/mark-800.png" alt="">
        <h1>Matchpoint</h1>
        <hr>
        <p class="tag">Torneos de pádel</p>
        <p class="lead">Cuadros, horarios y resultados en un solo lugar.</p>
        <div class="cta">
          <a class="btn lg ball" routerLink="/torneos">Ver torneos</a>
          @if (supa.loggedIn()) { <a class="btn lg ghost" routerLink="/panel">Mi club</a> }
          @else { <a class="btn lg ghost" routerLink="/entrar">Acceder</a> }
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; margin-bottom: -40px; }
    .hero {
      min-height: calc(100vh - 62px); display: grid; place-items: center; text-align: center;
      background: radial-gradient(70% 60% at 50% 38%, #142033 0%, var(--night) 70%); color: var(--cream);
    }
    .inner { padding: 48px 20px 64px; display: flex; flex-direction: column; align-items: center; }
    /* "lighten": el fondo oscuro de la imagen desaparece sobre la noche y queda solo el dorado */
    .mark { width: min(240px, 52vw); aspect-ratio: 1; mix-blend-mode: lighten; margin-bottom: 8px; }
    h1 {
      margin: 0; color: var(--cream); font-weight: 300; text-transform: uppercase;
      font-size: clamp(2rem, 6vw, 3.4rem); letter-spacing: .32em; margin-right: -.32em; line-height: 1;
    }
    hr { width: min(320px, 70%); height: 1px; border: 0; margin: 22px 0 18px; background: linear-gradient(90deg, transparent, var(--gold), transparent); }
    .tag { margin: 0; font-size: .85rem; font-weight: 500; letter-spacing: .4em; margin-right: -.4em; text-transform: uppercase; color: var(--gold); }
    .lead { margin: 30px 0 34px; font-size: 1.1rem; font-weight: 300; color: var(--cream-2); max-width: 40ch; }
    .cta { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
    @media (max-width: 420px) { .cta { flex-direction: column; width: 100%; } .cta .btn { width: 100%; } }
  `],
})
export class HomePage {
  supa = inject(SupabaseService);
}
