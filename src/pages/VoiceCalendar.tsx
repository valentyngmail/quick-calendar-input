import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Mic, Square, Check, X, Copy, Calendar, MapPin, Clock, Type, Timer, RotateCcw, Send, Trash2, Bug, CheckCircle2, AlertTriangle, Loader2, Users, Zap, FileText, Settings, Mail, Hash, Lock, Link as LinkIcon, RefreshCw, History, BookOpen, Edit2, Search, Globe } from 'lucide-react';
import { toast } from 'sonner';

type AppPhase = 'idle' | 'recording' | 'review' | 'processing' | 'validation' | 'saving' | 'success' | 'error';

interface ParsedEvent {
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
}

interface AppSettings {
  organizerEmail: string;
  calendarId: string;
  defaultGuests: string;
  decodeWebhook: string;
  saveWebhook: string;
  fetchLocationsWebhook: string;
  securityKey: string;
}

interface FavoritePlace {
  id: string;
  location: string;
  title: string;
}

const SETTINGS_KEY = 'voiceAssistantSettings';
const FAV_PLACES_KEY = 'calendarFavoritePlacesV3'; 

const DEFAULT_SETTINGS: AppSettings = {
  organizerEmail: '',
  calendarId: 'primary',
  defaultGuests: '',
  decodeWebhook: '',
  saveWebhook: '',
  fetchLocationsWebhook: '',
  securityKey: '',
};

const QUICK_CHIPS = [
  { label: 'Today', value: 'today' },
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'Next Monday', value: 'next Monday' },
  { label: '10:00 AM', value: '10:00 AM' },
];

// --- Словарь интерфейса ---
const DICT = {
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

const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
};

const saveSettings = (s: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
};

