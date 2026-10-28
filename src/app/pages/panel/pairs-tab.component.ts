import { Component, OnChanges, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Category, PairStatus, PairView, Player, Tournament, Unavailability } from '../../core/models';
import { dayName, hhmm } from '../../core/format';
import { findSimilar, normalizeName } from '../../core/names';
import { ToastService } from '../../core/toast.service';
import { UnavailabilityEditorComponent } from '../../shared/unavailability-editor.component';

interface Form {
  id?: string;
  p1: { fullName: string; phone?: string; email?: string };
  p2: { fullName: string; phone?: string; email?: string };
  seed?: number | null; notes?: string; status: PairStatus;
}

/** Parejas por categoría con sus restricciones horarias. */
@Component({
  selector: 'mp-pairs-tab',
  imports: [FormsModule, UnavailabilityEditorComponent],
  template: `
    @if (!t().categories.length) {
      <div class="panel empty"><h3>Primero crea una categoría</h3></div>
    } @else {
      <div class="row between" style="margin-bottom:14px">
        <div class="seg">
          @for (c of t().categories; track c.id) {
            <button [class.on]="c.id === cat()?.id" (click)="select(c.id)">{{ c.name }} <span class="muted">{{ c.confirmedPairs }}</span></button>
          }
        </div>
        <div class="row">
          @if (pendingCount() && !cat()?.drawGenerated) { <button class="btn ghost" (click)="confirmAll()">Confirmar {{ pendingCount() === 1 ? 'la inscripción pendiente' : pendingCount() + ' pendientes' }}</button> }
          <button class="btn" (click)="edit()" [disabled]="cat()?.drawGenerated">Añadir pareja</button>
        </div>
      </div>
      @if (cat()?.drawGenerated) {
        <div class="notice" style="margin-bottom:14px">El cuadro de esta categoría ya está generado. Para añadir o quitar parejas, reinícialo en "Cuadros y resultados".</div>
      }
      @if (loading()) { <p class="muted">Cargando parejas…</p> }
      @else if (!pairs().length) {
        <div class="panel empty"><h3>Sin parejas en {{ cat()?.name }}</h3><p>Añádelas tú o abre la inscripción pública en Ajustes.</p></div>
      } @else {
        <div class="panel table-wrap">
          <table class="table">
            <thead><tr><th>#</th><th>Pareja</th><th>Contacto</th><th>No pueden jugar</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              @for (p of pairs(); track p.id; let i = $index) {
                <tr [class.pending]="p.status === 'PENDING'" [class.withdrawn]="p.status === 'WITHDRAWN'">
                  <td class="num muted">{{ i + 1 }}</td>
                  <td>
                    <b>{{ p.player1.fullName }}</b><br><b>{{ p.player2.fullName }}</b><br>
                    @if (p.seed) { <span class="chip ball">Cabeza de serie {{ p.seed }}</span> }
                    @if (p.groupLabel) { <span class="chip grey">{{ cat()?.format === 'LEAGUE' ? 'Grupo' : 'Cuadro' }} {{ p.groupLabel }}</span> }
                  </td>
                  <td class="small">{{ p.player1.phone || '—' }}<br>{{ p.player2.phone || '—' }}</td>
                  <td class="small">
                    @for (u of p.unavailabilities; track $index) { <div>{{ unavText(u) }}</div> } @empty { <span class="muted">Sin restricciones</span> }
                    @if (p.notes) { <div class="muted tiny">“{{ p.notes }}”</div> }
                  </td>
                  <td>
                    @switch (p.status) {
                      @case ('CONFIRMED') { <span class="chip ok">Confirmada</span> }
                      @case ('PENDING') { <span class="chip warn">Pendiente</span> }
                      @case ('WITHDRAWN') { <span class="chip grey">Retirada</span> }
                    }
                    @if (p.source === 'PUBLIC') { <div class="tiny muted">Por enlace</div> }
                  </td>
                  <td class="nowrap" style="text-align:right">
                    @if (p.status === 'PENDING' && !cat()?.drawGenerated) { <button class="btn sm" (click)="setStatus(p, 'CONFIRMED')">Confirmar</button> }
                    <button class="btn ghost sm" (click)="edit(p)">Editar</button>
                    @if (!cat()?.drawGenerated) { <button class="btn danger sm" (click)="remove(p)">Eliminar</button> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    @if (form(); as f) {
      <div class="backdrop" (click)="form.set(null)">
        <form class="modal stack" style="width:min(720px,100%)" (click)="$event.stopPropagation()" (ngSubmit)="save(f)">
          <div class="modal-head"><h3>{{ f.id ? 'Editar pareja' : 'Nueva pareja' }} <span class="muted small">{{ cat()?.name }}</span></h3>
            <button type="button" class="icon-btn" (click)="form.set(null)" aria-label="Cerrar">✕</button></div>
          <datalist id="mp-players">@for (pl of players(); track pl.id) { <option [value]="pl.fullName"></option> }</datalist>
          <div class="grid-2">
            @for (p of [f.p1, f.p2]; track $index; let i = $index) {
              <fieldset class="stack">
                <legend>Jugador {{ i + 1 }}</legend>
                <label class="field"><span>Nombre y apellidos</span>
                  <input [name]="'n' + i" [(ngModel)]="p.fullName" list="mp-players" required autocomplete="off" (change)="fill(p)"></label>
                @if (similar(p); as s) {
                  <div class="notice warn small stack" style="gap:6px">
                    <span>¿Es el mismo jugador que <b>{{ s.fullName }}</b>{{ s.phone ? ' (' + s.phone + ')' : '' }}, ya inscrito en el torneo?</span>
                    <div class="row">
                      <button type="button" class="btn sm" (click)="useExisting(p, s)">Sí, es él</button>
                      <button type="button" class="btn ghost sm" (click)="dismiss(p, s)">No, es otro</button>
                    </div>
                  </div>
                }
                <label class="field"><span>Teléfono</span><input [name]="'t' + i" type="tel" [(ngModel)]="p.phone"></label>
                <label class="field"><span>Email</span><input [name]="'e' + i" type="email" [(ngModel)]="p.email"></label>
              </fieldset>
            }
          </div>
          <small class="muted">Si un jugador ya está en otra categoría del torneo, escribe el mismo nombre: así evitamos que le coincidan partidos.</small>
          <div class="field"><span>¿Cuándo NO pueden jugar?</span>
            <mp-unavailability-editor [days]="t().days" [duration]="cat()?.matchDurationMinutes ?? t().matchDurationMinutes" [(items)]="unav" />
          </div>
          <div class="grid-3">
            <label class="field"><span>Cabeza de serie</span><input name="seed" type="number" min="1" [(ngModel)]="f.seed" placeholder="—"></label>
            <label class="field"><span>Estado</span>
              <select name="st" [(ngModel)]="f.status" [disabled]="!!cat()?.drawGenerated">
                <option value="CONFIRMED">Confirmada</option><option value="PENDING">Pendiente</option><option value="WITHDRAWN">Retirada</option>
              </select>
            </label>
          </div>
          <label class="field"><span>Notas</span><input name="notes" [(ngModel)]="f.notes"></label>
          @if (cat()?.drawGenerated) { <div class="notice warn">El cuadro ya está generado: los cambios de horario se aplicarán al pulsar "Reprogramar horarios".</div> }
          <div class="modal-foot"><button type="button" class="btn ghost" (click)="form.set(null)">Cancelar</button><button class="btn" type="submit" [disabled]="busy()">Guardar pareja</button></div>
        </form>
      </div>
    }
  `,
  styles: [`
    fieldset { border: 1px solid var(--rule); border-radius: 12px; padding: 14px; margin: 0; }
    legend { font-weight: 700; padding: 0 6px; color: var(--court); }
    tr.pending td { background: #fffbef; }
    tr.withdrawn td { opacity: .5; }
    .chip { margin: 4px 4px 0 0; }
  `],
})
export class PairsTabComponent implements OnChanges {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  t = input.required<Tournament>();
  changed = output<void>();

