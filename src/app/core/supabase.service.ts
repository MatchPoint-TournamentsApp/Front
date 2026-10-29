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

  constructor() {
    this.client = createClient(
      this.configured ? environment.supabaseUrl : 'http://localhost:54321',
      this.configured ? environment.supabaseAnonKey : 'sin-configurar',
      // El bloqueo por defecto (navigator.locks) falla a veces con Angular: getSession() devuelve
      // vacío y las peticiones salen sin token (401 en la API, "anon" en Storage).
      { auth: { lock: processLock } },
    );
    this.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.ready.set(true);
    }).catch(() => this.ready.set(true));
    this.client.auth.onAuthStateChange((_event, s) => this.session.set(s));
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
      email, password, options: { data: { full_name: fullName }, emailRedirectTo: location.origin + '/panel' },
    });
    if (error) throw new Error(translate(error.message));
    return !!data.session; // false = falta confirmar el email
  }

  async resetPassword(email: string) {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/entrar' });
    if (error) throw new Error(translate(error.message));
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

function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Email o contraseña incorrectos';
  if (m.includes('already registered')) return 'Ya existe una cuenta con ese email';
  if (m.includes('email not confirmed')) return 'Confirma tu email antes de entrar (revisa tu bandeja de entrada)';
  if (m.includes('password should be')) return 'La contraseña debe tener al menos 6 caracteres';
  if (m.includes('fetch')) return 'No se puede conectar con el servidor de acceso';
  return msg;
}
