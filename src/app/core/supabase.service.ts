import { Injectable, signal, computed } from '@angular/core';
import { createClient, processLock, Session, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/** Login / registro / subida de imágenes con Supabase. */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly configured = !environment.supabaseUrl.includes('TU-PROYECTO');
  readonly client: SupabaseClient;
  readonly session = signal<Session | null>(null);
  readonly ready = signal(false);
  readonly loggedIn = computed(() => !!this.session());
  readonly email = computed(() => this.session()?.user.email ?? '');
  /** Se ha entrado con el enlace de "recuperar contraseña": hay que pedir la nueva. */
  readonly recovery = signal(false);
  /** Error que Supabase devuelve en la URL cuando el enlace del email no vale (caducado, ya usado…). */
  readonly linkError = signal(readLinkError());

  constructor() {
    if (location.hash.includes('type=recovery')) this.recovery.set(true);
    this.client = createClient(
      this.configured ? environment.supabaseUrl : 'http://localhost:54321',
      this.configured ? environment.supabaseAnonKey : 'sin-configurar',
      // El bloqueo por defecto (navigator.locks) falla a veces con Angular: getSession() devuelve
      // vacío y las peticiones salen sin token (401 en la API, "anon" en Storage).
      // storageKey: si Supabase se usa a través de un intermediario (otra dirección), se guarda la sesión con el
      // mismo nombre que con la dirección directa para que nadie tenga que volver a entrar.
      { auth: { lock: processLock, ...(storageKey() ? { storageKey: storageKey() } : {}) } },
    );
    this.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.ready.set(true);
    }).catch(() => this.ready.set(true));
    this.client.auth.onAuthStateChange((event, s) => {
      this.session.set(s);
      if (event === 'PASSWORD_RECOVERY') this.recovery.set(true);
    });
  }

  async whenReady(): Promise<void> {
    while (!this.ready()) await new Promise(r => setTimeout(r, 30));
  }

  async token(): Promise<string | null> {
    const { data } = await this.client.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(translate(error.message));
  }

  async signUp(email: string, password: string, fullName: string): Promise<boolean> {
    const { data, error } = await this.client.auth.signUp({
      email, password,
      // Se guarda cuándo aceptó las condiciones y la política de privacidad (prueba del consentimiento)
      options: { data: { full_name: fullName, terms_accepted_at: new Date().toISOString() }, emailRedirectTo: location.origin + '/panel' },
    });
    if (error) throw new Error(translate(error.message));
    return !!data.session; // false = falta confirmar el email
  }

  async resetPassword(email: string) {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/nueva-contrasena' });
    if (error) throw new Error(translate(error.message));
  }

  /** Guarda la contraseña nueva del usuario que ha entrado con el enlace de recuperación. */
  async updatePassword(password: string) {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw new Error(translate(error.message));
    this.recovery.set(false);
  }

  signOut() { return this.client.auth.signOut(); }

  /** Sube una imagen al bucket público dentro de la carpeta del usuario y devuelve su URL. */
  async uploadImage(file: File, folder: string): Promise<string> {
    const user = this.session()?.user.id;
    if (!user) throw new Error('Inicia sesión para subir imágenes');
    if (file.size > 2 * 1024 * 1024) throw new Error('La imagen no puede superar 2 MB');
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${user}/${folder}/${Date.now()}.${ext}`;
    const bucket = this.client.storage.from(environment.storageBucket);
    const { error } = await bucket.upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error('No se pudo subir la imagen: ' + error.message);
    return bucket.getPublicUrl(path).data.publicUrl;
  }
}

export function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Email o contraseña incorrectos';
  if (m.includes('already registered')) return 'Ya existe una cuenta con ese email';
  if (m.includes('email not confirmed')) return 'Confirma tu email antes de entrar (revisa tu bandeja de entrada)';
  const len = /password should be at least (\d+)/.exec(m);
  if (len) return `La contraseña debe tener al menos ${len[1]} caracteres`;
  if (m.includes('password should contain')) return passwordRules(msg);
  if (m.includes('weak') && m.includes('password')) return 'Contraseña demasiado débil o muy conocida: elige otra más difícil de adivinar';
  if (m.includes('fetch')) return 'No se puede conectar con el servidor de acceso';
  if (m.includes('should be different')) return 'La contraseña nueva tiene que ser distinta de la anterior';
  if (m.includes('session missing') || m.includes('not authenticated')) return 'El enlace ha caducado. Pide uno nuevo para cambiar la contraseña';
  return msg;
}

/** «Password should contain at least one character of each: abc…, ABC…, 0123456789» → qué tipos de caracteres pide. */
export function passwordRules(msg: string): string {
  const need: string[] = [];
  if (msg.includes('abcdefghijklmnopqrstuvwxyz')) need.push('minúsculas');
  if (msg.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ')) need.push('mayúsculas');
  if (msg.includes('0123456789')) need.push('números');
  if (/[!@#$%^&*]/.test(msg)) need.push('algún símbolo (!@#$…)');
  return need.length ? `La contraseña tiene que llevar ${need.join(', ').replace(/, ([^,]*)$/, ' y $1')}` : 'La contraseña no cumple los requisitos de seguridad';
}

/** Nombre con el que se guarda la sesión (vacío = el que Supabase deduce de su dirección). */
function storageKey(): string {
  return (environment as { supabaseStorageKey?: string }).supabaseStorageKey ?? '';
}

/** "#error=access_denied&error_code=otp_expired&error_description=..." en la URL de vuelta del email. */
function readLinkError(): string {
  const p = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
  const code = p.get('error_code') ?? '';
  if (!p.get('error') && !code) return '';
  if (code === 'otp_expired') return 'El enlace ha caducado o ya se ha usado.';
  return p.get('error_description') || 'El enlace no es válido.';
}
