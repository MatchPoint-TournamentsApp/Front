import { passwordProblem } from './validation';
import { passwordRules, translate } from './supabase.service';

describe('contraseñas nuevas', () => {
  it('pide 10 caracteres, letras y números', () => {
    expect(passwordProblem('padel2026')).toContain('10 caracteres');
    expect(passwordProblem('1234567890')).toBe('Falta: alguna letra');
    expect(passwordProblem('contraseñas')).toBe('Falta: algún número');
    expect(passwordProblem('Padel2026club')).toBe('');
    expect(passwordProblem('')).toBe('');
  });

  it('traduce los errores de Supabase', () => {
    expect(translate('Password should be at least 10 characters.')).toBe('La contraseña debe tener al menos 10 caracteres');
    expect(passwordRules('Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789'))
      .toBe('La contraseña tiene que llevar minúsculas, mayúsculas y números');
  });
});
