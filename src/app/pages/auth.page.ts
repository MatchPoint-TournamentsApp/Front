import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../core/supabase.service';
import { ToastService } from '../core/toast.service';
import { LogoComponent } from '../shared/logo.component';

@Component({
  selector: 'mp-auth',
  imports: [FormsModule, RouterLink, LogoComponent],
  template: `
    <div class="wrap">
      <form class="panel" (ngSubmit)="submit()">
        <mp-logo [size]="40" />
        @if (mode() === 'register') {
          <h2>Crea tu cuenta</h2>
          <p class="muted small">Con tu cuenta podrás dar de alta tu club y organizar torneos.</p>
          <label class="field"><span>Nombre y apellidos</span><input name="name" [(ngModel)]="name" required autocomplete="name"></label>
        } @else if (mode() === 'reset') {
          <h2>Recuperar contraseña</h2>
          <p class="muted small">Te enviaremos un enlace para crear una contraseña nueva.</p>
        } @else {
          <h2>Inicia sesión</h2>
        }
        <label class="field"><span>Email</span><input name="email" type="email" [(ngModel)]="email" required autocomplete="email"></label>
        @if (mode() !== 'reset') {
          <label class="field"><span>Contraseña</span><input name="password" type="password" [(ngModel)]="password" required minlength="6"
            [autocomplete]="mode() === 'register' ? 'new-password' : 'current-password'"></label>
        }
        @if (info()) { <div class="notice">{{ info() }}</div> }
        <button class="btn lg" type="submit" [disabled]="busy()">
          {{ mode() === 'register' ? 'Crear cuenta' : mode() === 'reset' ? 'Enviar enlace' : 'Entrar' }}
        </button>
        <div class="alt small">
          @if (mode() === 'login') {
            <button type="button" class="link" (click)="mode.set('reset')">¿Has olvidado la contraseña?</button>
            <span>¿No tienes cuenta? <a routerLink="/registro">Regístrate</a></span>
          } @else {
            <span>¿Ya tienes cuenta? <a routerLink="/entrar" (click)="mode.set('login')">Inicia sesión</a></span>
          }
        </div>
        <div class="guest">
          <a class="btn ghost" routerLink="/torneos">Continuar como invitado</a>
          <span class="tiny muted">Consulta cuadros, horarios y resultados, e inscríbete en torneos sin cuenta.</span>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .wrap { min-height: calc(100vh - 60px); display: grid; place-items: center; padding: 32px 16px; }
    form { width: min(420px, 100%); display: flex; flex-direction: column; gap: 14px; }
    h2 { margin: 8px 0 0; }
    p { margin: 0; }
    .alt { display: flex; flex-direction: column; gap: 6px; align-items: center; }
    .link { background: none; border: 0; color: var(--court-2); cursor: pointer; font: inherit; text-decoration: underline; }
    .guest { border-top: 1px solid var(--rule); padding-top: 14px; display: flex; flex-direction: column; gap: 6px; text-align: center; }
  `],
})
export class AuthPage {
  private supa = inject(SupabaseService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  mode = signal<'login' | 'register' | 'reset'>(this.route.snapshot.data['mode'] ?? 'login');
  next = input<string>();
  name = ''; email = ''; password = '';
  busy = signal(false);
  info = signal('');

  async submit() {
    this.busy.set(true);
    this.info.set('');
    try {
      if (this.mode() === 'reset') {
        await this.supa.resetPassword(this.email);
        this.info.set('Si el email existe, recibirás un enlace en unos minutos.');
      } else if (this.mode() === 'register') {
        if (!this.name.trim()) throw new Error('Indica tu nombre');
        const logged = await this.supa.signUp(this.email, this.password, this.name.trim());
        if (logged) this.router.navigateByUrl('/panel');
        else this.info.set('Te hemos enviado un email para confirmar la cuenta. Ábrelo y después inicia sesión.');
      } else {
        await this.supa.signIn(this.email, this.password);
        this.router.navigateByUrl(this.next() || '/panel');
      }
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }
}
