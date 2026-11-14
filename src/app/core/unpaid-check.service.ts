import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ConfirmService } from './confirm.service';

/**
 * Antes de empezar un partido: si algún jugador de las dos parejas no tiene marcada la inscripción
 * como pagada (pestaña «Pagos»), el club decide si lo empieza igualmente. Solo avisa, no bloquea.
 */
@Injectable({ providedIn: 'root' })
export class UnpaidCheckService {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);

  /** true = empezar el partido. Si no se pueden consultar los pagos, no se frena al club. */
  async okToStart(tournamentId: string, pairIds: (string | undefined)[]): Promise<boolean> {
    const ids = new Set(pairIds.filter((x): x is string => !!x));
    let unpaid: string[];
    try {
      const list = await this.api.payments(tournamentId);
      unpaid = list.flatMap(c => c.players).filter(p => ids.has(p.pairId) && !p.paidAt).map(p => p.fullName);
    } catch {
      return true;
    }
    if (!unpaid.length) return true;
    const names = joinNames(unpaid);
    return this.confirm.ask({
      title: 'Inscripción sin pagar',
      message: unpaid.length === 1
        ? `${names} no abonó la inscripción del torneo. ¿Quieres empezar el partido igualmente?`
        : `${names} no abonaron la inscripción del torneo. ¿Quieres empezar el partido igualmente?`,
      ok: 'Continuar',
    });
  }
}

/** "Ana", "Ana y Eva", "Ana, Eva y Luz". */
export function joinNames(names: string[]) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}
