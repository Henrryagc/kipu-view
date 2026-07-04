import { Component, EventEmitter, Output, inject, input, signal } from '@angular/core';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [],
  template: `
    <header class="toolbar">
      <!-- Left: File controls & Delimiter configuration -->
      <div class="toolbar-left">
        <div class="toolbar-group">
          <button type="button" class="btn btn-primary" (click)="pickFile.emit()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-icon">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
            </svg>
            {{ ts.t().openFile }}
          </button>

          @if (filePath()) {
            <button type="button" class="btn btn-ghost" (click)="clearFile.emit()">
              {{ ts.t().close }}
            </button>
          }
        </div>

        <div class="divider"></div>

        <div class="toolbar-group">
          <label class="field">
            <span class="field-label">{{ ts.t().separator }}</span>
            <div class="select-wrapper">
              <select class="select" [value]="delimiterKind()" (change)="onKindSelect($event)">
                <option value="comma">{{ ts.t().comma }}</option>
                <option value="semicolon">{{ ts.t().semicolon }}</option>
                <option value="tab">{{ ts.t().tab }}</option>
                <option value="custom">{{ ts.t().custom }}</option>
              </select>
            </div>
          </label>

          @if (delimiterKind() === 'custom') {
            <div class="field-custom">
              <label class="field">
                <span class="field-label">{{ ts.t().character }}</span>
                <input class="input input-char" type="text" placeholder="|" [value]="customChar()" (input)="onCharInput($event)" />
              </label>

              @if (customCharError()) {
                <span class="field-error">
                  {{ customCharError() }}
                </span>
              }
            </div>
          }
        </div>
      </div>

      <!-- Right: Settings & Readouts -->
      <div class="toolbar-right">
        @if (filePath(); as path) {
          <div class="readout">
            <span class="readout-path" [title]="path">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              </svg>
              {{ getFileName(path) }}
            </span>
            <span class="readout-count">
              <strong>{{ totalRowCount() }}</strong> {{ ts.t().rows }}
            </span>
          </div>
          <div class="divider"></div>
        }

        <div class="toolbar-actions">
          <!-- Translation Toggle -->
          <button type="button" class="btn btn-icon-only" (click)="ts.toggleLanguage()" [title]="ts.t().langToggle">
            <span class="lang-text">{{ ts.currentLanguage() === 'en' ? 'ES' : 'EN' }}</span>
          </button>

          <!-- Theme Toggle -->
          <button type="button" class="btn btn-icon-only" (click)="toggleTheme()" [title]="ts.t().themeToggle">
            @if (isDark()) {
              <!-- Sun Icon -->
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            } @else {
              <!-- Moon Icon -->
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            }
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      background: var(--panel-glass);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-glass);
      box-shadow: var(--shadow-sm);
      z-index: 20;
      flex-shrink: 0;
      gap: 16px;
    }

    .toolbar-left,
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .toolbar-left {
      flex: 1;
      min-width: 0;
    }

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .divider {
      width: 1px;
      height: 24px;
      background: var(--border-glass);
      flex-shrink: 0;
    }

    .field {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .field-custom {
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideIn 0.2s ease-out;
    }

    .field-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .field-error {
      font-size: 11px;
      color: var(--danger);
      background: var(--danger-bg-opacity);
      border: 1px solid var(--danger-border-opacity);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }

    .btn-primary {
      background: var(--accent-gradient);
      color: var(--btn-primary-text);
      box-shadow: var(--accent-shadow);
      border: 1px solid var(--accent-border);

      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--accent-shadow-hover);
        filter: brightness(1.1);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .btn-ghost {
      background: transparent;
      border-color: var(--border-glass);
      color: var(--text);

      &:hover {
        background: var(--panel-hover);
        border-color: var(--border-strong);
        color: var(--text);
      }
    }

    .btn-icon-only {
      background: transparent;
      border: 1px solid var(--border-glass);
      color: var(--text-muted);
      width: 36px;
      height: 36px;
      padding: 0;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: var(--panel-hover);
        color: var(--text);
        border-color: var(--border-strong);
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .lang-text {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 11px;
    }

    .btn-icon {
      flex-shrink: 0;
    }

    .select-wrapper {
      position: relative;
    }

    .select,
    .input {
      font-family: var(--font-body);
      font-size: 13px;
      color: var(--text);
      background: var(--input-bg);
      border: 1px solid var(--border-glass);
      border-radius: 8px;
      padding: 6px 12px;
      appearance: none;
      transition: all 0.15s ease;

      &:focus-visible {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-focus-shadow);
      }
    }

    .select {
      padding-right: 32px;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238891a0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 16px;
    }

    .input-char {
      width: 4ch;
      text-align: center;
      font-family: var(--font-display);
      padding: 6px 4px;
    }

    .readout {
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: var(--font-body);
      font-size: 13px;
    }

    .readout-path {
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .inline-icon {
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .readout-count {
      color: var(--text-muted);
      strong {
        color: var(--accent);
        font-weight: 600;
      }
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `]
})
export class ToolbarComponent {
  readonly ts = inject(TranslationService);

  readonly filePath = input.required<string | null>();
  readonly totalRowCount = input.required<number>();
  readonly delimiterKind = input.required<'comma' | 'semicolon' | 'tab' | 'custom'>();
  readonly customChar = input.required<string>();
  readonly customCharError = input.required<string | null>();

  @Output() readonly pickFile = new EventEmitter<void>();
  @Output() readonly clearFile = new EventEmitter<void>();
  @Output() readonly delimiterKindChange = new EventEmitter<'comma' | 'semicolon' | 'tab' | 'custom'>();
  @Output() readonly customCharChange = new EventEmitter<string>();

  readonly isDark = signal(true);

  constructor() {
    // Read and initialize theme safely in client browser
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'dark';
      this.isDark.set(savedTheme === 'dark');
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }

  toggleTheme(): void {
    this.isDark.update(dark => !dark);
    const theme = this.isDark() ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  getFileName(path: string): string {
    return path.split('/').pop() || path;
  }

  onKindSelect(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as any;
    this.delimiterKindChange.emit(val);
  }

  onCharInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.customCharChange.emit(val);
  }
}
