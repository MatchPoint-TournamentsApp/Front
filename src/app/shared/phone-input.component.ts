import { Component, booleanAttribute, forwardRef, input, signal } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import { joinPhone, PHONE_PREFIXES, phoneError, splitPhone } from '../core/validation';

/**
 * Teléfono con prefijo internacional. Valor con [(ngModel)]: "+34 612345678" ('' si está vacío).
 * Valida 9 cifras empezando por 6/7/8/9 para España y 6–14 cifras para el resto.
 */
@Component({
  selector: 'mp-phone-input',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PhoneInputComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => PhoneInputComponent), multi: true },
  ],
  template: `
    <div class="control">
      <select (change)="setPrefix($any($event.target).value)" (blur)="touched()" [disabled]="disabled()" aria-label="Prefijo del país">
        @for (p of prefixes; track p.code) { <option [value]="p.code" [selected]="p.code === prefix()" [title]="p.country">{{ p.iso }} {{ p.code }}</option> }
        @if (!known()) { <option [value]="prefix()" selected>{{ prefix() }}</option> }
      </select>
      <input type="tel" inputmode="tel" autocomplete="tel-national" [value]="number()" [required]="required()"
        [attr.aria-label]="label()" [placeholder]="prefix() === '+34' ? '612 34 56 78' : 'Número'" [disabled]="disabled()"
        (input)="setNumber($any($event.target).value)" (blur)="touched()">
    </div>
  `,
  styles: [`
    :host { display: block; }
    .control { display: grid; grid-template-columns: 112px 1fr; }
    select { border-top-right-radius: 0; border-bottom-right-radius: 0; border-right: 0; padding-right: 4px; background-color: var(--glass); }
    input { border-top-left-radius: 0; border-bottom-left-radius: 0; }
  `],
})
export class PhoneInputComponent implements ControlValueAccessor, Validator {
  required = input(false, { transform: booleanAttribute });
  label = input('Teléfono');
  prefixes = PHONE_PREFIXES;
  prefix = signal('+34');
  number = signal('');
  disabled = signal(false);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  known() { return this.prefixes.some(p => p.code === this.prefix()); }

  writeValue(v: string | null) {
    const { prefix, number } = splitPhone(v);
    this.prefix.set(prefix);
    this.number.set(number);
  }
  registerOnChange(fn: (v: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  registerOnValidatorChange(fn: () => void) { this.onValidatorChange = fn; }
  setDisabledState(d: boolean) { this.disabled.set(d); }

  setPrefix(p: string) { this.prefix.set(p); this.emit(); this.onValidatorChange(); }
  setNumber(n: string) { this.number.set(n); this.emit(); }
  touched() { this.onTouched(); }
  private emit() { this.onChange(joinPhone(this.prefix(), this.number())); }

  validate(_c: AbstractControl): ValidationErrors | null {
    const e = phoneError(this.prefix(), this.number());
    return e ? { phone: e } : null;
  }
}
