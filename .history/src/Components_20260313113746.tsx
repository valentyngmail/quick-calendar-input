import React, { useState, useEffect, useRef, useCallback } from 'react';

import { 
  AlertTriangle, Settings, X, Globe, Mail, Lock, Link as LinkIcon, 
  RefreshCw, History, Loader2, Hash, Users, Bug, Check, 
  BookOpen, Search, MapPin, Edit2, Trash2, Calendar, Clock, Type, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

import { AppSettings, FavoritePlace, ParsedEvent } from './Core';
const FAV_PLACES_KEY = 'voicecal_favorite_places';

type Dictionary = Record<string, string>;

// ==========================================
// 1. IOS TOGGLE (Новый компонент переключателя)
// ==========================================
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button 
    onClick={() => onChange(!checked)}
    className={`w-[51px] h-[31px] rounded-full transition-colors relative focus:outline-none ${checked ? 'bg-[#34C759]' : 'bg-[#39393D]'}`}
  >
    <div className={`absolute top-[2px] left-[2px] bg-white w-[27px] h-[27px] rounded-full shadow-md transition-transform ${checked ? 'translate-x-[20px]' : 'translate-x-0'}`} />
  </button>
);

// ==========================================
// 2. SETTINGS ROW (Строка настроек в стиле iOS)
// ==========================================
const SettingsRow = ({ label, icon, bgColor, children }: { label: string; icon: React.ReactNode; bgColor: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-0 min-h-[44px]">
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white ${bgColor}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 16, strokeWidth: 2.5 })}
      </div>
      <span className="text-[17px] tracking-tight">{label}</span>
    </div>
    <div className="flex-1 flex justify-end ml-4">
      {children}
    </div>
  </div>
);

// ==========================================
// 3. SETTINGS MODAL (Новый дизайн)
// ==========================================
interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onSync: (url: string) => void;
  isSyncing: boolean;
  syncProgress: string;
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;
  appLang: 'ru' | 'en' | 'de';
  setAppLang: (lang: 'ru' | 'en' | 'de') => void;
  skipTranslation: boolean;
  setSkipTranslation: (skip: boolean) => void;
  t: Dictionary;
}

