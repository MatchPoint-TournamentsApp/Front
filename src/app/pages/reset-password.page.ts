import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../core/supabase.service';
import { ToastService } from '../core/toast.service';
import { FORM_KIT } from '../shared/forms';

/** Destino del enlace "recuperar contraseña" del email: pide la contraseña nueva. */
@Component({
  selector: 'mp-reset-password',
  imports: [FormsModule, RouterLink, FORM_KIT],
  template: `
    <div class="wrap">
      <div class="panel card">
        <img class="mark" src="brand/icon-512.png" alt="">
        @if (!supa.ready()) {
          <p class="muted center">Comprobando el enlace…</p>
        } @else if (supa.loggedIn()) {
          <h2>Nueva contraseña</h2>
          <p class="muted small center">Para la cuenta {{ supa.email() }}</p>
          <form #form="ngForm" mpForm (ngSubmit)="save(form)" novalidate class="stack">
            <label class="field"><span>Contraseña nueva</span>
              <input name="password" type="password" [(ngModel)]="password" #passRef="ngModel" required minlength="6" autocomplete="new-password">
              <small>Mínimo 6 caracteres.</small>
              <mp-error [control]="passRef" /></label>
            <label class="field"><span>Repite la contraseña</span>
              <input name="repeat" type="password" [(ngModel)]="repeat" #repRef="ngModel" required [mpSameAs]="password"
                mpSameAsMessage="Las contraseñas no coinciden" autocomplete="new-password">
              <mp-error [control]="repRef" /></label>
            <button class="btn lg ball" type="submit" [disabled]="busy()">Guardar contraseña</button>
          </form>
        } @else {
          <h2>Enlace no válido</h2>
          <p class="muted center">{{ supa.linkError() || 'El enlace ha caducado o ya se ha usado.' }} Pide uno nuevo y ábrelo en este mismo navegador.</p>
          <a class="btn lg ball" routerLink="/recuperar">Pedir un enlace nuevo</a>
          <a class="center small" routerLink="/entrar">Volver a iniciar sesión</a>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; margin-bottom: -40px; }
    .wrap { min-height: calc(100vh - 62px); display: grid; place-items: center; padding: 48px 16px 64px;
      background: radial-gradient(90% 70% at 50% 0%, #142033 0%, var(--night) 65%); }
    .card { width: min(420px, 100%); display: flex; flex-direction: column; gap: 14px; padding: 34px 30px 28px; border: 0; box-shadow: var(--shadow-lg); }
    .mark { width: 56px; height: 56px; border-radius: 14px; align-self: center; box-shadow: 0 0 0 1px rgba(201, 164, 106, .35); }
    h2 { margin: 0; text-align: center; font-weight: 300; font-size: 1.75rem; }
    .center { text-align: center; margin: 0 auto; }
  `],
})
export class ResetPasswordPage {
  supa = inject(SupabaseService);
  private toast = inject(ToastService);
  private router = inject(Router);
  password = '';
  repeat = '';
  busy = signal(false);

  async save(form: NgForm) {
    if (form.invalid) return;
    this.busy.set(true);
    try {
      await this.supa.updatePassword(this.password);
      this.toast.ok('Contraseña cambiada');
      this.router.navigateByUrl('/panel');
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }
}
