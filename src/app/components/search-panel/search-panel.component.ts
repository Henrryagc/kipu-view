import {
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  ViewChild,
  ElementRef,
  afterNextRender,
  HostListener,
  OnDestroy,
  signal
} from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [TooltipDirective],
  template: `
    <div 
      class="search-panel" 
      [style.transform]="'translate(' + posX() + 'px, ' + posY() + 'px)'"
      (keydown.escape)="close.emit()"
    >
      <!-- Search Row -->
      <div class="search-row">
        <!-- Drag Handle -->
        <div 
          class="drag-handle" 
          (mousedown)="onDragStart($event)"
          [appTooltip]="ts.t().dragToMove"
          tooltipPosition="bottom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drag-handle-icon">
            <circle cx="9" cy="12" r="1"/>
            <circle cx="9" cy="5" r="1"/>
            <circle cx="9" cy="19" r="1"/>
            <circle cx="15" cy="12" r="1"/>
            <circle cx="15" cy="5" r="1"/>
            <circle cx="15" cy="19" r="1"/>
          </svg>
        </div>
        <!-- Expand/Collapse Replace Icon -->
        <button
          type="button"
          class="btn-icon-sm toggle-replace-btn"
          [class.expanded]="isReplaceOpen()"
          (click)="isReplaceOpenChange.emit(!isReplaceOpen())"
          [appTooltip]="ts.t().replace"
          tooltipPosition="bottom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <!-- Search Input Wrapper -->
        <div class="input-wrapper">
          <input
            #searchInput
            type="text"
            class="search-input"
            [placeholder]="ts.t().search + '...'"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            (keydown.enter)="onSearchEnter($event)"
          />
          
          <!-- Query Match settings inside input -->
          <div class="input-actions">
            <button
              type="button"
              class="btn-option"
              [class.active]="caseSensitive()"
              (click)="caseSensitiveChange.emit(!caseSensitive())"
              [appTooltip]="ts.t().matchCase"
              tooltipPosition="bottom"
            >
              Aa
            </button>
            <button
              type="button"
              class="btn-option"
              [class.active]="wholeWord()"
              (click)="wholeWordChange.emit(!wholeWord())"
              [appTooltip]="ts.t().matchWholeWord"
              tooltipPosition="bottom"
            >
              Ab
            </button>
            <button
              type="button"
              class="btn-option"
              [class.active]="regex()"
              (click)="regexChange.emit(!regex())"
              [appTooltip]="ts.t().useRegex"
              tooltipPosition="bottom"
            >
              .*
            </button>
          </div>
        </div>

        <!-- Matches Counter & Navigation -->
        <div class="search-navigation">
          <span class="match-count" [class.no-matches]="matchesCount() === 0 && searchQuery().length > 0">
            @if (searchQuery().length === 0) {
              &mdash;
            } @else if (matchesCount() === 0) {
              {{ ts.t().noResults }}
            } @else {
              {{ getCounterText() }}
            }
          </span>

          <button
            type="button"
            class="btn-icon-sm"
            [disabled]="matchesCount() === 0"
            (click)="prevMatch.emit()"
            [appTooltip]="ts.t().prevMatch"
            tooltipPosition="bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button
            type="button"
            class="btn-icon-sm"
            [disabled]="matchesCount() === 0"
            (click)="nextMatch.emit()"
            [appTooltip]="ts.t().nextMatch"
            tooltipPosition="bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>

        <!-- Close Button -->
        <button
          type="button"
          class="btn-icon-sm close-btn"
          (click)="close.emit()"
          [appTooltip]="ts.t().close"
          tooltipPosition="bottom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Replace Row (Only shown when expanded) -->
      @if (isReplaceOpen()) {
        <div class="replace-row animate-slide-down">
          <!-- Spacer matching toggle replace button width -->
          <div class="replace-spacer"></div>

          <!-- Replace Input Wrapper -->
          <div class="input-wrapper">
            <input
              type="text"
              class="search-input"
              [placeholder]="ts.t().replace + '...'"
              [value]="replaceQuery()"
              (input)="onReplaceInput($event)"
              (keydown.enter)="replace.emit()"
            />
          </div>

          <!-- Replace Actions -->
          <div class="replace-actions">
            <button
              type="button"
              class="btn-text-sm"
              [disabled]="matchesCount() === 0"
              (click)="replace.emit()"
            >
              {{ ts.t().replace }}
            </button>
            <button
              type="button"
              class="btn-text-sm"
              [disabled]="matchesCount() === 0"
              (click)="replaceAll.emit()"
            >
              {{ ts.t().replaceAll }}
            </button>
          </div>
        </div>
      }

      <!-- Settings / Column Filter Row -->
      <div class="settings-row">
        <span class="settings-label">{{ ts.t().searchInColumn }}:</span>
        <div class="select-wrapper-sm">
          <select class="select-sm" (change)="onColumnSelect($event)">
            <option [value]="-1" [selected]="selectedColumn() === null">{{ ts.t().allColumns }}</option>
            @for (header of headers(); track $index) {
              <option [value]="$index" [selected]="selectedColumn() === $index">
                {{ header || ('Col ' + ($index + 1)) }}
              </option>
            }
          </select>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-panel {
      position: absolute;
      top: 16px;
      right: 24px;
      width: 440px;
      background: var(--panel-glass);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-strong);
      border-radius: 12px;
      padding: 12px;
      box-shadow: var(--shadow-premium);
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 10px;
      animation: slideInFromTop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .drag-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: move;
      color: var(--text-muted);
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.15s ease, color 0.15s ease;
      flex-shrink: 0;
      
      &:hover {
        background: var(--panel-hover);
        color: var(--text);
      }
    }
    
    .drag-handle-icon {
      opacity: 0.6;
    }

    .search-row,
    .replace-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .replace-spacer {
      width: 26px; /* Width of the toggle replace button */
      flex-shrink: 0;
    }

    .input-wrapper {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-input {
      width: 100%;
      height: 32px;
      padding: 0 80px 0 10px;
      background: var(--input-bg);
      border: 1px solid var(--border-glass);
      border-radius: 6px;
      color: var(--text);
      font-size: 13px;
      font-family: var(--font-body);
      outline: none;
      transition: all 0.2s ease;

      &:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent-focus-shadow);
      }
    }

    .replace-row .search-input {
      padding-right: 10px;
    }

    .input-actions {
      position: absolute;
      right: 6px;
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .btn-option {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 600;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;

      &:hover {
        background: var(--panel-hover);
        color: var(--text);
      }

      &.active {
        background: var(--accent-gradient-opacity);
        border-color: var(--accent);
        color: var(--accent);
      }
    }

    .search-navigation {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .match-count {
      font-size: 12px;
      color: var(--text-muted);
      margin-right: 6px;
      min-width: 65px;
      text-align: right;
      white-space: nowrap;

      &.no-matches {
        color: var(--danger);
        font-weight: 500;
      }
    }

    .btn-icon-sm {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: var(--text-muted);
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: var(--panel-hover);
        color: var(--text);
      }

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }

    .toggle-replace-btn {
      transition: transform 0.2s ease;
      &.expanded {
        transform: rotate(90deg);
        color: var(--accent);
      }
    }

    .close-btn:hover {
      background: var(--danger-bg-opacity) !important;
      color: var(--danger) !important;
    }

    .replace-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-text-sm {
      background: transparent;
      border: 1px solid var(--border-glass);
      border-radius: 6px;
      color: var(--text);
      font-size: 11px;
      font-weight: 600;
      padding: 6px 10px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;

      &:hover:not(:disabled) {
        background: var(--panel-hover);
        border-color: var(--border-strong);
      }

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }

    .settings-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 4px;
      border-top: 1px solid var(--border-dim);
      margin-left: 26px; /* align with inputs */
    }

    .settings-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.02em;
      font-weight: 500;
    }

    .select-wrapper-sm {
      position: relative;
      flex: 1;
      max-width: 180px;
    }

    .select-sm {
      width: 100%;
      font-size: 12px;
      font-family: var(--font-body);
      color: var(--text);
      background: var(--input-bg);
      border: 1px solid var(--border-glass);
      border-radius: 6px;
      padding: 4px 20px 4px 8px;
      appearance: none;
      cursor: pointer;
      outline: none;
      transition: all 0.15s ease;

      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238891a0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 6px center;
      background-size: 12px;

      &:focus {
        border-color: var(--accent);
      }
    }

    .animate-slide-down {
      animation: slideDownSm 0.2s ease-out forwards;
    }

    @keyframes slideInFromTop {
      from {
        opacity: 0;
        margin-top: -10px;
      }
      to {
        opacity: 1;
        margin-top: 0;
      }
    }

    @keyframes slideDownSm {
      from {
        opacity: 0;
        transform: translateY(-6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class SearchPanelComponent implements OnDestroy {
  readonly ts = inject(TranslationService);
  private readonly el = inject(ElementRef);

  readonly headers = input.required<string[]>();
  readonly searchQuery = input.required<string>();
  readonly replaceQuery = input.required<string>();
  readonly isReplaceOpen = input.required<boolean>();
  readonly caseSensitive = input.required<boolean>();
  readonly wholeWord = input.required<boolean>();
  readonly regex = input.required<boolean>();
  readonly selectedColumn = input.required<number | null>();
  readonly matchesCount = input.required<number>();
  readonly currentMatchIndex = input.required<number>();

  @Output() readonly searchQueryChange = new EventEmitter<string>();
  @Output() readonly replaceQueryChange = new EventEmitter<string>();
  @Output() readonly isReplaceOpenChange = new EventEmitter<boolean>();
  @Output() readonly caseSensitiveChange = new EventEmitter<boolean>();
  @Output() readonly wholeWordChange = new EventEmitter<boolean>();
  @Output() readonly regexChange = new EventEmitter<boolean>();
  @Output() readonly selectedColumnChange = new EventEmitter<number | null>();

  @Output() readonly nextMatch = new EventEmitter<void>();
  @Output() readonly prevMatch = new EventEmitter<void>();
  @Output() readonly replace = new EventEmitter<void>();
  @Output() readonly replaceAll = new EventEmitter<void>();
  @Output() readonly close = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  readonly posX = signal(0);
  readonly posY = signal(0);

  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartPosX = 0;
  private dragStartPosY = 0;
  private onMouseMoveFn?: (e: MouseEvent) => void;
  private onMouseUpFn?: () => void;

  @HostListener('window:mouseleave')
  onWindowMouseLeave(): void {
    this.onDragEnd();
  }

  onDragStart(event: MouseEvent): void {
    event.preventDefault();
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartPosX = this.posX();
    this.dragStartPosY = this.posY();

    this.onMouseMoveFn = (e: MouseEvent) => this.onDragMove(e);
    this.onMouseUpFn = () => this.onDragEnd();

    document.addEventListener('mousemove', this.onMouseMoveFn);
    document.addEventListener('mouseup', this.onMouseUpFn);

    document.body.style.userSelect = 'none';
  }

  onDragMove(event: MouseEvent): void {
    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;
    
    let targetX = this.dragStartPosX + deltaX;
    let targetY = this.dragStartPosY + deltaY;

    if (typeof window !== 'undefined') {
      const winWidth = window.innerWidth;
      const winHeight = window.innerHeight;
      
      const panelWidth = 440;
      const panelEl = this.el.nativeElement.querySelector('.search-panel');
      const panelHeight = panelEl?.getBoundingClientRect()?.height || 150;
      
      const defaultLeft = winWidth - panelWidth - 24;
      const minX = -defaultLeft;
      const maxX = 24;
      
      targetX = Math.max(minX, Math.min(maxX, targetX));
      
      const defaultTop = 16;
      const minY = -defaultTop;
      const maxY = winHeight - defaultTop - panelHeight;
      
      targetY = Math.max(minY, Math.min(maxY, targetY));
    }

    this.posX.set(targetX);
    this.posY.set(targetY);
  }

  onDragEnd(): void {
    document.body.style.userSelect = '';
    if (this.onMouseMoveFn) {
      document.removeEventListener('mousemove', this.onMouseMoveFn);
      this.onMouseMoveFn = undefined;
    }
    if (this.onMouseUpFn) {
      document.removeEventListener('mouseup', this.onMouseUpFn);
      this.onMouseUpFn = undefined;
    }
  }

  ngOnDestroy(): void {
    if (this.onMouseMoveFn) {
      document.removeEventListener('mousemove', this.onMouseMoveFn);
    }
    if (this.onMouseUpFn) {
      document.removeEventListener('mouseup', this.onMouseUpFn);
    }
    document.body.style.userSelect = '';
  }

  constructor() {
    afterNextRender(() => {
      this.searchInput?.nativeElement?.focus();
      this.searchInput?.nativeElement?.select();
    });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQueryChange.emit(value);
  }

  onReplaceInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.replaceQueryChange.emit(value);
  }

  onColumnSelect(event: Event): void {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    this.selectedColumnChange.emit(val === -1 ? null : val);
  }

  onSearchEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      this.prevMatch.emit();
    } else {
      this.nextMatch.emit();
    }
  }

  getCounterText(): string {
    const text = this.ts.t().matchCounter;
    return text
      .replace('{current}', (this.currentMatchIndex() + 1).toString())
      .replace('{total}', this.matchesCount().toString());
  }
}
