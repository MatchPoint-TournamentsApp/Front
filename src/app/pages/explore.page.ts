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
        <div><h1>Torneos</h1><p class="muted">Cuadros, horarios y resultados en directo. No necesitas cuenta.</p></div>
        <input class="search" type="search" placeholder="Buscar por torneo, club o ciudad" [(ngModel)]="q" (ngModelChange)="query.set($event)" aria-label="Buscar">
      </div>
      @if (loading()) { <p class="muted">Cargando torneos…</p> }
      @else if (!filtered().length) {
        <div class="panel empty"><h3>No hay torneos publicados</h3><p>Cuando un club publique un torneo aparecerá aquí.</p></div>
      } @else {
        <div class="cards">
          @for (t of filtered(); track t.id) { <mp-tournament-card [t]="t" [link]="'/t/' + t.slug" /> }
        </div>
      }
    </div>
  `,
  styles: [`
    .search { max-width: 340px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
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
