import { Injectable, signal, computed, inject, Signal, WritableSignal } from '@angular/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, exists, writeTextFile } from '@tauri-apps/plugin-fs';
import { FileTab } from '../components/tab-bar/tab-bar.component';
import { TranslationService } from './translation.service';

export type DelimiterKind = 'comma' | 'semicolon' | 'tab' | 'custom';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  readonly ts = inject(TranslationService);

  readonly tabs = signal<FileTab[]>([]);
  readonly activeTabId = signal<string | null>(null);

  readonly activeTab = computed(() =>
    this.tabs().find(t => t.id === this.activeTabId()) || null
  );

  readonly defaultDelimiterKind = signal<DelimiterKind>('comma');
  readonly defaultCustomChar = signal<string>('');

  readonly filePath = computed(() => this.activeTab()?.path ?? null);
  readonly fileContent = computed(() => this.activeTab()?.content ?? null);

  readonly formattedFilePath = computed(() => {
    const path = this.filePath();
    if (!path) return '';

    let formatted = path;
    const homePattern = /^\/(Users|home)\/[^\/]+/;
    if (homePattern.test(path)) {
      formatted = path.replace(homePattern, '~');
    }

    // Middle truncate if still very long (> 45 chars) to keep the filename fully visible
    const maxLen = 45;
    if (formatted.length > maxLen) {
      const parts = formatted.split('/');
      if (parts.length > 2) {
        const fileName = parts.pop()!;
        const start = parts.slice(0, 2).join('/');
        formatted = `${start}/.../${fileName}`;
        if (formatted.length > maxLen) {
          formatted = `.../${fileName}`;
        }
      }
    }
    return formatted;
  });

  readonly isLoading = signal(false);
  readonly appError: WritableSignal<string | null> = signal(null);
  readonly isDragging = signal(false);

  readonly pendingFile = signal<{ path: string; name: string; content: string } | null>(null);
  readonly confirmDelimiterKind = signal<DelimiterKind>('comma');
  readonly confirmCustomChar = signal<string>('');

  readonly saveStatus = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  readonly confirmCustomCharError = computed(() => {
    if (this.confirmDelimiterKind() !== 'custom') return null;
    const char = this.confirmCustomChar();
    if (char.length === 0) return this.ts.t().errorSeparator;
    if (char.length > 1) return this.ts.t().errorLength;
    return null;
  });

  readonly confirmMessageText = computed(() => {
    const pending = this.pendingFile();
    if (!pending) return '';
    return this.ts.t().confirmMessage.replace('{name}', pending.name);
  });

  readonly delimiterKind: Signal<DelimiterKind> = computed(
    () => this.activeTab()?.delimiterKind ?? this.defaultDelimiterKind()
  );

  readonly customChar: Signal<string> = computed(
    () => this.activeTab()?.customChar ?? this.defaultCustomChar()
  );

  readonly customCharError: Signal<string | null> = computed(() => {
    const active = this.activeTab();
    const currentKind = active ? active.delimiterKind : this.defaultDelimiterKind();
    if (currentKind !== 'custom') return null;
    const char = active ? active.customChar : this.defaultCustomChar();
    if (char.length === 0) return this.ts.t().errorSeparator;
    if (char.length > 1) return this.ts.t().errorLength;
    return null;
  });

  /** Resolves the dropdown + custom input into the actual separator character(s). */
  readonly effectiveDelimiter: Signal<string | null> = computed(() => {
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

  /** Splits raw file text into rows of cells. */
  readonly parsedRows: Signal<string[][]> = computed(() => {
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
    const bytes = content.length;
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

  onDelimiterKindChange(kind: DelimiterKind): void {
    const activeId = this.activeTabId();
    if (activeId) {
      this.tabs.update(list =>
        list.map(t => t.id === activeId ? { ...t, delimiterKind: kind } : t)
      );
    } else {
      this.defaultDelimiterKind.set(kind);
    }
  }

  onCustomCharChange(char: string): void {
    const activeId = this.activeTabId();
    if (activeId) {
      this.tabs.update(list =>
        list.map(t => t.id === activeId ? { ...t, customChar: char } : t)
      );
    } else {
      this.defaultCustomChar.set(char);
    }
  }

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
      this.appError.set(this.describeError(err, this.ts.t().errorFileDialog));
      return;
    }

    if (!selected) {
      return;
    }

    await this.loadFile(selected);
  }

  async loadFile(path: string): Promise<void> {
    this.isLoading.set(true);
    this.appError.set(null);

    try {
      const fileExists = await exists(path);
      if (!fileExists) {
        this.appError.set(this.ts.t().errorFileNoLongerExists.replace('{path}', path));
        return;
      }

      const content = await readTextFile(path);
      const fileName = path.split('/').pop() || path;

      if (this.tabs().length > 0) {
        const active = this.activeTab();
        this.confirmDelimiterKind.set(active ? active.delimiterKind : this.defaultDelimiterKind());
        this.confirmCustomChar.set(active ? active.customChar : this.defaultCustomChar());
        this.pendingFile.set({ path, name: fileName, content });
      } else {
        const newTab: FileTab = {
          id: crypto.randomUUID(),
          name: fileName,
          path: path,
          content: content,
          delimiterKind: this.defaultDelimiterKind(),
          customChar: this.defaultCustomChar()
        };
        this.tabs.update(list => [...list, newTab]);
        this.activeTabId.set(newTab.id);
      }
    } catch (err) {
      this.appError.set(
        this.describeError(err, this.ts.t().errorFileRead),
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  confirmLoadFile(): void {
    const pending = this.pendingFile();
    if (!pending) return;

    if (this.confirmCustomCharError()) {
      return;
    }

    const newTab: FileTab = {
      id: crypto.randomUUID(),
      name: pending.name,
      path: pending.path,
      content: pending.content,
      delimiterKind: this.confirmDelimiterKind(),
      customChar: this.confirmCustomChar()
    };

    this.tabs.update(list => [...list, newTab]);
    this.activeTabId.set(newTab.id);
    this.pendingFile.set(null);
  }

  cancelLoadFile(): void {
    this.pendingFile.set(null);
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

  async saveActiveTab(): Promise<void> {
    const active = this.activeTab();
    if (!active || !active.isModified) return;

    this.isLoading.set(true);
    this.saveStatus.set(null);

    try {
      await writeTextFile(active.path, active.content);

      this.tabs.update(list =>
        list.map(t => t.id === active.id ? { ...t, isModified: false } : t)
      );

      this.saveStatus.set({
        type: 'success',
        message: this.ts.t().saveSuccess
      });

      setTimeout(() => {
        if (this.saveStatus()?.type === 'success') {
          this.saveStatus.set(null);
        }
      }, 3000);
    } catch (err) {
      this.saveStatus.set({
        type: 'error',
        message: this.ts.t().saveError.replace('{error}', this.describeError(err, this.ts.t().errorUnknown))
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async discardActiveTabChanges(): Promise<void> {
    const active = this.activeTab();
    if (!active || !active.isModified) return;

    this.isLoading.set(true);
    this.appError.set(null);

    try {
      const content = await readTextFile(active.path);
      this.tabs.update(list =>
        list.map(t => t.id === active.id ? { ...t, content: content, isModified: false } : t)
      );
    } catch (err) {
      this.appError.set(
        this.describeError(err, this.ts.t().errorDiscardChanges)
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  onCellEdit(event: { rowIndex: number; colIndex: number; newValue: string }): void {
    const active = this.activeTab();
    const delimiter = this.effectiveDelimiter();
    if (!active || !delimiter) return;

    const dataRows = this.tableRows().map(row => [...row]);
    const r = event.rowIndex;
    const c = event.colIndex;
    if (r >= dataRows.length || c >= dataRows[r].length) return;

    dataRows[r][c] = event.newValue;

    const allRows = [this.tableHeaders(), ...dataRows];
    const lineEnding = active.content.includes('\r\n') ? '\r\n' : '\n';
    const newContent = allRows.map(row => row.join(delimiter)).join(lineEnding);

    this.tabs.update(list =>
      list.map(t => t.id === active.id ? { ...t, content: newContent, isModified: true } : t)
    );
  }

  describeError(err: unknown, fallback: string): string {
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    return fallback;
  }
}
