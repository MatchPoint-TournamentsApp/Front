// Datos del titular para el aviso legal, la política de privacidad y las condiciones de uso.
// PENDIENTE: rellenar cuando estén disponibles (LSSI-CE art. 10). Lo que empieza por "[completar"
// se resalta en las páginas para que no pase desapercibido.

export const LEGAL = {
  brand: 'MatchZone',
  titular: '[completar: nombre o razón social del titular]',
  nif: '[completar: NIF/CIF]',
  address: '[completar: domicilio completo]',
  email: '[completar: email de contacto]',
  registry: '[completar, si es una sociedad: datos de inscripción en el Registro Mercantil]',
  updated: '29 de octubre de 2026',
};

export function isPending(v: string) { return v.startsWith('[completar'); }
