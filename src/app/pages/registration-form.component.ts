import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Board, Unavailability } from '../core/models';
import { ToastService } from '../core/toast.service';
import { FORM_KIT } from '../shared/forms';
import { PhoneInputComponent } from '../shared/phone-input.component';
import { UnavailabilityEditorComponent } from '../shared/unavailability-editor.component';

/** Inscripción pública de una pareja con sus restricciones horarias. */
@Component({
  selector: 'mp-registration-form',
  imports: [FormsModule, RouterLink, UnavailabilityEditorComponent, PhoneInputComponent, FORM_KIT],
  template: `
    @if (done()) {
      <div class="panel empty">
        <h3>Inscripción enviada</h3>
        <p>El club revisará vuestra inscripción y aparecerá en el cuadro cuando se publique.</p>
        <button class="btn ghost" (click)="reset()">Inscribir otra pareja</button>
      </div>
    } @else {
      <form class="panel stack" #form="ngForm" mpForm (ngSubmit)="send(form)" novalidate>
        <h3>Inscribir pareja</h3>
        <mp-form-errors [form]="form" />
        <label class="field"><span>Categoría</span>
          <select name="cat" [(ngModel)]="categoryId" #catRef="ngModel" required>
            <option [ngValue]="null" disabled>Elige categoría</option>
            @for (c of open(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
          </select>
          <mp-error [control]="catRef" />
        </label>
        <div class="grid-2">
          @for (p of [p1, p2]; track $index; let i = $index) {
            <fieldset class="stack">
              <legend>Jugador {{ i + 1 }}</legend>
              <label class="field"><span>Nombre y apellidos</span><input [name]="'n' + i" [(ngModel)]="p.fullName" #nRef="ngModel" required autocomplete="off"><mp-error [control]="nRef" /></label>
              <div class="field" [class.req]="i === 0"><span>Teléfono</span><mp-phone-input [name]="'t' + i" [(ngModel)]="p.phone" #tRef="ngModel" [required]="i === 0" [label]="'Teléfono del jugador ' + (i + 1)" /><mp-error [control]="tRef" /></div>
              <label class="field"><span>Email</span><input [name]="'e' + i" type="email" [(ngModel)]="p.email" #eRef="ngModel" mpEmail autocomplete="email"><mp-error [control]="eRef" /></label>
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
        <!-- Campo trampa: invisible para personas; si llega relleno, la inscripción es de un bot -->
        <div class="hp" aria-hidden="true"><label>Web <input name="website" [(ngModel)]="website" tabindex="-1" autocomplete="off"></label></div>

        <div class="privacy">
          <p class="small muted">
            <b>Protección de datos.</b> Responsable: {{ board().club.name }}, organizador del torneo. Finalidad: gestionar vuestra inscripción
            y el torneo. Vuestros nombres aparecerán en los cuadros y horarios públicos; el teléfono y el email solo los ve el club.
            Podéis ejercer vuestros derechos ante el club. Más información en la <a routerLink="/privacidad" target="_blank">política de privacidad</a>.
          </p>
          <label class="check">
            <input type="checkbox" name="privacy" [(ngModel)]="privacy" #privRef="ngModel" required>
            <span>He leído la política de privacidad y acepto que el club trate estos datos para gestionar el torneo. Si alguno de los jugadores es menor de 14 años, soy su padre, madre o tutor, o tengo su autorización.</span>
          </label>
          <mp-error [control]="privRef" requiredText="Para inscribiros tenéis que aceptar la política de privacidad" />
        </div>
        <div class="row end"><button class="btn lg" type="submit" [disabled]="busy()">Enviar inscripción</button></div>
      </form>
    }
  `,
  styles: [`
    fieldset { border: 1px solid var(--rule); border-radius: 12px; padding: 14px; margin: 0; }
    legend { font-weight: 700; padding: 0 6px; color: var(--court); }
    .hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
    .privacy { display: grid; gap: 10px; border-top: 1px solid var(--rule-2); padding-top: 14px; }
    .privacy p { margin: 0; max-width: none; }
    .privacy .check { align-items: flex-start; font-weight: 400; font-size: .92rem; }
    .privacy .check input { margin-top: 3px; flex: none; }
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
  privacy = false;
  website = '';
  /** Momento en que se abrió el formulario: un envío instantáneo es de un bot. */
  private openedAt = Date.now();
  unav = signal<Unavailability[]>([]);
  busy = signal(false);
  done = signal(false);

  duration() {
    const t = this.board().tournament;
    return t.categories.find(c => c.id === this.categoryId)?.matchDurationMinutes ?? t.matchDurationMinutes;
  }

  async send(form: NgForm) {
    if (form.invalid) return;
    this.busy.set(true);
    try {
      await this.api.register(this.board().tournament.slug, {
        categoryId: this.categoryId!, player1: this.p1, player2: this.p2, notes: this.notes, unavailabilities: this.unav(),
        privacyAccepted: this.privacy, website: this.website, elapsedMs: Date.now() - this.openedAt,
      });
      this.done.set(true);
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }

  reset() {
    this.p1 = { fullName: '', phone: '', email: '' };
    this.p2 = { fullName: '', phone: '', email: '' };
    this.notes = '';
    this.privacy = false;
    this.website = '';
    this.openedAt = Date.now();
    this.unav.set([]);
    this.done.set(false);
  }
}
