import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Profile } from './models';
import { SupabaseService } from './supabase.service';

/** Perfil del usuario con sesión (rol y bloqueo), compartido por el menú, los avisos y los guards. */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private api = inject(ApiService);
  private supa = inject(SupabaseService);

  readonly profile = signal<Profile | null>(null);
  readonly isAdmin = computed(() => this.profile()?.role === 'SUPERADMIN');
  readonly blocked = computed(() => !!this.profile()?.blockedAt);

  private loading: Promise<Profile | null> | null = null;
  private loadedFor = '';

  constructor() {
    // Al entrar o salir de la sesión, recargar el perfil
    effect(() => {
      const id = this.supa.session()?.user.id ?? '';
      if (id === this.loadedFor) return;
      this.loadedFor = id;
      this.loading = null;
      this.profile.set(null);
      if (id) this.load();
    });
  }

  /** Carga el perfil una vez por sesión (null si no hay sesión o falla). */
  async load(): Promise<Profile | null> {
    await this.supa.whenReady();
    if (!this.supa.loggedIn()) return null;
    this.loading ??= this.api.me().then(p => { this.profile.set(p); return p; }).catch(() => { this.loading = null; return null; });
    return this.loading;
  }
}
