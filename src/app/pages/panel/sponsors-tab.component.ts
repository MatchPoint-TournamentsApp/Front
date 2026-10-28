import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Sponsor, SponsorTier, Tournament } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ImageUploadComponent } from '../../shared/image-upload.component';

interface Form { id?: string; name: string; website?: string; tier: SponsorTier; }

@Component({
  selector: 'mp-sponsors-tab',
  imports: [FormsModule, ImageUploadComponent],
  template: `
    <div class="row between" style="margin-bottom:14px">
      <p class="muted" style="margin:0">Aparecen en la página pública y al pie de los carteles PDF. Los principales se muestran más grandes.</p>
      <button class="btn" (click)="edit()">Añadir patrocinador</button>
    </div>
    @if (!t().sponsors.length) {
      <div class="panel empty"><h3>Sin patrocinadores</h3><p>Añade los logos de quienes hacen posible el torneo.</p></div>
    } @else {
      <div class="sp">
        @for (s of t().sponsors; track s.id) {
          <div class="panel card">
            <div class="logo">@if (s.logoUrl) { <img [src]="s.logoUrl" [alt]="s.name"> } @else { <b>{{ s.name }}</b> }</div>
            <div class="row between">
              <div><b>{{ s.name }}</b><br><span class="chip" [class.ball]="s.tier === 'PRINCIPAL'">{{ s.tier === 'PRINCIPAL' ? 'Principal' : 'Colaborador' }}</span></div>
              <div class="row" style="gap:6px"><button class="btn ghost sm" (click)="edit(s)">Editar</button><button class="btn danger sm" (click)="remove(s)">Quitar</button></div>
            </div>
          </div>
        }
      </div>
    }
    @if (form(); as f) {
      <div class="backdrop" (click)="form.set(null)">
        <form class="modal stack" (click)="$event.stopPropagation()" (ngSubmit)="save(f)">
          <div class="modal-head"><h3>{{ f.id ? 'Editar patrocinador' : 'Nuevo patrocinador' }}</h3><button type="button" class="icon-btn" (click)="form.set(null)" aria-label="Cerrar">✕</button></div>
          <label class="field"><span>Nombre</span><input name="n" [(ngModel)]="f.name" required></label>
          <div class="field"><span>Logo</span><mp-image-upload [(url)]="logo" folder="sponsors" /></div>
          <label class="field"><span>Web</span><input name="w" [(ngModel)]="f.website" placeholder="https://"></label>
          <div class="field"><span>Tipo</span>
            <div class="seg">
              <button type="button" [class.on]="f.tier === 'PRINCIPAL'" (click)="f.tier = 'PRINCIPAL'">Principal</button>
              <button type="button" [class.on]="f.tier === 'COLABORADOR'" (click)="f.tier = 'COLABORADOR'">Colaborador</button>
            </div>
          </div>
          <div class="modal-foot"><button type="button" class="btn ghost" (click)="form.set(null)">Cancelar</button><button class="btn" type="submit">Guardar</button></div>
        </form>
      </div>
    }
  `,
  styles: [`
    .sp { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .card { margin: 0 !important; display: flex; flex-direction: column; gap: 12px; }
    .logo { height: 90px; display: grid; place-items: center; background: var(--glass); border-radius: 10px; padding: 10px; }
    .logo img { max-height: 70px; max-width: 100%; object-fit: contain; }
  `],
})
export class SponsorsTabComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  t = input.required<Tournament>();
  changed = output<void>();
  form = signal<Form | null>(null);
  logo = signal('');

  edit(s?: Sponsor) {
    this.logo.set(s?.logoUrl ?? '');
    this.form.set(s ? { id: s.id, name: s.name, website: s.website, tier: s.tier } : { name: '', tier: 'COLABORADOR' });
  }

  async save(f: Form) {
    if (!f.name.trim()) { this.toast.error('Indica el nombre'); return; }
    const body = { name: f.name, website: f.website, tier: f.tier, logoUrl: this.logo() || undefined };
    try {
      if (f.id) await this.api.updateSponsor(f.id, body); else await this.api.addSponsor(this.t().id, body);
      this.form.set(null);
      this.changed.emit();
    } catch (e) { this.toast.error(e); }
  }

  async remove(s: Sponsor) {
    if (!confirm(`¿Quitar a ${s.name}?`)) return;
    try { await this.api.deleteSponsor(s.id); this.changed.emit(); } catch (e) { this.toast.error(e); }
  }
}
