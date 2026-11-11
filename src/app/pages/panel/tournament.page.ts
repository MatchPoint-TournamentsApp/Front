import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Board, Club, MatchView, Tournament } from '../../core/models';
import { range, STATUS_LABEL } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { MatchDialogComponent } from '../../shared/match-dialog.component';
import { ScheduleComponent } from '../../shared/schedule.component';
import { CategoriesTabComponent } from './categories-tab.component';
import { DrawsTabComponent } from './draws-tab.component';
import { PairsTabComponent } from './pairs-tab.component';
import { SettingsTabComponent } from './settings-tab.component';
import { SponsorsTabComponent } from './sponsors-tab.component';
import { DrawStatusComponent } from './draw-status.component';
import { ExportMenuComponent } from './export-menu.component';
import { CourtsTabComponent } from './courts-tab.component';

type Tab = 'courts' | 'settings' | 'categories' | 'pairs' | 'draws' | 'schedule' | 'sponsors';

/** Cada cuánto se refresca el panel de pistas (varias personas pueden llevar el torneo a la vez). */
const REFRESH_MS = 30_000;

/** Gestión completa de un torneo por el organizador. */
@Component({
  selector: 'mp-tournament',
  imports: [RouterLink, SettingsTabComponent, CategoriesTabComponent, PairsTabComponent, DrawsTabComponent,
    ScheduleComponent, SponsorsTabComponent, MatchDialogComponent, DrawStatusComponent, ExportMenuComponent, CourtsTabComponent],
  template: `
    <div class="page">
      @if (t(); as tt) {
        <div class="page-head">
          <div>
            <a class="back" [routerLink]="['/panel/club', tt.clubId]">← {{ club()?.name ?? 'Club' }}</a>
            <h1>{{ tt.name }}</h1>
            <div class="row">
              <span class="chip">{{ status() }}</span>
              <span class="muted small">{{ dates() }}</span>
              @if (tt.registrationOpen) { <span class="chip ball">Inscripción abierta</span> }
            </div>
          </div>
          <div class="row">
            <button class="btn ghost" (click)="copyLink()">Copiar enlace público</button>
            <a class="btn ghost" [href]="'/t/' + tt.slug" target="_blank" rel="noopener">Ver página pública</a>
            <mp-export-menu [t]="tt" [board]="board()" />
          </div>
        </div>

        <mp-draw-status [t]="tt" (changed)="reload()" (generated)="tab.set('draws')" />
        @if (next(); as n) { <div class="notice next">{{ n }}</div> }

        <div class="tabs" role="tablist">
          @if (hasMatches()) {
            <button [class.on]="tab() === 'courts'" (click)="tab.set('courts')">Pistas@if (liveCount()) { <span class="live tab-live" [title]="liveCount() + ' en juego'">{{ liveCount() }}</span> }</button>
          }
          <button [class.on]="tab() === 'settings'" (click)="tab.set('settings')">Ajustes</button>
          <button [class.on]="tab() === 'categories'" (click)="tab.set('categories')">Categorías <span class="count">{{ tt.categories.length }}</span></button>
          <button [class.on]="tab() === 'pairs'" (click)="tab.set('pairs')">Parejas <span class="count">{{ totalPairs() }}</span>@if (pending()) { <span class="chip warn">{{ pending() }} pendientes</span> }</button>
          <button [class.on]="tab() === 'draws'" (click)="tab.set('draws')">Cuadros y resultados@if (liveCount()) { <span class="live tab-live" [title]="liveCount() + ' en juego'">{{ liveCount() }}</span> }</button>
          <button [class.on]="tab() === 'schedule'" (click)="tab.set('schedule')">Horario</button>
          <button [class.on]="tab() === 'sponsors'" (click)="tab.set('sponsors')">Patrocinadores</button>
        </div>

        @switch (tab()) {
          @case ('courts') { @if (board(); as b) { <mp-courts-tab [board]="b" (changed)="reload()" (matchClick)="selected.set($event)" /> } }
          @case ('settings') { <mp-settings-tab [t]="tt" [club]="club()" (changed)="reload()" /> }
          @case ('categories') { <mp-categories-tab [t]="tt" (changed)="reload()" /> }
          @case ('pairs') { <mp-pairs-tab [t]="tt" (changed)="reload()" /> }
          @case ('draws') { @if (board(); as b) { <mp-draws-tab [t]="tt" [board]="b" (changed)="reload()" (matchClick)="selected.set($event)" /> } }
          @case ('schedule') {
            @if (board(); as b) {
              <p class="muted small">Pulsa en un partido para empezarlo en una pista, cambiar su día u hora o meter el resultado.</p>
              <mp-schedule [board]="b" [admin]="true" (matchClick)="selected.set($event)" />
            }
          }
          @case ('sponsors') { <mp-sponsors-tab [t]="tt" (changed)="reload()" /> }
        }
        @if (selected() && board(); as b) {
          <mp-match-dialog [m]="selected()!" [board]="b" (closed)="onDialogClosed($event)" />
        }
      } @else { <p class="muted">Cargando torneo…</p> }
    </div>
  `,
  styles: [`
    .back { font-size: .74rem; letter-spacing: .2em; text-transform: uppercase; text-decoration: none; color: var(--gold-ink); }
    .back:hover { color: var(--ink); }
    .page-head h1 { margin: 10px 0 10px; }
    .count { font-size: .78rem; color: var(--ink-3); margin-left: 4px; }
    .tabs .chip { margin-left: 6px; }
    .tab-live { margin-left: 6px; font-size: .74rem; vertical-align: middle; }
    .next { margin-bottom: 18px; }
  `],
})
export class TournamentPage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  id = input.required<string>();
  tabParam = input<string>('', { alias: 'tab' });

  t = signal<Tournament | null>(null);
  board = signal<Board | null>(null);
  club = signal<Club | null>(null);
  tab = signal<Tab>('settings');
  selected = signal<MatchView | null>(null);

  status = computed(() => this.t() ? STATUS_LABEL[this.t()!.status] : '');
  dates = computed(() => this.t() ? range(this.t()!.startDate, this.t()!.endDate) : '');
  totalPairs = computed(() => this.t()?.categories.reduce((a, c) => a + c.confirmedPairs, 0) ?? 0);
  /** Hay cuadros generados con partidos (se muestra la pestaña Pistas). */
  hasMatches = computed(() => this.board()?.categories.some(c => c.matches.length) ?? false);
  private timer?: ReturnType<typeof setInterval>;
  /** Partidos en juego ahora mismo (punto rojo en la pestaña de cuadros). */
  liveCount = computed(() => this.board()?.categories.reduce((a, c) => a + c.matches.filter(m => m.live).length, 0) ?? 0);
  pending = computed(() => this.t()?.categories.reduce((a, c) => a + c.pendingPairs, 0) ?? 0);

  /** Siguiente paso sugerido al organizador. */
  next = computed(() => {
    const t = this.t();
    if (!t) return '';
    if (!t.categories.length) return 'Siguiente paso: crea las categorías del torneo (por ejemplo "Cuarta masculina" o "Primera mixta").';
    if (!this.totalPairs() && !this.pending()) return 'Siguiente paso: inscribe parejas o abre la inscripción pública en Ajustes y comparte el enlace.';
    if (this.pending()) return `Tienes ${this.pending()} inscripciones pendientes de confirmar en la pestaña Parejas.`;
    return '';
  });

  async ngOnInit() {
    const p = this.tabParam() as Tab;
    await this.reload();
    if (['courts', 'settings', 'categories', 'pairs', 'draws', 'schedule', 'sponsors'].includes(p)) this.tab.set(p);
    else if (this.t()?.status === 'IN_PROGRESS' && this.hasMatches()) this.tab.set('courts');
    // Panel de pistas: refresco periódico mientras está a la vista y sin ventana abierta
    this.timer = setInterval(() => {
      if (this.tab() === 'courts' && !this.selected() && document.visibilityState === 'visible') this.reload(true);
    }, REFRESH_MS);
    if (this.t()) this.api.club(this.t()!.clubId).then(c => this.club.set(c)).catch(() => {});
  }

  ngOnDestroy() { clearInterval(this.timer); }

  /** @param silent refresco automático: sin avisos de error */
  async reload(silent = false) {
    try {
      const [t, b] = await Promise.all([this.api.tournament(this.id()), this.api.board(this.id())]);
      this.t.set(t);
      this.board.set(b);
    } catch (e) { if (!silent) this.toast.error(e); }
  }

  onDialogClosed(changed: boolean) {
    this.selected.set(null);
    if (changed) this.reload();
  }

  copyLink() {
    const url = `${location.origin}/t/${this.t()!.slug}`;
    navigator.clipboard?.writeText(url).then(() => this.toast.ok('Enlace copiado: ' + url), () => this.toast.show(url));
  }
}
