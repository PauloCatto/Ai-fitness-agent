import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="spinner-wrapper" [class.fullscreen]="fullscreen">
      <div class="spinner-ring">
        <div></div><div></div><div></div><div></div>
      </div>
      @if (message) {
        <p class="spinner-message">{{ message }}</p>
      }
    </div>
  `,
  styles: [`
    .spinner-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 2rem;
    }

    .spinner-wrapper.fullscreen {
      position: fixed;
      inset: 0;
      background: rgba(13, 13, 20, 0.8);
      backdrop-filter: blur(8px);
      z-index: 999;
    }

    .spinner-ring {
      display: inline-block;
      position: relative;
      width: 48px;
      height: 48px;
    }

    .spinner-ring div {
      box-sizing: border-box;
      display: block;
      position: absolute;
      width: 40px;
      height: 40px;
      margin: 4px;
      border: 3px solid transparent;
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    }

    .spinner-ring div:nth-child(1) { animation-delay: -0.3s; }
    .spinner-ring div:nth-child(2) { animation-delay: -0.2s; border-top-color: var(--ai); }
    .spinner-ring div:nth-child(3) { animation-delay: -0.1s; border-top-color: rgba(163,230,53,0.4); }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .spinner-message {
      font-size: 0.875rem;
      color: var(--text-2);
      margin: 0;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
  `],
})
export class LoadingSpinnerComponent {
  @Input() message?: string;
  @Input() fullscreen = false;
}
