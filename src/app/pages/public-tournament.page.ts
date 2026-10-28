import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { Board, CategoryBoard } from '../core/models';
import { categoryColor, range } from '../core/format';
import { CategoryBoardComponent } from '../shared/category-board.component';
import { ScheduleComponent } from '../shared/schedule.component';
import { PosterComponent } from '../shared/poster.component';
import { RegistrationFormComponent } from './registration-form.component';
import { SponsorStripComponent } from './sponsor-strip.component';
import { MyMatchesComponent } from './my-matches.component';

/** Página pública del torneo (invitados): cuadros, horario, normas e inscripción. */
@Component({
  selector: 'mp-public-tournament',
  imports: [CategoryBoardComponent, ScheduleComponent, PosterComponent, RegistrationFormComponent, SponsorStripComponent, MyMatchesComponent],
  template: `
    @if (error()) {
      <div class="page"><div class="panel empty"><h3>Torneo no disponible</h3><p>{{ error() }}</p></div></div>
    } @else if (board(); as b) {
      <header class="band" [style.--c]="b.tournament.primaryColor">
        <div class="inner">
          <div class="logo">@if (b.club.logoUrl) { <img [src]="b.club.logoUrl" alt=""> } @else { <span>{{ b.club.name.charAt(0) }}</span> }</div>
          <div>
            <h1>{{ b.tournament.name }}</h1>
            <div class="meta">{{ dates() }} <span>{{ b.club.name }}</span>@if (b.club.address) {<span>{{ b.club.address }}@if (b.club.city) {, {{ b.club.city }}}</span>}</div>
          </div>
        </div>
      </header>
      <div class="page">
        @if (b.tournament.description) { <p class="desc">{{ b.tournament.description }}</p> }
        <div class="tabs">
          <button [class.on]="tab() === 'draws'" (click)="tab.set('draws')">Cuadros</button>
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
                    <button [class.on]="c.category.id === current()?.category?.id" (click)="catId.set(c.category.id)">
                      <span class="dot" [style.background]="color(c)"></span>{{ c.category.name }}
                    </button>
                  }
                </div>
                @if (current()?.category?.drawGenerated) { <button class="btn ghost sm" (click)="poster.set(true)">Descargar PDF</button> }
              </div>
              @if (current(); as c) { <mp-category-board [board]="c" /> }
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
      @if (poster() && current(); as c) { <mp-poster [board]="b" [category]="c" (closed)="poster.set(false)" /> }
    } @else {
      <div class="page"><p class="muted">Cargando torneo…</p></div>
    }
  `,
  styles: [`
    .band { background: var(--c); color: #fff; }
    .band .inner { max-width: 1240px; margin: 0 auto; padding: 32px 20px; display: flex; gap: 20px; align-items: center; }
    .band h1 { margin: 0; color: #fff; text-transform: uppercase; }
    .meta { display: flex; gap: 16px; flex-wrap: wrap; opacity: .9; font-weight: 500; }
    .logo { width: 84px; height: 84px; border-radius: 14px; background: #fff; display: grid; place-items: center; padding: 8px; flex: none; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo span { font: 800 40px var(--display); color: var(--court); }
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
  poster = signal(false);

  current = computed<CategoryBoard | undefined>(() => {
    const b = this.board();
    if (!b) return undefined;
    return b.categories.find(c => c.category.id === this.catId()) ?? b.categories[0];
  });
  dates = computed(() => this.board() ? range(this.board()!.tournament.startDate, this.board()!.tournament.endDate) : '');

  constructor() {
    effect(() => {
      const s = this.slug();
      this.api.publicBoard(s).then(b => this.board.set(b)).catch(e => this.error.set(e.message));
    });
  }

  color(c: CategoryBoard) { return categoryColor(c.category); }
}
