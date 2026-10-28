import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { TournamentRequest } from '../../core/models';
import { isoDate } from '../../core/format';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'mp-tournament-new',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page narrow">
      <div class="page-head">
        <div><h1>Nuevo torneo</h1><p class="muted">Después añadirás categorías, parejas y patrocinadores.</p></div>
        <a class="btn ghost" [routerLink]="['/panel/club', clubId()]">Cancelar</a>
      </div>
      <form class="panel stack" (ngSubmit)="save()">
        <label class="field"><span>Nombre del torneo *</span><input name="name" [(ngModel)]="f.name" required placeholder="Torneo de Otoño 2026"></label>
        <div class="grid-2">
          <label class="field"><span>Empieza *</span><input name="s" type="date" [(ngModel)]="f.startDate" required></label>
          <label class="field"><span>Termina *</span><input name="e" type="date" [(ngModel)]="f.endDate" required></label>
        </div>
        <label class="field"><span>Descripción</span><textarea name="d" [(ngModel)]="f.description" rows="3" placeholder="Premios, regalos de bienvenida, cena de clausura…"></textarea></label>
        <div class="grid-3">
          <label class="field"><span>Duración de cada partido</span>
            <select name="dur" [(ngModel)]="f.matchDurationMinutes">
              @for (m of [60, 75, 90, 105, 120]; track m) { <option [ngValue]="m">{{ m }} min</option> }
            </select>
          </label>
          <label class="field"><span>Descanso mínimo entre partidos</span>
            <select name="rest" [(ngModel)]="f.minRestMinutes">
              @for (m of [0, 15, 30, 45, 60, 90, 120]; track m) { <option [ngValue]="m">{{ m }} min</option> }
            </select>
          </label>
          <label class="field"><span>Inscripción (€ por pareja)</span><input name="fee" type="number" min="0" step="0.5" [(ngModel)]="f.entryFee"></label>
        </div>
        <label class="field" style="max-width:200px"><span>Color del torneo</span><input name="color" type="color" [(ngModel)]="f.primaryColor"></label>
        <div class="row end"><button class="btn lg" type="submit" [disabled]="busy()">Crear torneo</button></div>
      </form>
    </div>
  `,
})
export class TournamentNewPage {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  clubId = input.required<string>();
  busy = signal(false);
  f: TournamentRequest = (() => {
    const d = new Date(); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
    const end = new Date(d); end.setDate(d.getDate() + 2);
    return { name: '', startDate: isoDate(d), endDate: isoDate(end), matchDurationMinutes: 90, minRestMinutes: 30, primaryColor: '#12355b', entryFee: null };
  })();

  async save() {
    if (!this.f.name.trim()) { this.toast.error('Pon un nombre al torneo'); return; }
    if (this.f.endDate < this.f.startDate) { this.toast.error('La fecha de fin es anterior a la de inicio'); return; }
    this.busy.set(true);
    try {
      const t = await this.api.createTournament(this.clubId(), this.f);
      this.toast.ok('Torneo creado. Ahora añade las categorías.');
      this.router.navigate(['/panel/torneo', t.id], { queryParams: { tab: 'categories' } });
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }
}
