import {
  Component,
  ElementRef,
  Signal,
  WritableSignal,
  afterNextRender,
  computed,
  input,
  signal,
  viewChild,
  NgZone,
  inject
} from '@angular/core';

const ROW_HEIGHT = 36; // Premium size: slightly taller rows for better readability
const OVERSCAN_ROWS = 8;

@Component({
  selector: 'app-grid-view',
  standalone: true,
  template: `
    <div class="grid-container">
      <div class="grid-viewport" #gridViewport (scroll)="onGridScroll($event)">
        <!-- Sticky Header -->
        <div class="grid-row grid-row-header">
          <div class="cell cell-gutter cell-gutter-header">#</div>
          @for (header of headers(); track $index) {
            <div class="cell cell-header" [attr.title]="header">{{ header || '\u2014' }}</div>
          }
        </div>

        <!-- Top Spacer -->
        <div class="grid-spacer" [style.height.px]="topSpacerHeight()"></div>

        <!-- Visible Rows -->
        @for (entry of visibleRows(); track entry.index) {
          <div class="grid-row" [style.height.px]="rowHeight">
            <div class="cell cell-gutter">{{ entry.index + 1 }}</div>
            @for (cell of entry.row; track $index) {
              <div class="cell" [attr.title]="cell">{{ cell }}</div>
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
      flex: 0 0 150px;
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

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class GridViewComponent {
  readonly headers = input.required<string[]>();
  readonly rows = input.required<string[][]>();

  private readonly gridViewport =
    viewChild<ElementRef<HTMLDivElement>>('gridViewport');

  private readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(600);

  readonly rowHeight = ROW_HEIGHT;

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
  }

  onGridScroll(event: Event): void {
    const target = event.target as HTMLDivElement;
    this.scrollTop.set(target.scrollTop);
  }
}
