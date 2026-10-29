import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { FORM_KIT } from '../../shared/forms';
import { ApiService } from '../../core/api.service';
import { Category, CategoryFormat, Gender, Tournament } from '../../core/models';
import { categoryColor, FORMAT_LABEL, GENDER_LABEL } from '../../core/format';
import { ToastService } from '../../core/toast.service';

interface Form {
  id?: string; name: string; gender: Gender; level?: string; format: CategoryFormat; groupCount: number;
  split: 'auto' | 'one' | 'two'; maxPairs?: number | null; matchDurationMinutes?: number | null; color?: string;
}

@Component({
  selector: 'mp-categories-tab',
  imports: [FormsModule, FORM_KIT],
  template: `
    <div class="row between" style="margin-bottom:14px">
      <p class="muted" style="margin:0">Cada categoría tiene su propio cuadro o liguilla.</p>
      <button class="btn" (click)="edit()">Nueva categoría</button>
    </div>
    @if (!t().categories.length) {
      <div class="panel empty"><h3>Sin categorías</h3><p>Crea al menos una para empezar a inscribir parejas.</p></div>
    } @else {
      <div class="panel table-wrap">
        <table class="table">
          <thead><tr><th>Categoría</th><th>Formato</th><th>Parejas</th><th>Cuadro</th><th></th></tr></thead>
          <tbody>
            @for (c of t().categories; track c.id) {
              <tr>
                <td><span class="dot" [style.background]="color(c)"></span><b>{{ c.name }}</b> <span class="muted small">{{ gender(c.gender) }}{{ c.level ? ', ' + c.level : '' }}</span></td>
                <td>{{ format(c.format) }}@if (c.format === 'LEAGUE' && c.groupCount === 2) { (2 grupos) }</td>
                <td class="num">{{ c.confirmedPairs }}@if (c.maxPairs) { / {{ c.maxPairs }} } @if (c.pendingPairs) { <span class="chip warn">+{{ c.pendingPairs }}</span> }</td>
                <td>@if (c.drawGenerated) { <span class="chip ok">Generado</span> } @else { <span class="chip grey">Pendiente</span> }</td>
                <td class="nowrap" style="text-align:right">
                  <button class="btn ghost sm" (click)="edit(c)">Editar</button>
                  <button class="btn danger sm" (click)="remove(c)">Eliminar</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (form(); as f) {
      <div class="backdrop" (click)="form.set(null)">
        <form class="modal stack" (click)="$event.stopPropagation()" #cform="ngForm" mpForm (ngSubmit)="save(f, cform)" novalidate>
          <div class="modal-head"><h3>{{ f.id ? 'Editar categoría' : 'Nueva categoría' }}</h3><button type="button" class="icon-btn" (click)="form.set(null)" aria-label="Cerrar">✕</button></div>
          <mp-form-errors [form]="cform" />
          <label class="field"><span>Nombre</span><input name="n" [(ngModel)]="f.name" #nRef="ngModel" required placeholder="Cuarta masculina"><mp-error [control]="nRef" /></label>
          <div class="grid-2">
            <label class="field"><span>Modalidad</span>
              <select name="g" [(ngModel)]="f.gender">@for (g of genders; track g) { <option [ngValue]="g">{{ gender(g) }}</option> }</select>
            </label>
            <label class="field"><span>Nivel</span><input name="l" [(ngModel)]="f.level" placeholder="Primera, segunda, iniciación…"></label>
          </div>
          <div class="field"><span>Formato</span>
            <div class="formats">
              @for (fm of formats; track fm.v) {
                <label class="fmt" [class.on]="f.format === fm.v">
                  <input type="radio" name="fmt" [value]="fm.v" [(ngModel)]="f.format">
                  <b>{{ fm.t }}</b><small>{{ fm.d }}</small>
                </label>
              }
            </div>
          </div>
          @if (f.format === 'LEAGUE') {
            <div class="field"><span>Grupos</span>
              <div class="seg">
                <button type="button" [class.on]="f.groupCount === 1" (click)="f.groupCount = 1">Una liga</button>
                <button type="button" [class.on]="f.groupCount === 2" (click)="f.groupCount = 2">Dos grupos + final</button>
              </div>
              <small>Con dos grupos, los primeros juegan la final (1º y 2º puesto) y los segundos el 3º y 4º puesto.</small>
            </div>
          } @else {
            <div class="field"><span>Tamaño de cuadro</span>
              <div class="seg">
                <button type="button" [class.on]="f.split === 'auto'" (click)="f.split = 'auto'">Automático</button>
                <button type="button" [class.on]="f.split === 'one'" (click)="f.split = 'one'">Un cuadro</button>
                <button type="button" [class.on]="f.split === 'two'" (click)="f.split = 'two'">Cuadro A y B</button>
              </div>
              <small>Automático: se divide en A y B si hay más de {{ t().splitThreshold }} parejas. Los ganadores de A y B juegan la final.</small>
            </div>
          }
          <div class="grid-3">
            <label class="field"><span>Máx. parejas</span><input name="m" type="number" min="2" [(ngModel)]="f.maxPairs"></label>
            <label class="field"><span>Duración (min)</span><input name="d" type="number" min="30" step="5" [(ngModel)]="f.matchDurationMinutes" [placeholder]="'' + t().matchDurationMinutes"></label>
            <label class="field"><span>Color</span><input name="c" type="color" [(ngModel)]="f.color"></label>
          </div>
          <div class="modal-foot"><button type="button" class="btn ghost" (click)="form.set(null)">Cancelar</button><button class="btn" type="submit">Guardar</button></div>
        </form>
      </div>
    }
  `,
  styles: [`
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
    .formats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    @media (max-width: 560px) { .formats { grid-template-columns: 1fr; } }
    .fmt { border: 1.5px solid var(--rule); border-radius: 10px; padding: 10px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
    .fmt input { display: none; }
    .fmt.on { border-color: var(--court-2); background: var(--court-3); }
    .fmt small { color: var(--ink-2); font-size: .8rem; line-height: 1.3; }
  `],
})
export class CategoriesTabComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  t = input.required<Tournament>();
  changed = output<void>();
  form = signal<Form | null>(null);

  genders: Gender[] = ['MASCULINA', 'FEMENINA', 'MIXTA', 'OPEN'];
  formats = [
    { v: 'KNOCKOUT_CONSOLATION' as CategoryFormat, t: 'Cuadro + consolación', d: 'Quien pierde su primer partido sigue jugando en consolación.' },
    { v: 'KNOCKOUT' as CategoryFormat, t: 'Eliminatoria', d: 'Quien pierde queda eliminado.' },
    { v: 'LEAGUE' as CategoryFormat, t: 'Liguilla', d: 'Todos contra todos. Ideal con pocas parejas.' },
  ];

  gender(g: Gender) { return GENDER_LABEL[g]; }
  format(f: CategoryFormat) { return FORMAT_LABEL[f]; }
  color(c: Category) { return categoryColor(c); }

  edit(c?: Category) {
    this.form.set(c ? {
      id: c.id, name: c.name, gender: c.gender, level: c.level, format: c.format, groupCount: c.groupCount,
      split: c.splitDraws == null ? 'auto' : c.splitDraws ? 'two' : 'one', maxPairs: c.maxPairs,
      matchDurationMinutes: c.matchDurationMinutes, color: categoryColor(c),
    } : { name: '', gender: 'MASCULINA', format: 'KNOCKOUT_CONSOLATION', groupCount: 1, split: 'auto', color: categoryColor({ position: this.t().categories.length + 1 }) });
  }

  async save(f: Form, cform: NgForm) {
    if (cform.invalid) return;
    const body: Partial<Category> = {
      name: f.name, gender: f.gender, level: f.level, format: f.format, groupCount: f.groupCount,
      splitDraws: f.split === 'auto' ? null : f.split === 'two', maxPairs: f.maxPairs || null,
      matchDurationMinutes: f.matchDurationMinutes || null, color: f.color,
    };
    try {
      if (f.id) await this.api.updateCategory(f.id, body); else await this.api.addCategory(this.t().id, body);
      this.toast.ok('Categoría guardada');
      this.form.set(null);
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
  }

  async remove(c: Category) {
    if (!confirm(`¿Eliminar la categoría ${c.name} con sus parejas y partidos?`)) return;
    try { await this.api.deleteCategory(c.id); this.changed.emit(); } catch (e) { this.toast.error(e); }
  }
}
