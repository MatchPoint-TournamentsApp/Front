import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isPending, LEGAL } from '../core/legal';
import { SupabaseService } from '../core/supabase.service';
import { FillComponent } from './legal.page';

/** Quiénes somos: qué es MatchZone, misión, visión, valores, manuales y datos del titular. */
@Component({
  selector: 'mp-about',
  imports: [RouterLink, FillComponent],
  template: `
    <header class="band on-dark">
      <div class="inner">
        <span class="eyebrow">Quiénes somos</span>
        <h1>Torneos de pádel,<br>bien organizados</h1>
        <p class="lead">{{ L.brand }} es la herramienta con la que los clubes organizan sus torneos de pádel: inscripciones, cuadros, horarios y resultados en un solo sitio, y una página pública para que los jugadores lo sigan todo desde el móvil.</p>
      </div>
      <hr class="gold-rule">
    </header>

    <div class="page about">
      <section class="pair">
        <article class="card">
          <span class="eyebrow">Misión</span>
          <h2>Que organizar un torneo sea sencillo</h2>
          <p>Ayudamos a los clubes a montar sus torneos sin hojas de cálculo ni horas cuadrando horarios a mano, respetando siempre la disponibilidad de cada pareja, para que el organizador dedique su tiempo al club y los jugadores a jugar.</p>
        </article>
        <article class="card">
          <span class="eyebrow">Visión</span>
          <h2>La referencia de los clubes de pádel</h2>
          <p>Queremos ser la herramienta de referencia para organizar torneos de pádel, primero en España y después en Europa, con una experiencia igual de clara para el club que organiza y para el jugador que se inscribe.</p>
        </article>
      </section>

      <section>
        <span class="eyebrow">Valores</span>
        <h2 class="sec">Lo que nos guía</h2>
        <div class="values">
          @for (v of values; track v.t) {
            <article class="value">
              <span class="n num">{{ $index + 1 }}</span>
              <h3>{{ v.t }}</h3>
              <p>{{ v.d }}</p>
            </article>
          }
        </div>
      </section>

      <section>
        <span class="eyebrow">Qué hacemos</span>
        <h2 class="sec">Todo el torneo en una sola herramienta</h2>
        <ul class="features">
          @for (f of features; track f.t) {
            <li><b>{{ f.t }}</b><span>{{ f.d }}</span></li>
          }
        </ul>
      </section>

      <section class="split">
        <div>
          <span class="eyebrow">Manuales</span>
          <h2 class="sec">Recursos para clubes</h2>
          <p class="muted">Guía paso a paso para organizar un torneo con {{ L.brand }}: crear el club y el torneo, inscribir parejas, generar los cuadros, gestionar el día de juego y publicar resultados.</p>
        </div>
        <a class="doc" href="docs/MatchZone-Manual-del-club.pdf" target="_blank" rel="noopener" download>
          <span class="ico" aria-hidden="true">PDF</span>
          <span><b>Manual del club</b><small>Guía completa · PDF</small></span>
          <span class="go" aria-hidden="true">↓</span>
        </a>
      </section>

      <section class="split">
        <div>
          <span class="eyebrow">Datos</span>
          <h2 class="sec">Quién está detrás</h2>
          <p class="muted who">{{ L.brand }} está diseñada y desarrollada por {{ L.titular }}, en Mérida.</p>
          <p class="muted">Más información en el <a routerLink="/aviso-legal">aviso legal</a>, la <a routerLink="/privacidad">política de privacidad</a> y las <a routerLink="/condiciones">condiciones de uso</a>.</p>
        </div>
        <dl class="facts">
          <dt>Desarrollador</dt><dd><mp-fill [v]="L.titular" /></dd>
          <dt>Ubicación</dt><dd><mp-fill [v]="L.address" /></dd>
          <dt>Contacto</dt><dd>@if (pending(L.email)) { <mp-fill [v]="L.email" /> } @else { <a [href]="'mailto:' + L.email">{{ L.email }}</a> }</dd>
        </dl>
      </section>

      <section class="cta">
        <h2>¿Organizas torneos en tu club?</h2>
        <div class="row">
          <a class="btn ball" [routerLink]="supa.loggedIn() ? '/panel' : '/registro'">Organizar un torneo</a>
          <a class="btn ghost" routerLink="/torneos">Ver torneos</a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .band { background: radial-gradient(100% 120% at 85% 0%, #142033 0%, var(--night) 60%); color: var(--cream); }
    .band .inner { max-width: 1200px; margin: 0 auto; padding: 56px 20px 48px; }
    .band h1 { color: var(--cream); font-weight: 300; font-size: clamp(2rem, 4.6vw, 3.2rem); line-height: 1.05; margin: 14px 0 18px; }
    .lead { max-width: 62ch; color: var(--cream-2); font-size: 1.08rem; line-height: 1.6; margin: 0; }
    .about section { margin: 0 0 56px; }
    .about section:first-child { margin-top: 8px; }
    .sec { margin: 10px 0 22px; font-weight: 400; }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .card { background: #fff; border: 1px solid var(--rule); border-top: 3px solid var(--gold); border-radius: var(--r-lg, 16px); padding: 26px 26px 22px; }
    .card h2 { font-weight: 400; margin: 10px 0 10px; font-size: 1.45rem; }
    .card p { color: var(--ink-2); line-height: 1.65; margin: 0; }
    .values { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .value { background: #fff; border: 1px solid var(--rule); border-radius: 14px; padding: 18px 20px; }
    .value .n { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--night); color: var(--gold); font-size: 15px; }
    .value h3 { margin: 12px 0 6px; font-size: 1.05rem; font-weight: 500; }
    .value p { margin: 0; color: var(--ink-2); font-size: .94rem; line-height: 1.55; }
    .features { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }
    .features li { display: flex; flex-direction: column; gap: 3px; padding: 14px 0; border-top: 1px solid var(--rule); }
    .features b { font-weight: 500; }
    .features span { color: var(--ink-2); font-size: .94rem; line-height: 1.5; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: center; }
    .split p { line-height: 1.6; margin: 0; }
    .split p.who { margin-bottom: 10px; }
    .doc { display: flex; align-items: center; gap: 16px; padding: 18px 20px; background: #fff; border: 1px solid var(--rule); border-radius: 14px; text-decoration: none; color: var(--ink); transition: border-color .2s, transform .2s; }
    .doc:hover { border-color: var(--gold); transform: translateY(-1px); }
    .doc .ico { width: 48px; height: 56px; border-radius: 6px; background: var(--night); color: var(--gold); display: grid; place-items: center; font: 600 .78rem var(--body); letter-spacing: .1em; flex: none; }
    .doc b { display: block; font-weight: 500; font-size: 1.05rem; }
    .doc small { color: var(--ink-3); }
    .doc .go { margin-left: auto; font-size: 1.3rem; color: var(--gold-ink); }
    .facts { display: grid; grid-template-columns: max-content 1fr; gap: 10px 20px; margin: 0; padding: 20px 22px; background: #fff; border: 1px solid var(--rule); border-radius: 14px; }
    .facts dt { color: var(--ink-3); font-size: .82rem; letter-spacing: .12em; text-transform: uppercase; padding-top: 2px; }
    .facts dd { margin: 0; }
    .cta { text-align: center; padding: 40px 20px; border-top: 1px solid var(--gold); }
    .cta h2 { font-weight: 300; margin: 0 0 18px; }
    .cta .row { justify-content: center; gap: 12px; }
    @media (max-width: 820px) {
      .pair, .split, .features { grid-template-columns: 1fr; }
      .values { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 520px) { .values { grid-template-columns: 1fr; } }
  `],
})
export class AboutPage {
  readonly L = LEGAL;
  readonly pending = isPending;
  readonly supa = inject(SupabaseService);

