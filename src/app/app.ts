import {
  Component,
  ElementRef,
  Signal,
  WritableSignal,
  afterNextRender,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormField,
  form,
  required,
  maxLength,
  applyWhen,
} from '@angular/forms/signals';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, exists } from '@tauri-apps/plugin-fs';

/** Preset delimiter choices shown in the dropdown. 'custom' unlocks the text input. */
type DelimiterKind = 'comma' | 'semicolon' | 'tab' | 'custom';

/** Backing model for the Signal Form that drives the delimiter configuration. */
interface DelimiterConfig {
  kind: DelimiterKind;
  customChar: string;
}

/** Height (px) of a single data row. Kept constant so virtual scrolling math is trivial. */
const ROW_HEIGHT = 32;
/** Extra rows rendered above/below the viewport so fast scrolling doesn't show blank gaps. */
const OVERSCAN_ROWS = 8;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormField],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('kipu-view');


  readonly filePath: WritableSignal<string | null> = signal(null);
  readonly fileContent: WritableSignal<string | null> = signal(null);
  readonly isLoading: WritableSignal<boolean> = signal(false);
  readonly appError: WritableSignal<string | null> = signal(null);

  /** Data model handed to the Signal Form. The form derives all state from this signal. */
  private readonly delimiterModel = signal<DelimiterConfig>({
    kind: 'comma',
    customChar: '',
  });

  /**
   * Signal Form for the delimiter configuration. `required` + `maxLength` only apply
   * to `customChar` when `kind === 'custom'`, via `applyWhen`.
   */
  readonly delimiterForm = form(this.delimiterModel, (path) => {
    applyWhen(
      path,
      ({ valueOf }) => valueOf(path.kind) === 'custom',
      (customPath) => {
        required(customPath.customChar, {
          message: 'Enter a single character to use as the separator.',
        });
        maxLength(customPath.customChar, 1, {
          message: 'Custom separators must be exactly one character.',
        });
      },
    );
  });

  /** Convenience read-only view of the current delimiter kind, for the template. */
  readonly delimiterKind: Signal<DelimiterKind> = computed(
    () => this.delimiterModel().kind,
  );

  // ---------------------------------------------------------------------
  // Parsing (derived entirely from signals — no re-read from the native layer
  // when the user only changes the delimiter)
  // ---------------------------------------------------------------------

  /** Resolves the dropdown + custom input into the actual separator character(s). */
  private readonly effectiveDelimiter: Signal<string | null> = computed(() => {
    const { kind, customChar } = this.delimiterModel();
    switch (kind) {
      case 'comma':
        return ',';
      case 'semicolon':
        return ';';
      case 'tab':
        return '\t';
      case 'custom':
        return customChar.length === 1 ? customChar : null;
    }
  });

  /**
   * Splits the raw file text into rows of cells. Uses manual index scanning
   * instead of a global regex split so a large single-string payload isn't
   * walked more times than necessary and no throwaway intermediate arrays
   * are created for line endings.
   */
  private readonly parsedRows: Signal<string[][]> = computed(() => {
    const content = this.fileContent();
    const delimiter = this.effectiveDelimiter();
    if (!content || !delimiter) {
      return [];
    }

    const rows: string[][] = [];
    let lineStart = 0;

    for (let i = 0; i <= content.length; i++) {
      const atEnd = i === content.length;
      if (atEnd || content[i] === '\n') {
        let lineEnd = i;
        // Trim a trailing \r so CRLF files don't leave it stuck on the last cell.
        if (lineEnd > lineStart && content[lineEnd - 1] === '\r') {
          lineEnd--;
        }
        if (lineEnd > lineStart || (!atEnd && lineEnd === lineStart)) {
          const line = content.slice(lineStart, lineEnd);
          if (line.length > 0 || rows.length === 0) {
            rows.push(line.split(delimiter));
          }
        }
        lineStart = i + 1;
      }
    }

    return rows;
  });

  readonly tableHeaders: Signal<string[]> = computed(
    () => this.parsedRows()[0] ?? [],
  );

  readonly tableRows: Signal<string[][]> = computed(() =>
    this.parsedRows().slice(1),
  );

  // ---------------------------------------------------------------------
  // Lightweight manual virtual scrolling (no extra dependency required)
  // ---------------------------------------------------------------------

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
    return Math.min(this.tableRows().length, raw);
  });

  readonly visibleRows: Signal<{ row: string[]; index: number }[]> = computed(
    () => {
      const start = this.startIndex();
      const end = this.endIndex();
      return this.tableRows()
        .slice(start, end)
        .map((row, offset) => ({ row, index: start + offset }));
    },
  );

  readonly topSpacerHeight: Signal<number> = computed(
    () => this.startIndex() * ROW_HEIGHT,
  );

  readonly bottomSpacerHeight: Signal<number> = computed(
    () => (this.tableRows().length - this.endIndex()) * ROW_HEIGHT,
  );

  readonly totalRowCount: Signal<number> = computed(
    () => this.tableRows().length,
  );

  constructor() {
    // Measure the viewport once it exists, and keep it in sync on resize.
    afterNextRender(() => {
      const el = this.gridViewport()?.nativeElement;
      if (!el) return;

      this.viewportHeight.set(el.clientHeight);

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.viewportHeight.set(entry.contentRect.height);
        }
      });
      observer.observe(el);
    });
  }

  onGridScroll(event: Event): void {
    const target = event.target as HTMLDivElement;
    this.scrollTop.set(target.scrollTop);
  }

  // ---------------------------------------------------------------------
  // File selection + reading
  // ---------------------------------------------------------------------

  async pickFile(): Promise<void> {
    this.appError.set(null);

    let selected: string | null;
    try {
      selected = await open({
        multiple: false,
        directory: false,
        title: 'Open a delimited file',
        filters: [
          { name: 'Delimited text', extensions: ['csv', 'tsv', 'txt', 'dat'] },
          { name: 'All files', extensions: ['*'] },
        ],
      });
    } catch (err) {
      this.appError.set(this.describeError(err, 'The file dialog could not be opened.'));
      return;
    }

    if (!selected) {
      // User cancelled the dialog — leave the current state untouched.
      return;
    }

    await this.loadFile(selected);
  }

  private async loadFile(path: string): Promise<void> {
    this.isLoading.set(true);
    this.appError.set(null);

    try {
      const fileExists = await exists(path);
      if (!fileExists) {
        this.appError.set(`File no longer exists at: ${path}`);
        return;
      }

      const content = await readTextFile(path);
      this.filePath.set(path);
      this.fileContent.set(content);
      this.scrollTop.set(0);
    } catch (err) {
      this.appError.set(
        this.describeError(err, 'The selected file could not be read.'),
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private describeError(err: unknown, fallback: string): string {
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    return fallback;
  }

  clearFile(): void {
    this.filePath.set(null);
    this.fileContent.set(null);
    this.appError.set(null);
    this.scrollTop.set(0);
  }
}
