import { Injectable, signal, computed } from '@angular/core';
import { en } from './en';
import { es } from './es';

export type Language = 'en' | 'es';

const translations = { en, es };

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly _currentLanguage = signal<Language>('en');

  readonly currentLanguage = this._currentLanguage.asReadonly();

  readonly t = computed(() => translations[this._currentLanguage()]);

  setLanguage(lang: Language): void {
    this._currentLanguage.set(lang);
  }

  toggleLanguage(): void {
    this._currentLanguage.update(lang => (lang === 'en' ? 'es' : 'en'));
  }
}
