import { Component, EventEmitter, Output, inject, input } from '@angular/core';
import { TranslationService } from '../../services/translation.service';

export interface FileTab {
  id: string;
  name: string;
  path: string;
  content: string;
  delimiterKind: 'comma' | 'semicolon' | 'tab' | 'custom';
  customChar: string;
}

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  template: `
    <div class="tab-bar-container">
      <div class="tab-list">
        @for (tab of tabs(); track tab.id) {
          <div
            class="tab-item"
            [class.active]="tab.id === activeId()"
            (click)="selectTab.emit(tab.id)"
          >
            <!-- Tab Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tab-icon">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
            </svg>

            <!-- Tab Name -->
            <span class="tab-name" [title]="tab.path">{{ tab.name }}</span>

            <!-- Close Tab Button -->
            <button
              type="button"
              class="btn-close"
              (click)="onCloseClick($event, tab.id)"
              [title]="ts.t().close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        }

        <!-- Add Tab Button -->
        <button
          type="button"
          class="btn-add"
          (click)="addTab.emit()"
          [title]="ts.t().newTab"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5v14"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .tab-bar-container {
      display: flex;
      align-items: center;
      background: var(--panel-glass);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-glass);
      padding: 4px 16px 0 16px;
      overflow-x: auto;
      overflow-y: hidden;
      flex-shrink: 0;

      &::-webkit-scrollbar {
        height: 3px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb);
        border-radius: 10px;
      }
    }

    .tab-list {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      width: 100%;
    }

    .tab-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px 8px 14px;
      background: transparent;
      border: 1px solid transparent;
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      max-width: 180px;
      position: relative;
      transition: all 0.2s ease;
      user-select: none;

      &:hover {
        background: var(--panel-hover);
        color: var(--text);

        .btn-close {
          opacity: 1;
        }
      }

      &.active {
        background: var(--bg);
        color: var(--text);
        border-color: var(--border-glass);
        border-bottom: 1px solid var(--bg);
        margin-bottom: -1px;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);

        .tab-icon {
          color: var(--accent);
        }

        .btn-close {
          opacity: 0.7;
          &:hover {
            opacity: 1;
          }
        }
      }
    }

    .tab-icon {
      flex-shrink: 0;
      color: var(--text-muted);
      transition: color 0.2s ease;
    }

    .tab-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      border-radius: 50%;
      opacity: 0;
      transition: all 0.15s ease;
      flex-shrink: 0;

      &:hover {
        background: var(--danger-bg-opacity);
        color: var(--danger);
      }
    }

    .btn-add {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      margin-bottom: 4px;
      transition: all 0.15s ease;

      &:hover {
        background: var(--panel-hover);
        color: var(--text);
        transform: scale(1.05);
      }
    }
  `]
})
export class TabBarComponent {
  readonly ts = inject(TranslationService);

  readonly tabs = input.required<FileTab[]>();
  readonly activeId = input.required<string | null>();

  @Output() readonly selectTab = new EventEmitter<string>();
  @Output() readonly closeTab = new EventEmitter<string>();
  @Output() readonly addTab = new EventEmitter<void>();

  onCloseClick(event: MouseEvent, tabId: string): void {
    event.stopPropagation(); // Avoid selecting the tab when closing it
    this.closeTab.emit(tabId);
  }
}
