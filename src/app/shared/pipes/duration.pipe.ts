import { Pipe, PipeTransform } from '@angular/core';


@Pipe({ name: 'duration', standalone: true })
export class DurationPipe implements PipeTransform {
  transform(minutes: number | undefined | null): string {
    if (minutes == null || minutes <= 0) return 'Rest';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}

