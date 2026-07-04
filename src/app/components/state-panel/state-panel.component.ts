import { Component, inject, input } from '@angular/core';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-state-panel',
  standalone: true,
  template: `
    <div class="state-panel">
      @if (isLoading()) {
        <div class="loader-container">
          <div class="spinner"></div>
          <span class="state-label">{{ ts.t().reading }}</span>
        </div>
      } @else {
        <div class="empty-container">
          <div class="icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              <path d="M9 15h6"/>
              <path d="M9 11h6"/>
            </svg>
          </div>
          <span class="state-label">{{ ts.t().noFile }}</span>
          <span class="state-hint">{{ ts.t().hint }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      flex: 1;
      min-height: 0;
    }

    .state-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 400px;
      padding: 40px;
      text-align: center;
      background: var(--panel-glass);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border-glass);
      border-radius: 16px;
      margin: 20px;
      box-shadow: var(--shadow-premium);
    }

    .loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 3px solid var(--accent-dim);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .empty-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      max-width: 400px;
      animation: fadeIn 0.5s ease-out;
    }

    .icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--accent-gradient-opacity);
      margin-bottom: 8px;
      border: 1px solid var(--accent-border-opacity);
    }

    .empty-icon {
      width: 40px;
      height: 40px;
      color: var(--accent);
    }

    .state-label {
      font-size: 18px;
      font-weight: 600;
      color: var(--text);
      letter-spacing: -0.01em;
    }

    .state-hint {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class StatePanelComponent {
  readonly ts = inject(TranslationService);
  readonly isLoading = input.required<boolean>();
}