  readonly values = [
    { t: 'El jugador primero', d: 'Respetamos la disponibilidad de cada pareja: el horario se adapta a las personas, no al revés.' },
    { t: 'Sencillez', d: 'Lo complicado lo resuelve la herramienta; el club solo tiene que tomar las decisiones importantes.' },
    { t: 'Transparencia', d: 'Cuadros, horarios y resultados públicos y al día, para que nadie tenga que preguntar.' },
    { t: 'Cercanía', d: 'Construimos MatchZone junto a los clubes, a partir de torneos reales y de lo que necesitan en pista.' },
    { t: 'Privacidad', d: 'Tratamos los datos de los jugadores con cuidado y conforme al RGPD: solo lo necesario.' },
    { t: 'Mejora continua', d: 'Cada torneo nos enseña algo y la herramienta mejora con cada temporada.' },
  ];

  readonly features = [
    { t: 'Inscripciones', d: 'Por enlace público o desde el club, con las restricciones horarias de cada pareja.' },
    { t: 'Cuadros automáticos', d: 'Eliminatoria, consolación, cuadros A/B y liguillas, generados en segundos.' },
    { t: 'Horarios que respetan a los jugadores', d: 'Reparto por días, horas y pistas sin pisar la disponibilidad de nadie.' },
    { t: 'Panel de control', d: 'Pistas libres u ocupadas y los siguientes partidos, para el día del torneo.' },
    { t: 'Resultados en directo', d: 'Página pública del torneo con los partidos en juego y los resultados al momento.' },
    { t: 'Carteles y cuadro de honor', d: 'PDF e imagen con los patrocinadores, listos para colgar o compartir.' },
    { t: 'Pagos de inscripción', d: 'Control de quién ha pagado, con aviso antes de empezar cada partido.' },
    { t: 'Exportación', d: 'Copia completa del torneo y listados para Excel.' },
  ];
}
