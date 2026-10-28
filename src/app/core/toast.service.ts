import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; text: string; kind: 'info' | 'ok' | 'error'; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  show(text: string, kind: Toast['kind'] = 'info', ms = 4200) {
    const t = { id: ++this.seq, text, kind };
    this.toasts.update(l => [...l, t]);
    setTimeout(() => this.toasts.update(l => l.filter(x => x.id !== t.id)), ms);
  }
  ok(text: string) { this.show(text, 'ok'); }
  error(e: unknown) { this.show(e instanceof Error ? e.message : String(e), 'error', 6500); }
}
