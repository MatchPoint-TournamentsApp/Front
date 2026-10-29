import { isEmail, isUrl, joinPhone, normalizeUrl, phoneError, postalCodeError, provinceCode, splitPhone } from './validation';

describe('validation', () => {
  it('teléfonos de España', () => {
    expect(phoneError('+34', '612 34 56 78')).toBeNull();
    expect(phoneError('+34', '924123456')).toBeNull();
    expect(phoneError('+34', '')).toBeNull();
    expect(phoneError('+34', '61234567')).toMatch(/9 cifras/);
    expect(phoneError('+34', '512345678')).toMatch(/6, 7, 8 o 9/);
  });

  it('teléfonos de otros países', () => {
    expect(phoneError('+351', '912345678')).toBeNull();
    expect(phoneError('+44', '123')).not.toBeNull();
  });

  it('separa y une el teléfono (también datos antiguos sin prefijo)', () => {
    expect(splitPhone('+34 612345678')).toEqual({ prefix: '+34', number: '612345678' });
    expect(splitPhone('+351 912345678')).toEqual({ prefix: '+351', number: '912345678' });
    expect(splitPhone('0034612345678')).toEqual({ prefix: '+34', number: '612345678' });
    expect(splitPhone('612 34 56 78')).toEqual({ prefix: '+34', number: '612345678' });
    expect(joinPhone('+34', '612 34 56 78')).toBe('+34 612345678');
    expect(joinPhone('+34', '')).toBe('');
  });

  it('emails', () => {
    expect(isEmail('ana@club.es')).toBe(true);
    expect(isEmail('')).toBe(true);
    expect(isEmail('ana@club')).toBe(false);
    expect(isEmail('ana club.es')).toBe(false);
  });

  it('webs', () => {
    expect(isUrl('https://miclub.es')).toBe(true);
    expect(isUrl('miclub.es')).toBe(true);
    expect(isUrl('miclub')).toBe(false);
    expect(normalizeUrl('miclub.es')).toBe('https://miclub.es');
  });

  it('código postal y provincia', () => {
    expect(postalCodeError('06200', provinceCode('Badajoz'), 'Badajoz')).toBeNull();
    expect(postalCodeError('28001', provinceCode('Badajoz'), 'Badajoz')).toMatch(/no es de Badajoz/);
    expect(postalCodeError('6200')).toMatch(/5 cifras/);
    expect(postalCodeError('53001')).toMatch(/no válido/);
    expect(provinceCode('Cáceres')).toBe('10');
    expect(provinceCode('A Coruña')).toBe('15');
    expect(provinceCode('Araba')).toBe('01');
    expect(provinceCode('Valencia/València')).toBe('46');
  });
});
