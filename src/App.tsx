import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Square, Check, X, Copy, Calendar, MapPin, Clock, Type, Timer, RotateCcw, Send, Trash2, Bug, CheckCircle2, AlertTriangle, Loader2, Users, Zap, FileText, Settings, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

// Импортируем наши модули
import { AppPhase, ParsedEvent, AppSettings, FavoritePlace } from './types';
import { SETTINGS_KEY, FAV_PLACES_KEY, DEFAULT_SETTINGS, QUICK_CHIPS, DICT, loadSettings, saveSettings } from './constants';
import PlacesDatabaseModal from './PlacesDatabaseModal';
import SettingsModal from './SettingsModal';
import InputField from './InputField';

const VoiceCalendarApp = () => {
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [parsedEvent, setParsedEvent] = useState<ParsedEvent | null>(null);
  
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
  
  const [appLang, setAppLang] = useState<'ru'|'en'|'de'>(() => (localStorage.getItem('appLang') as 'ru'|'en'|'de') || 'ru');
  const [skipTranslation, setSkipTranslation] = useState(() => localStorage.getItem('skipTrans') === 'true');
  
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>(() => {
    return JSON.parse(localStorage.getItem(FAV_PLACES_KEY) || '[]');
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');

  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const locationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
          data.forEach((item: Record<string, string>) => {
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
    } catch (err: unknown) {
      const error = err as Error;
      addLog(`Sync error: ${error.message}`);
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
      const suggestions = data.map((item: { display_name: string }) => item.display_name);
      setLocationSuggestions(suggestions);
      setShowLocationDropdown(suggestions.length > 0);
    } catch (err: unknown) {
      setLocationSuggestions([]);
    }
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

  const handleChipClick = (value: string) => {
    setTextInput(prev => prev ? `${prev} ${value}` : value);
    inputRef.current?.focus();
  };

  const handleProcessText = () => {
    if (!textInput.trim()) return;
    if (!settingsConfigured) return setShowSettings(true);
    if (recognitionRef.current) recognitionRef.current.stop();
    setEditableTranscript(textInput.trim());
    setRawInputStore(textInput.trim()); 
    handleSendForDecoding(textInput.trim());
  };

  const handleRetry = () => {
    setTranscript(''); setEditableTranscript(''); setTextInput(''); setPhase('idle');
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
      
      const tokenCount = res.headers.get('X-Total-Tokens');
      const modelUsed = res.headers.get('Gemini-Model');
      
      if (modelUsed) addLog(`🤖 [GEMINI] Модель: ${modelUsed}`);
      if (tokenCount) addLog(`⚡ [GEMINI] Использовано токенов: ${tokenCount}`);
      
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
        guests: settings.defaultGuests || '', 
        description: textToProcess + buildAuditFooter(),
        guestsCanModify: true,
        reminder: 15,
      });
      
      setFieldErrors({});
      setIsShowingRawTitle(false);
      setPhase('validation');
      
    } catch (e: unknown) {
      const error = e as Error;
      addLog(`❌ [DECODE] Критическая ошибка: ${error.message}`);
      setErrorMessage(`Error: ${error.message}`);
      setPhase('error');
    }
  };

  const validateAndConfirm = () => {
    if (!parsedEvent) return;
    const errors: Record<string, string> = {};
    
    if (!parsedEvent.title.trim()) errors.title = 'Required';
    if (!parsedEvent.date.trim()) errors.date = 'Required';
    if (!parsedEvent.time.trim()) errors.time = 'Required';

    // --- НОВАЯ СТРОГАЯ ВАЛИДАЦИЯ ГОСТЕЙ ---
    const rawGuests = parsedEvent.guests.trim();
    if (rawGuests) {
      // Разбиваем по запятой и убираем лишние пробелы
      const emails = rawGuests.split(',').map(e => e.trim()).filter(e => e !== '');
      
      // Стандартное регулярное выражение для проверки email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      const invalidEmails = emails.filter(email => !emailRegex.test(email));
      
      if (invalidEmails.length > 0) {
        errors.guests = `Invalid email(s): ${invalidEmails.join(', ')}`;
      }
    }
    // --------------------------------------

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
    } catch (err) { 
      /* Игнорируем ошибки приведения даты */
    }

    // 🛡️ БРОНЯ ДЛЯ ГОСТЕЙ: чистим и сразу делаем формат для Google Calendar
    const rawGuests = parsedEvent.guests || settings.defaultGuests || "";
    const validGuestsArray = rawGuests
      .split(',')
      .map(g => g.trim())
      .filter(g => g.includes('@'))
      .map(email => ({ email })); // Делаем объекты { email: "..." }

    const savePayload = {
      ...parsedEvent,
      isoStart, isoEnd,
      securityKey: settings.securityKey,
      organizerEmail: settings.organizerEmail.trim(),
      calendarId: settings.calendarId.trim() || 'primary',
      // ВОЗВРАЩАЕМ КАК БЫЛО: Если гостей нет, поле удаляется, и календарь не ругается
      guests: validGuestsArray.length > 0 ? validGuestsArray : undefined,
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
    } catch (e: unknown) {
      const error = e as Error;
      addLog(`❌ [SAVE] Ошибка при сохранении: ${error.message}`);
      setErrorMessage(`Save failed: ${error.message}`);
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

  const toggleTitleShuffle = () => {
    if (!parsedEvent || !rawInputStore) return;
    
    const eventWithAi = parsedEvent as ParsedEvent & { aiTitle?: string };
    
    if (parsedEvent.title === rawInputStore) {
        setParsedEvent({ ...parsedEvent, title: eventWithAi.aiTitle || '' });
        toast.success("Reverted to AI title");
    } else {
        setParsedEvent({ ...parsedEvent, aiTitle: parsedEvent.title, title: rawInputStore } as ParsedEvent & { aiTitle?: string });
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

        {phase === 'recording' && (
          <div className="flex flex-col items-center gap-8 py-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-destructive/30 animate-pulse-ring" />
              <button onClick={() => recognitionRef.current?.stop()} className="relative z-10 w-36 h-36 rounded-full flex items-center justify-center bg-destructive transition-all duration-300 shadow-xl shadow-destructive/40">
                <Square className="w-12 h-12 text-destructive-foreground fill-current" />
              </button>
            </div>
            <div className="text-center">
              <p className="text-destructive font-medium animate-pulse text-lg">{t.recording}</p>
              {transcript && <p className="mt-3 text-foreground/80 font-mono text-xs bg-muted px-4 py-2 rounded-lg max-w-xs">"{transcript}"</p>}
            </div>
          </div>
        )}

        {phase === 'review' && (
          <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-lg shadow-primary/5">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> {t.reviewTitle}</h2>
            <textarea value={editableTranscript} onChange={e => setEditableTranscript(e.target.value)} rows={5} className="w-full bg-muted/50 backdrop-blur border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none font-mono leading-relaxed text-left" style={{ fontSize: '16px' }} />
            <div className="flex gap-3 mt-5">
              <button onClick={handleRetry} className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-semibold py-3.5 rounded-xl hover:bg-secondary/80 transition-all border border-border">
                <RotateCcw className="w-4 h-4" /> {t.retry}
              </button>
              <button onClick={() => handleSendForDecoding(editableTranscript)} className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all glow-primary">
                <Send className="w-4 h-4" /> {t.decode}
              </button>
            </div>
          </div>
        )}

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
              
              <div className="relative">
                <InputField 
                  icon={<Type className="w-4 h-4" />} 
                  label={t.title} 
                  type="text" 
                  value={parsedEvent.title} 
                  onChange={(val: string) => { 
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
                <InputField icon={<Calendar className="w-4 h-4" />} label={t.date} type="date" value={parsedEvent.date} onChange={(val: string) => { setParsedEvent({ ...parsedEvent, date: val }); setFieldErrors(prev => { const n = { ...prev }; delete n.date; return n; }); }} required error={fieldErrors.date} />
                <InputField icon={<Clock className="w-4 h-4" />} label={t.time} type="time" value={parsedEvent.time} onChange={(val: string) => { setParsedEvent({ ...parsedEvent, time: val }); setFieldErrors(prev => { const n = { ...prev }; delete n.time; return n; }); }} required error={fieldErrors.time} />
              </div>

              <div className="w-1/2 pr-1.5">
                <InputField icon={<Timer className="w-4 h-4" />} label={t.duration} type="number" value={parsedEvent.duration} onChange={(val: string) => setParsedEvent({ ...parsedEvent, duration: val })} />
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
              
              <InputField 
                icon={<Users className="w-4 h-4" />} 
                label={t.guests} 
                type="text" 
                value={parsedEvent.guests} 
                onChange={(val: string) => { 
                  setParsedEvent({ ...parsedEvent, guests: val }); 
                  // Убираем ошибку, когда пользователь начинает печатать
                  setFieldErrors(prev => { const n = { ...prev }; delete n.guests; return n; }); 
                }} 
                error={fieldErrors.guests} 
              />

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

        {showDebug && (
          <div className="mt-8 bg-black/95 border border-primary/50 rounded-xl p-4 font-mono text-[10px] text-green-400 shadow-2xl text-left">
            <div className="flex items-center justify-between mb-3 border-b border-green-400/30 pb-2">
              <h3 className="font-bold uppercase tracking-widest flex items-center gap-2">
                <Bug className="w-3 h-3" /> System Logs
              </h3>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(debugLogs.join('\n')); toast.success('Logs copied!'); }} className="flex items-center gap-1 text-white/50 hover:text-white bg-white/10 px-2 py-1 rounded transition-colors">
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button onClick={() => setDebugLogs([])} className="text-white/50 hover:text-white bg-white/10 px-2 py-1 rounded transition-colors">Clear</button>
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
        onSelect={(loc: string) => { if (parsedEvent) setParsedEvent({ ...parsedEvent, location: loc }); setShowDatabase(false); }} 
        t={t}
      />
    </div>
  );
};

export default VoiceCalendarApp;