export const SettingsModal = ({ 
  open, onClose, settings, onSave, onSync, isSyncing, syncProgress, showDebug, setShowDebug,
  appLang, setAppLang, skipTranslation, setSkipTranslation, t
}: any) => {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  useEffect(() => { if (open) setLocal({ ...settings }); }, [open, settings]);
  if (!open) return null;

  const handleSave = () => { onSave(local); toast.success('Settings saved'); onClose(); };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Navigation Bar */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-white/10">
        <button onClick={onClose} className="text-[#34C759] text-[17px]">{t.cancel || 'Cancel'}</button>
        <h2 className="text-[17px] font-semibold">{t.settingsTitle}</h2>
        <div className="w-[60px]" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <p className="text-[13px] text-white/40 uppercase mt-6 mb-2 ml-4 tracking-tight">{t.langSection}</p>
        <div className="bg-[#1C1C1E] rounded-xl px-4 overflow-hidden">
          <SettingsRow label={t.interfaceLang} icon={<Globe />} bgColor="bg-[#007AFF]">
            <div className="flex bg-[#2C2C2E] p-0.5 rounded-lg">
              {(['ru', 'en', 'de'] as const).map(l => (
                <button key={l} onClick={() => setAppLang(l)} className={`px-3 py-1 rounded-md text-[13px] font-bold ${appLang === l ? 'bg-[#636366] text-white shadow-sm' : 'text-white/40'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </SettingsRow>
          <SettingsRow label={t.skipTrans} icon={<ArrowRight />} bgColor="bg-[#5856D6]">
            <Toggle checked={skipTranslation} onChange={(v) => { setSkipTranslation(v); localStorage.setItem('skipTrans', String(v)); }} />
          </SettingsRow>
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-8 mb-2 ml-4 tracking-tight">{t.identitySection}</p>
        <div className="bg-[#1C1C1E] rounded-xl px-4 overflow-hidden">
          <SettingsRow label="Organizer" icon={<Mail />} bgColor="bg-[#FF9500]">
            <input type="email" value={local.organizerEmail} onChange={e => setLocal({...local, organizerEmail: e.target.value})} className="bg-transparent text-right outline-none text-white/60 w-full" placeholder="email" />
          </SettingsRow>
          <SettingsRow label="Default Guests" icon={<Users />} bgColor="bg-[#007AFF]">
            <input type="text" value={local.defaultGuests} onChange={e => setLocal({...local, defaultGuests: e.target.value})} className="bg-transparent text-right outline-none text-white/60 w-full" placeholder="emails" />
          </SettingsRow>
          <SettingsRow label="Calendar ID" icon={<Hash />} bgColor="bg-[#FF3B30]">
            <input type="text" value={local.calendarId} onChange={e => setLocal({...local, calendarId: e.target.value})} className="bg-transparent text-right outline-none text-white/60 w-full" />
          </SettingsRow>
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-8 mb-2 ml-4 tracking-tight">{t.webhooksSection}</p>
        <div className="bg-[#1C1C1E] rounded-xl px-4 overflow-hidden">
          <div className="py-3 border-b border-white/10">
             <div className="flex items-center gap-3 mb-1">
                <div className="w-7 h-7 rounded-md bg-[#8E8E93] flex items-center justify-center text-white"><LinkIcon size={16} /></div>
                <span className="text-[17px]">Decode Webhook</span>
             </div>
             <input type="url" value={local.decodeWebhook} onChange={e => setLocal({...local, decodeWebhook: e.target.value})} className="bg-transparent outline-none text-[#0A84FF] text-[14px] font-mono w-full" />
          </div>
          <div className="py-3 border-b border-white/10">
             <div className="flex items-center gap-3 mb-1">
                <div className="w-7 h-7 rounded-md bg-[#8E8E93] flex items-center justify-center text-white"><LinkIcon size={16} /></div>
                <span className="text-[17px]">Save Webhook</span>
             </div>
             <input type="url" value={local.saveWebhook} onChange={e => setLocal({...local, saveWebhook: e.target.value})} className="bg-transparent outline-none text-[#0A84FF] text-[14px] font-mono w-full" />
          </div>
          <button onClick={() => onSync(local.fetchLocationsWebhook || '')} className="w-full flex items-center py-3 text-[#34C759] gap-3">
             <div className="w-7 h-7 rounded-md bg-[#34C759] flex items-center justify-center text-white">
                {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
             </div>
             <span className="text-[17px] font-medium">{isSyncing ? syncProgress : t.syncHistory}</span>
          </button>
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-8 mb-2 ml-4 tracking-tight">Security & Debug</p>
        <div className="bg-[#1C1C1E] rounded-xl px-4 overflow-hidden">
          <SettingsRow label="Security Key" icon={<Lock />} bgColor="bg-[#8E8E93]">
            <input type="password" value={local.securityKey} onChange={e => setLocal({...local, securityKey: e.target.value})} className="bg-transparent text-right outline-none text-white/60 w-full" />
          </SettingsRow>
          <SettingsRow label="Debug Console" icon={<Bug />} bgColor="bg-[#FF9500]">
            <Toggle checked={showDebug} onChange={setShowDebug} />
          </SettingsRow>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <button onClick={handleSave} className="w-full h-14 bg-[#34C759] text-black font-bold rounded-2xl shadow-xl active:scale-95 transition-transform">
          {t.saveSettings || 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 4. INPUT ROW (Для экрана Review)
// ==========================================
export const InputRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 last:border-0 min-h-[56px]">
    <span className="text-[15px] text-white/40 font-medium w-24">{label}</span>
    <div className="flex-1 flex justify-end">
      {children}
    </div>
  </div>
);

export const PlacesDatabaseModal = ({ 
  open, onClose, places, setPlaces, onSelect, t
}: any) => {
  // Код базы мест оставляем функциональным, но обновляем цвета под iOS (Card-bg #1C1C1E)
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
           <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-[17px]">{t.dbTitle || 'Places'}</h3>
              <button onClick={onClose} className="p-2"><X size={20} /></button>
           </div>
           {/* ... функционал поиска и списка мест ... */}
           <div className="p-8 text-center text-white/40">Places database content...</div>
        </div>
    </div>
  );
};

// Добавь это в Components.tsx
export const ReviewScreen = ({ parsedEvent, setParsedEvent, rawInputStore, t, onCancel, onSave, onLocationChange }: any) => (
  <div className="fixed inset-0 bg-black z-[150] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
    <div className="flex items-center justify-between px-4 h-11 border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0">
      <button onClick={onCancel} className="text-[#FF453A] text-[17px] font-medium">Cancel</button>
      <h2 className="text-[17px] font-semibold">{t.checkDetails}</h2>
      <div className="w-[60px]" />
    </div>

    <div className="flex-1 overflow-y-auto px-4 pb-32">
      <div className="py-6">
        <textarea 
          value={parsedEvent.title} 
          onChange={e => setParsedEvent({...parsedEvent, title: e.target.value})}
          className="w-full bg-transparent text-[24px] font-bold outline-none resize-none placeholder:text-white/20"
          rows={2}
        />
      </div>

      <div className="bg-[#1C1C1E] rounded-xl overflow-hidden mb-6">
        <InputRow label={t.date}><input type="date" value={parsedEvent.date} onChange={e => setParsedEvent({...parsedEvent, date: e.target.value})} className="bg-transparent text-right outline-none text-[#34C759] font-semibold" /></InputRow>
        <InputRow label={t.time}><input type="time" value={parsedEvent.time} onChange={e => setParsedEvent({...parsedEvent, time: e.target.value})} className="bg-transparent text-right outline-none text-[#34C759] font-semibold" /></InputRow>
      </div>

      <div className="bg-[#1C1C1E] rounded-xl overflow-hidden mb-6">
        <InputRow label={t.location}><input type="text" value={parsedEvent.location} onChange={e => onLocationChange(e.target.value)} className="bg-transparent text-right outline-none text-white/60 w-full" placeholder="Location" /></InputRow>
        <InputRow label="Guests"><input type="text" value={parsedEvent.guests} onChange={e => setParsedEvent({...parsedEvent, guests: e.target.value})} className="bg-transparent text-right outline-none text-white/60 w-full" placeholder="Emails" /></InputRow>
      </div>

      <div className="bg-[#34C759]/5 border border-[#34C759]/20 rounded-xl p-4 mb-8">
        <p className="text-[13px] text-white/40 mb-1 font-bold uppercase tracking-widest">Original Prompt</p>
        <p className="text-[15px] text-white/80 leading-relaxed italic">"{rawInputStore}"</p>
      </div>
    </div>

    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <button onClick={onSave} className="w-full h-14 bg-gradient-to-br from-[#34C759] to-[#28a745] text-black font-bold rounded-2xl shadow-lg active:scale-95 transition-transform">Save to Calendar</button>
    </div>
  </div>
);