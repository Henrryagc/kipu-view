import { Component, EventEmitter, Output, inject, input, signal, ViewChild, ElementRef, computed } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { SelectComponent } from '../select/select.component';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [TooltipDirective, SelectComponent],
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
          <app-select
            [label]="ts.t().separator"
            [options]="delimiterOptions()"
            [value]="delimiterKind()"
            (valueChange)="onKindSelect($event)"
          />

          @if (delimiterKind() === 'custom') {
            <div class="field-custom">
              <div class="custom-input-container" [class.has-value]="customChar()" [class.has-error]="customCharError()">
                <span class="custom-input-label">{{ ts.t().character }}</span>
                <input #customInput class="input input-char" type="text" placeholder="|" [value]="customChar()" (input)="onCharInput($event)" />

                @if (customCharError()) {
                  <span class="field-error">
                    {{ customCharError() }}
                  </span>
                }
              </div>
            </div>
          }
        </div>
    </div>

      <!-- Right: Settings & Readouts -->
      <div class="toolbar-right">

        <div class="toolbar-actions">
          <!-- Translation Toggle -->
          <button type="button" class="btn btn-icon-only" (click)="ts.toggleLanguage()" [appTooltip]="ts.t().langToggle" tooltipPosition="bottom">
            <span class="lang-text">{{ ts.currentLanguage() === 'en' ? 'ES' : 'EN' }}</span>
          </button>

          <!-- Theme Toggle -->
          <button type="button" class="btn btn-icon-only" (click)="toggleTheme()" [appTooltip]="ts.t().themeToggle" tooltipPosition="bottom">
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
      position: relative;
      z-index: 30;
    }

    .toolbar {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px 10px 24px;
      background: var(--panel-glass);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-glass);
      box-shadow: var(--shadow-sm);
      z-index: 50;
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
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideIn 0.2s ease-out;
    }

    .custom-input-container {
      position: relative;
      font-family: var(--font-body);
      
      .input-char {
        width: 80px;
        height: 42px;
        padding: 0 14px;
        background: var(--input-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        font-size: 13px;
        outline: none;
        text-align: center;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        
        &:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-light);
        }
      }

      .custom-input-label {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) scale(1);
        transform-origin: center center;
        font-size: 13px;
        color: var(--text-muted);
        pointer-events: none;
        transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), color 0.2s ease;
        background: var(--panel-bg);
        padding: 0 4px;
        z-index: 1;
        white-space: nowrap;
      }

      /* Float standard input label */
      &:focus-within .custom-input-label,
      &.has-value .custom-input-label {
        transform: translate(-50%, calc(-50% - 21px)) scale(0.8);
        color: var(--accent);
        font-weight: 600;
      }

      &.has-error {
        .input-char {
          border-color: var(--danger);
          box-shadow: 0 0 0 2px var(--danger-border-opacity);
        }
        .custom-input-label {
          color: var(--danger) !important;
        }
      }
    }

    .field-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .field-error {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      white-space: nowrap;
      font-size: 11px;
      color: var(--danger);
      background: var(--danger-bg-solid);
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 0 1px 4px rgba(207, 102, 121, 0.15);
    }

    .input.input-error {
      border-color: var(--danger);
      box-shadow: 0 0 0 2px var(--danger-border-opacity);
      &:focus-visible {
        border-color: var(--danger);
        box-shadow: 0 0 0 3px var(--danger-border-opacity);
      }
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

  readonly delimiterOptions = computed(() => [
    { value: 'comma', label: this.ts.t().comma },
    { value: 'semicolon', label: this.ts.t().semicolon },
    { value: 'tab', label: this.ts.t().tab },
    { value: 'custom', label: this.ts.t().custom }
  ]);

  @ViewChild('customInput') set customInput(element: ElementRef<HTMLInputElement> | undefined) {
    if (element) {
      // Focus and highlight text automatically when the custom input mounts
      setTimeout(() => {
        element.nativeElement.focus();
        element.nativeElement.select();
      });
    }
  }

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

  onKindSelect(val: any): void {
    this.delimiterKindChange.emit(val);
  }

  onCharInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.customCharChange.emit(val);
  }
}
