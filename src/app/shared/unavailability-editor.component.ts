import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Day, Unavailability } from '../core/models';
import { dayName, shortDate } from '../core/format';

type DayMode = 'any' | 'all' | 'some';

/**
 * Restricciones horarias de una pareja, una fila por día del torneo:
 * "el viernes no podemos hasta las 22:00", "el sábado no podemos en todo el día"...
 * Sin restricciones en un día = pueden a cualquier hora.
 */
@Component({
  selector: 'mp-unavailability-editor',
  imports: [FormsModule],
  template: `
    <div class="stack">
      @for (d of days(); track d.playDate) {
        <div class="day">
          <div class="d">
            <span class="label">{{ label(d.playDate) }}</span>
            <select [ngModel]="dayMode(d.playDate)" (ngModelChange)="setDayMode(d.playDate, $event)" [attr.aria-label]="'Disponibilidad ' + label(d.playDate)">
              <option value="any">Puede a cualquier hora</option>
              <option value="all">No puede en todo el día</option>
              <option value="some">No puede en algunas horas</option>
            </select>
          </div>
          @if (dayMode(d.playDate) === 'some') {
            <div class="slots">
              @for (u of slots(d.playDate); track $index) {
                <div class="r">
                  <select [ngModel]="mode(u)" (ngModelChange)="setMode(u, $event)" aria-label="Tipo">
                    <option value="until">No puede hasta las…</option>
                    <option value="from">No puede desde las…</option>
                    <option value="range">No puede entre…</option>
                  </select>
                  @if (mode(u) === 'from' || mode(u) === 'range') {
                    <input type="time" step="900" [(ngModel)]="u.fromTime" (ngModelChange)="touch()" aria-label="Desde">
                  }
                  @if (mode(u) === 'range') { <span class="muted small">y</span> }
                  @if (mode(u) === 'until' || mode(u) === 'range') {
                    <input type="time" step="900" [(ngModel)]="u.toTime" (ngModelChange)="touch()" aria-label="Hasta">
                  }
                  <button type="button" class="icon-btn" (click)="remove(u)" aria-label="Quitar franja">✕</button>
                </div>
              }
              <div><button type="button" class="btn ghost sm" (click)="addSlot(d.playDate)">＋ otra franja</button></div>
            </div>
          }
        </div>
      } @empty {
        <p class="small muted" style="margin:0">El torneo aún no tiene días de juego.</p>
      }
      @if (duration() && days().length) {
        <p class="small muted" style="margin:0">Los partidos duran {{ duration() }} min: no se programará ningún partido que pise estas horas.</p>
      }
    </div>
  `,
  styles: [`
    .day { border-bottom: 1px solid var(--rule); padding-bottom: 8px; }
    .day:last-of-type { border-bottom: 0; }
    .d { display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center; }
    .label { font-weight: 600; }
    .slots { display: flex; flex-direction: column; gap: 6px; margin: 8px 0 0 148px; }
    .r { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    @media (max-width: 640px) {
      .d { grid-template-columns: 1fr; }
      .slots { margin-left: 0; }
    }
  `],
})
export class UnavailabilityEditorComponent {
  days = input.required<Day[]>();
  /** Duración del partido en minutos (solo para el texto de ayuda). */
  duration = input<number | null>(null);
  items = model<Unavailability[]>([]);

  label(d: string) { return `${dayName(d)} ${shortDate(d)}`; }

  slots(d: string) { return this.items().filter(u => u.playDate === d); }

  dayMode(d: string): DayMode {
    const list = this.slots(d);
    if (!list.length) return 'any';
    return list.some(u => u.fromTime == null && u.toTime == null) ? 'all' : 'some';
  }

  setDayMode(d: string, mode: DayMode) {
    const rest = this.items().filter(u => u.playDate !== d);
    if (mode === 'all') rest.push({ playDate: d, fromTime: null, toTime: null });
    if (mode === 'some') rest.push({ playDate: d, fromTime: null, toTime: '20:00' });
    this.items.set(rest);
  }

  mode(u: Unavailability) {
    if (!u.fromTime) return 'until';
    if (!u.toTime) return 'from';
    return 'range';
  }

  setMode(u: Unavailability, mode: string) {
    u.fromTime = mode === 'from' || mode === 'range' ? (u.fromTime || '17:00') : null;
    u.toTime = mode === 'until' || mode === 'range' ? (u.toTime || '20:00') : null;
    this.touch();
  }

  addSlot(d: string) { this.items.set([...this.items(), { playDate: d, fromTime: '14:00', toTime: '17:00' }]); }
  remove(u: Unavailability) { this.items.set(this.items().filter(x => x !== u)); }
  touch() { this.items.set([...this.items()]); }
}
