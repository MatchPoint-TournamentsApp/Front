// Reglas de validación compartidas por los formularios (las mismas que aplica el Back).

export interface PhonePrefix { code: string; country: string; iso: string; }

/** Prefijos más habituales; España primero (por defecto). */
export const PHONE_PREFIXES: PhonePrefix[] = [
  { code: '+34', country: 'España', iso: 'ES' },
  { code: '+351', country: 'Portugal', iso: 'PT' },
  { code: '+33', country: 'Francia', iso: 'FR' },
  { code: '+376', country: 'Andorra', iso: 'AD' },
  { code: '+44', country: 'Reino Unido', iso: 'GB' },
  { code: '+39', country: 'Italia', iso: 'IT' },
  { code: '+49', country: 'Alemania', iso: 'DE' },
  { code: '+41', country: 'Suiza', iso: 'CH' },
  { code: '+32', country: 'Bélgica', iso: 'BE' },
  { code: '+31', country: 'Países Bajos', iso: 'NL' },
  { code: '+1', country: 'EE. UU. / Canadá', iso: 'US' },
  { code: '+52', country: 'México', iso: 'MX' },
  { code: '+54', country: 'Argentina', iso: 'AR' },
  { code: '+57', country: 'Colombia', iso: 'CO' },
  { code: '+58', country: 'Venezuela', iso: 'VE' },
  { code: '+212', country: 'Marruecos', iso: 'MA' },
];

const DEFAULT_PREFIX = '+34';

/** Separa "+34 612345678" (o "612 34 56 78" sin prefijo, de datos antiguos) en prefijo y dígitos. */
export function splitPhone(value: string | null | undefined): { prefix: string; number: string } {
  const v = (value ?? '').trim();
  if (!v) return { prefix: DEFAULT_PREFIX, number: '' };
  if (v.startsWith('+') || v.startsWith('00')) {
    const digits = v.replace(/^00/, '+').replace(/[^\d+]/g, '');
    const known = [...PHONE_PREFIXES].sort((a, b) => b.code.length - a.code.length).find(p => digits.startsWith(p.code));
    if (known) return { prefix: known.code, number: digits.slice(known.code.length) };
    const m = /^(\+\d{1,4}?)(\d{6,14})$/.exec(digits);
    if (m) return { prefix: m[1], number: m[2] };
  }
  return { prefix: DEFAULT_PREFIX, number: v.replace(/\D/g, '') };
}

/** Formato guardado: "+34 612345678". Vacío si no hay número. */
export function joinPhone(prefix: string, number: string): string {
  const n = (number ?? '').replace(/\D/g, '');
  return n ? `${prefix} ${n}` : '';
}

/** Motivo por el que el número no es válido para ese prefijo, o null si lo es. */
export function phoneError(prefix: string, number: string): string | null {
  const n = (number ?? '').replace(/\D/g, '');
  if (!n) return null;
  if (prefix === '+34') {
    if (n.length !== 9) return 'Un teléfono de España tiene 9 cifras';
    if (!/^[6789]/.test(n)) return 'Debe empezar por 6, 7, 8 o 9';
    return null;
  }
  return n.length >= 6 && n.length <= 14 ? null : 'Número de teléfono no válido';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isEmail(v: string | null | undefined) { return !v || EMAIL.test(v.trim()); }

/** Web opcional: https://dominio.ext (también se acepta sin https://, que se añade al guardar). */
export function isUrl(v: string | null | undefined) {
  if (!v?.trim()) return true;
  try {
    const u = new URL(/^https?:\/\//i.test(v.trim()) ? v.trim() : 'https://' + v.trim());
    return /\.[a-z]{2,}$/i.test(u.hostname);
  } catch { return false; }
}
export function normalizeUrl(v: string | null | undefined) {
  const t = v?.trim();
  return !t ? '' : /^https?:\/\//i.test(t) ? t : 'https://' + t;
}

/** Código postal español: 5 cifras y, si se conoce, de la misma provincia (las 2 primeras cifras). */
export function postalCodeError(cp: string | null | undefined, provinceCode?: string | null, provinceName?: string | null): string | null {
  const v = (cp ?? '').trim();
  if (!v) return null;
  if (!/^\d{5}$/.test(v)) return 'El código postal tiene 5 cifras';
  const prov = +v.slice(0, 2);
  if (prov < 1 || prov > 52) return 'Código postal no válido';
  if (provinceCode && v.slice(0, 2) !== provinceCode) return `Ese código postal no es de ${provinceName || 'esa provincia'}`;
  return null;
}

/** Código (2 cifras) de una provincia española a partir de su nombre, para validar el CP. */
export function provinceCode(name: string | null | undefined): string | null {
  const n = norm(name);
  if (!n) return null;
  const hit = Object.entries(PROVINCES).find(([, names]) => names.some(x => norm(x) === n));
  return hit ? hit[0] : null;
}

export function norm(s: string | null | undefined) {
  return (s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ').trim();
}

/** Nombres (oficiales y habituales) de las provincias por código postal / INE. */
const PROVINCES: Record<string, string[]> = {
  '01': ['Araba', 'Álava', 'Araba/Álava'], '02': ['Albacete'], '03': ['Alicante', 'Alacant', 'Alicante/Alacant'],
  '04': ['Almería'], '05': ['Ávila'], '06': ['Badajoz'], '07': ['Illes Balears', 'Islas Baleares', 'Baleares'],
  '08': ['Barcelona'], '09': ['Burgos'], '10': ['Cáceres'], '11': ['Cádiz'], '12': ['Castellón', 'Castelló', 'Castellón/Castelló'],
  '13': ['Ciudad Real'], '14': ['Córdoba'], '15': ['A Coruña', 'La Coruña', 'Coruña'], '16': ['Cuenca'],
  '17': ['Girona', 'Gerona'], '18': ['Granada'], '19': ['Guadalajara'], '20': ['Gipuzkoa', 'Guipúzcoa'], '21': ['Huelva'],
  '22': ['Huesca'], '23': ['Jaén'], '24': ['León'], '25': ['Lleida', 'Lérida'], '26': ['La Rioja', 'Rioja'], '27': ['Lugo'],
  '28': ['Madrid'], '29': ['Málaga'], '30': ['Murcia'], '31': ['Navarra', 'Nafarroa'], '32': ['Ourense', 'Orense'],
  '33': ['Asturias'], '34': ['Palencia'], '35': ['Las Palmas', 'Palmas'], '36': ['Pontevedra'], '37': ['Salamanca'],
  '38': ['Santa Cruz de Tenerife', 'Tenerife'], '39': ['Cantabria'], '40': ['Segovia'], '41': ['Sevilla'], '42': ['Soria'],
  '43': ['Tarragona'], '44': ['Teruel'], '45': ['Toledo'], '46': ['Valencia', 'València', 'Valencia/València'],
  '47': ['Valladolid'], '48': ['Bizkaia', 'Vizcaya'], '49': ['Zamora'], '50': ['Zaragoza'], '51': ['Ceuta'], '52': ['Melilla'],
};
