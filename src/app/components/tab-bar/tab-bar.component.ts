import { Component, EventEmitter, Output, inject, input } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { TooltipDirective } from '../../directives/tooltip.directive';

export interface FileTab {
  id: string;
  name: string;
  path: string;
  content: string;
  delimiterKind: 'comma' | 'semicolon' | 'tab' | 'custom';
  customChar: string;
  isModified?: boolean;
}

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  imports: [TooltipDirective],
  template: `
    <div class="tab-bar-container">
      <div class="tab-list">
        @for (tab of tabs(); track tab.id) {
          <div
            class="tab-item"
            [class.active]="tab.id === activeId()"
            [class.modified]="tab.isModified"
            [appTooltip]="formatPathHierarchy(tab.path)"
            [tooltipHtml]="true"
            tooltipPosition="bottom"
            (click)="selectTab.emit(tab.id)"
          >
            <!-- Tab Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tab-icon">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
            </svg>

            <!-- Tab Name -->
            <span class="tab-name">{{ tab.name }}</span>

            <!-- Tab Action Container (Modified dot / Close Button) -->
            <div class="tab-action-container">
              <span class="tab-modified-indicator" [appTooltip]="ts.t().unsavedChanges" tooltipPosition="bottom"></span>
              
              <button
                type="button"
                class="btn-close"
                (click)="onCloseClick($event, tab.id)"
                [appTooltip]="ts.t().close"
                tooltipPosition="bottom"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        }

        <!-- Add Tab Button -->
        <button
          type="button"
          class="btn-add"
          (click)="addTab.emit()"
          [appTooltip]="ts.t().newTab"
          tooltipPosition="bottom"
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

        .tab-modified-indicator {
          opacity: 0;
        }

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

    .tab-action-container {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;
    }

    .tab-modified-indicator {
      width: 7px;
      height: 7px;
      background: var(--accent);
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      transition: opacity 0.15s ease;
      pointer-events: none;
      box-shadow: 0 0 4px var(--accent);
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
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      transition: opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease;
      z-index: 2;

      &:hover {
        background: var(--danger-bg-opacity);
        color: var(--danger);
      }
    }

    // Modified tabs: show dot and hide close button when not hovered
    .tab-item.modified:not(:hover) {
      .btn-close {
        opacity: 0;
      }
      .tab-modified-indicator {
        opacity: 1;
      }
    }

    // Non-modified tabs: hide dot
    .tab-item:not(.modified) {
      .tab-modified-indicator {
        opacity: 0;
      }
    }

    // Inactive non-modified tabs: hide close button by default
    .tab-item:not(.active):not(.modified):not(:hover) {
      .btn-close {
        opacity: 0;
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

  constructor() {
    (window as any).copyTabPath = (event: MouseEvent, path: string) => {
      event.stopPropagation();
      navigator.clipboard.writeText(path).then(() => {
        const btn = event.currentTarget as HTMLElement;
        if (!btn) return;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent); margin-right: 2px;">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          ${this.ts.t().copied}
        `;
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('copied');
        }, 1500);
      });
    };
  }

  onCloseClick(event: MouseEvent, tabId: string): void {
    event.stopPropagation(); // Avoid selecting the tab when closing it
    this.closeTab.emit(tabId);
  }

  formatPathHierarchy(path: string | null | undefined): string {
    if (!path) return '';
    
    // Check for new unsaved tab
    if (path.startsWith('New Tab') || path.startsWith('Nueva pestaña')) {
      return `<strong>${path}</strong>`;
    }

    // Normalize slashes
    const normalized = path.replace(/\\/g, '/');
    const segments = normalized.split('/').filter(s => s.length > 0);
    if (segments.length === 0) return path;

    // Check if it's an absolute path
    const isAbsolute = path.startsWith('/') || /^[a-zA-Z]:/.test(path);
    
    let html = `
      <div class="tooltip-path-container">
        <button type="button" class="tooltip-copy-btn" onclick="window.copyTabPath(event, '${path.replace(/\\/g, '\\\\')}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
          ${this.ts.t().copy}
        </button>
        <div class="path-hierarchy">
    `;
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;
      const isFirst = i === 0;
      
      // Determine prefix for root
      let displayName = segment;
      if (isFirst && isAbsolute && path.startsWith('/')) {
        displayName = '/' + segment;
      }
      
      const indent = isFirst ? 0 : i * 14;
      
      html += `
        <div class="path-hierarchy-row" style="padding-left: ${indent}px;">
          ${!isFirst ? '<span class="path-tree-connector">└──</span>' : ''}
          ${isLast ? `
            <svg class="tooltip-svg-icon file" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
          ` : `
            <svg class="tooltip-svg-icon folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
          `}
          <span class="path-segment-text ${isLast ? 'file-name' : ''}">${displayName}</span>
        </div>
      `;
    }
    
    html += '</div></div>';
    return html;
  }
}
