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
    translateToGerman: 'Перевод на немецкий',
    identitySection: 'Аккаунт',
    organizer: 'Организатор',
    defaultGuests: 'Гости по умолчанию',
    calendarId: 'ID Календаря',
    webhooksSection: 'Интеграции (Webhooks)',
    decodeWebhook: 'Вебхук расшифровки',
    saveWebhook: 'Вебхук сохранения',
    addressesSection: 'АДРЕСА',
    fetchAddresses: 'Сканирование адресов из календаря',
    exportBackup: 'Экспорт в JSON файл',
    restoreBackup: 'Загрузить из файла',
    securitySection: 'Безопасность и отладка',
    securityKey: 'Секретный ключ',
    debugConsole: 'Дебаг-консоль',
    saveSettings: 'Сохранить настройки',
    dbTitle: 'База адресов',
    selectAddress: 'Выбрать адрес',
    searchDb: 'Поиск по адресу...',
    found: 'Найдено',
    noLocFound: 'Адреса не найдены',
    saving: 'Сохранение...',
    analyzing: 'Анализируем...',
    eventSaved: 'Событие сохранено!',
    retry: 'Повторить',
    deleted: 'Удалено',
    taskCompleted: 'Выполнено!',
    tasksTitle: 'Мои Задачи',
    overdue: 'Хвосты',
    upcoming: 'Предстоящие',
    noOverdue: 'Все хвосты подчищены!',
    noUpcoming: 'Нет будущих задач!',
    done: 'Выполнено',
    taskMode: 'Контроль выполнения',
    copied: 'Скопировано!',
    saveBtn: 'Сохранить',
    untitled: 'Без названия',
    saveFailed: 'Ошибка сохранения. Проверьте консоль.',
    settingsSaved: 'Настройки сохранены!',
    syncDbTitle: 'Синхронизация базы',
    syncDbDesc: 'Для загрузки истории из Make.com вставьте URL вебхука "Fetch Locations" ниже.',
    fetchWebhookLabel: 'URL Вебхука (Fetch)',
    syncing: 'Загрузка...',
    startSync: 'Начать',
    fetchWebhookEmpty: 'Вебхук не настроен',
    syncSuccess: 'Синхронизировано адресов: ',
    syncError: 'Ошибка синхронизации',
    dbEmpty: 'База адресов пуста!',
    backupCreated: 'Бэкап сохранен!',
    backupRestored: 'Бэкап успешно восстановлен!',
    backupError: 'Ошибка чтения файла.',
    confirmDelete: 'Удалить этот адрес из базы?',
    placeUpdated: 'Адрес обновлен!',
    systemLogs: 'Системные логи',
    noLogs: 'Логов нет',
    copyLogs: 'Скопировать',
    clearLogs: 'Очистить',
    backupSection: 'Данные и бэкап',
    placeName: 'Название',
    address: 'Адрес',
    back: 'Назад'
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
    langSection: 'Language & Translation',
    interfaceLang: 'Interface Language',
    translateToGerman: 'Translate to German',
    identitySection: 'Account',
    organizer: 'Organizer',
    defaultGuests: 'Default Guests',
    calendarId: 'Calendar ID',
    webhooksSection: 'Integrations (Webhooks)',
    decodeWebhook: 'Decode Webhook',
    saveWebhook: 'Save Webhook',
    addressesSection: 'ADDRESSES',
    fetchAddresses: 'Fetch calendar addresses',
    exportBackup: 'Export to JSON file',
    restoreBackup: 'Load from file',
    securitySection: 'Security & Debug',
    securityKey: 'Secret Key',
    debugConsole: 'Debug Console',
    saveSettings: 'Save Settings',
    dbTitle: 'Address Database',
    selectAddress: 'Select Address',
    searchDb: 'Search address...',
    found: 'Found',
    noLocFound: 'No addresses found',
    saving: 'Saving...',
    analyzing: 'Analyzing...',
    eventSaved: 'Event saved!',
    retry: 'Retry',
    deleted: 'Deleted',
    taskCompleted: 'Completed!',
    tasksTitle: 'My Tasks',
    overdue: 'Overdue',
    upcoming: 'Upcoming',
    noOverdue: 'All caught up!',
    noUpcoming: 'No upcoming tasks!',
    done: 'Completed',
    taskMode: 'Task Control',
    copied: 'Copied!',
    saveBtn: 'Save',
    untitled: 'Untitled',
    saveFailed: 'Save failed. Check console.',
    settingsSaved: 'Settings saved!',
    syncDbTitle: 'Sync Database',
    syncDbDesc: 'To fetch history from Make.com, paste the "Fetch Locations" webhook URL below.',
    fetchWebhookLabel: 'Webhook URL (Fetch)',
    syncing: 'Fetching...',
    startSync: 'Start',
    fetchWebhookEmpty: 'Webhook not configured',
    syncSuccess: 'Synced addresses: ',
    syncError: 'Sync error',
    dbEmpty: 'Address database is empty!',
    backupCreated: 'Backup saved!',
    backupRestored: 'Backup successfully restored!',
    backupError: 'Error reading file.',
    confirmDelete: 'Delete this address from database?',
    placeUpdated: 'Address updated!',
    systemLogs: 'System Logs',
    noLogs: 'No logs',
    copyLogs: 'Copy',
    clearLogs: 'Clear',
    backupSection: 'Data & Backup',
    placeName: 'Place Name',
    address: 'Address',
    back: 'Back'
  },
  de: {
    subtitle: 'Was ist der Plan?',
    process: 'Erstellen',
    checkDetails: 'Details prüfen',
    title: 'Ereignis',
    date: 'Datum',
    time: 'Zeit',
    duration: 'Dauer',
    location: 'Ort',
    guestsLabel: 'Gäste',
    descLabel: 'BESCHREIBUNG',
    promptLabel: 'ORIGINALER TEXT',
    confirm: 'Bestätigen',
    cancel: 'Abbrechen',
    saveToCalendar: 'Im Kalender speichern',
    settingsTitle: 'Einstellungen',
    langSection: 'Sprache & Übersetzung',
    interfaceLang: 'Oberflächensprache',
    translateToGerman: 'Auf Deutsch übersetzen',
    identitySection: 'Konto',
    organizer: 'Organisator',
    defaultGuests: 'Standardgäste',
    calendarId: 'Kalender-ID',
    webhooksSection: 'Integrationen (Webhooks)',
    decodeWebhook: 'Decode Webhook',
    saveWebhook: 'Save Webhook',
    addressesSection: 'ADRESSEN',
    fetchAddresses: 'Kalenderadressen abrufen',
    exportBackup: 'Als JSON exportieren',
    restoreBackup: 'Aus Datei laden',
    securitySection: 'Sicherheit & Debug',
    securityKey: 'Geheimer Schlüssel',
    debugConsole: 'Debug-Konsole',
    saveSettings: 'Einstellungen speichern',
    dbTitle: 'Adressdatenbank',
    selectAddress: 'Adresse auswählen',
    searchDb: 'Adresse suchen...',
    found: 'Gefunden',
    noLocFound: 'Keine Adressen gefunden',
    saving: 'Speichern...',
    analyzing: 'Analysieren...',
    eventSaved: 'Ereignis gespeichert!',
    retry: 'Wiederholen',
    deleted: 'Gelöscht',
    taskCompleted: 'Erledigt!',
    tasksTitle: 'Meine Aufgaben',
    overdue: 'Überfällig',
    upcoming: 'Anstehend',
    noOverdue: 'Alles erledigt!',
    noUpcoming: 'Keine anstehenden Aufgaben!',
    done: 'Erledigt',
    taskMode: 'Aufgabenkontrolle',
    copied: 'Kopiert!',
    saveBtn: 'Speichern',
    untitled: 'Unbenannt',
    saveFailed: 'Speichern fehlgeschlagen. Konsole prüfen.',
    settingsSaved: 'Einstellungen gespeichert!',
    syncDbTitle: 'Datenbank synchronisieren',
    syncDbDesc: 'Um den Verlauf von Make.com abzurufen, fügen Sie unten die Webhook-URL "Fetch Locations" ein.',
    fetchWebhookLabel: 'Webhook-URL (Fetch)',
    syncing: 'Laden...',
    startSync: 'Starten',
    fetchWebhookEmpty: 'Webhook nicht konfiguriert',
    syncSuccess: 'Synchronisierte Adressen: ',
    syncError: 'Synchronisierungsfehler',
    dbEmpty: 'Adressdatenbank ist leer!',
    backupCreated: 'Backup gespeichert!',
    backupRestored: 'Backup erfolgreich wiederhergestellt!',
    backupError: 'Fehler beim Lesen der Datei.',
    confirmDelete: 'Diese Adresse aus der Datenbank löschen?',
    placeUpdated: 'Adresse aktualisiert!',
    systemLogs: 'Systemprotokolle',
    noLogs: 'Keine Protokolle',
    copyLogs: 'Kopieren',
    clearLogs: 'Löschen',
    backupSection: 'Daten & Backup',
    placeName: 'Ortsname',
    address: 'Adresse',
    back: 'Zurück'
  }
}; 