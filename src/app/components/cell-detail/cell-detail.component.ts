import { Component, EventEmitter, Output, inject, input, signal } from '@angular/core';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-cell-detail',
  standalone: true,
  template: `
    <div class="cell-detail-overlay" (click)="close.emit()">
      <div class="cell-detail-modal animate-scale-in" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title-group">
            <h3 class="modal-title{{ columnName() ? '' : ' unnamed' }}">
              <span class="header-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="title-icon">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M7 3v18"/>
                  <path d="M3 9h18"/>
                  <path d="M3 15h18"/>
                </svg>
              </span>
              {{ columnName() || ('Column ' + (colIndex() + 1)) }}
            </h3>
            <span class="modal-subtitle">
              <span class="header-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="subtitle-icon">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                </svg>
              </span>
              {{ ts.t().cellDetailEditor }} &bull; {{ ts.t().row }} {{ rowIndex() + 1 }}
            </span>
          </div>
          <button type="button" class="btn-close-modal" (click)="close.emit()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div class="modal-body">
          <textarea
            #detailTextarea
            class="cell-detail-textarea"
            [value]="value()"
            placeholder="..."
            (input)="updateTextareaStats(detailTextarea.value)"
            (keydown)="onTextareaKeyDown($event, detailTextarea.value)"
          ></textarea>
          <div class="modal-body-meta">
            <span class="textarea-stats">
              {{ charCount() }} characters &bull; {{ wordCount() }} words
            </span>
            <span class="keyboard-hint" [innerHTML]="ts.t().pressCtrlEnter"></span>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" (click)="close.emit()">
            {{ ts.t().cancelBtn }}
          </button>
          <button type="button" class="btn btn-primary" (click)="save.emit(detailTextarea.value)">
            {{ ts.t().saveChanges }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cell-detail-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .cell-detail-modal {
      width: 650px;
      max-width: 92%;
      background: var(--panel-glass);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border: 1px solid var(--border-strong);
      border-radius: 16px;
      box-shadow: var(--shadow-premium), 0 20px 40px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 24px;
      border-bottom: 1px solid var(--border-dim);
    }

    .modal-title-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      text-align: left;
    }

    .modal-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -0.01em;
      margin: 0;
    }

    .modal-subtitle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .header-icon-wrapper {
      width: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      flex-shrink: 0;
    }

    .title-icon {
      color: var(--accent);
      opacity: 0.9;
      flex-shrink: 0;
    }

    .subtitle-icon {
      color: var(--text-muted);
      opacity: 0.8;
      flex-shrink: 0;
    }

    .btn-close-modal {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      transition: all 0.2s ease;
      
      &:hover {
        background: var(--danger-bg-opacity);
        color: var(--danger);
      }
    }

    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .cell-detail-textarea {
      width: 100%;
      height: 260px;
      min-height: 150px;
      max-height: 400px;
      background: var(--input-bg);
      border: 1px solid var(--border-glass);
      border-radius: 10px;
      color: var(--text);
      font-size: 13px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      line-height: 1.6;
      padding: 16px;
      outline: none;
      resize: vertical;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      
      &:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-focus-shadow);
      }
      
      &::-webkit-scrollbar {
        width: 8px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb);
        border-radius: 4px;
      }
    }

    .modal-body-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      padding: 0 4px;
    }

    .textarea-stats {
      font-family: var(--font-body);
      font-weight: 500;
    }

    .keyboard-hint {
      font-size: 11px;
      opacity: 0.8;
      
      strong {
        color: var(--text);
        background: var(--panel-hover);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid var(--border-glass);
        font-family: monospace;
      }
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 18px 24px;
      border-top: 1px solid var(--border-dim);
      background: var(--panel-hover);
    }

    @keyframes scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .animate-scale-in {
      animation: scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class CellDetailComponent {
  readonly ts = inject(TranslationService);

  readonly rowIndex = input.required<number>();
  readonly colIndex = input.required<number>();
  readonly columnName = input.required<string>();
  readonly value = input.required<string>();

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<string>();

  readonly charCount = signal(0);
  readonly wordCount = signal(0);

  constructor() {
    // Initialize stats when component loads
    setTimeout(() => {
      const val = this.value();
      this.charCount.set(val.length);
      this.wordCount.set(val.trim() ? val.trim().split(/\s+/).length : 0);
      
      const textarea = document.querySelector('.cell-detail-textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 0);
  }

  updateTextareaStats(val: string): void {
    this.charCount.set(val.length);
    this.wordCount.set(val.trim() ? val.trim().split(/\s+/).length : 0);
  }

  onTextareaKeyDown(event: KeyboardEvent, val: string): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close.emit();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopPropagation();
      this.save.emit(val);
    }
  }
}
