// Datos del titular para el aviso legal, la política de privacidad y las condiciones de uso.
// PENDIENTE: rellenar cuando estén disponibles (LSSI-CE art. 10). Lo que empieza por "[completar"
// se resalta en las páginas para que no pase desapercibido.

export const LEGAL = {
  brand: 'MatchZone',
  titular: 'Cristo Macías',
  nif: '[completar: NIF/CIF]',
  address: 'Mérida, Extremadura, España',
  email: 'cristomac.izaguirre@gmail.com',
  registry: 'No aplica (persona física, sin inscripción en el Registro Mercantil)',
  updated: '14 de noviembre de 2026',
};

export function isPending(v: string) { return v.startsWith('[completar'); }
