import { Injectable, signal, computed, inject } from '@angular/core';
import { FileService } from './file.service';
import { TranslationService } from './translation.service';
import { SearchMatch } from '../components/grid-view/grid-view.component';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly fileService = inject(FileService);
  private readonly ts = inject(TranslationService);

  readonly isSearchOpen = signal(false);
  readonly isReplaceOpen = signal(false);
  readonly searchQuery = signal('');
  readonly replaceQuery = signal('');
  readonly searchCaseSensitive = signal(false);
  readonly searchWholeWord = signal(false);
  readonly searchRegex = signal(false);
  readonly searchColumn = signal<number | null>(null);
  readonly currentMatchIndex = signal(0);

  readonly searchMatches = computed<SearchMatch[]>(() => {
    const query = this.searchQuery();
    const rows = this.fileService.tableRows();
    const caseSensitive = this.searchCaseSensitive();
    const wholeWord = this.searchWholeWord();
    const isRegex = this.searchRegex();
    const searchCol = this.searchColumn();

    if (!query || rows.length === 0) return [];

    let regex: RegExp;
    try {
      if (isRegex) {
        const flags = caseSensitive ? 'g' : 'gi';
        regex = new RegExp(query, flags);
      } else {
        let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (wholeWord) {
          escaped = `\\b${escaped}\\b`;
        }
        const flags = caseSensitive ? 'g' : 'gi';
        regex = new RegExp(escaped, flags);
      }
    } catch (e) {
      return [];
    }

    const matches: SearchMatch[] = [];

    // Search headers (rowIndex = -1)
    const headers = this.fileService.tableHeaders();
    if (headers && headers.length > 0) {
      const colsToSearch = searchCol !== null ? [searchCol] : Array.from({ length: headers.length }, (_, i) => i);
      for (const c of colsToSearch) {
        if (c < headers.length) {
          const cellText = headers[c] || '';
          regex.lastIndex = 0;
          let match;
          while ((match = regex.exec(cellText)) !== null) {
            matches.push({
              rowIndex: -1,
              colIndex: c,
              matchStart: match.index,
              matchLength: match[0].length
            });
            if (match[0].length === 0) {
              regex.lastIndex++;
            }
          }
        }
      }
    }

    // Search rows (rowIndex >= 0)
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const colsToSearch = searchCol !== null ? [searchCol] : Array.from({ length: row.length }, (_, i) => i);

      for (const c of colsToSearch) {
        const cellText = row[c] || '';
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(cellText)) !== null) {
          matches.push({
            rowIndex: r,
            colIndex: c,
            matchStart: match.index,
            matchLength: match[0].length
          });
          if (match[0].length === 0) {
            regex.lastIndex++;
          }
        }
      }
    }
    return matches;
  });

  readonly currentMatch = computed(() => {
    const matches = this.searchMatches();
    const idx = this.currentMatchIndex();
    return matches.length > 0 && idx < matches.length ? matches[idx] : null;
  });

  toggleSearch(): void {
    if (!this.fileService.fileContent()) return;
    this.isSearchOpen.update(open => !open);
    if (!this.isSearchOpen()) {
      this.searchQuery.set('');
    }
  }

  nextMatch(): void {
    const total = this.searchMatches().length;
    if (total === 0) return;
    this.currentMatchIndex.update(idx => (idx + 1) % total);
  }

  prevMatch(): void {
    const total = this.searchMatches().length;
    if (total === 0) return;
    this.currentMatchIndex.update(idx => (idx - 1 + total) % total);
  }

  replace(): void {
    const match = this.currentMatch();
    if (!match) return;

    const active = this.fileService.activeTab();
    const delimiter = this.fileService.effectiveDelimiter();
    if (!active || !delimiter) return;

    const dataRows = this.fileService.tableRows().map(row => [...row]);
    const r = match.rowIndex;
    const c = match.colIndex;

    if (r === -1) {
      // Modify headers
      const headers = [...this.fileService.tableHeaders()];
      if (c >= headers.length) return;
      const cellText = headers[c] || '';
      const replaceText = this.replaceQuery();
      const newCellText = cellText.slice(0, match.matchStart) + replaceText + cellText.slice(match.matchStart + match.matchLength);
      headers[c] = newCellText;

      const allRows = [headers, ...dataRows];
      const lineEnding = active.content.includes('\r\n') ? '\r\n' : '\n';
      const newContent = allRows.map(row => row.join(delimiter)).join(lineEnding);

      this.fileService.tabs.update(list =>
        list.map(t => t.id === active.id ? { ...t, content: newContent, isModified: true } : t)
      );

      this.currentMatchIndex.set(0);
    } else {
      // Modify data rows
      if (r >= dataRows.length || c >= dataRows[r].length) return;
      const cellText = dataRows[r][c] || '';
      const replaceText = this.replaceQuery();
      const newCellText = cellText.slice(0, match.matchStart) + replaceText + cellText.slice(match.matchStart + match.matchLength);
      dataRows[r][c] = newCellText;

      const allRows = [this.fileService.tableHeaders(), ...dataRows];
      const lineEnding = active.content.includes('\r\n') ? '\r\n' : '\n';
      const newContent = allRows.map(row => row.join(delimiter)).join(lineEnding);

      this.fileService.tabs.update(list =>
        list.map(t => t.id === active.id ? { ...t, content: newContent, isModified: true } : t)
      );

      this.currentMatchIndex.set(0);
    }
  }

  replaceAll(): void {
    const query = this.searchQuery();
    const active = this.fileService.activeTab();
    const delimiter = this.fileService.effectiveDelimiter();
    const caseSensitive = this.searchCaseSensitive();
    const wholeWord = this.searchWholeWord();
    const isRegex = this.searchRegex();
    const searchCol = this.searchColumn();

    if (!query || !active || !delimiter) return;

    let regex: RegExp;
    try {
      if (isRegex) {
        const flags = caseSensitive ? 'g' : 'gi';
        regex = new RegExp(query, flags);
      } else {
        let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (wholeWord) {
          escaped = `\\b${escaped}\\b`;
        }
        const flags = caseSensitive ? 'g' : 'gi';
        regex = new RegExp(escaped, flags);
      }
    } catch (e) {
      return;
    }

    const dataRows = this.fileService.tableRows().map(row => [...row]);
    const headers = [...this.fileService.tableHeaders()];
    let changed = false;

    // Search and replace headers
    const colsToSearchHeaders = searchCol !== null ? [searchCol] : Array.from({ length: headers.length }, (_, i) => i);
    for (const c of colsToSearchHeaders) {
      if (c < headers.length) {
        const cellText = headers[c] || '';
        regex.lastIndex = 0;
        if (regex.test(cellText)) {
          headers[c] = cellText.replace(regex, this.replaceQuery());
          changed = true;
        }
      }
    }

    // Search and replace data rows
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      const colsToSearch = searchCol !== null ? [searchCol] : Array.from({ length: row.length }, (_, i) => i);

      for (const c of colsToSearch) {
        const cellText = row[c] || '';
        regex.lastIndex = 0;
        if (regex.test(cellText)) {
          row[c] = cellText.replace(regex, this.replaceQuery());
          changed = true;
        }
      }
    }

    if (changed) {
      const allRows = [headers, ...dataRows];
      const lineEnding = active.content.includes('\r\n') ? '\r\n' : '\n';
      const newContent = allRows.map(row => row.join(delimiter)).join(lineEnding);

      this.fileService.tabs.update(list =>
        list.map(t => t.id === active.id ? { ...t, content: newContent, isModified: true } : t)
      );

      this.currentMatchIndex.set(0);
    }
  }
}
