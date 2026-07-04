import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject
} from '@angular/core';

@Component({
  selector: 'app-select',
  standalone: true,
  template: `
    <div
      class="custom-select-container"
      [class.open]="isOpen"
      [class.has-value]="value"
    >
      <!-- Label -->
      <span class="custom-select-label">{{ label }}</span>

      <!-- Trigger -->
      <button
        type="button"
        class="custom-select-trigger"
        (click)="toggle()"
      >
        <span class="selected-text">{{ getSelectedLabel() }}</span>
        <!-- Arrow Icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="arrow-icon"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      <!-- Dropdown Options -->
      @if (isOpen) {
        <div class="custom-options-list">
          @for (opt of options; track opt.value) {
            <div
              class="custom-option-item"
              [class.selected]="opt.value === value"
              (click)="selectOption(opt.value)"
            >
              {{ opt.label }}
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .custom-select-container {
      position: relative;
      width: 180px;
      font-family: var(--font-body);
    }

    .custom-select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 42px;
      padding: 0 14px;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-size: 13px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        border-color: var(--border-strong);
      }

      &:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent-light);
      }
    }

    .selected-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 8px;
    }

    .arrow-icon {
      flex-shrink: 0;
      color: var(--text-muted);
      transition: transform 0.2s ease;
    }

    .custom-select-container.open {
      .custom-select-trigger {
        border-color: var(--accent);
      }
      .arrow-icon {
        transform: rotate(180deg);
      }
    }

    .custom-select-label {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%) scale(1);
      transform-origin: left center;
      font-size: 13px;
      color: var(--text-muted);
      pointer-events: none;
      transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), color 0.2s ease;
      background: var(--panel-bg);
      padding: 0 4px;
      z-index: 1;
    }

    /* Floating label animation matching material layout */
    .custom-select-container.has-value .custom-select-label,
    .custom-select-container.open .custom-select-label {
      transform: translateY(calc(-50% - 21px)) scale(0.8);
      color: var(--accent);
      font-weight: 600;
    }

    /* Options Dropdown Panel */
    .custom-options-list {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 100%;
      max-height: 200px;
      overflow-y: auto;
      background: var(--panel-bg);
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      box-shadow: var(--shadow-md);
      z-index: 1000;
      padding: 4px;
      animation: slideDown 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .custom-option-item {
      padding: 8px 12px;
      font-size: 13px;
      color: var(--text);
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      &.selected {
        background: var(--accent-light);
        color: var(--accent);
        font-weight: 600;
      }
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class SelectComponent {
  @Input() label = '';
  @Input() options: { value: string; label: string }[] = [];
  @Input() value = '';
  @Output() readonly valueChange = new EventEmitter<string>();

  isOpen = false;
  private readonly el = inject(ElementRef);

  toggle() {
    this.isOpen = !this.isOpen;
  }

  selectOption(val: string) {
    this.value = val;
    this.valueChange.emit(val);
    this.isOpen = false;
  }

  getSelectedLabel(): string {
    const matched = this.options.find(opt => opt.value === this.value);
    return matched ? matched.label : '';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
