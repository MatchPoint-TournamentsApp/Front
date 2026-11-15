import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AdminContactMessage, ContactReason } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { dateTime } from './admin-format';

const REASON: Record<ContactReason, string> = { ORGANIZE: 'Organizar un torneo', SUPPORT: 'Soporte técnico', OTHER: 'Otro' };

/** Mensajes del formulario de contacto: leerlos, responder por correo y marcarlos como respondidos. */
@Component({
  selector: 'mp-admin-messages',
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
            <b>{{ m.name }}</b>
            <span class="chip" [class.warn]="m.reason === 'SUPPORT'">{{ reason(m.reason) }}</span>
            @if (m.handledAt) { <span class="chip ok">Respondido</span> }
            @if (!m.emailSent) { <span class="chip warn" title="No se pudo reenviar al correo">Sin reenviar</span> }
          </div>
          <span class="small muted">{{ when(m.createdAt) }}</span>
        </header>
        <p class="meta small">
          <a [href]="'mailto:' + m.email">{{ m.email }}</a>
          @if (m.phone) { · <a [href]="'tel:' + m.phone.replace(' ', '')">{{ m.phone }}</a> }
          @if (m.club) { · {{ m.club }} }
        </p>
        <p class="body">{{ m.message }}</p>
        <div class="row">
          <a class="btn sm" [href]="replyLink(m)">Responder</a>
          <button class="btn ghost sm" (click)="toggle(m)" [disabled]="busy() === m.id">{{ m.handledAt ? 'Marcar sin responder' : 'Marcar como respondido' }}</button>
        </div>
      </article>
    } @empty {
      <div class="panel empty"><h3>{{ filter() === 'new' ? 'No hay mensajes sin responder' : 'Todavía no hay mensajes' }}</h3>
        <p>Los mensajes del formulario de <b>/contacto</b> aparecerán aquí.</p></div>
    }
  `,
  styles: [`
    .head { margin-bottom: 14px; gap: 10px; flex-wrap: wrap; }
    .msg { margin-bottom: 12px; border-left: 3px solid var(--gold); }
    .msg.done { border-left-color: var(--rule); opacity: .85; }
    .msg header { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; align-items: baseline; }
    .msg header .chip { margin-left: 8px; }
    .meta { margin: 4px 0 10px; color: var(--ink-2); }
    .body { white-space: pre-wrap; margin: 0 0 12px; max-width: none; line-height: 1.55; }
  `],
})
export class AdminMessagesComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  messages = input.required<AdminContactMessage[]>();
  changed = output<void>();
  filter = signal<'new' | 'all'>('new');
  busy = signal<string | null>(null);

  pending = computed(() => this.messages().filter(m => !m.handledAt).length);
  shown = computed(() => this.filter() === 'new' ? this.messages().filter(m => !m.handledAt) : this.messages());

  reason(r: ContactReason) { return REASON[r]; }
  when(s: string) { return dateTime(s); }

  /** Abre el correo para responder desde info@ o support@ (en Gmail, «Enviar como»). */
  replyLink(m: AdminContactMessage) {
    const subject = 'Re: tu mensaje a MatchZone Sports';
    const quote = m.message.split('\n').map(l => '> ' + l).join('\n');
    return `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Hola ${m.name.split(' ')[0]},\n\n\n\n${quote}`)}`;
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
