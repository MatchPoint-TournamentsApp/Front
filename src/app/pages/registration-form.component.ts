import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Board, Unavailability } from '../core/models';
import { ToastService } from '../core/toast.service';
import { UnavailabilityEditorComponent } from '../shared/unavailability-editor.component';

/** Inscripción pública de una pareja con sus restricciones horarias. */
@Component({
  selector: 'mp-registration-form',
  imports: [FormsModule, UnavailabilityEditorComponent],
  template: `
    @if (done()) {
      <div class="panel empty">
        <h3>Inscripción enviada</h3>
        <p>El club revisará vuestra inscripción y aparecerá en el cuadro cuando se publique.</p>
        <button class="btn ghost" (click)="reset()">Inscribir otra pareja</button>
      </div>
    } @else {
      <form class="panel stack" (ngSubmit)="send()">
        <h3>Inscribir pareja</h3>
        <label class="field"><span>Categoría</span>
          <select name="cat" [(ngModel)]="categoryId" required>
            <option [ngValue]="null" disabled>Elige categoría</option>
            @for (c of open(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
          </select>
        </label>
        <div class="grid-2">
          @for (p of [p1, p2]; track $index; let i = $index) {
            <fieldset class="stack">
              <legend>Jugador {{ i + 1 }}</legend>
              <label class="field"><span>Nombre y apellidos</span><input [name]="'n' + i" [(ngModel)]="p.fullName" required autocomplete="off"></label>
              <label class="field"><span>Teléfono</span><input [name]="'t' + i" type="tel" [(ngModel)]="p.phone" [required]="i === 0"></label>
              <label class="field"><span>Email</span><input [name]="'e' + i" type="email" [(ngModel)]="p.email"></label>
            </fieldset>
          }
        </div>
        <div class="field">
          <span>¿Cuándo NO podéis jugar?</span>
          <mp-unavailability-editor [days]="board().tournament.days" [duration]="duration()" [(items)]="unav" />
        </div>
        <label class="field"><span>Comentarios para el organizador</span><textarea name="notes" [(ngModel)]="notes" rows="2"></textarea></label>
        @if (board().tournament.entryFee) {
          <p class="small muted">Inscripción: {{ board().tournament.entryFee }} € por pareja. Se abona en el club.</p>
        }
        <div class="row end"><button class="btn lg" type="submit" [disabled]="busy()">Enviar inscripción</button></div>
      </form>
    }
  `,
  styles: [`
    fieldset { border: 1px solid var(--rule); border-radius: 12px; padding: 14px; margin: 0; }
    legend { font-weight: 700; padding: 0 6px; color: var(--court); }
  `],
})
export class RegistrationFormComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  board = input.required<Board>();
  open = computed(() => this.board().tournament.categories.filter(c => !c.drawGenerated));

  categoryId: string | null = null;
  p1 = { fullName: '', phone: '', email: '' };
  p2 = { fullName: '', phone: '', email: '' };
  notes = '';
  unav = signal<Unavailability[]>([]);
  busy = signal(false);
  done = signal(false);

  duration() {
    const t = this.board().tournament;
    return t.categories.find(c => c.id === this.categoryId)?.matchDurationMinutes ?? t.matchDurationMinutes;
  }

  async send() {
    if (!this.categoryId) { this.toast.error('Elige una categoría'); return; }
    if (!this.p1.fullName.trim() || !this.p2.fullName.trim()) { this.toast.error('Indica el nombre de los dos jugadores'); return; }
    this.busy.set(true);
    try {
      await this.api.register(this.board().tournament.slug, {
        categoryId: this.categoryId, player1: this.p1, player2: this.p2, notes: this.notes, unavailabilities: this.unav(),
      });
      this.done.set(true);
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }

  reset() {
    this.p1 = { fullName: '', phone: '', email: '' };
    this.p2 = { fullName: '', phone: '', email: '' };
    this.notes = '';
    this.unav.set([]);
    this.done.set(false);
  }
}
