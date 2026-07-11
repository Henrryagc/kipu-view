import {
  Component,
  ElementRef,
  Signal,
  afterNextRender,
  computed,
  input,
  signal,
  viewChild,
  NgZone,
  inject,
  effect,
  OnDestroy,
  EventEmitter,
  Output
} from '@angular/core';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { TranslationService } from '../../services/translation.service';

export interface SearchMatch {
  rowIndex: number;
  colIndex: number;
  matchStart: number;
  matchLength: number;
}

const ROW_HEIGHT = 36; // Premium size: slightly taller rows for better readability
const OVERSCAN_ROWS = 8;

@Component({
  selector: 'app-grid-view',
  standalone: true,
  imports: [TooltipDirective],
  template: `
    <div class="grid-container">
      <div class="grid-viewport" #gridViewport (scroll)="onGridScroll($event)">
        <!-- Sticky Header -->
        <div class="grid-row grid-row-header">
          <div 
            class="cell cell-gutter cell-gutter-header auto-fit-all-btn"
            (click)="autoResizeAllColumns()"
            [appTooltip]="ts.t().autoFitAll"
            tooltipPosition="bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="fit-icon">
              <path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4"/>
            </svg>
          </div>
          @for (header of headers(); track $index) {
            <div 
              class="cell cell-header"
              [style.flex]="'0 0 ' + columnWidths()[$index] + 'px'"
              [style.width.px]="columnWidths()[$index]"
            >
              <span 
                class="cell-text"
                [appTooltip]="header" 
                tooltipPosition="bottom"
              >
                {{ header || '\u2014' }}
              </span>
              <div 
                class="col-resize-handle"
                (mousedown)="onResizeStart($event, $index)"
                (dblclick)="autoResizeColumn($index)"
              ></div>
            </div>
          }
        </div>

        <!-- Top Spacer -->
        <div class="grid-spacer" [style.height.px]="topSpacerHeight()"></div>

        <!-- Visible Rows -->
        @for (entry of visibleRows(); track entry.index) {
          <div class="grid-row" [style.height.px]="rowHeight">
            <div class="cell cell-gutter">{{ entry.index + 1 }}</div>
            @for (cell of entry.row; track $index) {
              <div 
                class="cell"
                [class.editing]="isEditing(entry.index, $index)"
                [class.has-expand-btn]="shouldShowExpandBtn(entry.index, $index)"
                [style.flex]="'0 0 ' + columnWidths()[$index] + 'px'"
                [style.width.px]="columnWidths()[$index]"
                (dblclick)="startEdit(entry.index, $index, cell)"
                (mouseenter)="onCellMouseEnter($event, entry.index, $index)"
                (mouseleave)="onCellMouseLeave()"
              >
                @if (isEditing(entry.index, $index)) {
                  <input
                    #editInput
                    type="text"
                    class="cell-edit-input"
                    [value]="editValue()"
                    (blur)="commitEdit(entry.index, $index, editInput.value)"
                    (keydown.enter)="commitEdit(entry.index, $index, editInput.value); editInput.blur()"
                    (keydown.escape)="cancelEdit(); editInput.blur()"
                  />
                } @else {
                  <span class="cell-text">
                    @for (part of getCellParts(cell, entry.index, $index); track $index) {
                      <span [class.search-highlight]="part.isMatch" [class.search-highlight-active]="part.isActive">{{ part.text }}</span>
                    }
                  </span>
                  
                  <!-- Cell Expand Hover Trigger (only rendered if text overflows) -->
                  @if (shouldShowExpandBtn(entry.index, $index)) {
                    <button 
                      type="button" 
                      class="cell-expand-btn"
                      (click)="openDetailDialog(entry.index, $index, cell); $event.stopPropagation()"
                      [appTooltip]="ts.t().langToggle === 'Language' ? 'Expand Cell' : 'Expandir celda'"
                      tooltipPosition="top"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 3 21 3 21 9"/>
                        <polyline points="9 21 3 21 3 15"/>
                        <line x1="21" y1="3" x2="14" y2="10"/>
                        <line x1="3" y1="21" x2="10" y2="14"/>
                      </svg>
                    </button>
                  }
                }
              </div>
            }
          </div>
        }

        <!-- Bottom Spacer -->
        <div class="grid-spacer" [style.height.px]="bottomSpacerHeight()"></div>
      </div>
    </div>

    <!-- Cell Detail Modal Dialog -->
    @if (activeDetailCell(); as detail) {
      <div class="cell-detail-overlay" (click)="closeDetailDialog()">
        <div class="cell-detail-modal animate-scale-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-subtitle">Row {{ detail.rowIndex + 1 }} &bull; Column {{ headers()[detail.colIndex] || ('Col ' + (detail.colIndex + 1)) }}</span>
              <h3 class="modal-title">{{ ts.t().langToggle === 'Language' ? 'Cell Detail Editor' : 'Editor de Detalle de Celda' }}</h3>
            </div>
            <button type="button" class="btn-close-modal" (click)="closeDetailDialog()">
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
              [value]="detail.value"
              placeholder="..."
              (input)="updateTextareaStats(detailTextarea.value)"
              (keydown)="onTextareaKeyDown($event, detailTextarea.value)"
            ></textarea>
            <div class="modal-body-meta">
              <span class="textarea-stats">
                {{ charCount() }} characters &bull; {{ wordCount() }} words
              </span>
              <span class="keyboard-hint">
                @if (ts.currentLanguage() === 'en') {
                  Press <strong>Ctrl</strong>+<strong>Enter</strong> to save, <strong>Esc</strong> to cancel
                } @else {
                  Presione <strong>Ctrl</strong>+<strong>Enter</strong> para guardar, <strong>Esc</strong> para cancelar
                }
              </span>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" (click)="closeDetailDialog()">
              {{ ts.t().cancelBtn }}
            </button>
            <button type="button" class="btn btn-primary" (click)="saveDetailEdit(detailTextarea.value)">
              {{ ts.t().langToggle === 'Language' ? 'Save Changes' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      flex: 1;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
    }

    .grid-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--panel-glass);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid var(--border-glass);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow-premium);
      animation: fadeIn 0.4s ease-out;
    }

    .grid-viewport {
      flex: 1 1 auto;
      overflow: auto;
      position: relative;
      /* Custom Premium Scrollbar */
      &::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb);
        border: 2px solid transparent;
        border-radius: 5px;
        background-clip: padding-box;
      }
      &::-webkit-scrollbar-thumb:hover {
        background: var(--scrollbar-thumb-hover);
        border: 2px solid transparent;
        border-radius: 5px;
        background-clip: padding-box;
      }
    }

    .grid-row {
      display: flex;
      align-items: stretch;
      width: max-content;
      min-width: 100%;
      border-bottom: 1px solid var(--border);
      transition: background-color 0.15s ease;

      &:hover:not(.grid-row-header) {
        background: var(--row-hover);
      }
    }

    .grid-row-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--header-bg);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-bottom: 2px solid var(--border-strong);
      font-weight: 600;
    }

    .cell {
      display: flex;
      align-items: center;
      padding: 0 14px;
      font-size: 13px;
      color: var(--text-cell);
      border-right: 1px solid var(--border-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      position: relative;

      &.editing {
        padding: 0;
      }

      &.has-expand-btn {
        .cell-text {
          padding-right: 20px;
        }
        .cell-expand-btn {
          opacity: 1;
          pointer-events: auto;
        }
      }
    }

    .cell-expand-btn {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      background: var(--panel-bg);
      border: 1px solid var(--border-glass);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition: all 0.15s ease;
      z-index: 5;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);

      &:hover {
        background: var(--accent-gradient);
        color: var(--btn-primary-text);
        border-color: var(--accent);
        transform: translateY(-50%) scale(1.05);
      }
      
      &:active {
        transform: translateY(-50%) scale(0.95);
      }
    }

    .cell-edit-input {
      width: 100%;
      height: 100%;
      border: 1.5px solid var(--accent);
      border-radius: 0;
      background: var(--input-bg);
      color: var(--text);
      font-size: 13px;
      font-family: var(--font-body);
      padding: 0 14px;
      outline: none;
      box-shadow: inset 0 0 4px var(--accent-light);
    }

    /* Cell Detail Modal Styles */
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
      border-top: 3px solid var(--accent);
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
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-dim);
    }

    .modal-title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
    }

    .modal-subtitle {
      font-size: 11px;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -0.02em;
      margin: 0;
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

    .cell-header {
      color: var(--text);
      font-family: var(--font-body);
      font-size: 13px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      font-weight: 700;
      position: relative;
      overflow: visible;
    }

    .cell-text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .col-resize-handle {
      position: absolute;
      top: 0;
      right: -3px;
      width: 6px;
      height: 100%;
      cursor: col-resize;
      z-index: 15;
      background: transparent;
      transition: background-color 0.15s ease;
      
      &:hover,
      &:active {
        background-color: var(--accent);
        box-shadow: 0 0 4px var(--accent);
      }
    }

    .auto-fit-all-btn {
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover {
        background: var(--panel-hover);
        color: var(--accent);
      }
      
      &:active {
        transform: scale(0.92);
      }
    }

    .fit-icon {
      flex-shrink: 0;
    }

    .cell-gutter {
      flex: 0 0 60px;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 11px;
      color: var(--text-muted);
      background: var(--gutter-bg);
      border-right: 2px solid var(--border-strong);
      user-select: none;
    }

    .cell-gutter-header {
      font-weight: 600;
      color: var(--text-muted);
    }

    .grid-spacer {
      width: 100%;
      pointer-events: none;
    }

    .search-highlight {
      background-color: var(--highlight-bg, rgba(86, 235, 198, 0.25));
      color: inherit;
      border-radius: 2px;
      padding: 2px 0;
    }

    .search-highlight-active {
      background-color: var(--highlight-active-bg, #56ebc6);
      color: var(--highlight-active-text, #1b1e25);
      font-weight: 600;
      border-radius: 2px;
      padding: 2px 0;
      box-shadow: 0 0 4px var(--accent);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class GridViewComponent implements OnDestroy {
  readonly ts = inject(TranslationService);

  readonly headers = input.required<string[]>();
  readonly rows = input.required<string[][]>();
  readonly searchMatches = input<SearchMatch[]>([]);
  readonly currentMatch = input<SearchMatch | null>(null);

  @Output() readonly cellEdit = new EventEmitter<{ rowIndex: number; colIndex: number; newValue: string }>();

  readonly editingCell = signal<{ rowIndex: number; colIndex: number } | null>(null);
  readonly editValue = signal<string>('');
  readonly activeDetailCell = signal<{ rowIndex: number; colIndex: number; value: string } | null>(null);
  readonly charCount = signal(0);
  readonly wordCount = signal(0);
  readonly hoveredCell = signal<{ rowIndex: number; colIndex: number } | null>(null);
  readonly hoveredCellOverflows = signal<boolean>(false);

  private readonly gridViewport =
    viewChild<ElementRef<HTMLDivElement>>('gridViewport');

  private readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(600);

  readonly rowHeight = ROW_HEIGHT;

  readonly customWidths = signal<Record<number, number>>({});

  readonly columnWidths = computed(() => {
    const headersCount = this.headers().length;
    const overrides = this.customWidths();
    const widths: number[] = [];
    for (let i = 0; i < headersCount; i++) {
      widths.push(overrides[i] ?? 150);
    }
    return widths;
  });

  private readonly startIndex: Signal<number> = computed(() => {
    const raw = Math.floor(this.scrollTop() / ROW_HEIGHT) - OVERSCAN_ROWS;
    return Math.max(0, raw);
  });

  private readonly endIndex: Signal<number> = computed(() => {
    const visibleCount = Math.ceil(this.viewportHeight() / ROW_HEIGHT);
    const raw = this.startIndex() + visibleCount + OVERSCAN_ROWS * 2;
    return Math.min(this.rows().length, raw);
  });

  readonly visibleRows: Signal<{ row: string[]; index: number }[]> = computed(
    () => {
      const start = this.startIndex();
      const end = this.endIndex();
      return this.rows()
        .slice(start, end)
        .map((row, offset) => ({ row, index: start + offset }));
    },
  );

  readonly topSpacerHeight: Signal<number> = computed(
    () => this.startIndex() * ROW_HEIGHT,
  );

  readonly bottomSpacerHeight: Signal<number> = computed(
    () => (this.rows().length - this.endIndex()) * ROW_HEIGHT,
  );

  private readonly zone = inject(NgZone);

  constructor() {
    afterNextRender(() => {
      const el = this.gridViewport()?.nativeElement;
      if (!el) return;

      this.zone.run(() => {
        this.viewportHeight.set(el.clientHeight);
      });

      const observer = new ResizeObserver((entries) => {
        this.zone.run(() => {
          for (const entry of entries) {
            this.viewportHeight.set(entry.contentRect.height);
          }
        });
      });
      observer.observe(el);
    });

    effect(() => {
      const match = this.currentMatch();
      if (match) {
        this.scrollToRow(match.rowIndex, match.colIndex);
      }
    });

    effect(() => {
      const hdrs = this.headers();
      const rws = this.rows();
      if (hdrs.length > 0) {
        setTimeout(() => {
          this.autoResizeAllColumns();
        }, 0);
      }
    });
  }

  private dragStartIndex = -1;
  private dragStartWidth = 0;
  private dragStartX = 0;
  private onMouseMoveFn?: (e: MouseEvent) => void;
  private onMouseUpFn?: () => void;
  private measureCanvasCtx: CanvasRenderingContext2D | null = null;

  ngOnDestroy(): void {
    if (this.onMouseMoveFn) {
      document.removeEventListener('mousemove', this.onMouseMoveFn);
    }
    if (this.onMouseUpFn) {
      document.removeEventListener('mouseup', this.onMouseUpFn);
    }
    if (typeof document !== 'undefined') {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }

  updateColumnWidth(index: number, width: number): void {
    this.customWidths.update(overrides => ({
      ...overrides,
      [index]: Math.max(50, width)
    }));
  }

  onResizeStart(event: MouseEvent, index: number): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.dragStartIndex = index;
    this.dragStartWidth = this.columnWidths()[index] || 150;
    this.dragStartX = event.clientX;
    
    this.onMouseMoveFn = (e: MouseEvent) => this.onResizeMove(e);
    this.onMouseUpFn = () => this.onResizeEnd();
    
    document.addEventListener('mousemove', this.onMouseMoveFn);
    document.addEventListener('mouseup', this.onMouseUpFn);
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  onResizeMove(event: MouseEvent): void {
    if (this.dragStartIndex === -1) return;
    const deltaX = event.clientX - this.dragStartX;
    const newWidth = Math.max(50, this.dragStartWidth + deltaX);
    this.updateColumnWidth(this.dragStartIndex, newWidth);
  }

  onResizeEnd(): void {
    this.dragStartIndex = -1;
    document.body.style.cursor = '';
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

  private measureTextWidth(text: string): number {
    if (typeof document === 'undefined') return 0;
    if (!this.measureCanvasCtx) {
      const canvas = document.createElement('canvas');
      this.measureCanvasCtx = canvas.getContext('2d');
    }
    if (this.measureCanvasCtx) {
      this.measureCanvasCtx.font = '13px Inter, sans-serif';
      return this.measureCanvasCtx.measureText(text).width;
    }
    return text.length * 8;
  }

  autoResizeColumn(index: number): void {
    const headerText = this.headers()[index] || '';
    let maxWidth = this.measureTextWidth(headerText) + 28;

    const allRows = this.rows();
    const rowCount = allRows.length;
    const maxScan = Math.min(1000, rowCount);
    
    for (let r = 0; r < maxScan; r++) {
      const cellText = allRows[r][index] || '';
      const cellWidth = this.measureTextWidth(cellText) + 28;
      if (cellWidth > maxWidth) {
        maxWidth = cellWidth;
      }
    }
    
    if (rowCount > 1000) {
      const sampleIndices = [
        Math.floor(rowCount / 2),
        Math.floor(rowCount * 0.75),
        rowCount - 1
      ];
      for (const r of sampleIndices) {
        const cellText = allRows[r]?.[index] || '';
        const cellWidth = this.measureTextWidth(cellText) + 28;
        if (cellWidth > maxWidth) {
          maxWidth = cellWidth;
        }
      }
    }

    const finalWidth = Math.min(800, Math.max(80, Math.ceil(maxWidth)));
    this.updateColumnWidth(index, finalWidth);
  }

  autoResizeAllColumns(): void {
    const colCount = this.headers().length;
    const newOverrides: Record<number, number> = {};
    const allRows = this.rows();
    const rowCount = allRows.length;
    const maxScan = Math.min(1000, rowCount);

    for (let col = 0; col < colCount; col++) {
      const headerText = this.headers()[col] || '';
      let maxWidth = this.measureTextWidth(headerText) + 28;

      for (let r = 0; r < maxScan; r++) {
        const cellText = allRows[r][col] || '';
        const cellWidth = this.measureTextWidth(cellText) + 28;
        if (cellWidth > maxWidth) {
          maxWidth = cellWidth;
        }
      }
      
      if (rowCount > 1000) {
        const sampleIndices = [
          Math.floor(rowCount / 2),
          Math.floor(rowCount * 0.75),
          rowCount - 1
        ];
        for (const r of sampleIndices) {
          const cellText = allRows[r]?.[col] || '';
          const cellWidth = this.measureTextWidth(cellText) + 28;
          if (cellWidth > maxWidth) {
            maxWidth = cellWidth;
          }
        }
      }

      newOverrides[col] = Math.min(800, Math.max(80, Math.ceil(maxWidth)));
    }
    
    this.customWidths.set(newOverrides);
  }

  onGridScroll(event: Event): void {
    const target = event.target as HTMLDivElement;
    this.scrollTop.set(target.scrollTop);
  }

  scrollToRow(rowIndex: number, colIndex?: number): void {
    const el = this.gridViewport()?.nativeElement;
    if (!el) return;

    // Vertical scroll
    const rowTop = rowIndex * ROW_HEIGHT;
    const viewportHeight = el.clientHeight;
    const currentScrollTop = el.scrollTop;

    // Check if row is visible (safety margin for sticky header)
    const headerHeight = ROW_HEIGHT;
    const isVisible = rowTop >= (currentScrollTop + headerHeight) &&
                      (rowTop + ROW_HEIGHT) <= (currentScrollTop + viewportHeight);

    if (!isVisible) {
      // Center the row
      const targetScrollTop = rowTop - (viewportHeight / 2) + (ROW_HEIGHT / 2) + (headerHeight / 2);
      el.scrollTop = Math.max(0, targetScrollTop);
    }

    // Horizontal scroll
    if (colIndex !== undefined) {
      let cellLeft = 60; // gutter
      const widths = this.columnWidths();
      for (let i = 0; i < colIndex; i++) {
        cellLeft += widths[i] ?? 150;
      }
      const cellWidth = widths[colIndex] ?? 150;
      const cellRight = cellLeft + cellWidth;
      const viewportWidth = el.clientWidth;
      const currentScrollLeft = el.scrollLeft;

      const isColVisible = cellLeft >= currentScrollLeft && cellRight <= (currentScrollLeft + viewportWidth);
      if (!isColVisible) {
        // Center the column
        const targetScrollLeft = cellLeft - (viewportWidth / 2) + (cellWidth / 2);
        el.scrollLeft = Math.max(0, targetScrollLeft);
      }
    }
  }

  getCellParts(cellText: string, rowIndex: number, colIndex: number) {
    const matches = this.searchMatches().filter(
      m => m.rowIndex === rowIndex && m.colIndex === colIndex
    );

    if (matches.length === 0) {
      return [{ text: cellText, isMatch: false, isActive: false }];
    }

    // Sort matches by start index to process sequentially
    const sortedMatches = [...matches].sort((a, b) => a.matchStart - b.matchStart);

    const parts: { text: string; isMatch: boolean; isActive: boolean }[] = [];
    let lastIndex = 0;
    const current = this.currentMatch();

    for (const match of sortedMatches) {
      // Text before match
      if (match.matchStart > lastIndex) {
        parts.push({
          text: cellText.slice(lastIndex, match.matchStart),
          isMatch: false,
          isActive: false
        });
      }

      // Check if active
      const isActive = current !== null &&
                       current.rowIndex === rowIndex &&
                       current.colIndex === colIndex &&
                       current.matchStart === match.matchStart;

      parts.push({
        text: cellText.slice(match.matchStart, match.matchStart + match.matchLength),
        isMatch: true,
        isActive
      });

      lastIndex = match.matchStart + match.matchLength;
    }

    // Trailing text
    if (lastIndex < cellText.length) {
      parts.push({
        text: cellText.slice(lastIndex),
        isMatch: false,
        isActive: false
      });
    }

    return parts;
  }

  isEditing(rowIndex: number, colIndex: number): boolean {
    const current = this.editingCell();
    return current !== null && current.rowIndex === rowIndex && current.colIndex === colIndex;
  }

  startEdit(rowIndex: number, colIndex: number, currentValue: string): void {
    this.editingCell.set({ rowIndex, colIndex });
    this.editValue.set(currentValue);
    
    // Focus the input in the next tick
    setTimeout(() => {
      const inputEl = document.querySelector('.cell-edit-input') as HTMLInputElement;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 0);
  }

  commitEdit(rowIndex: number, colIndex: number, newValue: string): void {
    const current = this.editingCell();
    if (!current || current.rowIndex !== rowIndex || current.colIndex !== colIndex) return;
    
    // Only emit if value changed
    const originalValue = this.rows()[rowIndex][colIndex];
    if (originalValue !== newValue) {
      this.cellEdit.emit({ rowIndex, colIndex, newValue });
    }
    
    this.editingCell.set(null);
  }

  cancelEdit(): void {
    this.editingCell.set(null);
  }

  openDetailDialog(rowIndex: number, colIndex: number, value: string): void {
    this.activeDetailCell.set({ rowIndex, colIndex, value });
    this.charCount.set(value.length);
    this.wordCount.set(value.trim() ? value.trim().split(/\s+/).length : 0);
    setTimeout(() => {
      const textarea = document.querySelector('.cell-detail-textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 0);
  }

  closeDetailDialog(): void {
    this.activeDetailCell.set(null);
  }

  updateTextareaStats(val: string): void {
    this.charCount.set(val.length);
    this.wordCount.set(val.trim() ? val.trim().split(/\s+/).length : 0);
  }

  saveDetailEdit(newValue: string): void {
    const current = this.activeDetailCell();
    if (!current) return;
    
    const originalValue = this.rows()[current.rowIndex][current.colIndex];
    if (originalValue !== newValue) {
      this.cellEdit.emit({
        rowIndex: current.rowIndex,
        colIndex: current.colIndex,
        newValue
      });
    }
    
    this.closeDetailDialog();
  }

  onTextareaKeyDown(event: KeyboardEvent, value: string): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeDetailDialog();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopPropagation();
      this.saveDetailEdit(value);
    }
  }

  onCellMouseEnter(event: MouseEvent, rowIndex: number, colIndex: number): void {
    this.hoveredCell.set({ rowIndex, colIndex });
    const cellEl = event.currentTarget as HTMLElement;
    const textEl = cellEl.querySelector('.cell-text') as HTMLElement;
    if (textEl) {
      const isOverflowing = textEl.scrollWidth > textEl.clientWidth;
      this.hoveredCellOverflows.set(isOverflowing);
    } else {
      this.hoveredCellOverflows.set(false);
    }
  }

  onCellMouseLeave(): void {
    this.hoveredCell.set(null);
    this.hoveredCellOverflows.set(false);
  }

  shouldShowExpandBtn(rowIndex: number, colIndex: number): boolean {
    const hover = this.hoveredCell();
    return hover !== null && 
           hover.rowIndex === rowIndex && 
           hover.colIndex === colIndex && 
           this.hoveredCellOverflows();
  }
}
