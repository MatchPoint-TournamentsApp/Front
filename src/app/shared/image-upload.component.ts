import { Component, inject, input, model, signal } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { ToastService } from '../core/toast.service';

/** Subida de logo (club o patrocinador) a Supabase Storage. */
@Component({
  selector: 'mp-image-upload',
  template: `
    <div class="up">
      <div class="preview" [class.has]="!!url()">
        @if (url()) { <img [src]="url()" alt="Logo"> } @else { <span>Sin logo</span> }
      </div>
      <div class="stack" style="gap:6px">
        <label class="btn ghost sm">
          {{ busy() ? 'Subiendo…' : url() ? 'Cambiar imagen' : 'Subir imagen' }}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" (change)="pick($event)" hidden>
        </label>
        @if (url()) { <button type="button" class="btn ghost sm" (click)="url.set('')">Quitar</button> }
        <small class="tiny muted">PNG, JPG, WEBP o SVG. Máx. 2 MB</small>
      </div>
    </div>
  `,
  styles: [`
    .up { display: flex; gap: 14px; align-items: center; }
    .preview { width: 88px; height: 88px; border-radius: 12px; border: 1.5px dashed var(--rule); display: grid; place-items: center; background: #fff; overflow: hidden; flex: none; }
    .preview.has { border-style: solid; }
    .preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .preview span { font-size: .8rem; color: var(--ink-3); }
  `],
})
export class ImageUploadComponent {
  private supa = inject(SupabaseService);
  private toast = inject(ToastService);
  url = model<string>('');
  folder = input('logos');
  busy = signal(false);

  async pick(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.busy.set(true);
    try { this.url.set(await this.supa.uploadImage(file, this.folder())); }
    catch (e) { this.toast.error(e); }
    finally { this.busy.set(false); (ev.target as HTMLInputElement).value = ''; }
  }
}
