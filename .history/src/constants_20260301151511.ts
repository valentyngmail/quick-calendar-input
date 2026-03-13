import { AppSettings } from './types';

export const SETTINGS_KEY = 'voiceAssistantSettings';
export const FAV_PLACES_KEY = 'calendarFavoritePlacesV3'; 

export const DEFAULT_SETTINGS: AppSettings = {
  organizerEmail: '',
  calendarId: 'primary',
  defaultGuests: '',
  decodeWebhook: '',
  saveWebhook: '',
  fetchLocationsWebhook: '',
  securityKey: '',
};

export const QUICK_CHIPS = [
  { label: 'Today', value: 'today' },
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'Next Monday', value: 'next Monday' },
  { label: '10:00 AM', value: '10:00 AM' },
];

export const DICT: Record<string, any> = {
  ru: {
    subtitle: "Печатай, говори или диктуй",
    process: "Обработать", recording: "Идет запись...", reviewTitle: "Проверка и ред.",
    retry: "Заново", decode: "Распознать", checkDetails: "Детали встречи",
    title: "Название", date: "Дата", time: "Время", duration: "Длительность (мин)",
    location: "Место", guests: "Гости", desc: "Полное описание",
    confirm: "Подтвердить", cancel: "Отмена", skipTrans: "Без перевода (Gemini)",
    recentEvents: "Недавние события", error: "Ошибка",
    settingsTitle: "Настройки", langSection: "Язык и Обработка",
    interfaceLang: "Язык интерфейса", identitySection: "Личные данные",
    webhooksSection: "Вебхуки (Make.com)", prefsSection: "Предпочтения",
    saveSettings: "Сохранить настройки", syncHistory: "Синхронизировать 3 года",
    dbTitle: "База адресов", selectAddress: "Выбрать адрес",
    searchDb: "Поиск по названию или адресу...", found: "Найдено",
    noLocFound: "Адреса не найдены"
  },
  en: {
    subtitle: "Type, speak, or dictate",
    process: "Process", recording: "Recording...", reviewTitle: "Review & Edit",
    retry: "Retry", decode: "Decode", checkDetails: "Check Details",
    title: "Title", date: "Date", time: "Time", duration: "Duration (min)",
    location: "Location", guests: "Guests", desc: "Full Description",
    confirm: "Confirm", cancel: "Cancel", skipTrans: "Skip Translation",
    recentEvents: "Recent Events", error: "Error",
    settingsTitle: "Settings", langSection: "Language & Processing",
    interfaceLang: "Interface Language", identitySection: "Identity",
    webhooksSection: "Webhooks (Make.com)", prefsSection: "Preferences",
    saveSettings: "Save Configuration", syncHistory: "Sync 3-Year History",
    dbTitle: "Address Database", selectAddress: "Select Address",
    searchDb: "Search by meeting name or address...", found: "Found",
    noLocFound: "No locations found"
  },
  de: {
    subtitle: "Tippen, sprechen oder diktieren",
    process: "Verarbeiten", recording: "Aufnahme...", reviewTitle: "Prüfen & Bearbeiten",
    retry: "Wiederholen", decode: "Erkennen", checkDetails: "Details prüfen",
    title: "Titel", date: "Datum", time: "Zeit", duration: "Dauer (min)",
    location: "Standort", guests: "Gäste", desc: "Beschreibung",
    confirm: "Bestätigen", cancel: "Abbrechen", skipTrans: "Ohne Übers.",
    recentEvents: "Letzte Ereignisse", error: "Fehler",
    settingsTitle: "Einstellungen", langSection: "Sprache & Verarbeitung",
    interfaceLang: "Oberflächensprache", identitySection: "Identität",
    webhooksSection: "Webhooks (Make.com)", prefsSection: "Präferenzen",
    saveSettings: "Konfiguration speichern", syncHistory: "3-Jahre Historie synch.",
    dbTitle: "Adressdatenbank", selectAddress: "Adresse auswählen",
    searchDb: "Suche nach Name oder Adresse...", found: "Gefunden",
    noLocFound: "Keine Standorte gefunden"
  }
};

export const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
};

export const saveSettings = (s: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
};
