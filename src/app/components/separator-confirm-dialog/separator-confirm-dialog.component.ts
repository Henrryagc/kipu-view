import { Component, EventEmitter, Output, input, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { CustomSeparatorInputComponent } from '../custom-separator-input/custom-separator-input.component';

@Component({
  selector: 'app-separator-confirm-dialog',
  standalone: true,
  imports: [CustomSeparatorInputComponent],
  template: `
    <dialog #dialog class="confirm-dialog" (cancel)="cancel.emit()">
      <!-- Header -->
      <div class="modal-header">
        <div class="modal-title-group">
          <div class="modal-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <h3>{{ ts.t().confirmTitle }}</h3>
        </div>
        <button type="button" class="btn-close-modal" (click)="cancel.emit()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <p class="modal-description">{{ confirmMessageText() }}</p>

        <div class="separator-options-grid">
          <button
            type="button"
            class="separator-card"
            [class.active]="delimiterKind() === 'comma'"
            (click)="delimiterKindChange.emit('comma')"
          >
            <span class="separator-symbol">,</span>
            <span class="separator-name">{{ ts.t().comma }}</span>
          </button>

          <button
            type="button"
            class="separator-card"
            [class.active]="delimiterKind() === 'semicolon'"
            (click)="delimiterKindChange.emit('semicolon')"
          >
            <span class="separator-symbol">;</span>
            <span class="separator-name">{{ ts.t().semicolon }}</span>
          </button>

          <button
            type="button"
            class="separator-card"
            [class.active]="delimiterKind() === 'tab'"
            (click)="delimiterKindChange.emit('tab')"
          >
            <span class="separator-symbol">⇥</span>
            <span class="separator-name">{{ ts.t().tab }}</span>
          </button>

          <button
            type="button"
            class="separator-card"
            [class.active]="delimiterKind() === 'custom'"
            (click)="delimiterKindChange.emit('custom')"
          >
            <span class="separator-symbol">…</span>
            <span class="separator-name">{{ ts.t().custom }}</span>
          </button>
        </div>

        @if (delimiterKind() === 'custom') {
          <div class="modal-custom-field animate-slide-in">
            <app-custom-separator-input
              [customChar]="customChar()"
              [customCharError]="customCharError()"
              (customCharChange)="customCharChange.emit($event)"
            />
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" (click)="cancel.emit()">
          {{ ts.t().cancelBtn }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="delimiterKind() === 'custom' && customCharError()"
          (click)="confirm.emit()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-icon">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          {{ ts.t().confirmBtn }}
        </button>
      </div>
    </dialog>
  `,
})
export class SeparatorConfirmDialogComponent implements AfterViewInit {
  readonly ts = inject(TranslationService);

  readonly confirmMessageText = input.required<string>();
  readonly delimiterKind = input.required<'comma' | 'semicolon' | 'tab' | 'custom'>();
  readonly customChar = input.required<string>();
  readonly customCharError = input.required<string | null>();

  @Output() readonly delimiterKindChange = new EventEmitter<'comma' | 'semicolon' | 'tab' | 'custom'>();
  @Output() readonly customCharChange = new EventEmitter<string>();
  @Output() readonly confirm = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();

  @ViewChild('dialog') dialogRef!: ElementRef<HTMLDialogElement>;

  ngAfterViewInit() {
    if (this.dialogRef) {
      this.dialogRef.nativeElement.showModal();
    }
  }
}
