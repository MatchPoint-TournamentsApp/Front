import { Component, computed, input } from '@angular/core';
import { BoardPair, MatchView, SlotView } from '../core/models';
import { hhmm, dayName } from '../core/format';

/** Tarjeta de partido del cuadro: parejas, huecos de resultado a la derecha, día/hora/pista. */
@Component({
  selector: 'mp-match-card',
  template: `
    @let mm = m();
    @if (mm.status === 'BYE' && mm.round === 1 && (mm.stage === 'MAIN' || mm.stage === 'CONSOLATION')) {
      <div class="bye">Exento</div>
    } @else {
      <div class="card" [class.done]="decided()" [class.warn]="!!mm.warning && admin()" [class.clickable]="admin()">
        <div class="meta">
          <b class="num">P{{ mm.number }}</b>
          @if (mm.status === 'BYE') { <span>Pasa directo</span> }
          @else if (mm.playDate) {
            <span>{{ day() }} {{ time() }}</span>
            @if (mm.courtName) { <span class="court" [class.center]="mm.courtFeatured">{{ mm.courtName }}</span> }
          } @else { <span class="none">Sin horario</span> }
          @if (mm.locked && admin()) { <span class="lock" title="Horario fijado a mano">●</span> }
          @if (mm.warning && admin()) { <span class="alert" [title]="mm.warning">!</span> }
        </div>
        <div class="line" [class.win]="isWinner(mm.slot1)">
          <span class="name" [class.ph]="!mm.slot1.pairId">{{ label(mm.slot1) }}</span>
          <span class="sets">@for (s of sets(); track $index) { <i [class.w]="s[0] > s[1]">{{ s[0] }}</i> } @empty { @if (mm.status === 'WALKOVER' && isWinner(mm.slot1)) { <i class="wo">W.O.</i> } @else { <i></i><i></i> } }</span>
        </div>
        <div class="line" [class.win]="isWinner(mm.slot2)">
          <span class="name" [class.ph]="!mm.slot2.pairId">{{ label(mm.slot2) }}</span>
          <span class="sets">@for (s of sets(); track $index) { <i [class.w]="s[1] > s[0]">{{ s[1] }}</i> } @empty { @if (mm.status === 'WALKOVER' && isWinner(mm.slot2)) { <i class="wo">W.O.</i> } @else { <i></i><i></i> } }</span>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; position: absolute; width: var(--card-w, 214px); }
    .card {
      background: #fff; border: 1.5px solid var(--court); border-radius: 8px; overflow: hidden;
      font-size: 12.5px; line-height: 1.2; box-shadow: 0 1px 0 rgba(18,53,91,.06);
    }
    .card.clickable { cursor: pointer; }
    .card.clickable:hover { border-color: var(--court-2); box-shadow: 0 0 0 3px rgba(31,95,168,.15); }
    .card.done { border-color: #9fb3c8; }
    .card.warn { border-color: var(--warn); }
    .meta {
      display: flex; gap: 6px; align-items: center; padding: 3px 7px; height: 20px;
      background: var(--court); color: #fff; font-size: 11px; white-space: nowrap; overflow: hidden;
    }
    .card.done .meta { background: #5c7591; }
    .meta .num { font: 700 12px var(--display); letter-spacing: .02em; }
    .meta .none { opacity: .7; }
    .court { margin-left: auto; opacity: .9; overflow: hidden; text-overflow: ellipsis; }
    .court.center { background: var(--ball); color: var(--ink); opacity: 1; padding: 0 5px; border-radius: 3px; font-weight: 700; }
    .lock { color: var(--ball); font-size: 9px; }
    .alert { background: var(--ball); color: var(--ink); width: 14px; height: 14px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; flex: none; }
    .line { display: flex; align-items: stretch; height: 22px; border-top: 1px solid var(--rule-2); }
    .line .name { flex: 1; padding: 0 7px; display: flex; align-items: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-weight: 600; color: var(--ink); text-transform: uppercase; font-size: 11.5px; letter-spacing: .01em; }
    .line .name.ph { color: var(--ink-3); font-weight: 500; text-transform: none; font-style: italic; }
    .line.win .name { color: var(--court); font-weight: 800; }
    .line.win .name::after { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--ball); border: 1px solid var(--court); margin-left: 6px; flex: none; }
    .sets { display: flex; }
    .sets i { width: 20px; display: grid; place-items: center; font: normal 600 13px var(--display); border-left: 1px solid var(--rule-2); color: var(--ink-2); font-style: normal; }
    .sets i.w { color: var(--court); font-weight: 800; background: var(--court-3); }
    .sets i.wo { width: 40px; font-size: 11px; color: var(--court); }
    .bye { height: 30px; margin-top: 18px; border: 1.5px dashed var(--rule); border-radius: 8px; display: grid; place-items: center; color: var(--ink-3); font-size: 12px; }
  `],
})
export class MatchCardComponent {
  m = input.required<MatchView>();
  pairs = input.required<Map<string, BoardPair>>();
  admin = input(false);

  decided = computed(() => this.m().status === 'PLAYED' || this.m().status === 'WALKOVER');
  sets = computed(() => this.m().score ?? []);
  day = computed(() => this.m().playDate ? dayName(this.m().playDate!).slice(0, 3) : '');
  time = computed(() => hhmm(this.m().startTime));

  label(s: SlotView) {
    if (s.pairId) {
      const p = this.pairs().get(s.pairId);
      return p ? `${p.player1} - ${p.player2}` : '—';
    }
    if (s.empty) return '—';
    return s.placeholder ?? '';
  }

  isWinner(s: SlotView) { return !!s.pairId && s.pairId === this.m().winnerPairId; }
}
