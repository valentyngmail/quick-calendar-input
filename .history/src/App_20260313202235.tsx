import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Settings, Loader2, CheckCircle2, AlertTriangle, RotateCcw, Bug, Copy, BookOpen, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

import { AppPhase, ParsedEvent, AppSettings, FavoritePlace, DICT, FAV_PLACES_KEY, loadSettings, saveSettings } from './Core';
import { SettingsModal, SyncModal, PlacesDatabaseModal, ReviewScreen, TasksListModal } from './Components';

// --- КОМПОНЕНТ СВАЙПА ДЛЯ ИСТОРИИ ---
interface SwipeableHistoryItemProps {
  item: ParsedEvent;
  onDuplicate: (item: ParsedEvent) => void;
  onDelete: (id: number) => void;
  formatHistoryDate: (date: string, time: string) => string;
}

const SwipeableHistoryItem = ({ item, onDuplicate, onDelete, formatHistoryDate }: SwipeableHistoryItemProps) => {
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const isVerticalSwipe = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
    isVerticalSwipe.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - startY.current;
    const deltaX = currentX - startX.current;

    if (!isVerticalSwipe.current && Math.abs(deltaX) > Math.abs(deltaY)) {
      setIsDragging(false);
      return;
    }

    isVerticalSwipe.current = true;
    setOffsetY(deltaY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (Math.abs(offsetY) > 60) {
      onDelete(item.id);
    } else {
      setOffsetY(0); 
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        e.stopPropagation();
        if (Math.abs(offsetY) < 10 && !isVerticalSwipe.current) onDuplicate(item);
      }}
      className="bg-white/10 backdrop-blur-xl border border-white/5 border-t-white/10 rounded-[20px] py-3 px-4 flex items-center gap-4 shrink-0 max-w-[240px] cursor-pointer"
      style={{
        transform: `translateY(${offsetY}px) scale(${isDragging ? 1.02 : 1})`,
        opacity: 1 - Math.abs(offsetY) / 100, 
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s',
        touchAction: 'pan-x' 
      }}
    >
      <div className="flex flex-col gap-0.5 min-w-0 pointer-events-none">
        <div className="text-[15px] font-medium text-white truncate max-w-[130px]">{item.title}</div>
        <div className="text-[12px] text-white/60">{formatHistoryDate(item.date, item.time)}</div>
      </div>
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 shrink-0 pointer-events-none">
        <RefreshCw size={14} strokeWidth={2.5} />
      </div>
    </div>
  );
};

