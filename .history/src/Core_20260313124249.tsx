// ==========================================
// 1. ТИПЫ (Types)
// ==========================================
export type AppPhase = 'idle' | 'processing' | 'validation' | 'saving' | 'success' | 'error';

export interface ParsedEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  description: string;
  guests: string;
  guestsCanModify: boolean;
  reminder: number;
}

export interface AppSettings {
  organizerEmail: string;
  securityKey: string;
  decodeWebhook: string;
  saveWebhook: string;
  fetchLocationsWebhook: string;
  calendarId: string;
  defaultGuests: string;
}

export interface FavoritePlace {
  id: string;
  title: string;
  location: string;
}

// ==========================================
// 2. КОНСТАНТЫ И ХЕЛПЕРЫ (Constants)
// ==========================================
export const SETTINGS_KEY = 'voicecal_settings';
export const FAV_PLACES_KEY = 'voicecal_favorite_places';

export const DEFAULT_SETTINGS: AppSettings = {
  organizerEmail: '',
  securityKey: '',
  decodeWebhook: '',
  saveWebhook: '',
  fetchLocationsWebhook: '',
  calendarId: 'primary',
  defaultGuests: ''
};

export const loadSettings = (): AppSettings => {
  const saved = localStorage.getItem(SETTINGS_KEY);
  return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
};

export const saveSettings = (s: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
};

// Твой словарь переводов (DICT)
export const DICT: Record<string, Record<string, string>> = {
  ru: {
    subtitle: 'Что запланируем?',
    process: 'Создать',
    checkDetails: 'Проверь детали',
    title: 'Событие',
    date: 'Дата',
    time: 'Время',
    location: 'Место',
    confirm: 'Подтвердить',
    cancel: 'Отмена',
    settingsTitle: 'Настройки',
    langSection: 'Язык и перевод',
    interfaceLang: 'Язык интерфейса',
    skipTrans: 'Не переводить (RAW)',
    identitySection: 'Аккаунт',
    webhooksSection: 'Интеграции (Webhooks)',
    syncHistory: 'Синхронизировать места',
    prefsSection: 'Предпочтения',
    saveSettings: 'Сохранить настройки',
    dbTitle: 'База адресов',
    selectAddress: 'Выбрать адрес',
    searchDb: 'Поиск по адресу...',
    found: 'Найдено',
    noLocFound: 'Адреса не найдены'
  },
  en: {
    subtitle: 'What is the plan?',
    process: 'Create',
    checkDetails: 'Check Details',
    title: 'Event',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    confirm: 'Confirm',
    cancel: 'Cancel',
    settingsTitle: 'Settings',
    langSection: 'Language',
    interfaceLang: 'Interface Language',
    skipTrans: 'Skip translation',
    identitySection: 'Identity',
    webhooksSection: 'Webhooks',
    syncHistory: 'Sync Locations',
    prefsSection: 'Preferences',
    saveSettings: 'Save Settings',
    dbTitle: 'Address Database',
    selectAddress: 'Select Address',
    searchDb: 'Search address...',
    found: 'Found',
    noLocFound: 'No locations found'
  },
  de: {
    subtitle: 'Was planen wir?',
    process: 'Erstellen',
    checkDetails: 'Details prüfen',
    title: 'Ereignis',
    date: 'Datum',
    time: 'Zeit',
    location: 'Ort',
    confirm: 'Bestätigen',
    cancel: 'Abbrechen',
    settingsTitle: 'Einstellungen',
    langSection: 'Sprache & Übersetzung',
    interfaceLang: 'Oberflächensprache',
    skipTrans: 'Ohne Übersetzung (RAW)',
    identitySection: 'Konto',
    webhooksSection: 'Integrationen (Webhooks)',
    syncHistory: 'Orte synchronisieren',
    prefsSection: 'Präferenzen',
    saveSettings: 'Einstellungen speichern',
    dbTitle: 'Adressdatenbank',
    selectAddress: 'Adresse auswählen',
    searchDb: 'Adresse suchen...',
    found: 'Gefunden',
    noLocFound: 'Keine Standorte gefunden'
  }
};