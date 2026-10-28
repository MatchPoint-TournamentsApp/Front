import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { SupabaseService } from '../core/supabase.service';
import { TournamentSummary } from '../core/models';
import { TournamentCardComponent } from './tournament-card.component';

@Component({
  selector: 'mp-home',
  imports: [RouterLink, TournamentCardComponent],
  template: `
    <section class="hero">
      <div class="copy">
        <h1>Cuadros de pádel que encajan con el horario de cada pareja</h1>
        <p class="lead">Apunta las parejas y cuándo no pueden jugar. MatchPoint monta el cuadro o la liguilla, reparte pistas y horas, y lo publica para que todo el mundo lo siga desde el móvil.</p>
        <div class="row">
          <a class="btn lg ball" [routerLink]="supa.loggedIn() ? '/panel' : '/registro'">Dar de alta mi club</a>
          <a class="btn lg ghost" routerLink="/torneos">Ver torneos como invitado</a>
        </div>
      </div>
      <svg class="court" viewBox="0 0 520 420" role="img" aria-label="Cuadro de torneo dibujado sobre una pista de pádel">
        <rect width="520" height="420" rx="22" fill="#12355B"/>
        <g fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2">
          <rect x="30" y="30" width="460" height="360"/>
          <path d="M260 30v360M30 210h460M100 30v360M420 30v360"/>
        </g>
        <g class="draw" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
          <path d="M60 62h70v46h-70M60 154h70v46h-70M60 230h70v46h-70M60 322h70v46h-70"/>
          <path d="M130 85h44v92h-44M130 253h44v92h-44"/>
          <path d="M174 131h50v168h-50"/>
          <path d="M224 215h70"/>
        </g>
        <g class="slots" fill="#fff">
          <rect x="34" y="54" width="26" height="16" rx="3"/><rect x="34" y="100" width="26" height="16" rx="3"/>
          <rect x="34" y="146" width="26" height="16" rx="3"/><rect x="34" y="192" width="26" height="16" rx="3"/>
          <rect x="34" y="222" width="26" height="16" rx="3"/><rect x="34" y="268" width="26" height="16" rx="3"/>
          <rect x="34" y="314" width="26" height="16" rx="3"/><rect x="34" y="360" width="26" height="16" rx="3"/>
        </g>
        <g class="cup">
          <rect x="300" y="170" width="180" height="90" rx="12" fill="#fff"/>
          <text x="390" y="206" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="26" fill="#12355B">FINAL</text>
          <text x="390" y="236" text-anchor="middle" font-family="Barlow" font-weight="600" font-size="15" fill="#4a5a6e">Domingo 18:30</text>
        </g>
        <circle class="ball" r="11" fill="#D9F24A" stroke="#0e1b2c" stroke-width="2">
          <animateMotion dur="3.3s" begin="0s" fill="freeze" calcMode="spline" keyPoints="0;0;1" keyTimes="0;0.28;1" keySplines="0 0 1 1;.5 0 .3 1"
            path="M60 154 H130 V85 H174 V131 H224 V215 H300"/>
        </circle>
      </svg>
    </section>

    <section class="steps page">
      <h2>Cómo funciona</h2>
      <ol>
        <li><b>Da de alta tu club</b><span>Nombre, logo, dirección, horario y tus pistas (Pista 1, Pista 2… con el nombre que quieras).</span></li>
        <li><b>Crea el torneo</b><span>Días, franjas, categorías y formato: eliminatoria, cuadro con consolación o liguilla.</span></li>
        <li><b>Inscribe parejas</b><span>Tú o ellas mismas con el enlace del torneo, indicando cuándo no pueden jugar.</span></li>
        <li><b>Genera y publica</b><span>Cuadros y horarios listos. Metes resultados y las parejas avanzan solas.</span></li>
      </ol>
    </section>

    <section class="features page">
      <div>
        <h3>El "no puedo el viernes hasta las 22:00", resuelto</h3>
        <p>El generador coloca a cada pareja en el cuadro pensando en sus restricciones y en las de cualquiera que pueda cruzarse con ella, gane o pierda. Si un jugador está en dos categorías, nunca le coinciden dos partidos.</p>
      </div>
      <div>
        <h3>Consolación sin cuentas</h3>
        <p>Quien pierde su primer partido pasa a consolación en la ronda que le toca, también si estaba exento. El segundo partido perdido elimina.</p>
      </div>
      <div>
        <h3>Carteles con tus patrocinadores</h3>
        <p>Descarga cada cuadro en PDF con el logo del club y de los patrocinadores para colgarlo en recepción o enviarlo por WhatsApp.</p>
      </div>
    </section>

    @if (tournaments().length) {
      <section class="page">
        <div class="row between"><h2>Torneos en marcha</h2><a routerLink="/torneos">Ver todos</a></div>
        <div class="cards">
          @for (t of tournaments().slice(0, 6); track t.id) { <mp-tournament-card [t]="t" [link]="'/t/' + t.slug" /> }
        </div>
      </section>
    }
  `,
  styles: [`
    .hero { max-width: 1240px; margin: 0 auto; padding: 56px 20px 40px; display: grid; grid-template-columns: 1.05fr .95fr; gap: 48px; align-items: center; }
    .hero h1 { font-size: clamp(2.6rem, 5.4vw, 4.4rem); color: var(--court); max-width: 13ch; text-wrap: balance; }
    .lead { font-size: 1.15rem; color: var(--ink-2); margin-bottom: 28px; }
    .court { width: 100%; height: auto; display: block; }
    .draw path { stroke-dasharray: 600; stroke-dashoffset: 600; animation: draw 1.1s ease-out forwards; }
    .draw path:nth-child(2) { animation-delay: .25s; }
    .draw path:nth-child(3) { animation-delay: .45s; }
    .draw path:nth-child(4) { animation-delay: .6s; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) { .draw path { stroke-dashoffset: 0; animation: none; } }
    @media (max-width: 880px) { .hero { grid-template-columns: 1fr; padding-top: 32px; } }
    .steps ol { list-style: none; counter-reset: s; padding: 0; margin: 18px 0 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .steps li { counter-increment: s; background: #fff; border: 1px solid var(--rule); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 6px; }
    .steps li::before { content: counter(s); font: 800 2.4rem/1 var(--display); color: var(--court-2); }
    .steps li b { font-size: 1.05rem; }
    .steps li span { color: var(--ink-2); font-size: .95rem; }
    @media (max-width: 880px) { .steps ol { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 520px) { .steps ol { grid-template-columns: 1fr; } }
    .features { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 32px; padding-top: 8px; }
    .features h3 { color: var(--court); font-size: 1.5rem; }
    .features p { color: var(--ink-2); }
    @media (max-width: 880px) { .features { grid-template-columns: 1fr; } }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 16px; }
  `],
})
export class HomePage implements OnInit {
  supa = inject(SupabaseService);
  private api = inject(ApiService);
  tournaments = signal<TournamentSummary[]>([]);

  ngOnInit() { this.api.publicTournaments().then(t => this.tournaments.set(t)).catch(() => {}); }
}