const VoiceCalendarApp = () => {
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
  
  const [showTasks, setShowTasks] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<ParsedEvent[]>(() => 
    JSON.parse(localStorage.getItem('pendingTasks') || '[]')
  );

  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

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

  useEffect(() => {
    const sync = () => {
      const vv = window.visualViewport;
      if (!vv || !dockRef.current || !mainRef.current) return;
      
      const kbHeight = window.innerHeight - vv.height;
      const isKb = kbHeight > 50;
      setIsKbOpen(isKb);

      if (window.scrollY > 0) {
        window.scrollTo(0, 0);
      }

      if (isKb) {
        dockRef.current.style.bottom = `${kbHeight + 16}px`;
        mainRef.current.style.bottom = `${kbHeight}px`;
      } else {
        dockRef.current.style.bottom = 'calc(env(safe-area-inset-bottom) + 16px)';
        mainRef.current.style.bottom = '0px';
      }
    };
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);
    window.addEventListener('scroll', sync); 
    sync(); 

    return () => {
      window.visualViewport?.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('scroll', sync);
      window.removeEventListener('scroll', sync);
    };
  }, []);

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

  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) { setLocationSuggestions([]); setShowLocationDropdown(false); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`, { headers: { 'Accept-Language': `${appLang},en;q=0.9` }});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      interface OSMItem {
        display_name: string;
        name?: string;
        address?: { road?: string; pedestrian?: string; house_number?: string; city?: string; town?: string; village?: string; };
      }

      const suggestions = data.map((item: OSMItem) => {
        const addr = item.address;
        if (!addr) return item.display_name.split(',').slice(0, 3).join(',');
        const street = addr.road || addr.pedestrian || item.name || '';
        const house = addr.house_number ? ` ${addr.house_number}` : '';
        const city = addr.city || addr.town || addr.village || '';
        return street && city ? `${street}${house}, ${city}` : item.display_name.split(',').slice(0, 3).join(',');
      });
      
      setLocationSuggestions(suggestions);
      setShowLocationDropdown(suggestions.length > 0);
    } catch (err: unknown) { setLocationSuggestions([]); }
  }, [appLang]);

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

    if (settings.decodeWebhook === 'test') {
      addLog(`🧪 [MOCK] Включен тестовый режим без запроса к API`);
      setTimeout(() => {
        const mockData: ParsedEvent = {
          id: Date.now(),
          title: text.split(' ')[0] + " (Тест)",
          date: new Date().toISOString().split('T')[0],
          time: "12:00",
          duration: "60",
          location: "Тестовая локация",
          guests: settings.defaultGuests,
          description: text + '\n\n--- Mock Mode ---',
          isTask: text.toLowerCase().includes('задач') || text.toLowerCase().includes('task'),
          guestsCanModify: true,
          reminder: 15
        };
        setParsedEvent(mockData);
        setPhase('validation');
      }, 1000);
      return;
    }

    try {
      const res = await fetch(settings.decodeWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, securityKey: settings.securityKey, currentDate: new Date().toISOString().split('T')[0], interfaceLang: appLang, skipTranslation }),
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const rawText = await res.text();
      const data = JSON.parse(rawText);
      
      const newEvent: ParsedEvent = { 
        ...data, 
        id: Date.now(), 
        guests: data.guests || settings.defaultGuests,
        duration: data.duration || '60',
        description: text + '\n\n--- Created via VoiceCal ---' 
      };

      if (newEvent.isTask) {
        const updatedTasks = [newEvent, ...pendingTasks];
        setPendingTasks(updatedTasks);
        localStorage.setItem('pendingTasks', JSON.stringify(updatedTasks));
        addLog(`📌 [TASK] Задача добавлена в список контроля.`);
      }

      setParsedEvent(newEvent);
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

    if (settings.saveWebhook === 'test') {
      addLog(`🧪 [MOCK] Имитация сохранения в календарь...`);
      setTimeout(() => {
        if (parsedEvent.isTask) {
          const updatedTasks = [parsedEvent, ...pendingTasks];
          setPendingTasks(updatedTasks);
          localStorage.setItem('pendingTasks', JSON.stringify(updatedTasks));
          addLog(`📌 [TASK] (Mock) Задача добавлена в список контроля.`);
        }

        const updatedHistory = [parsedEvent, ...history].slice(0, 10);
        setHistory(updatedHistory);
        localStorage.setItem('calendarHistory', JSON.stringify(updatedHistory));
        
        setPhase('success');
        setTimeout(() => { setPhase('idle'); setTextInput(''); }, 2000);
      }, 1500);
      return;
    }

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
      
      if (parsedEvent.isTask) {
        const updatedTasks = [parsedEvent, ...pendingTasks];
        setPendingTasks(updatedTasks);
        localStorage.setItem('pendingTasks', JSON.stringify(updatedTasks));
        addLog(`📌 [TASK] Задача добавлена в список контроля.`);
      }
      
      const updatedHistory = [parsedEvent, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem('calendarHistory', JSON.stringify(updatedHistory));

      setPhase('success');
      setTimeout(() => { setPhase('idle'); setTextInput(''); }, 2000);
    } catch (e: unknown) { 
      addLog(`❌ [SAVE EXCEPTION] ${e instanceof Error ? e.message : 'Unknown error'}`);
      setErrorMessage(t.saveFailed); 
      setPhase('error'); 
    }
  };

  const handleDuplicate = (oldEvent: ParsedEvent) => {
    setParsedEvent({ ...oldEvent, id: Date.now(), description: oldEvent.description || '' });
    setPhase('validation');
  };

  const handleDeleteHistory = (id: number) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('calendarHistory', JSON.stringify(updated));
    toast.success(t.deleted);
  };

  const handleMarkDone = (taskId: number) => {
    const updated = pendingTasks.filter(t => t.id !== taskId);
    setPendingTasks(updated);
    localStorage.setItem('pendingTasks', JSON.stringify(updated));
    toast.success(t.taskCompleted);
  };

  const handleReschedule = (task: ParsedEvent) => {
    setParsedEvent({ ...task, id: Date.now() });
    setPhase('validation');
    setShowTasks(false);
  };

  const handleSyncLocations = async (webhookUrl: string) => {
    const cleanUrl = webhookUrl?.trim();
    if (!cleanUrl) { toast.error(t.fetchWebhookEmpty); return; }
    setIsSyncing(true); setSyncProgress(t.syncing);
    try {
      const res = await fetch(cleanUrl);
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(data));
        setFavoritePlaces(data);
        toast.success(t.syncSuccess + data.length);
        setShowSyncModal(false);
      }
    } catch (e: unknown) { toast.error(t.syncError); } 
    finally { setIsSyncing(false); setSyncProgress(""); }
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-main)] text-white overflow-hidden flex flex-col">
      
      {/* 1. HEADER (Идеальный баланс) */}
      <div className="absolute top-0 left-0 right-0 px-4 flex items-center justify-between z-50 h-header pt-safe">
        
        {/* Левая часть: Только оперативные Задачи */}
        <div className="flex-1 flex justify-start">
          <button onClick={() => setShowTasks(true)} className="p-2 rounded-xl active:bg-white/10 transition-colors relative" title="Pending Tasks">
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const overdueCount = pendingTasks.filter(t => t.date <= todayStr).length;
              const hasTasks = pendingTasks.length > 0;
              
              return (
                <>
                  <CheckCircle2 className={`w-6 h-6 ${overdueCount > 0 ? "text-[var(--danger)]" : hasTasks ? "text-[var(--success)]" : "text-white/40"}`} />
                  {overdueCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[var(--danger)] rounded-full border-2 border-black animate-pulse" />
                  )}
                </>
              );
            })()}
          </button>
        </div>

        {/* Центр: Логотип */}
        <div className="text-xl font-bold tracking-tight shrink-0">
          Voice<span className="text-[var(--primary)]">Cal</span>
        </div>

        {/* Правая часть: Административный блок (Адреса + Настройки) */}
        <div className="flex-1 flex justify-end items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setShowDatabase(true); }} className="p-2 rounded-xl active:bg-white/10 transition-colors" title="Places Database">
            <BookOpen className="w-5 h-5 text-white/40 hover:text-white/80 transition-colors" />
          </button>

          <div className="relative">
            <button onClick={() => setShowSettings(true)} className="p-2 text-white/40 active:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            {!settingsConfigured && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--danger)] rounded-full animate-pulse border border-black" />
            )}
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE AREA */}
      <div ref={mainRef} className="absolute top-[90px] left-0 right-0 bottom-0 flex flex-col transition-all duration-300">
        
        {phase === 'idle' && history.length > 0 && (
          <div className={`shrink-0 overflow-x-auto flex gap-3 px-6 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-all duration-300 ${isKbOpen ? 'opacity-0 max-h-0 pointer-events-none' : 'opacity-100 max-h-[100px]'}`}>
            {history.map((item, i) => (
              <SwipeableHistoryItem key={`${item.id}-${i}`} item={item} onDuplicate={handleDuplicate} onDelete={handleDeleteHistory} formatHistoryDate={formatHistoryDate} />
            ))}
          </div>
        )}

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
              /* Увеличили прозрачность с 20% до 40%, чтобы текст не выглядел заблокированным */
              className="w-full bg-transparent text-center text-3xl font-semibold outline-none resize-none placeholder:text-white/40"
            />
          )}

          {(phase === 'processing' || phase === 'saving') && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
              <p className="text-white/40 font-medium">{phase === 'saving' ? t.saving : t.analyzing}</p>
            </div>
          )}

          {phase === 'success' && <div className="flex flex-col items-center gap-4"><CheckCircle2 className="text-[var(--success)]" size={60} /><p className="text-xl font-bold">{t.eventSaved}</p></div>}

          {phase === 'error' && (
            <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--danger)]/30 text-center mx-auto w-full">
              <AlertTriangle className="text-[var(--danger)] mx-auto mb-2" />
              <p className="text-[var(--danger)] font-mono text-xs mb-4">{errorMessage}</p>
              <button onClick={() => setPhase('idle')} className="w-full py-3 bg-white/10 rounded-xl flex items-center justify-center gap-2 font-bold"><RotateCcw size={16}/> {t.retry}</button>
            </div>
          )}
        </div>
      </div>

      {/* 3. DOCK */}
      {phase === 'idle' && (
        <div ref={dockRef} className="absolute left-6 right-6 flex justify-center bottom-safe-16 z-50 transition-all duration-300">
          <div className="glass-panel rounded-[32px] p-1.5 flex items-center justify-between w-full max-w-sm shadow-2xl">
            <div className="flex bg-black/40 rounded-[28px] p-0.5">
              {(['ru', 'en', 'de'] as const).map(l => (
                <button key={l} onClick={() => { setAppLang(l); localStorage.setItem('appLang', l); }} className={`px-4 py-2.5 rounded-[24px] text-[15px] font-bold transition-colors ${appLang === l ? 'bg-white/15 text-white' : 'text-white/40'}`}>{l.toUpperCase()}</button>
              ))}
            </div>
            {/* Кнопка использует Primary переменную */}
            <button onClick={handleProcessText} className="h-11 px-8 ml-2 bg-[var(--primary)] text-white rounded-[22px] font-bold active:scale-95 transition-all">{t.process}</button>
          </div>
        </div>
      )}

      {/* FULLSCREEN DEBUG CONSOLE */}
      {showDebug && (phase === 'idle' || phase === 'error') && (
        <div className="fixed inset-0 z-[400] bg-[var(--bg-main)] flex flex-col p-6 pt-16">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[var(--primary)] font-bold text-xl flex items-center gap-2"><Bug /> {t.systemLogs}</h3>
            <button onClick={() => setShowDebug(false)} className="p-3 bg-[var(--bg-surface)] rounded-full text-white active:scale-95"><X size={24}/></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 mb-6 font-mono text-xs text-[var(--primary)] bg-[var(--bg-surface)] p-4 rounded-xl">
            {debugLogs.length === 0 ? <span className="opacity-50">{t.noLogs}</span> : debugLogs.map((log, i) => <p key={i} className="break-all border-b border-[var(--primary)]/20 pb-2">{log}</p>)}
          </div>
          <div className="flex gap-4 pb-8">
            <button onClick={() => { navigator.clipboard.writeText(debugLogs.join('\n')); toast.success(t.copied); }} className="flex-[2] py-4 bg-[var(--primary)] text-white rounded-xl font-bold text-lg active:scale-95 transition-transform">{t.copyLogs}</button>
            <button onClick={() => setDebugLogs([])} className="flex-1 py-4 bg-[var(--bg-surface)] text-white rounded-xl font-bold text-lg active:scale-95 transition-transform">{t.clearLogs}</button>
          </div>
        </div>
      )}

      {/* Modals & Screens */}
      {phase === 'validation' && parsedEvent && (
        <ReviewScreen 
          parsedEvent={parsedEvent} setParsedEvent={setParsedEvent} rawInputStore={rawInputStore} t={t}
          onCancel={() => setPhase('idle')} onSave={handleConfirm} onLocationChange={handleLocationChange}
          locationSuggestions={locationSuggestions} showLocationDropdown={showLocationDropdown}
          onSelectLocation={selectLocation} onOpenDatabase={() => setShowDatabase(true)}
        />
      )}

      <SettingsModal 
        open={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSave={(s: AppSettings) => { setSettings(s); saveSettings(s); }} 
        onOpenSyncModal={() => setShowSyncModal(true)} showDebug={showDebug} setShowDebug={setShowDebug}
        appLang={appLang} setAppLang={setAppLang} skipTranslation={skipTranslation} setSkipTranslation={setSkipTranslation} t={t}
      />

      <SyncModal
        open={showSyncModal} onClose={() => setShowSyncModal(false)} settings={settings} onSaveSettings={(s: AppSettings) => { setSettings(s); saveSettings(s); }}
        onSync={handleSyncLocations} isSyncing={isSyncing} syncProgress={syncProgress} t={t}
      />

      <PlacesDatabaseModal 
        open={showDatabase} onClose={() => setShowDatabase(false)} places={favoritePlaces} setPlaces={setFavoritePlaces} 
        onSelect={(loc: string) => { if (parsedEvent) setParsedEvent({ ...parsedEvent, location: loc }); setShowDatabase(false); }} t={t}
      />

      <TasksListModal 
        open={showTasks} onClose={() => setShowTasks(false)} tasks={pendingTasks} 
        onMarkDone={handleMarkDone} onReschedule={handleReschedule} t={t} 
      />
    </div>
  );
};

export default VoiceCalendarApp;