  catId = signal<string | null>(null);
  cat = computed<Category | undefined>(() => this.t().categories.find(c => c.id === this.catId()) ?? this.t().categories[0]);
  pairs = signal<PairView[]>([]);
  players = signal<Player[]>([]);
  loading = signal(false);
  form = signal<Form | null>(null);
  unav = signal<Unavailability[]>([]);
  busy = signal(false);
  pendingCount = computed(() => this.pairs().filter(p => p.status === 'PENDING').length);

  ngOnChanges() {
    this.load();
    this.api.players(this.t().id).then(p => this.players.set(p)).catch(() => {});
  }

  select(id: string) { this.catId.set(id); this.load(); }

  async load() {
    const c = this.cat();
    if (!c) return;
    this.loading.set(true);
    try { this.pairs.set(await this.api.pairs(c.id)); } catch (e) { this.toast.error(e); }
    finally { this.loading.set(false); }
  }

  unavText(u: Unavailability) {
    const d = dayName(u.playDate);
    if (!u.fromTime && !u.toTime) return `${d}: todo el día`;
    if (!u.fromTime) return `${d}: hasta las ${hhmm(u.toTime)}`;
    if (!u.toTime) return `${d}: desde las ${hhmm(u.fromTime)}`;
    return `${d}: de ${hhmm(u.fromTime)} a ${hhmm(u.toTime)}`;
  }

