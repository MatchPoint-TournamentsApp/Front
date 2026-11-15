import { Component, inject, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { FORM_KIT } from './forms';

/** «¿Nos ayudas a mejorar?»: propuesta de mejora (nombre y email opcionales) que llega a info@. */
@Component({
  selector: 'mp-suggestion-dialog',
  imports: [FormsModule, RouterLink, FORM_KIT],
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="sug-title">
        <div class="modal-head">
          <div>
            <h3 id="sug-title">¿Nos ayudas a mejorar?</h3>
            <p class="small muted" style="margin:4px 0 0">Cuéntanos qué echas en falta o qué cambiarías. Leemos todas las propuestas.</p>
          </div>
          <button class="icon-btn" (click)="closed.emit()" aria-label="Cerrar">✕</button>
        </div>

        @if (done()) {
          <div class="thanks">
            <span class="ok" aria-hidden="true">✓</span>
            <h3>¡Gracias!</h3>
            <p>Hemos recibido tu propuesta.@if (email.trim()) { Si hace falta, te escribiremos a <b>{{ email.trim() }}</b>. }</p>
            <button class="btn" (click)="closed.emit()">Cerrar</button>
          </div>
        } @else {
          <form class="stack" #form="ngForm" mpForm (ngSubmit)="send(form)" novalidate>
            <label class="field"><span>Tu propuesta</span>
              <textarea name="msg" [(ngModel)]="message" #mRef="ngModel" required minlength="10" maxlength="3000" rows="5"
                        placeholder="Me gustaría poder…"></textarea>
              <mp-error [control]="mRef" /></label>
            <div class="grid-2">
              <label class="field opt"><span>Nombre <small>(opcional)</small></span>
                <input name="name" [(ngModel)]="name" maxlength="100" autocomplete="name"></label>
              <label class="field opt"><span>Email <small>(opcional)</small></span>
                <input name="email" type="email" [(ngModel)]="email" #eRef="ngModel" mpEmail maxlength="200" autocomplete="email">
                <mp-error [control]="eRef" /></label>
            </div>
            <p class="tiny muted" style="margin:-4px 0 0">Déjanos tu email si quieres que te respondamos.</p>
            <!-- Campo trampa: invisible para personas; si llega relleno, es un bot -->
            <div class="hp" aria-hidden="true"><label>Web <input name="website" [(ngModel)]="website" tabindex="-1" autocomplete="off"></label></div>
            <label class="check privacy">
              <input type="checkbox" name="privacy" [(ngModel)]="privacy" #pRef="ngModel" required>
              <span>He leído la <a routerLink="/privacidad" target="_blank">política de privacidad</a> y acepto que se usen estos datos para atender mi propuesta.</span>
            </label>
            <mp-error [control]="pRef" requiredText="Para enviarla tienes que aceptar la política de privacidad" />
            <div class="modal-foot">
              <button type="button" class="btn ghost" (click)="closed.emit()">Cancelar</button>
              <button class="btn" type="submit" [disabled]="busy()">{{ busy() ? 'Enviando…' : 'Enviar propuesta' }}</button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .field.opt small { font-weight: 400; color: var(--ink-3); }
    textarea { resize: vertical; }
    .hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
    .privacy { align-items: flex-start; font-weight: 400; font-size: .9rem; }
    .privacy input { margin-top: 3px; flex: none; }
    .thanks { text-align: center; display: grid; gap: 10px; justify-items: center; padding: 16px 0 6px; }
    .thanks h3, .thanks p { margin: 0; }
    .thanks .ok { width: 50px; height: 50px; border-radius: 50%; background: var(--ok-bg); color: var(--ok); display: grid; place-items: center; font-size: 1.5rem; }
  `],
})
export class SuggestionDialogComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  closed = output<void>();

  message = '';
  name = '';
  email = '';
  privacy = false;
  website = '';
  /** Momento en que se abrió: un envío instantáneo es de un bot. */
  private openedAt = Date.now();
  busy = signal(false);
  done = signal(false);

  async send(form: NgForm) {
    if (form.invalid) return;
    this.busy.set(true);
    try {
      await this.api.contact({
        reason: 'SUGGESTION', name: this.name.trim() || undefined, email: this.email.trim() || undefined, message: this.message,
        privacyAccepted: this.privacy, website: this.website, elapsedMs: Date.now() - this.openedAt,
      });
      this.done.set(true);
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }
}
