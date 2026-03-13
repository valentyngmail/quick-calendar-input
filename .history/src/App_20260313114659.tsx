import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Settings, Loader2, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

// Подключаем наши модули
import { AppPhase, ParsedEvent, AppSettings, FavoritePlace, DICT, FAV_PLACES_KEY, loadSettings, saveSettings } from './Core';
import { SettingsModal, PlacesDatabaseModal, ReviewScreen } from './Components';

const VoiceCalendarApp = () => {
  // --- State ---
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [textInput, setTextInput] = useState('');
  const [parsedEvent, setParsedEvent] = useState<ParsedEvent | null>(null);
  const [rawInputStore, setRawInputStore] = useState('');
  const [history, setHistory] = useState<ParsedEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [appLang, setAppLang] = useState<'ru'|'en'|'de'>(() => (localStorage.getItem('appLang') as 'ru'|'en'|'de') || 'ru');
  const [skipTranslation, setSkipTranslation] = useState(() => localStorage.getItem('skipTrans') === 'true');
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const t = DICT[appLang] || DICT['ru']; 

  // --- Viewport Sync (iOS Keyboard) ---
  useEffect(() => {
    const sync = () => {
      if (!window.visualViewport || !dockRef.current) return;
      const kbHeight = window.innerHeight - window.visualViewport.height;
      dockRef.current.style.bottom = kbHeight > 50 ? `${kbHeight + 16}px` : 'calc(env(safe-area-inset-bottom) + 16px)';
    };
    window.visualViewport?.addEventListener('resize', sync);
    return () => window.visualViewport?.removeEventListener('resize', sync);
  }, []);

  // --- Logic ---
  const handleProcessText = () => {
    if (!textInput.trim()) return;
    if (!settings.decodeWebhook) return setShowSettings(true);
    inputRef.current?.blur();
    setRawInputStore(textInput.trim()); 
    handleSendForDecoding(textInput.trim());
  };

  const handleSendForDecoding = async (text: string) => {
    setPhase('processing');
    try {
      const res = await fetch(settings.decodeWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, securityKey: settings.securityKey, currentDate: new Date().toISOString().split('T')[0], interfaceLang: appLang, skipTranslation }),
      });
      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      const data = await res.json();
      setParsedEvent({ ...data, id: Date.now(), guests: data.guests || settings.defaultGuests });
      setPhase('validation');
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : 'Decoding failed'); setPhase('error'); }
  };

  const handleConfirm = async () => {
    if (!parsedEvent) return;
    setPhase('saving');
    try {
      const res = await fetch(settings.saveWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsedEvent, securityKey: settings.securityKey }),
      });
      if (!res.ok) throw new Error("Failed to save to Calendar");
      setHistory(prev => [parsedEvent, ...prev].slice(0, 10));
      setPhase('success');
      setTimeout(() => setPhase('idle'), 2000);
    } catch (e) { setErrorMessage("Save failed"); setPhase('error'); }
  };

  const handleSyncLocations = async (webhookUrl: string) => {
    const cleanUrl = webhookUrl?.trim();
    if (!cleanUrl) { 
      toast.error("Fetch Webhook not configured"); 
      return; 
    }
    setIsSyncing(true);
    setSyncProgress("Connecting...");
    try {
      const res = await fetch(cleanUrl);
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      // Если сервер прислал массив мест, сохраняем их
      if (Array.isArray(data)) {
        localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(data));
        toast.success(`Synced ${data.length} locations`);
      }
    } catch (e) {
      toast.error("Sync error");
    } finally {
      setIsSyncing(false);
      setSyncProgress("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden">
      
      {/* 1. Header (Only in Idle) */}
      {phase === 'idle' && (
        <div className="p-6 flex justify-between items-center z-50" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
          <div className="text-xl font-bold">Voice<span className="text-[#34C759]">Cal</span></div>
          <button onClick={() => setShowSettings(true)} className="p-2 text-white/40"><Settings size={22} /></button>
        </div>
      )}

      {/* 2. Main Canvas */}
      <div className="flex-1 flex flex-col justify-center items-center px-8">
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
          <div className="bg-[#1C1C1E] p-6 rounded-2xl border border-red-500/30 text-center max-w-xs">
            <AlertTriangle className="text-red-500 mx-auto mb-2" />
            <p className="text-red-500 font-mono text-xs mb-4">{errorMessage}</p>
            <button onClick={() => setPhase('idle')} className="w-full py-3 bg-white/10 rounded-xl flex items-center justify-center gap-2"><RotateCcw size={16}/> Retry</button>
          </div>
        )}
      </div>

      {/* 3. Validation Phase (Review) */}
      {phase === 'validation' && parsedEvent && (
        <ReviewScreen 
          parsedEvent={parsedEvent} setParsedEvent={setParsedEvent} rawInputStore={rawInputStore} t={t}
          onCancel={() => setPhase('idle')} onSave={handleConfirm} onLocationChange={(loc: string) => setParsedEvent({...parsedEvent, location: loc})}
        />
      )}

      {/* 4. Dock (Only in Idle) */}
      {phase === 'idle' && (
        <div ref={dockRef} className="fixed left-6 right-6 flex justify-center bottom-[calc(env(safe-area-inset-bottom)+16px)]">
          <div className="glass-panel rounded-[32px] p-1.5 flex items-center justify-between w-full max-w-sm">
            <div className="flex bg-black/20 rounded-[28px] p-0.5">
              {(['ru', 'en', 'de'] as const).map(l => (
                <button key={l} onClick={() => setAppLang(l)} className={`px-4 py-2 rounded-[24px] text-sm font-bold ${appLang === l ? 'bg-white/15 text-white' : 'text-white/40'}`}>{l.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={handleProcessText} className="h-11 px-8 bg-[#34C759] text-black rounded-[22px] font-bold active:scale-95 transition-all">Create</button>
          </div>
        </div>
      )}

      {/* 5. Settings Modal */}
      {/* 5. Settings Modal */}
      <SettingsModal 
        open={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={settings} 
        onSave={(s: AppSettings) => { setSettings(s); saveSettings(s); }} 
        // ВОТ ЭТИ ТРИ СТРОКИ НУЖНО ДОБАВИТЬ:
        onSync={handleSyncLocations}
        isSyncing={isSyncing}
        syncProgress={syncProgress}
        // ОСТАЛЬНОЕ ОСТАЕТСЯ:
        showDebug={false}
        setShowDebug={() => {}}
        appLang={appLang} 
        setAppLang={setAppLang} 
        skipTranslation={skipTranslation} 
        setSkipTranslation={setSkipTranslation} 
        t={t}
      />
    </div>
  );
};

export default VoiceCalendarApp;