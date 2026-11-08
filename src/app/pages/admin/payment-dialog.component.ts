import { Component, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AdminTournament, PaymentMethod, PaymentRequest } from '../../core/models';
import { isoDate } from '../../core/format';
import { FORM_KIT } from '../../shared/forms';
import { METHODS, METHOD_LABEL } from './accounting';

/**
 * Activar un torneo (con o sin cobro) o apuntar un cobro más.
 * Emite el cobro, null si se activa sin cobro, o undefined si se cancela.
 */
@Component({
  selector: 'mp-payment-dialog',
  imports: [FormsModule, FORM_KIT],
  template: `
    <div class="backdrop" (click)="done.emit(undefined)">
      <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="pay-title">
        <div class="modal-head">
          <div>
            <h3 id="pay-title">{{ mode() === 'approve' ? 'Activar torneo' : 'Apuntar cobro' }}</h3>
            <div class="small muted">{{ t().name }} · {{ t().clubName }}</div>
          </div>
          <button class="icon-btn" type="button" (click)="done.emit(undefined)" aria-label="Cerrar">✕</button>
        </div>
        <form #f="ngForm" mpForm (ngSubmit)="save(f)" novalidate class="stack">
          @if (mode() === 'approve') {
            <p class="small muted">Al activarlo, el club podrá generar y regenerar los cuadros de este torneo hasta que empiece.</p>
            <label class="switch"><input type="checkbox" name="charged" [(ngModel)]="charged"> He recibido el pago</label>
          }
          @if (charged() || mode() === 'payment') {
            <div class="grid-2">
              <label class="field"><span>Importe (€)</span>
                <input name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" [(ngModel)]="amount" #amountRef="ngModel" required>
                <mp-error [control]="amountRef" /></label>
              <label class="field"><span>Forma de pago</span>
                <select name="method" [(ngModel)]="method" required>
                  @for (m of methods; track m) { <option [value]="m">{{ label[m] }}</option> }
                </select></label>
            </div>
            <label class="field"><span>Fecha del cobro</span>
              <input name="paidOn" type="date" [(ngModel)]="paidOn" #dateRef="ngModel" required>
              <mp-error [control]="dateRef" /></label>
            <label class="field"><span>Nota (opcional)</span>
              <input name="note" [(ngModel)]="note" maxlength="500" placeholder="Por ejemplo: Bizum de Juan, pagado el viernes"></label>
          }
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="done.emit(undefined)">Cancelar</button>
            <button class="btn ball" type="submit" [disabled]="busy()">
              {{ mode() === 'payment' ? 'Guardar cobro' : charged() ? 'Activar y guardar cobro' : 'Activar sin cobro' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`.modal { width: min(520px, 100%); } .switch { font-weight: 500; }`],
})
export class PaymentDialogComponent {
  t = input.required<AdminTournament>();
  mode = input<'approve' | 'payment'>('approve');
  busy = input(false);
  done = output<PaymentRequest | null | undefined>();

  methods = METHODS;
  label = METHOD_LABEL;
  charged = signal(true);
  amount: number | null = null;
  method: PaymentMethod = 'BIZUM';
  paidOn = isoDate(new Date());
  note = '';

  save(f: NgForm) {
    const withPayment = this.mode() === 'payment' || this.charged();
    if (withPayment && f.invalid) return;
    this.done.emit(withPayment
      ? { amount: Number(this.amount), method: this.method, paidOn: this.paidOn, note: this.note.trim() || undefined }
      : null);
  }
}
