import { Component, EventEmitter, Output, ViewChild, ElementRef, input, inject } from '@angular/core';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-custom-separator-input',
  standalone: true,
  template: `
    <div class="field-custom">
      <div class="custom-input-container" [class.has-value]="customChar()" [class.has-error]="customCharError()">
        <span class="custom-input-label">{{ ts.t().character }}</span>
        <input
          #customInput
          class="input input-char"
          type="text"
          placeholder="|"
          [value]="customChar()"
          (input)="onCharInput($event)"
        />

        @if (customCharError()) {
          <span class="field-error">
            {{ customCharError() }}
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
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

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `],
})
export class CustomSeparatorInputComponent {
  readonly ts = inject(TranslationService);

  readonly customChar = input.required<string>();
  readonly customCharError = input.required<string | null>();

  @Output() readonly customCharChange = new EventEmitter<string>();

  @ViewChild('customInput') set customInput(element: ElementRef<HTMLInputElement> | undefined) {
    if (element) {
      setTimeout(() => {
        element.nativeElement.focus();
        element.nativeElement.select();
      });
    }
  }

  onCharInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.customCharChange.emit(val);
  }
}
