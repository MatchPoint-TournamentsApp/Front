import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Imágenes del bucket de Supabase (logos de clubes y patrocinadores). En la base de datos se guardan con la dirección
 * directa de Supabase (https://<proyecto>.supabase.co/storage/…). Si el Front habla con Supabase a través de un
 * intermediario propio (p. ej. https://sb.matchzonesports.com, para que no le afecten los bloqueos de IPs de LaLiga),
 * las imágenes también se piden por él. Con la dirección directa de Supabase, la URL no cambia.
 */
export function assetUrl(url?: string | null, supabaseUrl: string = environment.supabaseUrl): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const base = new URL(supabaseUrl);
    if (!u.hostname.endsWith('.supabase.co') || !u.pathname.startsWith('/storage/')) return url;
    if (base.hostname === u.hostname || base.hostname.endsWith('.supabase.co')) return url;
    return base.origin + base.pathname.replace(/\/+$/, '') + u.pathname + u.search;
  } catch {
    return url;
  }
}

/** {{ logoUrl | asset }}: la imagen por el mismo camino que el resto de peticiones a Supabase. */
@Pipe({ name: 'asset' })
export class AssetPipe implements PipeTransform {
  transform(url?: string | null): string { return assetUrl(url); }
}
