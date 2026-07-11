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
  OnDestroy
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
                [style.flex]="'0 0 ' + columnWidths()[$index] + 'px'"
                [style.width.px]="columnWidths()[$index]"
              >
                <span class="cell-text">
                  @for (part of getCellParts(cell, entry.index, $index); track $index) {
                    <span [class.search-highlight]="part.isMatch" [class.search-highlight-active]="part.isActive">{{ part.text }}</span>
                  }
                </span>
              </div>
            }
          </div>
        }

        <!-- Bottom Spacer -->
        <div class="grid-spacer" [style.height.px]="bottomSpacerHeight()"></div>
      </div>
    </div>
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
}
