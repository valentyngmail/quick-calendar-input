import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, Loader2, CheckCircle2, AlertTriangle, RotateCcw, Bug, Copy, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

import { AppPhase, ParsedEvent, AppSettings, FavoritePlace, DICT, FAV_PLACES_KEY, loadSettings, saveSettings } from './Core';
import { SettingsModal, SyncModal, PlacesDatabaseModal, ReviewScreen } from './Components';

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
  
  // App Logic States
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [appLang, setAppLang] = useState<'ru'|'en'|'de'>(() => (localStorage.getItem('appLang') as 'ru'|'en'|'de') || 'ru');
  const [skipTranslation, setSkipTranslation] = useState(() => localStorage.getItem('skipTrans') === 'true');
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>(() => JSON.parse(localStorage.getItem(FAV_PLACES_KEY) || '[]'));
  
  // Debug & Sync States
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');

  // Location Autocomplete States
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const locationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = DICT[appLang] || DICT['ru']; 

  // --- Keyboard & Viewport Sync ---
  useEffect(() => {
    const sync = () => {
      if (!window.visualViewport || !dockRef.current) return;
      const kbHeight = window.innerHeight - window.visualViewport.height;
      dockRef.current.style.bottom = kbHeight > 50 ? `${kbHeight + 16}px` : 'calc(env(safe-area-inset-bottom) + 16px)';
    };
    window.visualViewport?.addEventListener('resize', sync);
    return () => window.visualViewport?.removeEventListener('resize', sync);
  }, []);

  // --- Debug Logger ---
  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
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
    if (!settings.decodeWebhook) return setShowSettings(true);
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
      addLog(`📥 [DECODE] Response status: ${res.status}`);
      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      
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

    // AUTO-SAVE NEW LOCATION
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
      
      setHistory(prev => [parsedEvent, ...prev].slice(0, 10));
      setPhase('success');
      setTimeout(() => { setPhase('idle'); setTextInput(''); }, 2000);
    } catch (e: unknown) { 
      addLog(`❌ [SAVE EXCEPTION] ${e instanceof Error ? e.message : 'Unknown error'}`);
      setErrorMessage("Save failed. Check Debug Console."); 
      setPhase('error'); 
    }
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
    <div className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden">
      
      {/* Header */}
      {phase === 'idle' && (
        <div className="p-6 flex justify-between items-center z-50" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
          <button onClick={() => setShowDatabase(true)} className="p-2 text-white/40 hover:text-[#34C759] transition-colors"><BookOpen size={22} /></button>
          <div className="text-xl font-bold">Voice<span className="text-[#34C759]">Cal</span></div>
          <button onClick={() => setShowSettings(true)} className="p-2 text-white/40 hover:text-white transition-colors"><Settings size={22} /></button>
        </div>
      )}

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 relative">
        {phase === 'idle' && (
          <textarea
            ref={inputRef} value={textInput} onChange={e => setTextInput(e.target.value)}
            placeholder={t.subtitle} className="w-full bg-transparent text-center text-3xl font-semibold outline-none resize-none" rows={3}
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
          <div className="bg-[#1C1C1E] p-6 rounded-2xl border border-red-500/30 text-center max-w-xs z-10">
            <AlertTriangle className="text-red-500 mx-auto mb-2" />
            <p className="text-red-500 font-mono text-xs mb-4">{errorMessage}</p>
            <button onClick={() => setPhase('idle')} className="w-full py-3 bg-white/10 rounded-xl flex items-center justify-center gap-2"><RotateCcw size={16}/> Retry</button>
          </div>
        )}

        {/* Debug Console UI */}
        {showDebug && (phase === 'idle' || phase === 'error') && (
          <div className="absolute bottom-32 left-4 right-4 bg-black/90 border border-[#34C759]/30 rounded-xl p-4 font-mono text-[10px] text-[#34C759] shadow-2xl z-40 max-h-48 flex flex-col">
            <div className="flex items-center justify-between mb-2 border-b border-[#34C759]/20 pb-2 shrink-0">
              <h3 className="font-bold flex items-center gap-1"><Bug size={12}/> Debug Console</h3>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(debugLogs.join('\n'))} className="text-white/50 hover:text-white"><Copy size={12}/></button>
                <button onClick={() => setDebugLogs([])} className="text-white/50 hover:text-white">Clear</button>
              </div>
            </div>
            <div className="overflow-y-auto flex flex-col-reverse space-y-1.5 space-y-reverse">
              {debugLogs.map((log, i) => <p key={i} className="break-all">{log}</p>)}
            </div>
          </div>
        )}
      </div>

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

      {/* Dock */}
      {phase === 'idle' && (
        <div ref={dockRef} className="fixed left-6 right-6 flex justify-center bottom-[calc(env(safe-area-inset-bottom)+16px)] z-50">
          <div className="glass-panel rounded-[32px] p-1.5 flex items-center justify-between w-full max-w-sm">
            <div className="flex bg-black/20 rounded-[28px] p-0.5">
              {(['ru', 'en', 'de'] as const).map(l => (
                <button key={l} onClick={() => { setAppLang(l); localStorage.setItem('appLang', l); }} className={`px-4 py-2 rounded-[24px] text-sm font-bold ${appLang === l ? 'bg-white/15 text-white' : 'text-white/40'}`}>{l.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={handleProcessText} className="h-11 px-8 bg-[#34C759] text-black rounded-[22px] font-bold active:scale-95 transition-all">Create</button>
          </div>
        </div>
      )}

      {/* Modals */}
      <SettingsModal 
        open={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSave={(s: AppSettings) => { setSettings(s); saveSettings(s); }} 
        onOpenSyncModal={() => setShowSyncModal(true)}
        showDebug={showDebug} setShowDebug={setShowDebug}
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