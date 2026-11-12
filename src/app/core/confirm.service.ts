import { Injectable, signal } from '@angular/core';

/** Pregunta de confirmación con el estilo de MatchZone (sustituye a window.confirm). */
export interface ConfirmRequest {
  title: string;
  message?: string;
  /** Texto del botón de aceptar (por defecto "Continuar"). */
  ok?: string;
  /** Acción destructiva: el botón de aceptar se muestra en rojo. */
  danger?: boolean;
}

interface Pending extends ConfirmRequest { resolve: (v: boolean) => void; }

/**
 * Ventanas de confirmación propias. A diferencia de window.confirm funcionan en cualquier
 * navegador (algunos navegadores integrados las bloquean y devuelven "cancelar" sin preguntar).
 * Uso: `if (!(await this.confirm.ask({ title: '¿Eliminar…?' }))) return;`
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<Pending | null>(null);

  ask(req: ConfirmRequest): Promise<boolean> {
    this.current()?.resolve(false); // solo una pregunta a la vez
    return new Promise<boolean>(resolve => this.current.set({ ...req, resolve }));
  }

  answer(value: boolean) {
    const c = this.current();
    if (!c) return;
    this.current.set(null);
    c.resolve(value);
  }
}
