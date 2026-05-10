import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timer',
  standalone: true
})
export class TimerPipe implements PipeTransform {
  transform(totalSeconds: number | null | undefined): string {
    if (totalSeconds === null || totalSeconds === undefined) return '00:00';
    
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');

    if (h > 0) {
      const hh = h.toString().padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    }

    return `${mm}:${ss}`;
  }
}
