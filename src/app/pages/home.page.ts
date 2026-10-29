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
    <section class="hero on-dark">
      <div class="inner">
        <div class="copy">
          <span class="eyebrow">Torneos de pádel</span>
          <h1>Cuadros que encajan con el horario de cada pareja</h1>
          <p class="lead">Apunta las parejas y cuándo no pueden jugar. MatchPoint monta el cuadro o la liguilla, reparte pistas y horas, y lo publica para que todos lo sigan desde el móvil.</p>
          <div class="row cta">
            <a class="btn lg ball" [routerLink]="supa.loggedIn() ? '/panel' : '/registro'">Organizar un torneo</a>
            <a class="btn lg ghost" routerLink="/torneos">Ver torneos</a>
          </div>
        </div>
        <div class="art" aria-hidden="true">
          <div class="glow"></div>
          <img src="brand/mark-800.png" alt="">
        </div>
      </div>
    </section>

    <section class="page steps">
      <span class="eyebrow">Cómo funciona</span>
      <h2>De la lista de parejas al cuadro publicado</h2>
      <ol>
        <li><b>Da de alta tu club</b><span>Nombre, logo, horario y tus pistas, con el nombre que quieras.</span></li>
        <li><b>Crea el torneo</b><span>Días, horario, categorías y formato: eliminatoria, consolación o liguilla.</span></li>
        <li><b>Inscribe parejas</b><span>Tú o ellas con el enlace del torneo, indicando cuándo no pueden.</span></li>
        <li><b>Genera y publica</b><span>Cuadros y horarios listos. Metes resultados y las parejas avanzan solas.</span></li>
      </ol>
    </section>

    <section class="page feature">
      <div class="text">
        <span class="eyebrow">Lo que nos diferencia</span>
        <h2>"El viernes no podemos hasta las 20:00", resuelto</h2>
        <p class="muted">Cada pareja indica cuándo no puede jugar. El generador coloca los partidos en pista y hora sin pisar esas franjas, ni las de cualquier pareja que pueda llegar a ese cruce, gane o pierda. Si un jugador está en dos categorías, nunca le coinciden dos partidos.</p>
      </div>
      <div class="demo" aria-hidden="true">
        <div class="pair">
          <b>Ruiz · Navarro</b>
          <div class="days">
            <span><i>V</i> No puede hasta las 20:00</span>
            <span><i>S</i> Puede a cualquier hora</span>
            <span><i>D</i> No puede en todo el día</span>
          </div>
        </div>
        <div class="slots">
          <div class="slot off"><em>Vie 18:30</em><span>Fuera de su horario</span></div>
          <div class="slot on"><em>Vie 20:30</em><span>Pista 2 · Octavos</span><i>✓</i></div>
          <div class="slot"><em>Sáb 11:00</em><span>Siguiente ronda, gane o pierda</span></div>
        </div>
      </div>
    </section>

    <section class="page duo">
      <div>
        <span class="eyebrow">Consolación sin cuentas</span>
        <p>Quien pierde su primer partido pasa a consolación en la ronda que le toca, también si estaba exento. El segundo partido perdido elimina.</p>
      </div>
      <div>
        <span class="eyebrow">Carteles con patrocinadores</span>
        <p>Descarga cada cuadro en PDF con el logo del club y de los patrocinadores para colgarlo en recepción o enviarlo por WhatsApp.</p>
      </div>
    </section>

    @if (tournaments().length) {
      <section class="page live">
        <div class="row between">
          <div><span class="eyebrow">En juego</span><h2>Torneos en marcha</h2></div>
          <a routerLink="/torneos">Ver todos →</a>
        </div>
        <div class="cards">
          @for (t of tournaments().slice(0, 6); track t.id) { <mp-tournament-card [t]="t" [link]="'/t/' + t.slug" /> }
        </div>
      </section>
    }

    <section class="closing on-dark">
      <div class="inner">
        <h2>¿Organizas un torneo este mes?</h2>
        <p>Crea tu cuenta, da de alta el club y ten el primer cuadro listo en una tarde.</p>
        <a class="btn lg ball" [routerLink]="supa.loggedIn() ? '/panel' : '/registro'">Crear mi cuenta</a>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; margin-bottom: -40px; }

    .hero { background: radial-gradient(120% 90% at 78% 40%, #121c2b 0%, var(--night) 60%); color: var(--cream); overflow: hidden; }
    .hero .inner { max-width: 1200px; margin: 0 auto; padding: 72px 20px 88px; display: grid; grid-template-columns: 1.1fr .9fr; gap: 40px; align-items: center; }
    .hero h1 { color: var(--cream); font-weight: 300; font-size: clamp(2.4rem, 5vw, 3.9rem); line-height: 1.06; letter-spacing: -.025em; max-width: 14ch; margin: 22px 0 22px; text-wrap: balance; }
    .lead { font-size: 1.12rem; color: var(--cream-2); max-width: 46ch; margin-bottom: 34px; font-weight: 300; }
    .cta { gap: 14px; }
    .art { position: relative; justify-self: center; width: min(440px, 100%); aspect-ratio: 1; }
    /* "lighten": el fondo oscuro de la imagen desaparece sobre la noche y queda solo el dorado */
    .art img { position: relative; width: 100%; height: 100%; display: block; mix-blend-mode: lighten; animation: float 7s ease-in-out infinite; }
    .glow { position: absolute; inset: 14%; border-radius: 50%; background: radial-gradient(circle, rgba(201, 164, 106, .16), transparent 70%); filter: blur(10px); }
    @keyframes float { 50% { transform: translateY(-8px); } }
    @media (max-width: 880px) {
      .hero .inner { grid-template-columns: 1fr; padding: 40px 20px 56px; gap: 8px; }
      .art { order: -1; width: 220px; }
      .hero h1 { margin-top: 14px; }
    }

    h2 { margin-top: 14px; }

    .steps { padding-bottom: 24px; }
    .steps ol { list-style: none; counter-reset: s; padding: 0; margin: 30px 0 0; display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--rule); }
    .steps li { counter-increment: s; padding: 26px 24px 8px 0; display: flex; flex-direction: column; gap: 8px; }
    .steps li + li { padding-left: 24px; border-left: 1px solid var(--rule); }
    .steps li::before { content: '0' counter(s); font: 300 2rem/1 var(--body); color: var(--gold); letter-spacing: .04em; }
    .steps li b { font-weight: 500; font-size: 1.05rem; }
    .steps li span { color: var(--ink-2); font-size: .95rem; }
    @media (max-width: 880px) {
      .steps ol { grid-template-columns: 1fr 1fr; }
      .steps li:nth-child(3) { padding-left: 0; border-left: 0; }
    }
    @media (max-width: 520px) {
      .steps ol { grid-template-columns: 1fr; }
      .steps li, .steps li + li { padding: 20px 0 4px; border-left: 0; border-top: 1px solid var(--rule-2); }
      .steps li:first-child { border-top: 0; }
    }

    .feature { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; padding-top: 48px; padding-bottom: 40px; }
    .feature p { font-size: 1.04rem; }
    .demo { background: #fff; border: 1px solid var(--rule); border-radius: 20px; padding: 22px; box-shadow: var(--shadow); display: grid; gap: 18px; }
    .pair b { font-weight: 500; }
    .days { display: grid; gap: 6px; margin-top: 10px; }
    .days span { display: flex; align-items: center; gap: 10px; font-size: .9rem; color: var(--ink-2); }
    .days i { font-style: normal; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-size: .75rem; font-weight: 600; background: var(--rule-2); color: var(--ink); }
    .slots { display: grid; gap: 8px; border-top: 1px solid var(--rule-2); padding-top: 16px; }
    .slot { display: grid; grid-template-columns: 92px 1fr auto; gap: 12px; align-items: center; padding: 10px 14px; border-radius: 12px; background: var(--glass); font-size: .9rem; }
    .slot em { font-style: normal; font-family: var(--display); font-weight: 600; font-size: 1rem; }
    .slot span { color: var(--ink-2); }
    .slot.off { opacity: .55; }
    .slot.off em { text-decoration: line-through; }
    .slot.on { background: var(--night); color: var(--cream); }
    .slot.on span { color: var(--cream-2); }
    .slot.on i { font-style: normal; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: var(--gold-grad); color: var(--night); font-size: .8rem; font-weight: 700; }
    @media (max-width: 880px) { .feature { grid-template-columns: 1fr; gap: 28px; } }

    .duo { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; padding-top: 8px; }
    .duo p { margin-top: 14px; color: var(--ink-2); }
    @media (max-width: 760px) { .duo { grid-template-columns: 1fr; gap: 24px; } }

    .live .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 22px; }
    .live a { text-decoration: none; font-size: .92rem; }

    .closing { background: var(--night); color: var(--cream); text-align: center; border-top: 1px solid var(--night-3); }
    .closing .inner { max-width: 640px; margin: 0 auto; padding: 72px 20px; display: flex; flex-direction: column; align-items: center; }
    .closing h2 { color: var(--cream); font-weight: 300; font-size: clamp(1.7rem, 3.4vw, 2.3rem); }
    .closing p { color: var(--cream-2); margin: 4px 0 28px; }
  `],
})
export class HomePage implements OnInit {
  supa = inject(SupabaseService);
  private api = inject(ApiService);
  tournaments = signal<TournamentSummary[]>([]);

  ngOnInit() { this.api.publicTournaments().then(t => this.tournaments.set(t)).catch(() => {}); }
}
