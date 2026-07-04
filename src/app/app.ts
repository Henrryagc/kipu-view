import {
  Component,
  Signal,
  WritableSignal,
  computed,
  signal,
  inject,
  NgZone,
} from '@angular/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, exists } from '@tauri-apps/plugin-fs';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { StatePanelComponent } from './components/state-panel/state-panel.component';
import { GridViewComponent } from './components/grid-view/grid-view.component';
import { TabBarComponent, FileTab } from './components/tab-bar/tab-bar.component';
import { TooltipDirective } from './directives/tooltip.directive';
import { TranslationService } from './services/translation.service';

/** Preset delimiter choices. */
type DelimiterKind = 'comma' | 'semicolon' | 'tab' | 'custom';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ToolbarComponent, StatePanelComponent, GridViewComponent, TabBarComponent, TooltipDirective],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('kipu-view');
  readonly ts = inject(TranslationService);
  private readonly zone = inject(NgZone);

  readonly tabs = signal<FileTab[]>([]);
  readonly activeTabId = signal<string | null>(null);

  readonly activeTab = computed(() =>
    this.tabs().find(t => t.id === this.activeTabId()) || null
  );

  readonly filePath = computed(() => this.activeTab()?.path ?? null);
  readonly fileContent = computed(() => this.activeTab()?.content ?? null);
  readonly isLoading = signal(false);
  readonly appError: WritableSignal<string | null> = signal(null);
  readonly isDragging = signal(false);

  constructor() {
    // Listen to Tauri native window drag-and-drop events
    if (typeof window !== 'undefined') {
      getCurrentWebview().onDragDropEvent((event) => {
        this.zone.run(() => {
          if (event.payload.type === 'enter' || event.payload.type === 'over') {
            this.isDragging.set(true);
          } else if (event.payload.type === 'leave') {
            this.isDragging.set(false);
          } else if (event.payload.type === 'drop') {
            this.isDragging.set(false);
            if (event.payload.paths.length > 0) {
              this.loadFile(event.payload.paths[0]);
            }
          }
        });
      });
    }
  }

  readonly delimiterKind: Signal<DelimiterKind> = computed(
    () => this.activeTab()?.delimiterKind ?? 'comma'
  );

  readonly customChar: Signal<string> = computed(
    () => this.activeTab()?.customChar ?? ''
  );

  readonly customCharError: Signal<string | null> = computed(() => {
    const active = this.activeTab();
    if (!active || active.delimiterKind !== 'custom') return null;
    const char = active.customChar;
    if (char.length === 0) return this.ts.t().errorSeparator;
    if (char.length > 1) return this.ts.t().errorLength;
    return null;
  });

  onDelimiterKindChange(kind: DelimiterKind): void {
    const activeId = this.activeTabId();
    if (activeId) {
      this.tabs.update(list =>
        list.map(t => t.id === activeId ? { ...t, delimiterKind: kind } : t)
      );
    }
  }

  onCustomCharChange(char: string): void {
    const activeId = this.activeTabId();
    if (activeId) {
      this.tabs.update(list =>
        list.map(t => t.id === activeId ? { ...t, customChar: char } : t)
      );
    }
  }

  /** Resolves the dropdown + custom input into the actual separator character(s). */
  private readonly effectiveDelimiter: Signal<string | null> = computed(() => {
    const active = this.activeTab();
    if (!active) return null;
    const { delimiterKind, customChar } = active;
    switch (delimiterKind) {
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
      const fileName = path.split('/').pop() || path;

      const newTab: FileTab = {
        id: crypto.randomUUID(),
        name: fileName,
        path: path,
        content: content,
        delimiterKind: 'comma',
        customChar: ''
      };

      this.tabs.update(list => [...list, newTab]);
      this.activeTabId.set(newTab.id);
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

  selectTab(id: string): void {
    this.activeTabId.set(id);
    this.appError.set(null);
  }

  closeTab(tabId: string): void {
    const list = this.tabs();
    const index = list.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const newTabs = list.filter(t => t.id !== tabId);
    this.tabs.set(newTabs);

    if (this.activeTabId() === tabId) {
      if (newTabs.length > 0) {
        const nextActiveIndex = Math.min(index, newTabs.length - 1);
        this.activeTabId.set(newTabs[nextActiveIndex].id);
      } else {
        this.activeTabId.set(null);
      }
    }
  }

  clearFile(): void {
    const activeId = this.activeTabId();
    if (activeId) {
      this.closeTab(activeId);
    }
  }
}