// ─── База Данных Адресов (Модальное Окно) ─────────────────────────
const PlacesDatabaseModal = ({ 
  open, onClose, places, setPlaces, onSelect, t
}: { 
  open: boolean; onClose: () => void; places: FavoritePlace[]; setPlaces: (p: FavoritePlace[]) => void; onSelect?: (location: string) => void; t: any;
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', location: '' });

  useEffect(() => {
    if (open) {
      setSearch('');
      setEditingId(null);
    }
  }, [open]);

  if (!open) return null;

  const filteredPlaces = places.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this address from database?")) {
      const updated = places.filter(p => p.id !== id);
      setPlaces(updated);
      localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(updated));
    }
  };

  const startEdit = (place: FavoritePlace) => {
    setEditingId(place.id);
    setEditForm({ title: place.title, location: place.location });
  };

  const saveEdit = (id: string) => {
    const updated = places.map(p => 
      p.id === id ? { ...p, title: editForm.title.trim(), location: editForm.location.trim() } : p
    );
    updated.sort((a, b) => a.title.localeCompare(b.title));
    setPlaces(updated);
    localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(updated));
    setEditingId(null);
    toast.success("Place updated!");
  };

  const openGoogleMaps = (e: React.MouseEvent, location: string) => {
    e.stopPropagation();
    window.open(`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(location)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4" onMouseDown={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg h-[80vh] shadow-2xl flex flex-col" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> 
            {onSelect ? t.selectAddress : t.dbTitle}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.searchDb}
              className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 px-1">{t.found}: {filteredPlaces.length}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredPlaces.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">{t.noLocFound}</div>
          ) : (
            filteredPlaces.map(place => (
              <div key={place.id} className="bg-background border border-border rounded-xl p-4 shadow-sm group hover:border-primary/40 transition-all flex flex-col">
                {editingId === place.id ? (
                  <div className="space-y-3">
                    <input 
                      value={editForm.title} 
                      onChange={e => setEditForm({...editForm, title: e.target.value})} 
                      className="w-full bg-muted text-sm px-3 py-2 rounded-lg border-none focus:ring-1 focus:ring-primary"
                      placeholder="Meeting Title"
                    />
                    <input 
                      value={editForm.location} 
                      onChange={e => setEditForm({...editForm, location: e.target.value})} 
                      className="w-full bg-muted text-sm px-3 py-2 rounded-lg border-none focus:ring-1 focus:ring-primary"
                      placeholder="Address"
                    />
                    <div className="flex gap-2 justify-end mt-2">
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs rounded-lg hover:bg-muted">Cancel</button>
                      <button onClick={() => saveEdit(place.id)} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-bold">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start gap-4">
                    <div 
                      className={`flex-1 min-w-0 ${onSelect ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
                      onClick={() => { if(onSelect) onSelect(place.location); }}
                    >
                      <h4 className="font-bold text-foreground text-sm truncate">{place.title || 'Untitled Meeting'}</h4>
                      <div 
                        onClick={(e) => openGoogleMaps(e, place.location)}
                        className={`flex items-start gap-1.5 mt-1 text-muted-foreground hover:text-primary transition-colors ${!onSelect ? 'cursor-pointer' : ''}`}
                        title="Open in Google Maps"
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <p className="text-xs break-words">{place.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => startEdit(place)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(place.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Settings Modal ───────────────────────────────────────────────
const SettingsModal = ({ 
  open, onClose, settings, onSave, onSync, isSyncing, syncProgress, showDebug, setShowDebug,
  appLang, setAppLang, skipTranslation, setSkipTranslation, t
}: any) => {
  const [local, setLocal] = useState<AppSettings>({ ...settings });

  useEffect(() => { if (open) setLocal({ ...settings }); }, [open, settings]);

  if (!open) return null;

  const handleSave = () => {
    onSave(local);
    toast.success('Settings saved');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto" onMouseDown={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl my-auto" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> {t.settingsTitle}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-left pb-2">
          
          {/* --- Секция Языка и Перевода --- */}
          <section className="space-y-3 bg-primary/5 p-3 rounded-xl border border-primary/10">
             <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5"><Globe className="w-4 h-4"/> {t.langSection}</h3>
             
             <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium">{t.interfaceLang}:</span>
                <div className="flex bg-background border border-border rounded-lg p-1">
                    {['ru', 'en', 'de'].map(l => (
                        <button key={l} onClick={() => { setAppLang(l as any); localStorage.setItem('appLang', l); }} 
                                className={`px-2 py-1 rounded-md text-sm transition-all ${appLang === l ? 'bg-primary text-primary-foreground shadow-sm' : 'opacity-50 hover:opacity-100'}`}>
                            {l === 'ru' ? '🇷🇺' : l === 'en' ? '🇺🇸' : '🇩🇪'}
                        </button>
                    ))}
                </div>
             </div>

             <label className="flex items-center justify-between mt-3 cursor-pointer">
                <span className="text-sm font-medium">{t.skipTrans}:</span>
                <input 
                  type="checkbox" 
                  checked={skipTranslation} 
                  onChange={e => { setSkipTranslation(e.target.checked); localStorage.setItem('skipTrans', String(e.target.checked)); }} 
                  className="rounded border-border text-primary focus:ring-primary w-5 h-5" 
                />
             </label>
          </section>

          <section className="space-y-3 pt-2">
             <h3 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-border pb-1">{t.identitySection}</h3>
             <SettingInput label="Organizer Email" icon={<Mail className="w-4 h-4"/>} value={local.organizerEmail} onChange={(v:any) => setLocal({...local, organizerEmail: v})} placeholder="me@example.com" />
             <SettingInput label="Security Key" icon={<Lock className="w-4 h-4"/>} value={local.securityKey} onChange={(v:any) => setLocal({...local, securityKey: v})} placeholder="Your Secret Password" type="password" />
          </section>

          <section className="space-y-3 pt-2">
             <h3 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-border pb-1">{t.webhooksSection}</h3>
             <SettingInput label="Decode Webhook (Gemini)" icon={<LinkIcon className="w-4 h-4"/>} value={local.decodeWebhook} onChange={(v:any) => setLocal({...local, decodeWebhook: v})} placeholder="https://hook.make.com/..." />
             <SettingInput label="Save Webhook (Calendar)" icon={<LinkIcon className="w-4 h-4"/>} value={local.saveWebhook} onChange={(v:any) => setLocal({...local, saveWebhook: v})} placeholder="https://hook.make.com/..." />
             <SettingInput label="Fetch Locations (Optional)" icon={<RefreshCw className="w-4 h-4"/>} value={local.fetchLocationsWebhook} onChange={(v:any) => setLocal({...local, fetchLocationsWebhook: v})} placeholder="https://hook.make.com/..." />
             
             <button 
                onClick={() => onSync(local.fetchLocationsWebhook)} 
                disabled={isSyncing || !local.fetchLocationsWebhook}
                className="relative w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-50 overflow-hidden"
             >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span className="truncate">{syncProgress || "Syncing..."}</span>
                  </>
                ) : (
                  <>
                    <History className="w-4 h-4 shrink-0" />
                    <span>{t.syncHistory}</span>
                  </>
                )}
             </button>
          </section>

          <section className="space-y-3 pt-2">
             <h3 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-border pb-1">{t.prefsSection}</h3>
             <SettingInput label="Calendar ID" icon={<Hash className="w-4 h-4"/>} value={local.calendarId} onChange={(v:any) => setLocal({...local, calendarId: v})} placeholder="primary" />
             <div>
               <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><Users className="w-4 h-4" /> Default Guests</label>
               <textarea value={local.defaultGuests} onChange={e => setLocal({...local, defaultGuests: e.target.value})} placeholder="email1, email2" rows={2} className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none" style={{ fontSize: '16px' }} />
             </div>
             
             <div className="flex items-center justify-between p-3 mt-2 bg-muted/50 rounded-lg border border-border">
                <label className="text-xs font-medium text-foreground flex items-center gap-2">
                  <Bug className="w-4 h-4 text-primary" /> Show Debug Console
                </label>
                <button 
                  onClick={() => setShowDebug(!showDebug)} 
                  className={`w-10 h-6 rounded-full transition-colors relative focus:outline-none ${showDebug ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${showDebug ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
             </div>
          </section>
        </div>

        <button onClick={handleSave} className="w-full mt-6 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all">
          <Check className="w-5 h-5" /> {t.saveSettings}
        </button>
      </div>
    </div>
  );
};

const SettingInput = ({ label, icon, value, onChange, placeholder, type = "text" }: any) => (
  <div className="text-left">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">{icon} {label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all" style={{fontSize: '16px'}} />
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────
const VoiceCalendarApp = () => {
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [parsedEvent, setParsedEvent] = useState<ParsedEvent | null>(null);
  
  // Состояние для кнопки-шафл
  const [rawInputStore, setRawInputStore] = useState('');
  const [isShowingRawTitle, setIsShowingRawTitle] = useState(false);

  const [history, setHistory] = useState<ParsedEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDatabase, setShowDatabase] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  
  // Языковые настройки (сохраняются локально)
  const [appLang, setAppLang] = useState<'ru'|'en'|'de'>(() => (localStorage.getItem('appLang') as any) || 'ru');
  const [skipTranslation, setSkipTranslation] = useState(() => localStorage.getItem('skipTrans') === 'true');
  
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>(() => {
    return JSON.parse(localStorage.getItem(FAV_PLACES_KEY) || '[]');
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [isRequestingMic, setIsRequestingMic] = useState(false);

  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const locationTimeoutRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Получаем словарь для текущего языка
  const t = DICT[appLang] || DICT['ru']; 

  const settingsConfigured = useMemo(() => 
    settings.organizerEmail.trim() !== '' && 
    settings.decodeWebhook.trim() !== '' && 
    settings.saveWebhook.trim() !== '', 
  [settings]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('calendarHistory');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const handleSaveSettings = (s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  const handleSyncLocations = async (webhookUrl: string) => {
    const cleanUrl = webhookUrl?.trim();
    if (!cleanUrl) {
      toast.error("Fetch Webhook not configured");
      return;
    }

    setIsSyncing(true);
    const uniquePlaces: Record<string, FavoritePlace> = {};
    let totalValidCount = 0;

    const TOTAL_DAYS = 1095;
    const CHUNK_SIZE = 90; 
    const chunks = [];
    
    for (let i = 0; i < TOTAL_DAYS; i += CHUNK_SIZE) {
      chunks.push({ startDays: Math.min(i + CHUNK_SIZE, TOTAL_DAYS), endDays: i });
    }

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setSyncProgress(`Syncing part ${i + 1} of ${chunks.length}...`);
        addLog(`Requesting chunk ${i + 1}/${chunks.length} (days -${chunk.startDays} to -${chunk.endDays})...`);

        const now = new Date();
        const startDate = new Date();
        startDate.setDate(now.getDate() - chunk.startDays);
        const endDate = new Date();
        endDate.setDate(now.getDate() - chunk.endDays);

        const res = await fetch(cleanUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: startDate.toISOString(), endDate: endDate.toISOString() })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const textData = await res.text();
        
        if (textData === 'Accepted') {
           addLog(`⚠️ Chunk ${i + 1} empty. Skipping...`);
           continue; 
        }

        const data = JSON.parse(textData);
        if (Array.isArray(data)) {
          let chunkCount = 0;
          data.forEach((item: any) => {
            const rawLoc = (item.location || item.Location || '');
            const rawTitle = (item.summary || item.Summary || '');
            const cleanLoc = rawLoc.trim();
            const cleanTitle = rawTitle.trim();

            if (cleanLoc.length > 2) {
              totalValidCount++; chunkCount++;
              const normalizedLoc = cleanLoc.toLowerCase().replace(/\s+/g, ' ');
              if (!uniquePlaces[normalizedLoc]) {
                uniquePlaces[normalizedLoc] = { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), location: cleanLoc, title: cleanTitle };
              } else {
                const existing = uniquePlaces[normalizedLoc];
                if (cleanTitle.length > existing.title.length) existing.title = cleanTitle;
                if (cleanLoc.length > existing.location.length) existing.location = cleanLoc;
              }
            }
          });
          addLog(`✅ Chunk ${i + 1} done: processed ${chunkCount} valid addresses.`);
        }
      }

      const cleanArray = Object.values(uniquePlaces);
      cleanArray.sort((a, b) => a.title.localeCompare(b.title));

      setFavoritePlaces(cleanArray);
      localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(cleanArray));
      
      toast.success(`Done! Saved ${cleanArray.length} unique addresses.`);
      addLog(`Total events: ${totalValidCount} -> Unique: ${cleanArray.length}.`);
    } catch (err: any) {
      addLog(`Sync error: ${err.message}`);
      toast.error("Sync stopped due to an error.");
    } finally {
      setIsSyncing(false);
      setSyncProgress('');
    }
  };

  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, { headers: { 'Accept-Language': 'ru-RU,en;q=0.9' }});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const suggestions = data.map((item: any) => item.display_name as string);
      setLocationSuggestions(suggestions);
      setShowLocationDropdown(suggestions.length > 0);
    } catch (err: any) {
      setLocationSuggestions([]);
    }
  }, []);

  const handleLocationChange = (val: string) => {
    if (!parsedEvent) return;
    setParsedEvent({ ...parsedEvent, location: val });
    clearTimeout(locationTimeoutRef.current);
    locationTimeoutRef.current = setTimeout(() => searchLocation(val), 400);
  };

  const selectLocation = (loc: string) => {
    if (!parsedEvent) return;
    setParsedEvent({ ...parsedEvent, location: loc });
    setShowLocationDropdown(false);
  };

  const handleChipClick = (value: string) => {
    setTextInput(prev => prev ? `${prev} ${value}` : value);
    inputRef.current?.focus();
  };

  const handleProcessText = () => {
    if (!textInput.trim()) return;
    if (!settingsConfigured) return setShowSettings(true);
    if (recognitionRef.current) recognitionRef.current.stop();
    setEditableTranscript(textInput.trim());
    setRawInputStore(textInput.trim()); // Сохраняем сырой ввод для шафла
    handleSendForDecoding(textInput.trim());
  };

  const handleRetry = () => {
    setTranscript(''); setEditableTranscript(''); transcriptRef.current = ''; setTextInput(''); setPhase('idle');
    setRawInputStore('');
    setIsShowingRawTitle(false);
  };

  const buildAuditFooter = () => {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `\n\n--- Created via Voice-Assistant on ${date} at ${time} ---`;
  };

  const handleSendForDecoding = async (textOverride?: string) => {
    setPhase('processing');
    const now = new Date();
    const textToProcess = textOverride || editableTranscript;
    
    if (!rawInputStore) setRawInputStore(textToProcess);

    addLog(`🚀 [DECODE] Старт обработки. Длина текста: ${textToProcess.length} симв.`);

    const payload = {
      transcript: textToProcess,
      securityKey: settings.securityKey,
      currentDate: now.toISOString().split('T')[0],
      currentTime: now.toTimeString().slice(0, 5),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      skipTranslation, 
      interfaceLang: appLang 
    };

    try {
      addLog(`📡 [DECODE] Отправка запроса в Make.com...`);
      
      const res = await fetch(settings.decodeWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      addLog(`📥 [DECODE] Получен ответ. Статус: ${res.status}`);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      // Читаем токены
      const tokenCount = res.headers.get('X-Total-Tokens');
      if (tokenCount) {
        addLog(`⚡ [GEMINI] Использовано токенов: ${tokenCount}`);
      } else {
        addLog(`⚠️ [GEMINI] Токены не получены (проверь Access-Control-Expose-Headers в Make)`);
      }
      
      const rawText = await res.text();
      addLog(`📝 [DECODE] Сырой ответ получен (длина: ${rawText.length} симв.)`);
      
      let data;
      try {
        data = JSON.parse(rawText);
        addLog(`✅ [DECODE] JSON успешно распарсен`);
      } catch (parseError) {
        const safeRawText = rawText ? String(rawText) : "EMPTY_RESPONSE";
        const snippet = safeRawText.length > 100 ? safeRawText.substring(0, 100) + '...' : safeRawText;
        addLog(`❌ [DECODE] Ошибка JSON! Текст: ${snippet}`);
        throw new Error(`Gemini JSON error: ${snippet}`);
      }
      
      setParsedEvent({
        id: Date.now(),
        title: data.title ?? '',
        date: data.date ?? '',
        time: data.time ?? '',
        duration: data.duration ?? '60', 
        location: data.location ?? '',
        guests: data.guests ?? settings.defaultGuests,
        description: textToProcess + buildAuditFooter(),
        guestsCanModify: true,
        reminder: 15,
      });
      
      setFieldErrors({});
      setIsShowingRawTitle(false);
      setPhase('validation');
    } catch (e: any) {
      addLog(`❌ [DECODE] Критическая ошибка: ${e.message}`);
      setErrorMessage(`Error: ${e.message}`);
      setPhase('error');
    }
  };

  const validateAndConfirm = () => {
    if (!parsedEvent) return;
    const errors: Record<string, string> = {};
    if (!parsedEvent.title.trim()) errors.title = 'Required';
    if (!parsedEvent.date.trim()) errors.date = 'Required';
    if (!parsedEvent.time.trim()) errors.time = 'Required';

    if (Object.keys(errors).length > 0) return setFieldErrors(errors);
    setFieldErrors({});
    handleConfirm();
  };

  const handleConfirm = async () => {
    if (!parsedEvent) return;
    setPhase('saving');

    const loc = parsedEvent.location?.trim();
    if (loc && loc.length > 2) {
      const exists = favoritePlaces.some(p => p.location.toLowerCase() === loc.toLowerCase());
      if (!exists) {
        const newPlace = { id: Date.now().toString(), location: loc, title: parsedEvent.title || loc };
        const updatedPlaces = [newPlace, ...favoritePlaces].sort((a,b) => a.title.localeCompare(b.title));
        setFavoritePlaces(updatedPlaces);
        localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(updatedPlaces));
        addLog(`📌 [DB] Автосохранение нового адреса: ${loc}`);
      }
    }

    let isoStart = '', isoEnd = '';
    try {
      const startDateObj = new Date(`${parsedEvent.date}T${parsedEvent.time}`);
      isoStart = startDateObj.toISOString();
      const durationMins = parseInt(String(parsedEvent.duration), 10) || 60;
      isoEnd = new Date(startDateObj.getTime() + durationMins * 60000).toISOString();
    } catch (err) { }

    const savePayload = {
      ...parsedEvent,
      isoStart, isoEnd,
      securityKey: settings.securityKey,
      organizerEmail: settings.organizerEmail,
      calendarId: settings.calendarId || 'primary',
      guests: parsedEvent.guests || settings.defaultGuests,
      guestsCanModify: true,
      reminder: 15,
      skipTranslation,
      interfaceLang: appLang 
    };

    try {
      addLog(`📡 [SAVE] Отправка данных в календарь...`);
      const res = await fetch(settings.saveWebhook, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(savePayload) 
      });
      
      addLog(`📥 [SAVE] Получен ответ от календаря. Статус: ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const newHistory = [parsedEvent, ...history].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem('calendarHistory', JSON.stringify(newHistory));

      addLog(`✅ [SAVE] Встреча успешно создана!`);
      setPhase('success');
      setTimeout(() => resetToIdle(), 2000);
    } catch (e: any) {
      addLog(`❌ [SAVE] Ошибка при сохранении: ${e.message}`);
      setErrorMessage(`Save failed: ${e.message}`);
      setPhase('error');
    }
  };

  const resetToIdle = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (recognitionRef.current) recognitionRef.current.stop();
    setParsedEvent(null); setTranscript(''); setEditableTranscript(''); setTextInput(''); setErrorMessage(''); setFieldErrors({}); setPhase('idle');
    setRawInputStore('');
    setIsShowingRawTitle(false);
  };

  const handleDuplicate = (oldEvent: ParsedEvent) => {
    setParsedEvent({ ...oldEvent, id: Date.now(), description: oldEvent.description || '' });
    setFieldErrors({});
    setPhase('validation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistory = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('calendarHistory', JSON.stringify(updated));
    addLog(`Deleted event id=${id}`);
  };

  // Функция для переключения заголовка
  const toggleTitleShuffle = () => {
    if (!parsedEvent || !rawInputStore) return;
    
    // Если текущий title совпадает с сырым вводом, возвращаем ИИ-версию (мы её достаем из description, куда она изначально сохранялась вместе с подписью, или используем трюк).
    // Но так как у нас нет отдельного стейта для ИИ-тайтла, давай просто сохранять его перед первым шафлом!
    
    if (parsedEvent.title === rawInputStore) {
        // Чтобы не усложнять стейты, просто берем ИИ-заголовок, который мы временно сохраним в новом свойстве 'aiTitle' 
        setParsedEvent({ ...parsedEvent, title: (parsedEvent as any).aiTitle || '' });
        toast.success("Reverted to AI title");
    } else {
        // Сохраняем текущий (ИИ) заголовок перед тем, как заменить его на сырой
        setParsedEvent({ ...parsedEvent, aiTitle: parsedEvent.title, title: rawInputStore } as any);
        toast.success("Reverted to original input");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md pt-8 pb-4 text-center select-none shadow-sm">
        
        <button onClick={(e) => { e.stopPropagation(); setShowDatabase(true); }} className="absolute top-8 left-4 p-2.5 rounded-xl hover:bg-muted transition-colors group" title="Places Database">
          <BookOpen className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <div className="flex items-center justify-center gap-3 mb-1 mt-2">
          <Calendar className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Voice Assistant</h1>
        </div>
        <p className="text-muted-foreground text-xs">{t.subtitle}</p>
        
        <button onClick={(e) => { e.stopPropagation(); setShowSettings(true); }} className="absolute top-8 right-4 p-2.5 rounded-xl hover:bg-muted transition-colors" title="Settings">
          <Settings className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          {!settingsConfigured && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-destructive rounded-full border border-background animate-pulse" />}
        </button>
      </header>

      <div className="max-w-md mx-auto px-4 pb-12 mt-4">

        {!settingsConfigured && phase === 'idle' && (
          <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Setup required</p>
              <button onClick={() => setShowSettings(true)} className="mt-2 text-xs font-semibold text-primary hover:underline">Open Settings →</button>
            </div>
          </div>
        )}

        {phase === 'idle' && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-2 shadow-sm">
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {textInput.trim() && (
                    <button onClick={() => { setTextInput(''); inputRef.current?.focus(); }} className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <textarea
                    ref={inputRef}
                    value={textInput}
                    onChange={e => {
                      setTextInput(e.target.value);
                      const el = e.target;
                      el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 250) + 'px';
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleProcessText(); } }}
                    placeholder="..."
                    rows={1}
                    className="w-full h-full bg-transparent px-3 py-3 pr-10 text-foreground focus:outline-none resize-none"
                    style={{ minHeight: '140px', fontSize: '16px' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-2 px-2 pb-1">
                <button onClick={handleProcessText} disabled={!textInput.trim()} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 hover:enabled:opacity-90">
                  <Zap className="w-4 h-4" /> {t.process}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_CHIPS.map(chip => (
                <button key={chip.value} onClick={() => handleChipClick(chip.value)} className="px-3.5 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium hover:bg-primary/20 hover:text-primary border border-border transition-all">
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- Пропускаем Recording/Review для экономии места, они остались без изменений --- */}

        {(phase === 'processing' || phase === 'saving') && (
          <div className="flex flex-col items-center gap-6 py-16">
            <Loader2 className="w-14 h-14 text-primary animate-spin" />
          </div>
        )}

        {phase === 'success' && (
          <div className="flex flex-col items-center gap-6 py-16">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center shadow-inner"><CheckCircle2 className="w-12 h-12 text-primary" /></div>
          </div>
        )}

        {phase === 'error' && (
          <div className="bg-card border border-destructive/50 rounded-2xl p-6 shadow-lg text-left">
            <h2 className="text-lg font-semibold text-destructive mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> {t.error}</h2>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-5"><p className="text-destructive font-mono text-sm break-all">{errorMessage}</p></div>
            <button onClick={resetToIdle} className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-semibold py-3.5 rounded-xl border border-border">
              <RotateCcw className="w-4 h-4" /> {t.retry}
            </button>
          </div>
        )}

        {phase === 'validation' && parsedEvent && (
          <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-lg shadow-primary/5 text-left animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> {t.checkDetails}</h2>
            <div className="space-y-4">
              
              {/* --- Поле Title с кнопкой-шафл --- */}
              <div className="relative">
                <InputField 
                  icon={<Type className="w-4 h-4" />} 
                  label={t.title} 
                  type="text" 
                  value={parsedEvent.title} 
                  onChange={(val:any) => { 
                    setParsedEvent({ ...parsedEvent, title: val }); 
                    setFieldErrors(prev => { const n = { ...prev }; delete n.title; return n; }); 
                  }} 
                  required 
                  error={fieldErrors.title} 
                />
                {rawInputStore && (
                  <button 
                    type="button"
                    onClick={toggleTitleShuffle}
                    className="absolute right-3 top-10 p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                    title="Revert to original input"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <InputField icon={<Calendar className="w-4 h-4" />} label={t.date} type="date" value={parsedEvent.date} onChange={(val:any) => { setParsedEvent({ ...parsedEvent, date: val }); setFieldErrors(prev => { const n = { ...prev }; delete n.date; return n; }); }} required error={fieldErrors.date} />
                <InputField icon={<Clock className="w-4 h-4" />} label={t.time} type="time" value={parsedEvent.time} onChange={(val:any) => { setParsedEvent({ ...parsedEvent, time: val }); setFieldErrors(prev => { const n = { ...prev }; delete n.time; return n; }); }} required error={fieldErrors.time} />
              </div>

              <div className="w-1/2 pr-1.5">
                <InputField icon={<Timer className="w-4 h-4" />} label={t.duration} type="number" value={parsedEvent.duration} onChange={(val: any) => setParsedEvent({ ...parsedEvent, duration: val })} />
              </div>
              
              <div className="flex gap-2 items-start mt-3 relative">
                <div className="flex-1 relative">
                  <InputField icon={<MapPin className="w-4 h-4" />} label={t.location} type="text" value={parsedEvent.location} onChange={handleLocationChange} />
                  {showLocationDropdown && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-primary/30 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {locationSuggestions.map((loc, i) => (
                        <button key={i} type="button" onClick={() => selectLocation(loc)} className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-primary/10 transition-colors truncate border-b border-border/50 last:border-0">
                          <MapPin className="w-3.5 h-3.5 inline mr-2 text-primary" />{loc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="pt-[22px]"> 
                  <button type="button" onClick={() => setShowDatabase(true)} className="h-[46px] w-[46px] rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center hover:bg-primary/20 transition-all shadow-sm">
                    <BookOpen className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <InputField icon={<Users className="w-4 h-4" />} label={t.guests} type="text" value={parsedEvent.guests} onChange={(val:any) => setParsedEvent({ ...parsedEvent, guests: val })} />

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-2 shadow-inner">
                 <label className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-2"><FileText className="w-3 h-3"/> {t.desc}</label>
                 <textarea value={parsedEvent.description} onChange={e => setParsedEvent({...parsedEvent, description: e.target.value})} className="w-full bg-transparent text-sm focus:outline-none resize-none leading-relaxed text-left" rows={4} style={{fontSize: '16px'}} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={validateAndConfirm} className="flex-[2] flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all glow-primary">
                <Check className="w-5 h-5" /> {t.confirm}
              </button>
              <button onClick={resetToIdle} className="flex-1 flex items-center justify-center gap-2 bg-destructive/15 text-destructive font-semibold py-3.5 rounded-xl hover:bg-destructive/25 transition-all border border-destructive/20 shadow-sm">
                <X className="w-5 h-5" /> {t.cancel}
              </button>
            </div>
          </div>
        )}

        {/* --- Корзина и Recent Events --- */}
        {phase === 'idle' && history.length > 0 && (
          <div className="mt-8 text-left">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t.recentEvents}</h3>
            <div className="space-y-2.5">
              {history.map((item, i) => (
                <div key={`${item.id}-${i}`} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between group hover:border-primary/30 transition-colors shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground font-medium truncate text-sm">{item.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-muted-foreground text-xs flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.time}</span>
                      {item.location && <span className="flex items-center gap-1 truncate max-w-[120px]"><MapPin className="w-3 h-3" />{item.location}</span>}
                    </div>
                  </div>
                  <div className="ml-3 flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleDuplicate(item); }} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"><Copy className="w-4 h-4" /></button>
                    <button onClick={(e) => handleDeleteHistory(item.id, e)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- Системные логи --- */}
        {showDebug && (
          <div className="mt-8 bg-black/95 border border-primary/50 rounded-xl p-4 font-mono text-[10px] text-green-400 shadow-2xl text-left">
            <div className="flex items-center justify-between mb-3 border-b border-green-400/30 pb-2">
              <h3 className="font-bold uppercase tracking-widest flex items-center gap-2">
                <Bug className="w-3 h-3" /> System Logs
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(debugLogs.join('\n'));
                    toast.success('Logs copied to clipboard!');
                  }} 
                  className="flex items-center gap-1 text-white/50 hover:text-white bg-white/10 px-2 py-1 rounded transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button 
                  onClick={() => setDebugLogs([])} 
                  className="text-white/50 hover:text-white bg-white/10 px-2 py-1 rounded transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5 flex flex-col-reverse">
              {debugLogs.map((log, i) => <p key={i} className="break-all">{log}</p>)}
              {debugLogs.length === 0 && <span className="text-green-400/50">No logs yet...</span>}
            </div>
          </div>
        )}

      </div>

      <SettingsModal 
        open={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={settings} 
        onSave={handleSaveSettings} 
        onSync={handleSyncLocations} 
        isSyncing={isSyncing} 
        syncProgress={syncProgress} 
        showDebug={showDebug} 
        setShowDebug={setShowDebug}
        appLang={appLang}
        setAppLang={setAppLang}
        skipTranslation={skipTranslation}
        setSkipTranslation={setSkipTranslation}
        t={t}
      />
      
      <PlacesDatabaseModal 
        open={showDatabase} 
        onClose={() => setShowDatabase(false)} 
        places={favoritePlaces} 
        setPlaces={setFavoritePlaces} 
        onSelect={(loc:any) => { if (parsedEvent) setParsedEvent({ ...parsedEvent, location: loc }); setShowDatabase(false); }} 
        t={t}
      />
    </div>
  );
};

const InputField = ({ icon, label, type, value, onChange, placeholder, required, error }: any) => (
  <div className="text-left w-full">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
      {icon} {label} {required && <span className="text-destructive">*</span>}
    </label>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full bg-muted border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary transition-all ${error ? 'border-destructive ring-1 ring-destructive/50' : 'border-border'}`}
      style={{ fontSize: '16px' }}
    />
    {error && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {error}</p>}
  </div>
);

export default VoiceCalendarApp;
