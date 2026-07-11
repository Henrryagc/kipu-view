import { Injectable, signal, computed } from '@angular/core';

export type Language = 'en' | 'es';

const translations = {
  en: {
    openFile: 'Open file',
    close: 'Close',
    separator: 'Separator',
    comma: 'Comma ,',
    semicolon: 'Semicolon ;',
    tab: 'Tab',
    custom: 'Custom...',
    character: 'Character',
    rows: 'rows',
    noFile: 'No file loaded',
    hint: 'Open a .csv, .tsv, .txt, or .dat file to view its contents.',
    reading: 'Reading file...',
    errorSeparator: 'Enter a single character to use as the separator.',
    errorLength: 'Custom separators must be exactly one character.',
    errorSelect: 'Select file',
    themeLight: 'Light Theme',
    themeDark: 'Dark Theme',
    themeToggle: 'Toggle Theme',
    langToggle: 'Language',
    dropOverlay: 'Drop file here to open',
    columns: 'columns',
    size: 'Size',
    delimiter: 'Delimiter',
    newTab: 'New Tab',
    confirmTitle: 'Confirm Separator',
    confirmMessage: 'You are opening the file "{name}". Confirm the separator to use, or select another:',
    confirmBtn: 'Open File',
    cancelBtn: 'Cancel',
    search: 'Search',
    replace: 'Replace',
    replaceAll: 'Replace All',
    matchCase: 'Match Case',
    matchWholeWord: 'Match Whole Word',
    useRegex: 'Use Regular Expression',
    searchInColumn: 'Search in column',
    allColumns: 'All columns',
    noResults: 'No results',
    matchCounter: '{current} of {total}',
    saveChanges: 'Save Changes',
    saveSuccess: 'File saved successfully!',
    saveError: 'Failed to save file: {error}',
    unsavedChanges: 'Unsaved changes'
  },
  es: {
    openFile: 'Abrir archivo',
    close: 'Cerrar',
    separator: 'Separador',
    comma: 'Coma ,',
    semicolon: 'Punto y coma ;',
    tab: 'Tabulación',
    custom: 'Personalizado...',
    character: 'Carácter',
    rows: 'filas',
    noFile: 'Ningún archivo cargado',
    hint: 'Abra un archivo .csv, .tsv, .txt o .dat para ver su contenido.',
    reading: 'Leyendo archivo...',
    errorSeparator: 'Ingrese un solo carácter separador.',
    errorLength: 'El separador personalizado debe tener exactamente un carácter.',
    errorSelect: 'Seleccionar archivo',
    themeLight: 'Tema Claro',
    themeDark: 'Tema Oscuro',
    themeToggle: 'Cambiar Tema',
    langToggle: 'Idioma',
    dropOverlay: 'Suelte el archivo aquí para abrir',
    columns: 'columnas',
    size: 'Tamaño',
    delimiter: 'Delimitador',
    newTab: 'Nueva pestaña',
    confirmTitle: 'Confirmar Separador',
    confirmMessage: 'Está abriendo el archivo "{name}". Confirme el separador a usar, o seleccione otro:',
    confirmBtn: 'Abrir archivo',
    cancelBtn: 'Cancelar',
    search: 'Buscar',
    replace: 'Reemplazar',
    replaceAll: 'Reemplazar todo',
    matchCase: 'Coincidir mayúsculas y minúsculas',
    matchWholeWord: 'Coincidir palabra completa',
    useRegex: 'Usar expresión regular',
    searchInColumn: 'Buscar en columna',
    allColumns: 'Todas las columnas',
    noResults: 'Sin resultados',
    matchCounter: '{current} de {total}',
    saveChanges: 'Guardar cambios',
    saveSuccess: '¡Archivo guardado con éxito!',
    saveError: 'Error al guardar el archivo: {error}',
    unsavedChanges: 'Cambios no guardados'
  }
};

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
