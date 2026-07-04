import {
  Component,
  Signal,
  WritableSignal,
  computed,
  signal,
  inject,
} from '@angular/core';
import {
  form,
  required,
  maxLength,
  applyWhen,
} from '@angular/forms/signals';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, exists } from '@tauri-apps/plugin-fs';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { StatePanelComponent } from './components/state-panel/state-panel.component';
import { GridViewComponent } from './components/grid-view/grid-view.component';
import { TranslationService } from './services/translation.service';

/** Preset delimiter choices shown in the dropdown. 'custom' unlocks the text input. */
type DelimiterKind = 'comma' | 'semicolon' | 'tab' | 'custom';

/** Backing model for the Signal Form that drives the delimiter configuration. */
interface DelimiterConfig {
  kind: DelimiterKind;
  customChar: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ToolbarComponent, StatePanelComponent, GridViewComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('kipu-view');
  readonly ts = inject(TranslationService);

  readonly filePath: WritableSignal<string | null> = signal(null);
  readonly fileContent: WritableSignal<string | null> = signal(null);
  readonly isLoading: WritableSignal<boolean> = signal(false);
  readonly appError: WritableSignal<string | null> = signal(null);
  readonly isDragging = signal(false);

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

  readonly totalRowCount: Signal<number> = computed(
    () => this.tableRows().length,
  );

  readonly fileSizeLabel: Signal<string> = computed(() => {
    const content = this.fileContent();
    if (!content) return '0 B';
    const bytes = content.length; // rough estimate
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  });

  readonly delimiterLabel: Signal<string> = computed(() => {
    const kind = this.delimiterKind();
    const t = this.ts.t();
    switch (kind) {
      case 'comma':
        return t.comma;
      case 'semicolon':
        return t.semicolon;
      case 'tab':
        return t.tab;
      case 'custom':
        return `${t.custom} (${this.effectiveDelimiter() || ''})`;
    }
  });

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
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.isLoading.set(true);
      this.appError.set(null);
      try {
        const content = await file.text();
        this.filePath.set(file.name);
        this.fileContent.set(content);
      } catch (err) {
        this.appError.set(this.describeError(err, 'The dropped file could not be read.'));
      } finally {
        this.isLoading.set(false);
      }
    }
  }
}

