import { Injectable, signal } from '@angular/core';
import { Toast } from '../models';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 0;

  show(message: string, type: Toast['type'] = 'success', duration = 4000): void {
    const id = ++this.nextId;
    this.toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number): void {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
