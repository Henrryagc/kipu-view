import {
  Component,
  Signal,
  WritableSignal,
  computed,
  signal,
  inject,
  NgZone,
  HostListener
} from '@angular/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { StatePanelComponent } from './components/state-panel/state-panel.component';
import { GridViewComponent } from './components/grid-view/grid-view.component';
import { TabBarComponent } from './components/tab-bar/tab-bar.component';
import { TooltipDirective } from './directives/tooltip.directive';
import { TranslationService } from './services/translation.service';
import { SeparatorConfirmDialogComponent } from './components/separator-confirm-dialog/separator-confirm-dialog.component';
import { SearchPanelComponent } from './components/search-panel/search-panel.component';
import { FileService, DelimiterKind } from './services/file.service';
import { SearchService } from './services/search.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    ToolbarComponent,
    StatePanelComponent,
    GridViewComponent,
    TabBarComponent,
    TooltipDirective,
    SeparatorConfirmDialogComponent,
    SearchPanelComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('kipu-view');
  readonly ts = inject(TranslationService);
  private readonly zone = inject(NgZone);

  readonly fileService = inject(FileService);
  readonly searchService = inject(SearchService);

  // File signals/properties delegation
  readonly tabs = this.fileService.tabs;
  readonly activeTabId = this.fileService.activeTabId;
  readonly activeTab = this.fileService.activeTab;
  readonly defaultDelimiterKind = this.fileService.defaultDelimiterKind;
  readonly defaultCustomChar = this.fileService.defaultCustomChar;
  readonly filePath = this.fileService.filePath;
  readonly fileContent = this.fileService.fileContent;
  readonly formattedFilePath = this.fileService.formattedFilePath;
  readonly isLoading = this.fileService.isLoading;
  readonly appError = this.fileService.appError;
  readonly isDragging = this.fileService.isDragging;
  readonly pendingFile = this.fileService.pendingFile;
  readonly confirmDelimiterKind = this.fileService.confirmDelimiterKind;
  readonly confirmCustomChar = this.fileService.confirmCustomChar;
  readonly saveStatus = this.fileService.saveStatus;

  readonly confirmCustomCharError = this.fileService.confirmCustomCharError;
  readonly confirmMessageText = this.fileService.confirmMessageText;
  readonly delimiterKind = this.fileService.delimiterKind;
  readonly customChar = this.fileService.customChar;
  readonly customCharError = this.fileService.customCharError;
  readonly tableHeaders = this.fileService.tableHeaders;
  readonly tableRows = this.fileService.tableRows;
  readonly totalRowCount = this.fileService.totalRowCount;
  readonly fileSizeLabel = this.fileService.fileSizeLabel;
  readonly delimiterLabel = this.fileService.delimiterLabel;

  // Search signals/properties delegation
  readonly isSearchOpen = this.searchService.isSearchOpen;
  readonly isReplaceOpen = this.searchService.isReplaceOpen;
  readonly searchQuery = this.searchService.searchQuery;
  readonly replaceQuery = this.searchService.replaceQuery;
  readonly searchCaseSensitive = this.searchService.searchCaseSensitive;
  readonly searchWholeWord = this.searchService.searchWholeWord;
  readonly searchRegex = this.searchService.searchRegex;
  readonly searchColumn = this.searchService.searchColumn;
  readonly currentMatchIndex = this.searchService.currentMatchIndex;
  readonly searchMatches = this.searchService.searchMatches;
  readonly currentMatch = this.searchService.currentMatch;

  constructor() {
    // Listen to Tauri native window drag-and-drop events
    if (typeof window !== 'undefined') {
      getCurrentWebview().onDragDropEvent((event) => {
        this.zone.run(() => {
          if (event.payload.type === 'enter' || event.payload.type === 'over') {
            this.fileService.isDragging.set(true);
          } else if (event.payload.type === 'leave') {
            this.fileService.isDragging.set(false);
          } else if (event.payload.type === 'drop') {
            this.fileService.isDragging.set(false);
            if (event.payload.paths.length > 0) {
              this.fileService.loadFile(event.payload.paths[0]);
            }
          }
        });
      });

      // Check for application updates on startup
      setTimeout(() => {
        this.zone.run(() => {
          this.checkForAppUpdates(true);
        });
      }, 2000);
    }
  }

  // File methods delegation
  onDelimiterKindChange(kind: DelimiterKind): void {
    this.fileService.onDelimiterKindChange(kind);
  }

  onCustomCharChange(char: string): void {
    this.fileService.onCustomCharChange(char);
  }

  pickFile(): void {
    this.fileService.pickFile();
  }

  confirmLoadFile(): void {
    this.fileService.confirmLoadFile();
  }

  cancelLoadFile(): void {
    this.fileService.cancelLoadFile();
  }

  selectTab(id: string): void {
    this.fileService.selectTab(id);
  }

  closeTab(tabId: string): void {
    this.fileService.closeTab(tabId);
  }

  clearFile(): void {
    this.fileService.clearFile();
  }

  saveActiveTab(): void {
    this.fileService.saveActiveTab();
  }

  discardActiveTabChanges(): void {
    this.fileService.discardActiveTabChanges();
  }

  onCellEdit(event: { rowIndex: number; colIndex: number; newValue: string }): void {
    this.fileService.onCellEdit(event);
  }

  // Search methods delegation
  toggleSearch(): void {
    this.searchService.toggleSearch();
  }

  nextMatch(): void {
    this.searchService.nextMatch();
  }

  prevMatch(): void {
    this.searchService.prevMatch();
  }

  replace(): void {
    this.searchService.replace();
  }

  replaceAll(): void {
    this.searchService.replaceAll();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    const isCmdOrCtrl = event.metaKey || event.ctrlKey;

    // Ctrl+F / Cmd+F -> Toggle Search
    if (isCmdOrCtrl && event.key.toLowerCase() === 'f') {
      if (this.fileContent()) {
        event.preventDefault();
        this.toggleSearch();
      }
    }

    // Ctrl+S / Cmd+S -> Save File
    if (isCmdOrCtrl && event.key.toLowerCase() === 's') {
      if (this.activeTab()?.isModified) {
        event.preventDefault();
        this.saveActiveTab();
      }
    }

    // Escape -> Close Search Panel
    if (event.key === 'Escape') {
      if (this.isSearchOpen()) {
        event.preventDefault();
        this.isSearchOpen.set(false);
        this.searchQuery.set('');
      }
    }
  }

  async checkForAppUpdates(silent: boolean = true): Promise<void> {
    try {
      const update = await check();
      if (update) {
        const message = this.ts.t().updateAvailableMessage.replace('{version}', update.version);
        const shouldUpdate = await ask(message, {
          title: this.ts.t().updateAvailableTitle,
          kind: 'info',
          okLabel: this.ts.t().confirmBtn, // Use 'Confirm' translation button
          cancelLabel: this.ts.t().cancelBtn
        });

        if (shouldUpdate) {
          this.fileService.isLoading.set(true);
          await update.downloadAndInstall();
          await relaunch();
        }
      }
    } catch (err) {
      console.error('Failed to check/apply updates:', err);
      if (!silent) {
        this.fileService.appError.set(
          this.ts.t().updateError.replace('{error}', this.fileService.describeError(err, 'Unknown error'))
        );
      }
    } finally {
      this.fileService.isLoading.set(false);
    }
  }
}
