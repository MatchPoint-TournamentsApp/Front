import { Component, DestroyRef, ElementRef, booleanAttribute, inject, input, model, signal, viewChild } from '@angular/core';
import { ControlContainer, FormsModule } from '@angular/forms';
import { GeoService, Municipality } from '../core/geo.service';
import { FieldErrorComponent, PostalCodeValidatorDirective } from './forms';

/**
 * Municipio con autocompletado (España) que rellena localidad, provincia y código postal.
 * Sus campos se registran en el <form> del padre, así que se validan con el resto.
 * Si la búsqueda no responde, todo se puede escribir a mano.
 */
@Component({
  selector: 'mp-address-fields',
  imports: [FormsModule, FieldErrorComponent, PostalCodeValidatorDirective],
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
  template: `
    <div class="grid">
      <div class="field muni" [class.req]="required()">
        <span id="mp-muni-label">Municipio</span>
        <div class="combo">
          <input #muni name="city" [ngModel]="city()" (ngModelChange)="onType($event)" #cityRef="ngModel" [required]="required()"
            autocomplete="off" role="combobox" aria-labelledby="mp-muni-label" aria-autocomplete="list" [attr.aria-expanded]="open()"
            aria-controls="mp-muni-list" [attr.aria-activedescendant]="open() && active() >= 0 ? 'mp-muni-' + active() : null"
            placeholder="Empieza a escribir: Almendralejo, Cáceres…"
            (keydown)="onKey($event)" (focus)="open.set(results().length > 0)" (blur)="close()">
          @if (loading()) { <span class="spin" aria-hidden="true"></span> }
          @if (open()) {
            <ul id="mp-muni-list" class="list" role="listbox">
              @for (m of results(); track m.name + m.provinceCode; let i = $index) {
                <li [id]="'mp-muni-' + i" role="option" [attr.aria-selected]="i === active()" [class.on]="i === active()"
                  (mousedown)="$event.preventDefault(); pick(m)" (mouseenter)="active.set(i)">
                  <b>{{ m.name }}</b><span>{{ m.province }}@if (m.region && m.region !== m.province) { · {{ m.region }} }</span>
                </li>
              }
            </ul>
          }
        </div>
        @if (hint()) { <small class="hint">{{ hint() }}</small> }
        <mp-error [control]="cityRef" />
      </div>

      <label class="field" [class.req]="required()">
        <span>Provincia</span>
        <input name="province" [ngModel]="province()" (ngModelChange)="province.set($event)" #provRef="ngModel" [required]="required()" autocomplete="address-level1">
        <mp-error [control]="provRef" />
      </label>

      <label class="field" [class.req]="required()">
        <span>Código postal</span>
        @if (codes().length > 1) {
          <select name="postalCode" [ngModel]="postalCode()" (ngModelChange)="postalCode.set($event)" #cpRef="ngModel"
            [mpPostalCode]="province()" [required]="required()">
            <option value="">Elige…</option>
            @for (c of codes(); track c) { <option [value]="c">{{ c }}</option> }
          </select>
          <mp-error [control]="cpRef" />
        } @else {
          <input name="postalCode" [ngModel]="postalCode()" (ngModelChange)="postalCode.set($event)" #cpRef="ngModel"
            [mpPostalCode]="province()" [required]="required()" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder="06200">
          <mp-error [control]="cpRef" />
        }
      </label>
    </div>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: 1.4fr 1fr .8fr; gap: 16px; align-items: start; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr 1fr; } .muni { grid-column: 1 / -1; } }
    .combo { position: relative; }
    .spin { position: absolute; right: 12px; top: 50%; width: 14px; height: 14px; margin-top: -7px; border: 2px solid var(--rule); border-top-color: var(--gold); border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .list {
      position: absolute; z-index: 30; left: 0; right: 0; top: calc(100% + 4px); margin: 0; padding: 4px; list-style: none;
      background: #fff; border: 1px solid var(--rule); border-radius: var(--r-md); box-shadow: var(--shadow-lg); max-height: 300px; overflow: auto;
    }
    .list li { display: flex; flex-direction: column; gap: 1px; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
    .list li.on { background: var(--court-3); }
    .list b { font-weight: 500; }
    .list span { font-size: .8rem; color: var(--ink-3); }
    .hint { color: var(--ink-3); font-size: .8rem; }
  `],
})
export class AddressFieldsComponent {
  private geo = inject(GeoService);
  city = model<string | undefined>();
  province = model<string | undefined>();
  postalCode = model<string | undefined>();
  required = input(false, { transform: booleanAttribute });

  results = signal<Municipality[]>([]);
  codes = signal<string[]>([]);
  open = signal(false);
  active = signal(-1);
  loading = signal(false);
  hint = signal('');
  private input = viewChild<ElementRef<HTMLInputElement>>('muni');
  private timer?: ReturnType<typeof setTimeout>;
  private abort?: AbortController;

  constructor() {
    inject(DestroyRef).onDestroy(() => { clearTimeout(this.timer); this.abort?.abort(); });
  }

  onType(v: string) {
    this.city.set(v);
    this.codes.set([]);
    this.hint.set('');
    clearTimeout(this.timer);
    this.abort?.abort();
    if ((v ?? '').trim().length < 3) { this.results.set([]); this.open.set(false); this.loading.set(false); return; }
    this.timer = setTimeout(() => this.search(v), 250);
  }

  private async search(q: string) {
    this.abort = new AbortController();
    this.loading.set(true);
    try {
      const list = await this.geo.searchMunicipalities(q, this.abort.signal);
      if (q !== this.city()) return;
      this.results.set(list);
      this.active.set(list.length ? 0 : -1);
      this.open.set(list.length > 0 && document.activeElement === this.input()?.nativeElement);
      if (!list.length) this.hint.set('No encontramos ese municipio. Puedes escribir los datos a mano.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') this.hint.set('No se pudo buscar el municipio ahora. Escribe los datos a mano.');
    } finally { this.loading.set(false); }
  }

  onKey(e: KeyboardEvent) {
    const n = this.results().length;
    if (!this.open() || !n) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.active.set((this.active() + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.active.set((this.active() - 1 + n) % n); }
    else if (e.key === 'Enter' && this.active() >= 0) { e.preventDefault(); this.pick(this.results()[this.active()]); }
    else if (e.key === 'Escape') { this.open.set(false); }
  }

  close() { setTimeout(() => this.open.set(false), 120); }

  async pick(m: Municipality) {
    this.city.set(m.name);
    this.province.set(m.province);
    this.open.set(false);
    this.results.set([]);
    this.hint.set('');
    try {
      const codes = await this.geo.postalCodes(m);
      if (this.city() !== m.name) return;
      if (codes.length === 1) { this.codes.set([]); this.postalCode.set(codes[0]); }
      else if (codes.length > 1) {
        this.codes.set(codes);
        if (!codes.includes(this.postalCode() ?? '')) this.postalCode.set('');
        this.hint.set(`${m.name} tiene ${codes.length} códigos postales: elige el de la dirección.`);
      } else {
        this.codes.set([]);
        if (!(this.postalCode() ?? '').startsWith(m.provinceCode)) this.postalCode.set('');
        this.hint.set('No tenemos el código postal de este municipio: escríbelo a mano.');
      }
    } catch {
      this.hint.set('No se pudo obtener el código postal: escríbelo a mano.');
    }
  }
}
