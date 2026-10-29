import {
  Component, DestroyRef, Directive, ElementRef, Injector, OnChanges, afterNextRender, computed, effect, forwardRef, inject, input, signal,
} from '@angular/core';
import { AbstractControl, NG_VALIDATORS, NgForm, NgModel, ValidationErrors, Validator } from '@angular/forms';
import { isEmail, isUrl, postalCodeError, provinceCode } from '../core/validation';

/**
 * Ayudas para formularios con plantilla (ngModel):
 * - validadores mpEmail, mpUrl, mpPostalCode
 * - <mp-error [control]="ref" /> mensaje bajo el campo
 * - <mp-form-errors [form]="f" /> aviso "Revisa N campos"
 * - form[mpForm]: al enviar con errores marca todo, baja al primero y le pone el foco
 */

@Directive({
  selector: '[mpEmail][ngModel]',
  providers: [{ provide: NG_VALIDATORS, useExisting: forwardRef(() => EmailValidatorDirective), multi: true }],
})
export class EmailValidatorDirective implements Validator {
  validate(c: AbstractControl): ValidationErrors | null { return isEmail(c.value) ? null : { email: true }; }
}

@Directive({
  selector: '[mpUrl][ngModel]',
  providers: [{ provide: NG_VALIDATORS, useExisting: forwardRef(() => UrlValidatorDirective), multi: true }],
})
export class UrlValidatorDirective implements Validator {
  validate(c: AbstractControl): ValidationErrors | null { return isUrl(c.value) ? null : { url: true }; }
}

/** Código postal de 5 cifras que, si se indica la provincia, empieza por su código. */
@Directive({
  selector: '[mpPostalCode][ngModel]',
  providers: [{ provide: NG_VALIDATORS, useExisting: forwardRef(() => PostalCodeValidatorDirective), multi: true }],
})
export class PostalCodeValidatorDirective implements Validator, OnChanges {
  province = input<string | null | undefined>(undefined, { alias: 'mpPostalCode' });
  private changed?: () => void;
  ngOnChanges() { this.changed?.(); }
  registerOnValidatorChange(fn: () => void) { this.changed = fn; }
  validate(c: AbstractControl): ValidationErrors | null {
    const e = postalCodeError(c.value, provinceCode(this.province()), this.province());
    return e ? { postalCode: e } : null;
  }
}

/** Fecha (o texto comparable) que no puede ser anterior a otra: [mpNotBefore]="inicio". */
@Directive({
  selector: '[mpNotBefore][ngModel]',
  providers: [{ provide: NG_VALIDATORS, useExisting: forwardRef(() => NotBeforeValidatorDirective), multi: true }],
})
export class NotBeforeValidatorDirective implements Validator, OnChanges {
  min = input<string | null | undefined>(undefined, { alias: 'mpNotBefore' });
  message = input('No puede ser anterior a la fecha de inicio', { alias: 'mpNotBeforeMessage' });
  private changed?: () => void;
  ngOnChanges() { this.changed?.(); }
  registerOnValidatorChange(fn: () => void) { this.changed = fn; }
  validate(c: AbstractControl): ValidationErrors | null {
    return c.value && this.min() && c.value < this.min()! ? { custom: this.message() } : null;
  }
}

const MESSAGES: Record<string, (e: unknown) => string> = {
  required: () => 'Este campo es obligatorio',
  email: () => 'Escribe un email válido, por ejemplo nombre@correo.com',
  url: () => 'Escribe una web válida, por ejemplo https://miclub.es',
  minlength: e => `Mínimo ${(e as { requiredLength: number }).requiredLength} caracteres`,
  min: e => `El mínimo es ${(e as { min: number }).min}`,
  max: e => `El máximo es ${(e as { max: number }).max}`,
  phone: e => String(e),
  postalCode: e => String(e),
  custom: e => String(e),
};

export function errorMessage(errors: ValidationErrors | null | undefined): string {
  if (!errors) return '';
  const key = Object.keys(errors)[0];
  return MESSAGES[key]?.(errors[key]) ?? 'Valor no válido';
}

/**
 * Señal que cambia con cada evento de los controles (valor, estado, tocado, enviado), para que
 * los componentes se repinten sin Zone.js: el estado de los formularios no son señales.
 */
function formTick(sources: () => AbstractControl[]) {
  const tick = signal(0);
  effect(onCleanup => {
    const subs = sources().map(c => c.events.subscribe(() => tick.update(v => v + 1)));
    onCleanup(() => subs.forEach(s => s.unsubscribe()));
  });
  return tick;
}

/** Mensaje de error bajo un campo, visible al salir del campo o al intentar guardar. */
@Component({
  selector: 'mp-error',
  template: `@if (visible()) { <small class="field-error" role="alert">{{ message() }}</small> }`,
})
export class FieldErrorComponent {
  control = input.required<NgModel>();
  /** Texto propio para "obligatorio" (p. ej. en casillas de aceptación). */
  requiredText = input<string>();
  private form = inject(NgForm, { optional: true });
  private tick = formTick(() => [this.control().control, ...(this.form ? [this.form.form] : [])]);
  visible = computed(() => {
    this.tick();
    const c = this.control();
    return !!c.invalid && (!!c.touched || !!this.form?.submitted);
  });
  message = computed(() => {
    this.tick();
    const e = this.control().errors;
    return e?.['required'] && this.requiredText() ? this.requiredText()! : errorMessage(e);
  });
}

/** Aviso al principio del formulario cuando se intenta guardar con errores. */
@Component({
  selector: 'mp-form-errors',
  template: `
    @if (count()) {
      <div class="form-errors" role="alert">
        <b>Revisa {{ count() === 1 ? 'el campo marcado' : 'los ' + count() + ' campos marcados' }} en rojo</b>
        <span>Te hemos llevado al primero.</span>
      </div>
    }
  `,
})
export class FormErrorsComponent {
  form = input.required<NgForm>();
  private tick = formTick(() => [this.form().form]);
  count = computed(() => { this.tick(); return this.form().submitted ? invalidControls(this.form().control).length : 0; });
}

function invalidControls(c: AbstractControl): AbstractControl[] {
  const children = 'controls' in c ? Object.values((c as unknown as { controls: Record<string, AbstractControl> }).controls) : [];
  if (!children.length) return c.invalid ? [c] : [];
  return children.flatMap(invalidControls);
}

/** Al enviar un formulario con errores: marca todos los campos y lleva al primero con error. */
@Directive({ selector: 'form[mpForm]' })
export class FormFocusDirective {
  private form = inject(NgForm);
  private el = inject<ElementRef<HTMLFormElement>>(ElementRef);
  private injector = inject(Injector);

  constructor() {
    const sub = this.form.ngSubmit.subscribe(() => {
      if (this.form.valid) return;
      this.form.control.markAllAsTouched();
      afterNextRender(() => focusFirstInvalid(this.el.nativeElement), { injector: this.injector });
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }
}

export function focusFirstInvalid(root: HTMLElement) {
  const bad = root.querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid, .ng-invalid input, .ng-invalid select');
  if (!bad) return;
  bad.scrollIntoView({ behavior: 'smooth', block: 'center' });
  bad.focus({ preventScroll: true });
}

/** Todo lo necesario para validar un formulario, para importarlo de una vez. */
export const FORM_KIT = [
  EmailValidatorDirective, UrlValidatorDirective, PostalCodeValidatorDirective, NotBeforeValidatorDirective,
  FieldErrorComponent, FormErrorsComponent, FormFocusDirective,
] as const;
