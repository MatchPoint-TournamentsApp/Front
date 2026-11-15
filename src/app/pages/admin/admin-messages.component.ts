import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { AdminContactMessage, ContactReason } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { dateTime } from './admin-format';

const REASON: Record<ContactReason, string> = { ORGANIZE: 'Organizar un torneo', SUPPORT: 'Soporte técnico', OTHER: 'Otro', SUGGESTION: 'Sugerencia' };

/**
 * Mensajes del formulario de contacto: leerlos, responderlos desde aquí (sale desde info@ o support@ con la
 * firma, vía Brevo) y marcarlos como respondidos.
 */
@Component({
  selector: 'mp-admin-messages',
  imports: [FormsModule],
  template: `
    <div class="row between head">
      <div class="seg">
        <button [class.on]="filter() === 'new'" (click)="filter.set('new')">Sin responder ({{ pending() }})</button>
        <button [class.on]="filter() === 'all'" (click)="filter.set('all')">Todos ({{ messages().length }})</button>
      </div>
      <span class="small muted">También te llegan a info&#64; o support&#64; según el motivo.</span>
    </div>
    @for (m of shown(); track m.id) {
      <article class="panel msg" [class.done]="!!m.handledAt">
        <header>
          <div>
            <b>{{ m.name || m.email || 'Anónimo' }}</b>
            <span class="chip" [class.warn]="m.reason === 'SUPPORT'">{{ reason(m.reason) }}</span>
            @if (m.handledAt) { <span class="chip ok">Respondido</span> }
            @if (!m.emailSent) { <span class="chip warn" title="No se pudo reenviar al correo">Sin reenviar</span> }
          </div>
          <span class="small muted">{{ when(m.createdAt) }}</span>
        </header>
        <p class="meta small">
          {{ m.email || 'Sin email (no se puede responder)' }}
          @if (m.phone) { · <a [href]="'tel:' + m.phone.replace(' ', '')">{{ m.phone }}</a> }
          @if (m.club) { · {{ m.club }} }
        </p>
        <p class="body">{{ m.message }}</p>

        @if (m.replyText) {
          <div class="reply">
            <span class="small muted">Tu respuesta · {{ when(m.repliedAt!) }} · desde {{ from(m) }}</span>
            <p>{{ m.replyText }}</p>
          </div>
        }

        @if (writing() === m.id) {
          <div class="compose">
            <label class="field"><span>Respuesta a {{ m.email }} <small class="muted">· sale desde {{ from(m) }} con tu firma</small></span>
              <textarea name="reply" [(ngModel)]="draft" rows="7" maxlength="5000" [disabled]="busy() === m.id"></textarea>
            </label>
            <div class="row end">
              <button class="btn ghost sm" (click)="cancel()" [disabled]="busy() === m.id">Cancelar</button>
              <button class="btn sm" (click)="send(m)" [disabled]="busy() === m.id || !draft.trim()">{{ busy() === m.id ? 'Enviando…' : 'Enviar respuesta' }}</button>
            </div>
          </div>
        } @else {
          <div class="row">
            @if (m.email) { <button class="btn sm" (click)="write(m)">{{ m.replyText ? 'Responder otra vez' : 'Responder' }}</button> }
            <button class="btn ghost sm" (click)="toggle(m)" [disabled]="busy() === m.id">{{ m.handledAt ? 'Marcar sin responder' : 'Marcar como respondido' }}</button>
          </div>
        }
      </article>
    } @empty {
      <div class="panel empty"><h3>{{ filter() === 'new' ? 'No hay mensajes sin responder' : 'Todavía no hay mensajes' }}</h3>
        <p>Los mensajes del formulario de <b>/contacto</b> aparecerán aquí.</p></div>
    }
  `,
  styles: [`
    .head { margin-bottom: 14px; gap: 10px; flex-wrap: wrap; }
    .msg { margin-bottom: 12px; border-left: 3px solid var(--gold); }
    .msg.done { border-left-color: var(--rule); }
    .msg header { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; align-items: baseline; }
    .msg header .chip { margin-left: 8px; }
    .meta { margin: 4px 0 10px; color: var(--ink-2); }
    .body { white-space: pre-wrap; margin: 0 0 12px; max-width: none; line-height: 1.55; }
    .reply { background: var(--glass); border-radius: var(--r-md); padding: 10px 14px; margin: 0 0 12px; }
    .reply p { white-space: pre-wrap; margin: 6px 0 0; max-width: none; line-height: 1.55; }
    .compose { display: grid; gap: 10px; border-top: 1px solid var(--rule-2); padding-top: 12px; }
    .compose textarea { resize: vertical; }
  `],
})
export class AdminMessagesComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  messages = input.required<AdminContactMessage[]>();
  changed = output<void>();
  filter = signal<'new' | 'all'>('new');
  busy = signal<string | null>(null);
  /** Mensaje que se está respondiendo. */
  writing = signal<string | null>(null);
  draft = '';

  pending = computed(() => this.messages().filter(m => !m.handledAt).length);
  shown = computed(() => this.filter() === 'new' ? this.messages().filter(m => !m.handledAt || m.id === this.writing()) : this.messages());

  reason(r: ContactReason) { return REASON[r]; }
  when(s: string) { return dateTime(s); }
  /** La respuesta sale del mismo buzón al que llegó el mensaje. */
  from(m: AdminContactMessage) { return m.reason === 'SUPPORT' ? 'support@matchzonesports.com' : 'info@matchzonesports.com'; }

  write(m: AdminContactMessage) {
    this.draft = m.name ? `Hola ${m.name.split(' ')[0]},\n\n` : 'Hola,\n\n';
    this.writing.set(m.id);
  }
  cancel() { this.writing.set(null); this.draft = ''; }

  async send(m: AdminContactMessage) {
    const text = this.draft.trim();
    if (!text) return;
    if (!(await this.confirm.ask({ title: `¿Enviar la respuesta a ${m.name || m.email}?`, message: `Se enviará a ${m.email} desde ${this.from(m)}, con tu firma y su mensaje citado.`, ok: 'Enviar' }))) return;
    this.busy.set(m.id);
    try {
      await this.api.adminContactReply(m.id, text);
      this.toast.ok('Respuesta enviada');
      this.cancel();
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(null); }
  }

  async toggle(m: AdminContactMessage) {
    this.busy.set(m.id);
    try {
      await this.api.adminContactHandled(m.id, !m.handledAt);
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(null); }
  }
}
