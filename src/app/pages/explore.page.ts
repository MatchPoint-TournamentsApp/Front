import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { TournamentSummary } from '../core/models';
import { TournamentCardComponent } from './tournament-card.component';

@Component({
  selector: 'mp-explore',
  imports: [FormsModule, TournamentCardComponent],
  template: `
    <div class="page">
      <div class="page-head">
        <div><span class="eyebrow">Para jugadores e invitados</span><h1>Torneos</h1><p class="muted">Cuadros, horarios y resultados en directo. No necesitas cuenta.</p></div>
        <label class="search">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          <input type="search" placeholder="Torneo, club o ciudad" [(ngModel)]="q" (ngModelChange)="query.set($event)" aria-label="Buscar torneos">
        </label>
      </div>
      @if (loading()) { <p class="muted">Cargando torneos…</p> }
      @else if (!filtered().length) {
        <div class="panel empty">
          @if (query()) { <h3>Sin resultados para "{{ query() }}"</h3><p>Prueba con el nombre del club o la ciudad.</p> }
          @else { <h3>Todavía no hay torneos publicados</h3><p>Cuando un club publique un torneo aparecerá aquí.</p> }
        </div>
      } @else {
        <div class="cards">
          @for (t of filtered(); track t.id) { <mp-tournament-card [t]="t" [link]="'/t/' + t.slug" /> }
        </div>
      }
    </div>
  `,
  styles: [`
    h1 { margin-top: 12px; }
    .search { position: relative; width: min(340px, 100%); color: var(--ink-3); }
    .search svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; }
    .search input { padding-left: 40px; border-radius: 999px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr)); gap: 16px; }
  `],
})
export class ExplorePage implements OnInit {
  private api = inject(ApiService);
  list = signal<TournamentSummary[]>([]);
  loading = signal(true);
  q = '';
  query = signal('');
  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    return this.list().filter(t => !q || `${t.name} ${t.clubName} ${t.city ?? ''}`.toLowerCase().includes(q));
  });

  ngOnInit() {
    this.api.publicTournaments().then(l => this.list.set(l)).catch(() => {}).finally(() => this.loading.set(false));
  }
}
