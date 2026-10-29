import { Injectable } from '@angular/core';
import { norm } from './validation';

/** Municipio de España (registro oficial georef-spain-municipio). */
export interface Municipality { name: string; province: string; provinceCode: string; region: string; }

/**
 * Municipios y códigos postales de España con la API pública y gratuita de OpenDataSoft
 * (sin clave): municipios oficiales con tildes + códigos postales de GeoNames.
 * Si la API no responde, los formularios dejan escribir los datos a mano.
 */
@Injectable({ providedIn: 'root' })
export class GeoService {
  private base = 'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets';
  private cache = new Map<string, Promise<unknown>>();

  async searchMunicipalities(q: string, signal?: AbortSignal): Promise<Municipality[]> {
    const term = q.replace(/["\\]/g, '').trim();
    if (term.length < 2) return [];
    const where = `search(mun_name, "${term}")`;
    const url = `${this.base}/georef-spain-municipio/records?select=mun_name,prov_name,prov_code,acom_name&limit=25&where=${encodeURIComponent(where)}`;
    const data = await this.get<{ results: { mun_name: string; prov_name: string; prov_code: string; acom_name: string }[] }>(url, signal);
    const t = norm(term);
    return data.results
      .map(r => ({ name: one(r.mun_name), province: one(r.prov_name), provinceCode: one(r.prov_code), region: one(r.acom_name) }))
      // primero los que empiezan por lo escrito y los nombres cortos ("Cáceres" antes que "Casar de Cáceres")
      .sort((a, b) => rank(a.name, t) - rank(b.name, t) || a.name.length - b.name.length || a.name.localeCompare(b.name, 'es'))
      .slice(0, 8);
  }

  /** Códigos postales del municipio (puede haber muchos, p. ej. Madrid). Vacío si no se encuentran. */
  async postalCodes(m: Municipality): Promise<string[]> {
    const word = m.name.split(/[\s\-/,]+/).filter(w => w.length > 2).sort((a, b) => b.length - a.length)[0] ?? m.name;
    const where = `country_code = "ES" and startswith(postal_code, "${m.provinceCode}") and search(place_name, "${word.replace(/["\\]/g, '')}")`;
    const url = `${this.base}/geonames-postal-code/records?select=postal_code,place_name&limit=100&order_by=postal_code&where=${encodeURIComponent(where)}`;
    const data = await this.get<{ results: { postal_code: string; place_name: string }[] }>(url);
    const keys = nameKeys(m.name);
    let hits = data.results.filter(r => nameKeys(r.place_name).some(k => keys.includes(k)));
    // Sin coincidencia exacta, nombres que empiezan igual ("Palma" -> "Palma de Mallorca")
    if (!hits.length) hits = data.results.filter(r => nameKeys(r.place_name).some(k => keys.some(m => k.startsWith(m + ' '))));
    return [...new Set(hits.map(r => r.postal_code))].sort();
  }

  private get<T>(url: string, signal?: AbortSignal): Promise<T> {
    let p = this.cache.get(url) as Promise<T> | undefined;
    if (!p) {
      p = fetch(url, { signal }).then(r => { if (!r.ok) throw new Error('geo ' + r.status); return r.json() as Promise<T>; });
      this.cache.set(url, p);
      p.catch(() => this.cache.delete(url));
    }
    return p;
  }
}

/** Algunos campos llegan como lista de un elemento. */
function one(v: string | string[]): string { return Array.isArray(v) ? v[0] ?? '' : v ?? ''; }

const ARTICLE = /^(a|o|el|la|los|las|les|l|els|os|as) /;

/** Orden de las sugerencias; el artículo no cuenta ("A Coruña" antes que "Coruña del Conde" al buscar "coruña"). */
function rank(name: string, t: string) {
  const n = norm(name);
  const bare = n.replace(ARTICLE, '');
  return n === t || bare === t ? 0 : n.startsWith(t) || bare.startsWith(t) ? 1 : n.split(' ').some(w => w.startsWith(t)) ? 2 : 3;
}

/**
 * Variantes comparables de un nombre: "A Coruña" ~ "Coruña, A", "Vitoria-Gasteiz" ~ "Vitoria",
 * "Donostia/San Sebastián" ~ "San Sebastián"; sin tildes ni mayúsculas.
 */
function nameKeys(name: string): string[] {
  const base = name.replace(/\(.*?\)/g, '');
  const parts = [base, ...base.split(/[-/]/)];
  const keys = parts.flatMap(p => {
    const n = norm(p);
    const m = /^(.*) (a|o|el|la|los|las|les|l|els|os|as)$/.exec(n); // "coruna a" -> "a coruna"
    return m ? [n, `${m[2]} ${m[1]}`, m[1]] : [n, n.replace(ARTICLE, '')];
  });
  return [...new Set(keys.filter(Boolean))];
}
