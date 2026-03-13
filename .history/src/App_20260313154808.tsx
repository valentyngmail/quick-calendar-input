import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Settings, Loader2, CheckCircle2, AlertTriangle, RotateCcw, Bug, Copy, BookOpen, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

import { AppPhase, ParsedEvent, AppSettings, FavoritePlace, DICT, FAV_PLACES_KEY, loadSettings, saveSettings } from './Core';
import { SettingsModal, SyncModal, PlacesDatabaseModal, ReviewScreen } from './Components';

const VoiceCalendarApp = () => {
  //добавляем трекер задач
  const [showTasks, setShowTasks] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<ParsedEvent[]>(() => 
  JSON.parse(localStorage.getItem('pendingTasks') || '[]')  );
  
  // --- State ---
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [textInput, setTextInput] = useState('');
  const [parsedEvent, setParsedEvent] = useState<ParsedEvent | null>(null);
  const [rawInputStore, setRawInputStore] = useState('');
  const [history, setHistory] = useState<ParsedEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showDatabase, setShowDatabase] = useState(false);
  const [isKbOpen, setIsKbOpen] = useState(false);
  
  // App Logic States
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [appLang, setAppLang] = useState<'ru'|'en'|'de'>(() => (localStorage.getItem('appLang') as 'ru'|'en'|'de') || 'ru');
  const [skipTranslation, setSkipTranslation] = useState(() => localStorage.getItem('skipTrans') === 'true');
  
  // Авто-миграция адресов
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>(() => {
    let places = JSON.parse(localStorage.getItem(FAV_PLACES_KEY) || '[]');
    if (places.length === 0) {
      const oldPlaces = localStorage.getItem('calendarFavoritePlacesV3');
      if (oldPlaces && oldPlaces !== '[]') {
        places = JSON.parse(oldPlaces);
        localStorage.setItem(FAV_PLACES_KEY, oldPlaces);
      }
    }
    return places;
  });
  
  // Debug & Sync States
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  
  // Состояния для управления списком задач (Хвостов)
  const [showTasks, setShowTasks] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<ParsedEvent[]>(() => 
    JSON.parse(localStorage.getItem('pendingTasks') || '[]')
  );

  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  // Location Autocomplete States
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const locationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = DICT[appLang] || DICT['ru']; 

  const settingsConfigured = useMemo(() => 
    settings.organizerEmail.trim() !== '' && 
    settings.decodeWebhook.trim() !== '' && 
    settings.saveWebhook.trim() !== '', 
  [settings]);

  // --- Keyboard & Viewport Sync (КАК В INDEX.HTML) ---
  useEffect(() => {
    const sync = () => {
      if (!window.visualViewport || !dockRef.current || !mainRef.current) return;
      const kbHeight = window.innerHeight - window.visualViewport.height;
      
      if (kbHeight > 50) {
        setIsKbOpen(true);
        dockRef.current.style.bottom = `${kbHeight + 16}px`;
        mainRef.current.style.bottom = `${kbHeight}px`;
      } else {
        setIsKbOpen(false);
        dockRef.current.style.bottom = 'calc(env(safe-area-inset-bottom) + 16px)';
        mainRef.current.style.bottom = '0px';
      }
    };
    
    window.visualViewport?.addEventListener('resize', sync);
    window.addEventListener('resize', sync);
    sync(); // init
    return () => {
      window.visualViewport?.removeEventListener('resize', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  // --- Helpers ---
  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  const formatHistoryDate = (d: string, time: string) => {
    if (!d) return time;
    const parts = d.split('-'); 
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[parseInt(parts[1], 10) - 1] || parts[1];
      return `${month} ${parts[2]} • ${time}`;
    }
    return `${d} • ${time}`;
  };

  useEffect(() => {
    const saved = localStorage.getItem('calendarHistory');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // --- Location Autocomplete (OSM) ---
  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) { setLocationSuggestions([]); setShowLocationDropdown(false); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, { headers: { 'Accept-Language': 'ru-RU,en;q=0.9' }});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const suggestions = data.map((item: { display_name: string }) => item.display_name);
      setLocationSuggestions(suggestions);
      setShowLocationDropdown(suggestions.length > 0);
    } catch (err: unknown) { setLocationSuggestions([]); }
  }, []);

  const handleLocationChange = (val: string) => {
    if (!parsedEvent) return;
    setParsedEvent({ ...parsedEvent, location: val });
    if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
    locationTimeoutRef.current = setTimeout(() => searchLocation(val), 400);
  };

  const selectLocation = (loc: string) => {
    if (!parsedEvent) return;
    setParsedEvent({ ...parsedEvent, location: loc });
    setShowLocationDropdown(false);
  };

  // --- Processing & Webhooks ---
  const handleProcessText = () => {
    if (!textInput.trim()) return;
    if (!settingsConfigured) return setShowSettings(true);
    inputRef.current?.blur();
    setRawInputStore(textInput.trim()); 
    handleSendForDecoding(textInput.trim());
  };

  const handleSendForDecoding = async (text: string) => {
    setPhase('processing');
    addLog(`🚀 [DECODE] Sending: "${text}"`);
    try {
      const res = await fetch(settings.decodeWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, securityKey: settings.securityKey, currentDate: new Date().toISOString().split('T')[0], interfaceLang: appLang, skipTranslation }),
      });
      addLog(`📥 [SAVE] Получен ответ от календаря. Статус: ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Если включен режим задачи, сохраняем её в локальный список "Хвостов"
      if (parsedEvent.isTask) {
        const updatedTasks = [parsedEvent, ...pendingTasks];
        setPendingTasks(updatedTasks);
        localStorage.setItem('pendingTasks', JSON.stringify(updatedTasks));
        addLog(`📌 [TASK] Задача добавлена в список контроля.`);
      }

      const newHistory = [parsedEvent, ...history].slice(0, 10);
      
      const rawText = await res.text();
      addLog(`📝 [DECODE] Raw JSON: ${rawText}`);
      const data = JSON.parse(rawText);
      
      setParsedEvent({ 
        ...data, 
        id: Date.now(), 
        guests: data.guests || settings.defaultGuests,
        duration: data.duration || '60',
        description: text + '\n\n--- Created via VoiceCal ---' 
      });
      
      setPhase('validation');
    } catch (e: unknown) { 
      const errorMsg = e instanceof Error ? e.message : 'Decoding failed';
      addLog(`❌ [DECODE ERROR] ${errorMsg}`);
      setErrorMessage(errorMsg); 
      setPhase('error'); 
    }
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
        addLog(`📌 [DB] Auto-saved new address: ${loc}`);
      }
    }

    let isoStart = '', isoEnd = '';
    try {
      const startDateObj = new Date(`${parsedEvent.date}T${parsedEvent.time}`);
      isoStart = startDateObj.toISOString();
      const durationMins = parseInt(String(parsedEvent.duration), 10) || 60;
      isoEnd = new Date(startDateObj.getTime() + durationMins * 60000).toISOString();
    } catch (err: unknown) { addLog(`⚠️ [DATE ERROR] Failed to parse dates`); }

    const savePayload = {
      ...parsedEvent,
      isoStart, isoEnd,
      start: isoStart, 
      end: isoEnd,
      securityKey: settings.securityKey,
      organizerEmail: settings.organizerEmail,
      calendarId: settings.calendarId || 'primary',
      guests: parsedEvent.guests || settings.defaultGuests,
      guestsCanModify: true, reminder: 15, skipTranslation, interfaceLang: appLang 
    };

    try {
      addLog(`📡 [SAVE] Sending to Calendar Webhook...`);
      const res = await fetch(settings.saveWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload),
      });
      addLog(`📥 [SAVE] Response status: ${res.status}`);
      if (!res.ok) {
        const errText = await res.text();
        addLog(`❌ [SAVE ERROR] ${errText}`);
        throw new Error(`Failed to save: ${res.status}`);
      }
      
      const updatedHistory = [parsedEvent, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem('calendarHistory', JSON.stringify(updatedHistory));

      setPhase('success');
      setTimeout(() => { setPhase('idle'); setTextInput(''); }, 2000);
    } catch (e: unknown) { 
      addLog(`❌ [SAVE EXCEPTION] ${e instanceof Error ? e.message : 'Unknown error'}`);
      setErrorMessage("Save failed. Check Debug Console."); 
      setPhase('error'); 
    }
  };

  const handleDuplicate = (oldEvent: ParsedEvent) => {
    setParsedEvent({ ...oldEvent, id: Date.now(), description: oldEvent.description || '' });
    setRawInputStore(''); // Очищаем старый промпт, чтобы не плодить пустые кавычки
    setPhase('validation');
  };

  const handleSyncLocations = async (webhookUrl: string) => {
    const cleanUrl = webhookUrl?.trim();
    if (!cleanUrl) { toast.error("Fetch Webhook not configured"); return; }
    setIsSyncing(true); setSyncProgress("Connecting...");
    try {
      const res = await fetch(cleanUrl);
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(data));
        setFavoritePlaces(data);
        toast.success(`Synced ${data.length} locations`);
        setShowSyncModal(false);
      }
    } catch (e: unknown) { toast.error("Sync error"); } 
    finally { setIsSyncing(false); setSyncProgress(""); }
  };

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col">
      
      {/* 1. HEADER (Жестко зафиксирован сверху) */}
      <div className="absolute top-0 left-0 right-0 h-[90px] px-6 flex justify-between items-center z-50" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <button onClick={() => setShowDatabase(true)} className="p-2 text-white/40 hover:text-[#34C759] transition-colors"><BookOpen size={22} /></button>
        <div className="text-xl font-bold">Voice<span className="text-[#34C759]">Cal</span></div>
        <div className="relative">
          <button onClick={() => setShowSettings(true)} className="p-2 text-white/40 hover:text-white transition-colors"><Settings size={22} /></button>
          {!settingsConfigured && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
        </div>
      </div>

      {/* 2. INTERACTIVE AREA (Сжимается при открытии клавиатуры) */}
      <div ref={mainRef} className="absolute top-[90px] left-0 right-0 bottom-0 flex flex-col transition-all duration-300">
        
        {/* Горизонтальный скролл истории */}
        {phase === 'idle' && history.length > 0 && (
          <div className={`shrink-0 overflow-x-auto flex gap-3 px-6 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-all duration-300 ${isKbOpen ? 'opacity-0 max-h-0 pointer-events-none' : 'opacity-100 max-h-[100px]'}`}>
            {history.map((item, i) => (
              <div 
                key={`${item.id}-${i}`} 
                onClick={(e) => { e.stopPropagation(); handleDuplicate(item); }}
                className="bg-white/10 backdrop-blur-xl border border-white/5 border-t-white/10 rounded-[20px] py-3 px-4 flex items-center gap-4 shrink-0 max-w-[240px] cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="text-[15px] font-medium text-white truncate max-w-[130px]">{item.title}</div>
                  <div className="text-[12px] text-white/60">{formatHistoryDate(item.date, item.time)}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 shrink-0">
                  <RefreshCw size={14} strokeWidth={2.5} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Холст ввода */}
        <div className="flex-1 flex flex-col justify-center px-8 pb-[80px] w-full max-w-md mx-auto relative">
          {phase === 'idle' && (
            <textarea
              ref={inputRef} value={textInput} 
              onChange={e => {
                setTextInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 250) + 'px';
              }}
              placeholder={t.subtitle} 
              rows={1}
              className="w-full bg-transparent text-center text-3xl font-semibold outline-none resize-none placeholder:text-white/20"
            />
          )}

          {(phase === 'processing' || phase === 'saving') && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-[#34C759]" size={40} />
              <p className="text-white/40 font-medium">{phase === 'saving' ? 'Saving...' : 'Analyzing...'}</p>
            </div>
          )}

          {phase === 'success' && <div className="flex flex-col items-center gap-4"><CheckCircle2 className="text-[#34C759]" size={60} /><p className="text-xl font-bold">Event Saved!</p></div>}

          {phase === 'error' && (
            <div className="bg-[#1C1C1E] p-6 rounded-2xl border border-red-500/30 text-center mx-auto w-full">
              <AlertTriangle className="text-red-500 mx-auto mb-2" />
              <p className="text-red-500 font-mono text-xs mb-4">{errorMessage}</p>
              <button onClick={() => setPhase('idle')} className="w-full py-3 bg-white/10 rounded-xl flex items-center justify-center gap-2 font-bold"><RotateCcw size={16}/> Retry</button>
            </div>
          )}
        </div>
      </div>

      {/* 3. DOCK (Плавающая панель с кнопкой Create) */}
      {phase === 'idle' && (
        <div ref={dockRef} className="absolute left-6 right-6 flex justify-center bottom-[calc(env(safe-area-inset-bottom)+16px)] z-50 transition-all duration-300">
          <div className="glass-panel bg-[#1C1C1E]/80 backdrop-blur-2xl border border-white/10 border-t-white/20 rounded-[32px] p-1.5 flex items-center justify-between w-full max-w-sm shadow-2xl">
            <div className="flex bg-black/40 rounded-[28px] p-0.5">
              {(['ru', 'en', 'de'] as const).map(l => (
                <button key={l} onClick={() => { setAppLang(l); localStorage.setItem('appLang', l); }} className={`px-4 py-2.5 rounded-[24px] text-[15px] font-bold transition-colors ${appLang === l ? 'bg-white/15 text-white' : 'text-white/40'}`}>{l.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={handleProcessText} className="h-11 px-8 ml-2 bg-[#34C759] text-black rounded-[22px] font-bold active:scale-95 transition-all">Create</button>
          </div>
        </div>
      )}

      {/* FULLSCREEN DEBUG CONSOLE */}
      {showDebug && (phase === 'idle' || phase === 'error') && (
        <div className="fixed inset-0 z-[400] bg-black flex flex-col p-6 pt-16">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[#34C759] font-bold text-xl flex items-center gap-2"><Bug /> System Logs</h3>
            <button onClick={() => setShowDebug(false)} className="p-3 bg-[#1C1C1E] rounded-full text-white active:scale-95"><X size={24}/></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 mb-6 font-mono text-xs text-[#34C759] bg-[#1C1C1E] p-4 rounded-xl">
            {debugLogs.length === 0 ? <span className="opacity-50">No logs yet...</span> : debugLogs.map((log, i) => <p key={i} className="break-all border-b border-[#34C759]/20 pb-2">{log}</p>)}
          </div>
          <div className="flex gap-4 pb-8">
            <button onClick={() => { navigator.clipboard.writeText(debugLogs.join('\n')); toast.success('Copied!'); }} className="flex-[2] py-4 bg-[#34C759] text-black rounded-xl font-bold text-lg active:scale-95 transition-transform">Copy Logs</button>
            <button onClick={() => setDebugLogs([])} className="flex-1 py-4 bg-[#1C1C1E] text-white rounded-xl font-bold text-lg active:scale-95 transition-transform">Clear</button>
          </div>
        </div>
      )}

      {/* Review Screen */}
      {phase === 'validation' && parsedEvent && (
        <ReviewScreen 
          parsedEvent={parsedEvent} setParsedEvent={setParsedEvent} rawInputStore={rawInputStore} t={t}
          onCancel={() => setPhase('idle')} onSave={handleConfirm} 
          onLocationChange={handleLocationChange}
          locationSuggestions={locationSuggestions}
          showLocationDropdown={showLocationDropdown}
          onSelectLocation={selectLocation}
          onOpenDatabase={() => setShowDatabase(true)}
        />
      )}

      {/* Modals */}
      <SettingsModal 
        open={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSave={(s: AppSettings) => { setSettings(s); saveSettings(s); }} 
        onOpenSyncModal={() => setShowSyncModal(true)} showDebug={showDebug} setShowDebug={setShowDebug}
        appLang={appLang} setAppLang={setAppLang} skipTranslation={skipTranslation} setSkipTranslation={setSkipTranslation} t={t}
      />

      <SyncModal
        open={showSyncModal} onClose={() => setShowSyncModal(false)} settings={settings} onSaveSettings={(s: AppSettings) => { setSettings(s); saveSettings(s); }}
        onSync={handleSyncLocations} isSyncing={isSyncing} syncProgress={syncProgress}
      />

      <PlacesDatabaseModal 
        open={showDatabase} onClose={() => setShowDatabase(false)} places={favoritePlaces} setPlaces={setFavoritePlaces} 
        onSelect={(loc: string) => { if (parsedEvent) setParsedEvent({ ...parsedEvent, location: loc }); setShowDatabase(false); }} t={t}
      />
    </div>
  );
};

export default VoiceCalendarApp;