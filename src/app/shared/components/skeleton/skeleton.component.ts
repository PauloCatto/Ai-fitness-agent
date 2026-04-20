import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="skeleton-box shimmer" 
      [style.width]="width" 
      [style.height]="height" 
      [style.border-radius]="radius">
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      width: 100%;
    }
    .skeleton-box {
      width: 100%;
      background: rgba(255, 255, 255, 0.04);
    }
  `]
})
export class SkeletonComponent {
  @Input() width = '100%';
  @Input() height = '1rem';
  @Input() radius = 'var(--radius-sm)';
}

