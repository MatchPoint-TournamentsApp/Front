import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { Board, CategoryBoard } from '../core/models';
import { categoryColor, range } from '../core/format';
import { CategoryBoardComponent } from '../shared/category-board.component';
import { ScheduleComponent } from '../shared/schedule.component';
import { PosterComponent } from '../shared/poster.component';
import { HonorBoardComponent } from '../shared/honor-board.component';
import { podium } from '../shared/honor';
import { RegistrationFormComponent } from './registration-form.component';
import { SponsorStripComponent } from './sponsor-strip.component';
import { MyMatchesComponent } from './my-matches.component';

/** Página pública del torneo (invitados): cuadros, horario, normas e inscripción. */
@Component({
  selector: 'mp-public-tournament',
  imports: [CategoryBoardComponent, HonorBoardComponent, ScheduleComponent, PosterComponent, RegistrationFormComponent, SponsorStripComponent, MyMatchesComponent],
  template: `
    @if (error()) {
      <div class="page"><div class="panel empty"><h3>Torneo no disponible</h3><p>{{ error() }}</p></div></div>
    } @else if (board(); as b) {
      <header class="band on-dark">
        <div class="inner">
          <div class="logo">@if (b.club.logoUrl) { <img [src]="b.club.logoUrl" alt=""> } @else { <span>{{ b.club.name.charAt(0) }}</span> }</div>
          <div class="title">
            <span class="eyebrow">{{ b.club.name }}</span>
            <h1>{{ b.tournament.name }}</h1>
            <div class="meta">
              <span>{{ dates() }}</span>
              @if (b.club.address) { <span>{{ b.club.address }}@if (b.club.city) {, {{ b.club.city }}}</span> }
            </div>
          </div>
        </div>
        <hr class="gold-rule">
      </header>
      <div class="page">
        @if (b.tournament.description) { <p class="desc">{{ b.tournament.description }}</p> }
        <div class="tabs">
          <button [class.on]="tab() === 'draws'" (click)="tab.set('draws')">Cuadros@if (liveCount(b)) { <span class="live tab-live" [title]="liveCount(b) + ' en juego'">{{ liveCount(b) }}</span> }</button>
          <button [class.on]="tab() === 'schedule'" (click)="tab.set('schedule')">Horario</button>
          <button [class.on]="tab() === 'rules'" (click)="tab.set('rules')">Normas</button>
          @if (b.tournament.registrationOpen) { <button [class.on]="tab() === 'signup'" (click)="tab.set('signup')">Inscripción</button> }
        </div>

        @if (tab() === 'draws' || tab() === 'schedule') { <mp-my-matches [board]="b" /> }
        @switch (tab()) {
          @case ('draws') {
            @if (!b.categories.length) { <div class="panel empty"><h3>Sin categorías todavía</h3></div> }
            @else {
              <div class="row between" style="margin-bottom:14px">
                <div class="seg">
                  @for (c of b.categories; track c.category.id) {
                    <button [class.on]="!honor() && c.category.id === current()?.category?.id" (click)="catId.set(c.category.id)">
                      <span class="dot" [style.background]="color(c)"></span>{{ c.category.name }}
                      @if (liveIn(c)) { <span class="live cat-live" [title]="liveIn(c) + ' en juego'"></span> }
                    </button>
                  }
                  @if (hasHonor()) { <button class="honor-chip" [class.on]="honor()" (click)="catId.set('honor')">🏆 Cuadro de honor</button> }
                </div>
              </div>
              @if (honor()) {
                <mp-honor-board [board]="b" />
                <div class="dl">
                <span class="tiny muted">Descargar</span>
                <button class="dl-btn" (click)="openPoster('pdf')">PDF</button>
                <button class="dl-btn" (click)="openPoster('png')">Imagen</button>
              </div>
              } @else if (current(); as c) {
                <mp-category-board [board]="c" />
                @if (c.category.drawGenerated) {
                <div class="dl">
                <span class="tiny muted">Descargar</span>
                <button class="dl-btn" (click)="openPoster('pdf')">PDF</button>
                <button class="dl-btn" (click)="openPoster('png')">Imagen</button>
              </div>
                }
              }
            }
          }
          @case ('schedule') { <mp-schedule [board]="b" /> }
          @case ('rules') {
            <div class="panel rules">
              <h3>Formato de juego</h3>
              <p>Todos los partidos se jugarán a {{ b.tournament.scoringFormat }}.</p>
              @if (b.tournament.rules) { <h3>Normas del torneo</h3><div class="pre">{{ b.tournament.rules }}</div> }
            </div>
          }
          @case ('signup') { <mp-registration-form [board]="b" /> }
        }
        <mp-sponsor-strip [sponsors]="b.tournament.sponsors" />
      </div>
      @if (poster(); as kind) { <mp-poster [board]="b" [category]="honor() ? null : current() ?? null" [kind]="kind" (closed)="poster.set(null)" /> }
    } @else {
      <div class="page"><p class="muted">Cargando torneo…</p></div>
    }
  `,
  styles: [`
    .honor-chip { color: var(--gold-ink); font-weight: 600; }
    .dl { display: flex; justify-content: flex-end; align-items: center; gap: 4px; margin-top: 10px; }
    .dl-btn { background: none; border: 0; padding: 4px 8px; border-radius: 6px; font: 500 .82rem var(--body); color: var(--ink-2); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--rule); }
    .dl-btn:hover { color: var(--ink); background: var(--glass); }
    .tab-live { margin-left: 6px; font-size: .74rem; vertical-align: middle; }
    .cat-live { margin-left: 6px; }
    .band { background: radial-gradient(100% 120% at 85% 0%, #142033 0%, var(--night) 60%); color: var(--cream); }
    .band .inner { max-width: 1200px; margin: 0 auto; padding: 40px 20px 36px; display: flex; gap: 24px; align-items: center; }
    .band h1 { margin: 12px 0 10px; color: var(--cream); font-weight: 300; font-size: clamp(1.9rem, 4vw, 2.8rem); }
    .meta { display: flex; gap: 8px 22px; flex-wrap: wrap; color: var(--cream-2); font-size: .95rem; }
    .meta span + span::before { content: '·'; margin-right: 22px; color: var(--gold); }
    .logo { width: 88px; height: 88px; border-radius: 18px; background: #fff; display: grid; place-items: center; padding: 10px; flex: none; box-shadow: 0 0 0 1px rgba(201, 164, 106, .4); }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo span { font: 300 40px var(--body); color: var(--gold-ink); text-transform: uppercase; }
    .title { min-width: 0; }
    @media (max-width: 560px) {
      .band .inner { flex-direction: column; align-items: flex-start; gap: 16px; padding-top: 28px; }
      .logo { width: 64px; height: 64px; border-radius: 14px; }
    }
    .desc { font-size: 1.05rem; color: var(--ink-2); }
    .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }
    .pre { white-space: pre-line; color: var(--ink-2); }
    .rules p { max-width: 70ch; }
  `],
})
export class PublicTournamentPage {
  private api = inject(ApiService);
  slug = input.required<string>();
  board = signal<Board | null>(null);
  error = signal('');
  tab = signal<'draws' | 'schedule' | 'rules' | 'signup'>('draws');
  catId = signal<string | null>(null);
  /** Ventana de descarga abierta (PDF o imagen). */
  poster = signal<'pdf' | 'png' | null>(null);

  current = computed<CategoryBoard | undefined>(() => {
    const b = this.board();
    if (!b) return undefined;
    return b.categories.find(c => c.category.id === this.catId()) ?? b.categories[0];
  });
  /** Cuadro de honor elegido en la fila de categorías. */
  honor = computed(() => this.catId() === 'honor' && this.hasHonor());
  /** Alguna categoría tiene ya campeón. */
  hasHonor = computed(() => !!this.board()?.categories.some(c => podium(c).done));
  dates = computed(() => this.board() ? range(this.board()!.tournament.startDate, this.board()!.tournament.endDate) : '');

  constructor() {
    effect(() => {
      const s = this.slug();
      this.api.publicBoard(s).then(b => this.board.set(b)).catch(e => this.error.set(e.message));
    });
  }

  openPoster(kind: 'pdf' | 'png') { this.poster.set(kind); }
  color(c: CategoryBoard) { return categoryColor(c.category); }
  /** Partidos en juego ahora mismo (punto rojo en la pestaña Cuadros y en cada categoría). */
  liveIn(c: CategoryBoard) { return c.matches.filter(m => m.live).length; }
  liveCount(b: { categories: CategoryBoard[] }) { return b.categories.reduce((a, c) => a + this.liveIn(c), 0); }
}
