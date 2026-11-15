import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ContactReason } from '../core/models';
import { LEGAL } from '../core/legal';
import { ToastService } from '../core/toast.service';
import { FORM_KIT } from '../shared/forms';
import { PhoneInputComponent } from '../shared/phone-input.component';

/** Contacto: las dos direcciones de correo y un formulario que llega a info@ o a support@ según el motivo. */
@Component({
  selector: 'mp-contact',
  imports: [FormsModule, RouterLink, PhoneInputComponent, FORM_KIT],
  template: `
    <header class="band on-dark">
      <div class="inner">
        <span class="eyebrow">Contacto</span>
        <h1>¿Hablamos?</h1>
        <p class="lead">Escríbenos si quieres organizar torneos en tu club, tienes dudas o necesitas ayuda con la aplicación. Respondemos lo antes posible.</p>
      </div>
      <hr class="gold-rule">
    </header>

    <div class="page contact">
      <aside class="ways">
        <a class="way" href="mailto:info@matchzonesports.com">
          <span class="ico" aria-hidden="true">@</span>
          <span><small>Información y altas de clubes</small><b>info&#64;matchzonesports.com</b></span>
        </a>
        <a class="way" href="mailto:support@matchzonesports.com">
          <span class="ico" aria-hidden="true">?</span>
          <span><small>Ayuda con la aplicación</small><b>support&#64;matchzonesports.com</b></span>
        </a>
        <p class="small muted">¿Eres jugador y tienes una duda sobre un torneo? Escribe directamente al club organizador: sus datos están en la página del torneo.</p>
      </aside>

      @if (done()) {
        <div class="panel sent">
          <span class="ok" aria-hidden="true">✓</span>
          <h2>Mensaje enviado</h2>
          <p>Gracias, {{ firstName() }}. Te responderemos a <b>{{ email }}</b> lo antes posible.</p>
          <div class="row"><a class="btn ghost" routerLink="/">Volver al inicio</a><button class="btn ghost" (click)="reset()">Enviar otro mensaje</button></div>
        </div>
      } @else {
        <form class="panel stack" #form="ngForm" mpForm (ngSubmit)="send(form)" novalidate>
          <h2>Envíanos un mensaje</h2>
          <mp-form-errors [form]="form" />
          <div class="field">
            <span>Motivo</span>
            <div class="reasons" role="radiogroup" aria-label="Motivo">
              @for (r of reasons; track r.value) {
                <label class="reason" [class.on]="reason === r.value">
                  <input type="radio" name="reason" [value]="r.value" [(ngModel)]="reason">
                  <span>{{ r.label }}</span>
                </label>
              }
            </div>
          </div>
          <div class="grid-2">
            <label class="field"><span>Nombre</span>
              <input name="name" [(ngModel)]="name" #nRef="ngModel" required maxlength="100" autocomplete="name"><mp-error [control]="nRef" /></label>
            <label class="field"><span>Email</span>
              <input name="email" type="email" [(ngModel)]="email" #eRef="ngModel" required mpEmail maxlength="200" autocomplete="email"><mp-error [control]="eRef" /></label>
          </div>
          <div class="grid-2">
            <label class="field opt"><span>Club <small>(opcional)</small></span>
              <input name="club" [(ngModel)]="club" maxlength="120" autocomplete="organization"></label>
            <div class="field opt"><span>Teléfono <small>(opcional)</small></span>
              <mp-phone-input name="phone" [(ngModel)]="phone" #tRef="ngModel" label="Teléfono" /><mp-error [control]="tRef" /></div>
          </div>
          <label class="field"><span>Mensaje</span>
            <textarea name="message" [(ngModel)]="message" #mRef="ngModel" required minlength="10" maxlength="3000" rows="6"
                      [placeholder]="placeholder()"></textarea>
            <mp-error [control]="mRef" />
          </label>
          <!-- Campo trampa: invisible para personas; si llega relleno, el mensaje es de un bot -->
          <div class="hp" aria-hidden="true"><label>Web <input name="website" [(ngModel)]="website" tabindex="-1" autocomplete="off"></label></div>

          <div class="privacy">
            <p class="small muted">
              <b>Protección de datos.</b> Responsable: {{ L.titular }} ({{ L.brand }}). Finalidad: responder a tu consulta.
              No cedemos tus datos a terceros. Puedes ejercer tus derechos escribiendo a info&#64;matchzonesports.com.
              Más información en la <a routerLink="/privacidad" target="_blank">política de privacidad</a>.
            </p>
            <label class="check">
              <input type="checkbox" name="privacy" [(ngModel)]="privacy" #pRef="ngModel" required>
              <span>He leído la política de privacidad y acepto que se usen estos datos para responder a mi mensaje.</span>
            </label>
            <mp-error [control]="pRef" requiredText="Para enviar el mensaje tienes que aceptar la política de privacidad" />
          </div>
          <div class="row end"><button class="btn lg" type="submit" [disabled]="busy()">{{ busy() ? 'Enviando…' : 'Enviar mensaje' }}</button></div>
        </form>
      }
    </div>
  `,
  styles: [`
    .band { color: var(--cream); background: radial-gradient(100% 120% at 85% 0%, #142033 0%, var(--night) 60%); }
    .band .inner { max-width: 1200px; margin: 0 auto; padding: 64px 20px 56px; }
    .band h1 { color: var(--cream); font-weight: 300; font-size: clamp(2rem, 4.6vw, 3.2rem); line-height: 1.05; margin: 14px 0 18px; }
    .lead { max-width: 60ch; color: var(--cream-2); font-size: 1.08rem; line-height: 1.6; margin: 0; }
    .contact { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 28px; align-items: start; }
    .ways { display: grid; gap: 12px; position: sticky; top: 90px; }
    .way { display: flex; align-items: center; gap: 14px; padding: 16px 18px; background: #fff; border: 1px solid var(--rule); border-radius: 14px;
      text-decoration: none; color: var(--ink); transition: border-color .2s, transform .2s; }
    .way:hover { border-color: var(--gold); transform: translateY(-1px); }
    .way .ico { width: 40px; height: 40px; border-radius: 50%; background: var(--night); color: var(--gold); display: grid; place-items: center; font-weight: 600; flex: none; }
    .way small { display: block; color: var(--ink-3); font-size: .8rem; }
    .way b { font-weight: 500; word-break: break-all; }
    .ways p { margin: 6px 4px 0; line-height: 1.5; }
    form h2, .sent h2 { margin: 0; font-weight: 400; }
    .reasons { display: flex; flex-wrap: wrap; gap: 8px; }
    .reason { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border: 1px solid var(--rule); border-radius: 999px; cursor: pointer; font-weight: 500; font-size: .92rem; background: #fff; }
    .reason input { accent-color: var(--gold-ink); margin: 0; }
    .reason.on { border-color: var(--gold); background: var(--court-3, #faf6ee); }
    .field.opt small { font-weight: 400; color: var(--ink-3); }
    textarea { resize: vertical; }
    .hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
    .privacy { display: grid; gap: 10px; border-top: 1px solid var(--rule-2); padding-top: 14px; }
    .privacy p { margin: 0; max-width: none; }
    .privacy .check { align-items: flex-start; font-weight: 400; font-size: .92rem; }
    .privacy .check input { margin-top: 3px; flex: none; }
    .sent { text-align: center; padding: 40px 24px; display: grid; gap: 12px; justify-items: center; }
    .sent .ok { width: 54px; height: 54px; border-radius: 50%; background: var(--ok-bg); color: var(--ok); display: grid; place-items: center; font-size: 1.6rem; }
    .sent p { margin: 0; }
    @media (max-width: 860px) {
      .contact { grid-template-columns: 1fr; }
      .ways { position: static; }
    }
  `],
})
export class ContactPage {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  readonly L = LEGAL;

