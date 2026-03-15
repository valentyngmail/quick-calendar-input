import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Settings, Loader2, CheckCircle2, AlertTriangle, RotateCcw, Bug, Copy, BookOpen, Plus, ArrowUp, X, Trash2 } from 'lucide-react';
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
      className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.05] rounded-[24px] py-3.5 px-5 flex items-center gap-4 shrink-0 max-w-[240px] cursor-pointer"
      style={{
        transform: `translateY(${offsetY}px) scale(${isDragging ? 1.02 : 1})`,
        opacity: 1 - Math.abs(offsetY) / 100, 
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s',
        touchAction: 'pan-x' 
      }}
    >
      <div className="flex flex-col gap-0.5 min-w-0 pointer-events-none">
        <div className="text-[15px] font-semibold text-white truncate max-w-[130px] tracking-tight">{item.title}</div>
        <div className="text-[12px] font-medium text-white/40">{formatHistoryDate(item.date, item.time)}</div>
      </div>
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 pointer-events-none">
        <Plus size={16} strokeWidth={2.5} />
      </div>
    </div>
  );
};

const VoiceCalendarApp = () => {
  // --- State ---
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [textInput, setTextInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
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
  const [testMode, setTestMode] = useState(() => localStorage.getItem('testMode') === 'true'); // <-- ДОБАВИЛИ ЭТУ СТРОКУ
  
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
      if (!vv) return;
      
      // Магия: передаем реальную высоту видимой зоны в CSS переменную
      document.documentElement.style.setProperty('--app-height', `${vv.height}px`);
      
      const isKb = (window.innerHeight - vv.height) > 50;
      setIsKbOpen(isKb);
    };
    
    // Блокируем системный прыжок экрана
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);
    sync(); 

    return () => {
      window.visualViewport?.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('scroll', sync);
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

    if (testMode || settings.saveWebhook === 'test') {
      addLog(`🧪 [MOCK] Имитация сохранения в календарь...`);
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
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const res = await fetch(settings.decodeWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: text, 
          securityKey: settings.securityKey, 
          currentDate, 
          currentTime, 
          timeZone, 
          interfaceLang: appLang, 
          skipTranslation 
        }),
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const rawText = await res.text();
      const data = JSON.parse(rawText);
      
      const tokens = res.headers.get('x-total-tokens');
      const model = res.headers.get('gemini-model') || 'Gemini';

      addLog(`✅ [DECODE SUCCESS] Model: ${model} | Tokens: ${tokens || 'N/A'}`);
      addLog(`📥 [DECODE PAYLOAD] ${rawText}`);

      let finalDescription = data.description 
        ? `${data.description}\n\n🗣️ ${text}`
        : `🗣️ ${text}`;
        
      if (tokens) {
        finalDescription += `\n\n🤖 Model: ${model} | Tokens: ${tokens}`;
      }
      
      const newEvent: ParsedEvent = { 
        ...data, 
        id: Date.now(), 
        guests: data.guests || settings.defaultGuests,
        duration: data.duration || '60',
        description: finalDescription 
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

    const rawGuests = parsedEvent.guests || ''; 
    const formattedGuests = rawGuests 
      ? rawGuests.split(',').map(email => ({ email: email.trim() })).filter(obj => obj.email !== '')
      : [];

    const savePayload = {
      ...parsedEvent,
      isoStart, 
      isoEnd,
      start: isoStart, 
      end: isoEnd,
      securityKey: settings.securityKey,
      organizerEmail: settings.organizerEmail,
      calendarId: settings.calendarId || 'primary',
      guestsCanModify: true, 
      reminder: 15, 
      skipTranslation, 
      interfaceLang: appLang,
      ...(formattedGuests.length > 0 && { guests: formattedGuests })
    };

    if (formattedGuests.length > 0) {
      savePayload.guests = formattedGuests;
    }

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
    <div className="fixed top-0 left-0 right-0 bg-[var(--bg-main)] text-white overflow-hidden flex flex-col" style={{ height: 'var(--app-height, 100dvh)' }}>
      
      {/* 1. HEADER (Исправлена логика просрочки!) */}
      <div className="absolute top-0 left-0 right-0 px-4 flex items-center justify-between z-50 h-header pt-safe">
        <div className="flex-1 flex justify-start">
          <button onClick={() => setShowTasks(true)} className="p-2 rounded-xl active:bg-white/10 transition-colors relative" title="Pending Tasks">
            {(() => {
              const now = new Date();
              const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
              const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
              
              // Настоящая логика просрочки (Дата < Сегодня ИЛИ (Дата == Сегодня И Время < Сейчас))
              const overdueCount = pendingTasks.filter(t => t.date < todayStr || (t.date === todayStr && t.time < timeStr)).length;
              
              return (
                <>
                  <CheckCircle2 className={`w-6 h-6 transition-colors ${overdueCount > 0 ? "text-[var(--danger)]" : "text-white/30 hover:text-white/60"}`} />
                  {overdueCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[var(--danger)] rounded-full border-2 border-black animate-pulse" />}
                </>
              );
            })()}
          </button>
        </div>


        <div className="text-[19px] font-bold tracking-tight shrink-0">
          Voice<span className="text-[var(--primary)]">Cal</span>
        </div>
        <div className="flex-1 flex justify-end items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setShowDatabase(true); }} className="p-2 rounded-xl active:bg-white/10 transition-colors">
            <BookOpen className="w-5 h-5 text-white/30 hover:text-white/60 transition-colors" />
          </button>
          <div className="relative">
            <button onClick={() => setShowSettings(true)} className="p-2 text-white/30 hover:text-white/60 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            {!settingsConfigured && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--danger)] rounded-full animate-pulse border border-black" />}
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE AREA */}
      <div ref={mainRef} className="absolute top-[90px] left-0 right-0 bottom-0 flex flex-col transition-all duration-300">
        
        {/* ИСТОРИЯ (добавлен отступ сверху pt-2, чтобы дышало) */}
        {phase === 'idle' && history.length > 0 && (
          <div className={`shrink-0 overflow-x-auto flex gap-3 px-6 pb-2 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-all duration-500 ${isKbOpen ? 'opacity-0 max-h-0 pointer-events-none' : 'opacity-100 max-h-[120px]'}`}>
            {history.map((item, i) => (
              <SwipeableHistoryItem key={`${item.id}-${i}`} item={item} onDuplicate={handleDuplicate} onDelete={handleDeleteHistory} formatHistoryDate={formatHistoryDate} />
            ))}
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center px-6 pb-[100px] w-full max-w-md mx-auto relative">
          {phase === 'idle' && (
            <div className={`relative transition-all duration-500 w-full ${isFocused ? 'scale-[1.02]' : 'scale-100'}`}>
              <textarea
                ref={inputRef} 
                value={textInput} 
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={e => {
                  setTextInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 250) + 'px';
                }}
                placeholder={t.subtitle} 
                rows={1}
                className="w-full bg-transparent text-center text-[28px] leading-tight font-semibold outline-none resize-none placeholder:text-white/20 py-10 px-6 relative z-10 custom-scrollbar"
              />
            </div>
          )}

          {(phase === 'processing' || phase === 'saving') && (
            <div className="flex flex-col items-center gap-5 animate-in fade-in duration-300">
              <Loader2 className="animate-spin text-[var(--primary)]" size={44} strokeWidth={2.5} />
              <p className="text-white/50 font-medium tracking-wide uppercase text-sm">{phase === 'saving' ? t.saving : t.analyzing}</p>
            </div>
          )}

          {phase === 'success' && (
            <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
              <CheckCircle2 className="text-[var(--success)]" size={64} strokeWidth={2} />
              <p className="text-xl font-bold tracking-tight">{t.eventSaved}</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="bg-[var(--bg-surface)] p-6 rounded-[24px] border border-[var(--danger)]/30 text-center mx-auto w-full animate-in slide-in-from-bottom-4 duration-300">
              <AlertTriangle className="text-[var(--danger)] mx-auto mb-3" size={32} />
              <p className="text-[var(--danger)] font-mono text-sm mb-6 opacity-80">{errorMessage}</p>
              <button onClick={() => setPhase('idle')} className="w-full py-3.5 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors"><RotateCcw size={18}/> {t.retry}</button>
            </div>
          )}
        </div>
      </div>

      {/* 3. DOCK (Асимметричный, минималистичный, мощный) */}
      {phase === 'idle' && (
        <div className="absolute left-6 right-6 flex justify-center bottom-safe-16 z-50 transition-all duration-300">
          <div className="bg-[#1C1C1E]/80 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 flex items-center w-full max-w-sm shadow-2xl">
            
            {/* Круглый переключатель языка */}
            <button 
              onClick={() => {
                const langs: ('ru'|'en'|'de')[] = ['ru', 'en', 'de'];
                const next = langs[(langs.indexOf(appLang) + 1) % langs.length];
                setAppLang(next);
                localStorage.setItem('appLang', next);
              }} 
              className="w-[46px] h-[46px] shrink-0 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[15px] font-bold text-white/80 active:scale-95 transition-all"
            >
              {appLang.toUpperCase()}
            </button>
            
            {/* Массивная кнопка действия с ArrowUp */}
            <button 
              onClick={handleProcessText} 
              className="flex-1 h-[46px] ml-2 bg-[var(--primary)] text-white rounded-full font-semibold text-[17px] flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
            >
              {t.process || "Erstellen"}
              <ArrowUp size={20} strokeWidth={2.5} className="text-white/90" />
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN DEBUG CONSOLE (ОБНОВЛЕННЫЙ APPLE-ДИЗАЙН) */}
      {showDebug && (phase === 'idle' || phase === 'error') && (
        <div className="fixed inset-0 z-[500] bg-[var(--bg-main)] flex flex-col pt-safe animate-in fade-in duration-200">
          
          {/* iOS HIG Header */}
          <div className="flex items-center justify-between px-4 h-16 bg-[var(--bg-main)]/80 backdrop-blur-xl sticky top-0 shrink-0 z-20 border-b border-white/5">
            <button onClick={() => setShowDebug(false)} className="w-[80px] text-left text-[var(--primary)] text-[17px] active:opacity-50 transition-opacity">
              {t.cancel || 'Close'}
            </button>
            <h2 className="flex-1 text-center text-[17px] font-semibold text-white tracking-tight flex items-center justify-center gap-1.5">
              <Bug size={18} className="text-[var(--primary)]" />
              {t.systemLogs || 'System Logs'}
            </h2>
            <div className="w-[80px] flex justify-end items-center gap-4">
              <button onClick={() => { navigator.clipboard.writeText(debugLogs.join('\n')); toast.success(t.copied); }} className="text-[var(--primary)] active:opacity-50 transition-opacity">
                <Copy size={20} />
              </button>
              <button onClick={() => setDebugLogs([])} className="text-[var(--danger)] active:opacity-50 transition-opacity">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
          
          {/* 2. Консоль логов (Чистый и воздушный iOS-стиль) */}
          <div className="flex-1 overflow-y-auto pb-safe-24 custom-scrollbar transition-all duration-300">
            
            {/* Сами логи теперь на чистом черном фоне, без рамок */}
            <div className="font-mono text-[13px] leading-relaxed text-[var(--primary)] px-5 pt-5 relative">
              {debugLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] opacity-30 text-white">
                  <p className="text-[17px] font-semibold">{t.noLogs || 'No logs'}</p>
                </div>
              ) : (
                debugLogs.map((log, i) => (
                  <p key={i} className="break-all border-b border-white/[0.06] last:border-0 py-3.5 first:pt-0 last:pb-0">{log}</p>
                ))
              )}
            </div>
          </div>
          
        </div>
      )}

      {/* Modals & Screens (ОСТАВЛЯЕМ КАК БЫЛО!) */}
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
        appLang={appLang} setAppLang={setAppLang} skipTranslation={skipTranslation} setSkipTranslation={setSkipTranslation} 
        testMode={testMode} setTestMode={setTestMode} t={t} /* <-- ДОБАВИЛИ TEST MODE СЮДА */
      />

      <SyncModal
        open={showSyncModal} onClose={() => setShowSyncModal(false)} settings={settings} onSaveSettings={(s: AppSettings) => { setSettings(s); saveSettings(s); }}
        onSync={handleSyncLocations} isSyncing={isSyncing} syncProgress={syncProgress} t={t}
      />

      <PlacesDatabaseModal 
        open={showDatabase} 
        onClose={() => setShowDatabase(false)} 
        places={favoritePlaces} 
        setPlaces={setFavoritePlaces} 
        onSelect={phase === 'validation' ? ((loc: string) => { 
          if (parsedEvent) setParsedEvent({ ...parsedEvent, location: loc }); 
          setShowDatabase(false); 
        }) : undefined} 
        t={t}
      />

      <TasksListModal 
        open={showTasks} onClose={() => setShowTasks(false)} tasks={pendingTasks} 
        setTasks={(tasks) => {
          setPendingTasks(tasks);
          localStorage.setItem('pendingTasks', JSON.stringify(tasks));
        }}
        onReschedule={handleReschedule} t={t} 
      />
    </div>
  );
};

export default VoiceCalendarApp;