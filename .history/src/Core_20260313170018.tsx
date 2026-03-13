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
  guests: string;
  description: string;
  guestsCanModify: boolean;
  reminder: number;
  isTask?: boolean; // Новый флаг для контроля выполнения
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

// Cловарь переводов (DICT)
export const DICT: Record<string, Record<string, string>> = {
  ru: {
    subtitle: 'Что запланируем?',
    process: 'Создать',
    checkDetails: 'Проверь детали',
    title: 'Событие',
    date: 'Дата',
    time: 'Время',
    duration: 'Длительность',
    location: 'Место',
    guestsLabel: 'Гости',
    descLabel: 'ОПИСАНИЕ',
    promptLabel: 'ОРИГИНАЛЬНЫЙ ТЕКСТ',
    confirm: 'Подтвердить',
    cancel: 'Отмена',
    saveToCalendar: 'Отправить в календарь',
    settingsTitle: 'Настройки',
    langSection: 'Язык и перевод',
    interfaceLang: 'Язык интерфейса',
    skipTrans: 'Не переводить (RAW)',
    identitySection: 'Аккаунт',
    organizer: 'Организатор',
    defaultGuests: 'Гости по умолчанию',
    calendarId: 'ID Календаря',
    webhooksSection: 'Интеграции (Webhooks)',
    decodeWebhook: 'Вебхук расшифровки',
    saveWebhook: 'Вебхук сохранения',
    syncHistory: 'Синхронизировать места',
    backupSection: 'БЭКАП АДРЕСОВ',
    exportBackup: 'Экспорт в файл',
    restoreBackup: 'Восстановить из файла',
    securitySection: 'Безопасность и отладка',
    securityKey: 'Секретный ключ',
    debugConsole: 'Дебаг-консоль',
    prefsSection: 'Предпочтения',
    saveSettings: 'Сохранить настройки',
    dbTitle: 'База адресов',
    selectAddress: 'Выбрать адрес',
    searchDb: 'Поиск по адресу...',
    found: 'Найдено',
    noLocFound: 'Адреса не найдены',
    // НОВЫЕ КЛЮЧИ:
    saving: 'Сохранение...',
    analyzing: 'Анализируем...',
    eventSaved: 'Событие сохранено!',
    retry: 'Повторить',
    deleted: 'Удалено',
    taskCompleted: 'Выполнено!',
    tasksTitle: 'Мои Задачи',
    overdue: 'Хвосты',
    upcoming: 'Предстоящие',
    noOverdue: 'Все хвосты подчищены! 🎉',
    noUpcoming: 'Нет будущих задач! 🏖️',
    done: 'Готово',
    taskMode: 'Контроль выполнения'
  },
  en: {
    subtitle: 'What is the plan?',
    process: 'Create',
    checkDetails: 'Check Details',
    title: 'Event',
    date: 'Date',
    time: 'Time',
    duration: 'Duration',
    location: 'Location',
    guestsLabel: 'Guests',
    descLabel: 'DESCRIPTION',
    promptLabel: 'ORIGINAL PROMPT',
    confirm: 'Confirm',
    cancel: 'Cancel',
    saveToCalendar: 'Save to Calendar',
    settingsTitle: 'Settings',
    langSection: 'Language',
    interfaceLang: 'Interface Language',
    skipTrans: 'Skip translation',
    identitySection: 'Identity',
    organizer: 'Organizer',
    defaultGuests: 'Default Guests',
    calendarId: 'Calendar ID',
    webhooksSection: 'Webhooks',
    decodeWebhook: 'Decode Webhook',
    saveWebhook: 'Save Webhook',
    syncHistory: 'Sync Locations',
    backupSection: 'ADDRESSES BACKUP',
    exportBackup: 'Export to File',
    restoreBackup: 'Restore from File',
    securitySection: 'Security & Debug',
    securityKey: 'Security Key',
    debugConsole: 'Debug Console',
    prefsSection: 'Preferences',
    saveSettings: 'Save Settings',
    dbTitle: 'Address Database',
    selectAddress: 'Select Address',
    searchDb: 'Search address...',
    found: 'Found',
    noLocFound: 'No locations found',
    // НОВЫЕ КЛЮЧИ:
    saving: 'Saving...',
    analyzing: 'Analyzing...',
    eventSaved: 'Event Saved!',
    retry: 'Retry',
    deleted: 'Deleted',
    taskCompleted: 'Task Completed!',
    tasksTitle: 'My Tasks',
    overdue: 'Overdue',
    upcoming: 'Upcoming',
    noOverdue: 'All caught up! 🎉',
    noUpcoming: 'No upcoming tasks! 🏖️',
    done: 'Done',
    taskMode: 'Task Control'
  },
  de: {
    subtitle: 'Was planen wir?',
    process: 'Erstellen',
    checkDetails: 'Details prüfen',
    title: 'Ereignis',
    date: 'Datum',
    time: 'Zeit',
    duration: 'Dauer',
    location: 'Ort',
    guestsLabel: 'Gäste',
    descLabel: 'BESCHREIBUNG',
    promptLabel: 'URSPRÜNGLICHER TEXT',
    confirm: 'Bestätigen',
    cancel: 'Abbrechen',
    saveToCalendar: 'Im Kalender speichern',
    settingsTitle: 'Einstellungen',
    langSection: 'Sprache & Übersetzung',
    interfaceLang: 'Oberflächensprache',
    skipTrans: 'Ohne Übersetzung (RAW)',
    identitySection: 'Konto',
    organizer: 'Organisator',
    defaultGuests: 'Standardgäste',
    calendarId: 'Kalender-ID',
    webhooksSection: 'Integrationen (Webhooks)',
    decodeWebhook: 'Decode Webhook',
    saveWebhook: 'Save Webhook',
    syncHistory: 'Orte synchronisieren',
    backupSection: 'ADRESSEN-BACKUP',
    exportBackup: 'In Datei exportieren',
    restoreBackup: 'Aus Datei wiederherstellen',
    securitySection: 'Sicherheit & Debug',
    securityKey: 'Sicherheitsschlüssel',
    debugConsole: 'Debug-Konsole',
    prefsSection: 'Präferenzen',
    saveSettings: 'Einstellungen speichern',
    dbTitle: 'Adressdatenbank',
    selectAddress: 'Adresse auswählen',
    searchDb: 'Adresse suchen...',
    found: 'Gefunden',
    noLocFound: 'Keine Standorte gefunden',
    // НОВЫЕ КЛЮЧИ:
    saving: 'Speichern...',
    analyzing: 'Analysieren...',
    eventSaved: 'Ereignis gespeichert!',
    retry: 'Wiederholen',
    deleted: 'Gelöscht',
    taskCompleted: 'Erledigt!',
    tasksTitle: 'Meine Aufgaben',
    overdue: 'Überfällig',
    upcoming: 'Anstehend',
    noOverdue: 'Alles erledigt! 🎉',
    noUpcoming: 'Keine anstehenden Aufgaben! 🏖️',
    done: 'Fertig',
    taskMode: 'Aufgabenkontrolle'
  }
};