  readonly reasons: { value: ContactReason; label: string }[] = [
    { value: 'ORGANIZE', label: 'Quiero organizar un torneo' },
    { value: 'SUPPORT', label: 'Soporte técnico' },
    { value: 'OTHER', label: 'Otro' },
  ];

  reason: ContactReason = 'ORGANIZE';
  name = '';
  email = '';
  club = '';
  phone = '';
  message = '';
  privacy = false;
  website = '';
  /** Momento en que se abrió el formulario: un envío instantáneo es de un bot. */
  private openedAt = Date.now();
  busy = signal(false);
  done = signal(false);

  placeholder() {
    return this.reason === 'SUPPORT' ? 'Cuéntanos qué ocurre, en qué torneo y en qué pantalla.'
      : this.reason === 'ORGANIZE' ? 'Cuéntanos sobre tu club y qué torneos quieres organizar.' : 'Escribe tu mensaje.';
  }
  firstName() { return this.name.trim().split(/\s+/)[0] ?? ''; }

  async send(form: NgForm) {
    if (form.invalid) return;
    this.busy.set(true);
    try {
      await this.api.contact({
        reason: this.reason, name: this.name, email: this.email, club: this.club || undefined, phone: this.phone || undefined,
        message: this.message, privacyAccepted: this.privacy, website: this.website, elapsedMs: Date.now() - this.openedAt,
      });
      this.done.set(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }

  reset() {
    this.message = '';
    this.privacy = false;
    this.website = '';
    this.openedAt = Date.now();
    this.done.set(false);
  }
}
