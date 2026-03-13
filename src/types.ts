export type AppPhase = 'idle' | 'recording' | 'review' | 'processing' | 'validation' | 'saving' | 'success' | 'error';

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
  organizerEmail?: string;
  calendarId?: string;
  aiTitle?: string;
}

export interface AppSettings {
  organizerEmail: string;
  calendarId: string;
  defaultGuests: string;
  decodeWebhook: string;
  saveWebhook: string;
  fetchLocationsWebhook: string;
  securityKey: string;
}

export interface FavoritePlace {
  id: string;
  location: string;
  title: string;
}