  edit(p?: PairView) {
    this.unav.set(p ? p.unavailabilities.map(u => ({ ...u, fromTime: u.fromTime ? hhmm(u.fromTime) : null, toTime: u.toTime ? hhmm(u.toTime) : null })) : []);
    this.form.set(p ? {
      id: p.id, p1: { ...p.player1 }, p2: { ...p.player2 }, seed: p.seed, notes: p.notes, status: p.status,
    } : { p1: { fullName: '' }, p2: { fullName: '' }, status: 'CONFIRMED' });
  }

  /** Autocompleta teléfono/email si el jugador ya existe en el torneo. */
  fill(p: Form['p1']) {
    const found = this.players().find(x => x.fullName.toLowerCase() === p.fullName.trim().toLowerCase());
    if (found) { p.phone ||= found.phone; p.email ||= found.email; }
  }

  /** Nombres que el organizador ya ha dicho que son otra persona ("nombre escrito|id del parecido"). */
  private notSame = new Set<string>();

  /** Jugador del torneo con un nombre parecido (pero no igual) al escrito. */
  similar(p: Form['p1']) {
    const s = findSimilar(p.fullName, this.players());
    return s && !this.notSame.has(`${normalizeName(p.fullName)}|${s.id}`) ? s : undefined;
  }

  useExisting(p: Form['p1'], s: Player) {
    p.fullName = s.fullName;
    this.fill(p);
  }

  dismiss(p: Form['p1'], s: Player) { this.notSame.add(`${normalizeName(p.fullName)}|${s.id}`); }

  async save(f: Form) {
    if (!f.p1.fullName.trim() || !f.p2.fullName.trim()) { this.toast.error('Indica el nombre de los dos jugadores'); return; }
    const body = { player1: f.p1, player2: f.p2, seed: f.seed || null, notes: f.notes, unavailabilities: this.unav(), status: f.status };
    this.busy.set(true);
    try {
      if (f.id) await this.api.updatePair(f.id, body); else await this.api.addPair(this.cat()!.id, body);
      this.toast.ok('Pareja guardada');
      this.form.set(null);
      await this.load();
      this.changed.emit();
      this.api.players(this.t().id).then(p => this.players.set(p)).catch(() => {});
    } catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); }
  }

  async setStatus(p: PairView, s: PairStatus) {
    try { await this.api.setPairStatus(p.id, s); await this.load(); this.changed.emit(); } catch (e) { this.toast.error(e); }
  }

  async confirmAll() {
    try {
      for (const p of this.pairs().filter(x => x.status === 'PENDING')) await this.api.setPairStatus(p.id, 'CONFIRMED');
      this.toast.ok('Inscripciones confirmadas');
    } catch (e) { this.toast.error(e); }
    await this.load();
    this.changed.emit();
  }

  async remove(p: PairView) {
    if (!confirm(`¿Eliminar la pareja ${p.player1.fullName} / ${p.player2.fullName}?`)) return;
    try { await this.api.deletePair(p.id); await this.load(); this.changed.emit(); } catch (e) { this.toast.error(e); }
  }
}
