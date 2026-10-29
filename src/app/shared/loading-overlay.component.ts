import { Component, DestroyRef, inject, input, signal } from '@angular/core';

/**
 * Capa de espera a pantalla completa con una pelota de pádel botando. Si tarda, cambia el mensaje
 * (en el plan gratuito de Render la primera petición tras un rato sin uso tarda en torno a un minuto).
 */
@Component({
  selector: 'mp-loading-overlay',
  template: `
    <div class="overlay" role="status" aria-live="polite">
      <div class="box">
        <div class="court" aria-hidden="true">
          <div class="ball"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18"/><path d="M6 11c7 3 9 15 4 22M34 9c-6 4-8 15-2 23"/></svg></div>
          <div class="shadow"></div>
          <div class="line"></div>
        </div>
        <p class="title">{{ title() }}</p>
        <p class="sub">{{ seconds() < 12 ? subtitle() : 'Sigue trabajando… si el servidor estaba en reposo puede tardar hasta un minuto.' }}</p>
        <p class="time">{{ seconds() }} s</p>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; padding: 20px;
      background: rgba(10, 17, 26, .72); backdrop-filter: blur(4px); animation: fade .2s ease-out; }
    .box { width: min(380px, 100%); text-align: center; color: var(--cream); }
    .court { position: relative; height: 150px; width: 160px; margin: 0 auto 18px; }
    .ball { position: absolute; left: 50%; top: 0; width: 46px; height: 46px; margin-left: -23px; transform-origin: 50% 100%;
      animation-name: bounce; animation-duration: .9s; animation-timing-function: cubic-bezier(.45, 0, .55, 1); animation-iteration-count: infinite; }
    .ball svg { width: 100%; height: 100%; display: block; }
    .ball circle { fill: var(--gold); stroke: var(--gold-hi); stroke-width: 1.5; }
    .ball path { fill: none; stroke: var(--night); stroke-width: 2; stroke-linecap: round; opacity: .55; }
    .shadow { position: absolute; left: 50%; bottom: 14px; width: 46px; height: 8px; margin-left: -23px; border-radius: 50%; background: rgba(0, 0, 0, .45); filter: blur(2px); animation-name: shadow; animation-duration: .9s; animation-timing-function: cubic-bezier(.45, 0, .55, 1); animation-iteration-count: infinite; }
    .line { position: absolute; left: 0; right: 0; bottom: 17px; height: 1px; background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: .6; }
    @keyframes bounce {
      0%, 100% { transform: translateY(0) scale(1, 1); }
      45% { transform: translateY(78px) scale(1, 1); }
      50% { transform: translateY(82px) scale(1.18, .8); }
      55% { transform: translateY(78px) scale(1, 1); }
    }
    @keyframes shadow { 0%, 100% { transform: scale(.45); opacity: .35; } 50% { transform: scale(1.1); opacity: .8; } }
    .title { font-size: 1.15rem; font-weight: 400; margin: 0 0 6px; color: var(--cream); max-width: none; }
    .sub { font-size: .9rem; color: var(--cream-2); margin: 0 auto; max-width: 34ch; }
    .time { font-size: .75rem; color: var(--cream-2); opacity: .6; margin: 14px 0 0; letter-spacing: .1em; }
    @media (prefers-reduced-motion: reduce) { .ball, .shadow { animation: none; } }
  `],
})
export class LoadingOverlayComponent {
  title = input('Generando cuadros y horarios…');
  subtitle = input('Colocando a las parejas según su disponibilidad. Puede tardar unos segundos.');
  seconds = signal(0);

  constructor() {
    const id = setInterval(() => this.seconds.update(s => s + 1), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}
