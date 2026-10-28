import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Day, Unavailability } from '../core/models';
import { dayName, shortDate } from '../core/format';

/**
 * Restricciones horarias de una pareja: "el viernes no podemos hasta las 22:00",
 * "el sábado no podemos en todo el día"...
 */
@Component({
  selector: 'mp-unavailability-editor',
  imports: [FormsModule],
  template: `
    <div class="stack">
      @for (u of items(); track $index; let i = $index) {
        <div class="r">
          <select [(ngModel)]="u.playDate" (ngModelChange)="touch()" aria-label="Día">
            @for (d of days(); track d.playDate) { <option [value]="d.playDate">{{ label(d.playDate) }}</option> }
          </select>
          <select [ngModel]="mode(u)" (ngModelChange)="setMode(u, $event)" aria-label="Tipo">
            <option value="all">No puede en todo el día</option>
            <option value="until">No puede hasta las…</option>
            <option value="from">No puede desde las…</option>
            <option value="range">No puede entre…</option>
          </select>
          @if (mode(u) === 'from' || mode(u) === 'range') {
            <input type="time" step="900" [(ngModel)]="u.fromTime" (ngModelChange)="touch()" aria-label="Desde">
          }
          @if (mode(u) === 'until' || mode(u) === 'range') {
            <input type="time" step="900" [(ngModel)]="u.toTime" (ngModelChange)="touch()" aria-label="Hasta">
          }
          <button type="button" class="icon-btn" (click)="remove(i)" aria-label="Quitar restricción">✕</button>
        </div>
      } @empty {
        <p class="small muted" style="margin:0">Sin restricciones: pueden jugar en cualquier horario del torneo.</p>
      }
      <div><button type="button" class="btn ghost sm" (click)="add()" [disabled]="!days().length">Añadir restricción horaria</button></div>
    </div>
  `,
  styles: [`
    .r { display: grid; grid-template-columns: 1.1fr 1.3fr auto auto 32px; gap: 8px; align-items: center; }
    @media (max-width: 640px) { .r { grid-template-columns: 1fr 1fr; } }
  `],
})
export class UnavailabilityEditorComponent {
  days = input.required<Day[]>();
  items = model<Unavailability[]>([]);

  label(d: string) { return `${dayName(d)} ${shortDate(d)}`; }

  mode(u: Unavailability) {
    if (!u.fromTime && !u.toTime) return 'all';
    if (!u.fromTime) return 'until';
    if (!u.toTime) return 'from';
    return 'range';
  }

  setMode(u: Unavailability, mode: string) {
    u.fromTime = mode === 'from' || mode === 'range' ? (u.fromTime || '17:00') : null;
    u.toTime = mode === 'until' || mode === 'range' ? (u.toTime || '22:00') : null;
    this.touch();
  }

  add() { this.items.set([...this.items(), { playDate: this.days()[0].playDate, fromTime: null, toTime: '22:00' }]); }
  remove(i: number) { this.items.set(this.items().filter((_, j) => j !== i)); }
  touch() { this.items.set([...this.items()]); }
}
