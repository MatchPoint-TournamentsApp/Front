import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { ConflictMatch, PairConflict, Tournament } from '../../core/models';
import { dayName, hhmm, shortDate } from '../../core/format';
import { ToastService } from '../../core/toast.service';

/**
 * Parejas con problemas de horario: partidos que ya juegan (seguro) o a los que pueden llegar (posible)
 * a una hora en la que no pueden. Contacto directo y acciones para resolverlo. Solo para el club.
 */
@Component({
  selector: 'mp-conflicts-dialog',
  template: `
    <div class="backdrop" (click)="closed.emit(changed)">
      <div class="modal wide-ish" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="conf-title">
        <div class="modal-head">
          <div>
            <h3 id="conf-title">Parejas con problemas de horario</h3>
            <p class="small muted" style="margin:4px 0 0">Contacta con ellas para cambiar sus restricciones o retirarlas; después pulsa «Reprogramar horarios».</p>
          </div>
          <button class="icon-btn" (click)="closed.emit(changed)" aria-label="Cerrar">✕</button>
        </div>

        @if (matchId()) {
          <div class="row-c filter">
            <span class="small">Mostrando las parejas del partido seleccionado.</span>
            <button class="btn ghost sm" (click)="matchId.set(null)">Ver todas</button>
          </div>
        }

        @if (loading()) { <p class="muted">Buscando conflictos…</p> }
        @else if (!shown().length) {
          <div class="notice ok-box"><b>No hay parejas con problemas.</b> Todos los partidos respetan las restricciones de las parejas.</div>
        } @else {
          <div class="list">
            @for (pc of shown(); track pc.pairId) {
              <article class="pair">
                <header>
                  <div>
                    <b>{{ pc.player1.fullName }} / {{ pc.player2.fullName }}</b>
                    <span class="chip grey">{{ pc.categoryName }}</span>
                  </div>
                </header>
                <ul class="matches">
                  @for (m of pc.matches; track m.matchId + m.reason) {
                    <li [class.sure]="m.sure">
                      <span class="tag">{{ m.sure ? 'Seguro' : 'Posible' }}</span>
                      <span><b>{{ when(m) }}</b> · P{{ m.number }}@if (m.roundName) { · {{ m.roundName }} }
                        @if (!m.sure) { <span class="muted"> (si llegan a este partido)</span> }</span>
                      <span class="reason">{{ m.reason }}</span>
                    </li>
                  }
                </ul>
                <div class="contact">
                  @for (pl of [pc.player1, pc.player2]; track $index) {
                    @if (pl.phone || pl.email) {
                      <div class="who">
                        <span class="small">{{ pl.fullName }}</span>
                        @if (pl.phone) {
                          <a class="btn ghost sm" [href]="'tel:' + digits(pl.phone)">Llamar</a>
                          <a class="btn ghost sm" [href]="whatsapp(pl.phone, pc)" target="_blank" rel="noopener">WhatsApp</a>
                        }
                        @if (pl.email) { <a class="btn ghost sm" [href]="mail(pl.email, pc)">Correo</a> }
                      </div>
                    }
                  }
                  @if (!hasContact(pc)) { <span class="tiny muted">Sin teléfono ni correo: añádelos en la ficha de la pareja.</span> }
                </div>
                <div class="actions">
                  <button class="btn sm" (click)="editPair.emit({ categoryId: pc.categoryId, pairId: pc.pairId })">Editar restricciones</button>
                  <button class="btn danger sm" (click)="withdraw(pc)" [disabled]="busy()">Retirar pareja</button>
                </div>
              </article>
            }
          </div>
        }

        <div class="modal-foot">
          <button class="btn ghost" (click)="closed.emit(changed)">Cerrar</button>
          <button class="btn" (click)="reschedule()" [disabled]="busy()">Reprogramar horarios</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wide-ish { width: min(760px, 100%); }
    .filter { justify-content: space-between; background: var(--glass); border-radius: var(--r-md); padding: 8px 12px; margin-bottom: 12px; }
    .ok-box { border-left-color: var(--ok); }
    .list { display: flex; flex-direction: column; gap: 12px; }
    .pair { border: 1px solid var(--rule); border-left: 3px solid var(--warn); border-radius: var(--r-md); padding: 12px 14px; background: #fff; }
    .pair header { display: flex; justify-content: space-between; gap: 8px; }
    .pair header .chip { margin-left: 8px; }
    .matches { list-style: none; padding: 0; margin: 10px 0; display: flex; flex-direction: column; gap: 6px; }
    .matches li { display: grid; grid-template-columns: 70px 1fr; gap: 2px 10px; font-size: .9rem; }
    .matches .reason { grid-column: 2; color: var(--danger); font-size: .84rem; }
    .tag { grid-row: span 2; align-self: start; font: 600 .68rem var(--body); letter-spacing: .1em; text-transform: uppercase;
      padding: 3px 6px; border-radius: 999px; text-align: center; background: var(--glass); color: var(--ink-2); }
    li.sure .tag { background: var(--danger-bg); color: var(--danger); }
    .contact { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; border-top: 1px solid var(--rule-2); }
    .who { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .who > .small { min-width: 160px; font-weight: 600; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; padding-top: 8px; border-top: 1px solid var(--rule-2); }
    @media (max-width: 560px) { .who > .small { min-width: 100%; } }
  `],
})
export class ConflictsDialogComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  t = input.required<Tournament>();
  /** Si viene de un partido concreto, solo se muestran sus parejas (con opción de ver todas). */
  focusMatchId = input<string | null>(null);
  /** true si algo ha cambiado (hay que recargar el torneo). */
  closed = output<boolean>();
  editPair = output<{ categoryId: string; pairId: string }>();

  conflicts = signal<PairConflict[]>([]);
  loading = signal(true);
  busy = signal(false);
  matchId = signal<string | null>(null);
  changed = false;

  shown = computed(() => {
    const id = this.matchId();
    return id ? this.conflicts().filter(c => c.matches.some(m => m.matchId === id)) : this.conflicts();
  });

  ngOnInit() {
    this.matchId.set(this.focusMatchId());
    this.load();
  }

  async load() {
    this.loading.set(true);
    try { this.conflicts.set(await this.api.conflicts(this.t().id)); }
    catch (e) { this.toast.error(e); }
    finally { this.loading.set(false); }
  }

  when(m: ConflictMatch) { return `${dayName(m.playDate)} ${shortDate(m.playDate)} ${hhmm(m.startTime)}`; }
  digits(phone: string) { return phone.replace(/[^\d+]/g, ''); }
  hasContact(pc: PairConflict) { return !!(pc.player1.phone || pc.player1.email || pc.player2.phone || pc.player2.email); }

  /** Mensaje ya escrito para el jugador con el primer partido problemático. */
  private message(pc: PairConflict) {
    const m = pc.matches[0];
    return `Hola, te escribimos del torneo «${this.t().name}» (${pc.categoryName}). Tenéis un partido el ${this.when(m)} `
      + `y nos indicasteis que a esa hora no podéis. ¿Podríais confirmarnos vuestra disponibilidad?`;
  }
  whatsapp(phone: string, pc: PairConflict) {
    return `https://wa.me/${this.digits(phone).replace('+', '')}?text=${encodeURIComponent(this.message(pc))}`;
  }
  mail(email: string, pc: PairConflict) {
    return `mailto:${email}?subject=${encodeURIComponent('Horario de vuestro partido · ' + this.t().name)}&body=${encodeURIComponent(this.message(pc))}`;
  }

  async withdraw(pc: PairConflict) {
    if (!(await this.confirm.ask({
      title: `¿Retirar a ${pc.player1.fullName} / ${pc.player2.fullName}?`,
      message: 'Dejará de contar en el torneo. Antes de que empiece, el cuadro de su categoría tendrá que volver a generarse.',
      ok: 'Retirar pareja', danger: true,
    }))) return;
    this.busy.set(true);
    try {
      await this.api.setPairStatus(pc.pairId, 'WITHDRAWN');
      this.toast.ok('Pareja retirada');
      this.changed = true;
      await this.load();
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }

  async reschedule() {
    this.busy.set(true);
    try {
      const s = await this.api.reschedule(this.t().id);
      this.toast.ok(s.warnings ? `Horarios recalculados: ${s.warnings} partidos siguen con avisos` : 'Horarios recalculados sin avisos');
      this.changed = true;
      await this.load();
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }
}
