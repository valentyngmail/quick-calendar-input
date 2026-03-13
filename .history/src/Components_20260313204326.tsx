import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, Settings, X, Globe, Mail, Lock, Link as LinkIcon, 
  RefreshCw, History, Loader2, Hash, Users, Bug, Check, CheckSquare, // <-- Добавлен CheckSquare
  BookOpen, Search, MapPin, Edit2, Trash2, Calendar, Clock, ArrowRight, Copy, Download, Upload
} from 'lucide-react';
import { toast } from 'sonner';

import { AppSettings, FavoritePlace, ParsedEvent } from './Core';
const FAV_PLACES_KEY = 'voicecal_favorite_places';

type Dictionary = Record<string, string>;

// ==========================================
// 1. IOS TOGGLE & SETTINGS ROW
// ==========================================
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!checked)} className={`w-[51px] h-[31px] rounded-full transition-colors relative focus:outline-none ${checked ? 'bg-[var(--primary)]' : 'bg-[var(--bg-surface-elevated)]'}`}>
    <div className={`absolute top-[2px] left-[2px] bg-white w-[27px] h-[27px] rounded-full shadow-md transition-transform ${checked ? 'translate-x-[20px]' : 'translate-x-0'}`} />
  </button>
);

const SettingsRow = ({ label, icon, bgColor, children }: { label: string; icon: React.ReactNode; bgColor: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-0 min-h-[44px]">
    <div className="flex items-center gap-3 shrink-0">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white ${bgColor}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 16, strokeWidth: 2.5 })}
      </div>
      <span className="text-[17px] tracking-tight">{label}</span>
    </div>
    <div className="flex-1 flex justify-end ml-4">{children}</div>
  </div>
);

// ==========================================
// 2. SYNC MODAL
// ==========================================
interface SyncModalProps {
  open: boolean; onClose: () => void; settings: AppSettings; onSaveSettings: (s: AppSettings) => void; onSync: (url: string) => void; isSyncing: boolean; syncProgress: string; t: Dictionary;
}

export const SyncModal = ({ open, onClose, settings, onSaveSettings, onSync, isSyncing, syncProgress, t }: SyncModalProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-white/10 rounded-2xl w-full max-w-sm p-6 flex flex-col shadow-2xl">
         <div className="flex items-center gap-3 mb-4 text-[var(--primary)]">
           <History size={24} />
           <h2 className="text-xl font-bold text-white">{t.syncDbTitle}</h2>
         </div>
         <p className="text-[14px] text-white/60 mb-6 leading-relaxed">
           {t.syncDbDesc}
         </p>
         <label className="text-[12px] font-bold text-white/40 uppercase mb-2 block tracking-wider">{t.fetchWebhookLabel}</label>
         <input 
           type="url" placeholder="https://hook.make.com/..." 
           value={settings.fetchLocationsWebhook}
           onChange={e => onSaveSettings({...settings, fetchLocationsWebhook: e.target.value})}
           className="bg-black border border-white/10 rounded-xl px-4 py-3 mb-6 w-full text-[#0A84FF] text-sm outline-none focus:border-[var(--primary)]"
         />
         <div className="flex gap-3 mt-2">
           <button onClick={onClose} className="flex-1 py-3.5 bg-white/10 text-white rounded-xl font-bold active:scale-95 transition-transform">{t.cancel}</button>
           <button 
             onClick={() => onSync(settings.fetchLocationsWebhook)}
             disabled={isSyncing || !settings.fetchLocationsWebhook}
             className="flex-1 py-3.5 bg-[var(--primary)] text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
           >
             {isSyncing && <Loader2 className="animate-spin" size={18}/>}
             {isSyncing ? t.syncing : t.startSync}
           </button>
         </div>
         {syncProgress && <p className="text-center text-[var(--primary)] text-xs mt-4 font-bold">{syncProgress}</p>}
      </div>
    </div>
  );
}

// ==========================================
// 3. SETTINGS MODAL
// ==========================================
interface SettingsModalProps {
  open: boolean; onClose: () => void; settings: AppSettings; onSave: (s: AppSettings) => void;
  onOpenSyncModal: () => void; showDebug: boolean; setShowDebug: (show: boolean) => void;
  appLang: 'ru' | 'en' | 'de'; setAppLang: (lang: 'ru' | 'en' | 'de') => void; skipTranslation: boolean; setSkipTranslation: (skip: boolean) => void; t: Dictionary;
}

export const SettingsModal = ({ 
  open, onClose, settings, onSave, onOpenSyncModal, showDebug, setShowDebug,
  appLang, setAppLang, skipTranslation, setSkipTranslation, t
}: SettingsModalProps) => {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setLocal({ ...settings }); }, [open, settings]);
  if (!open) return null;

  const handleSave = () => { onSave(local); toast.success(t.settingsSaved); onClose(); };

  const exportBackup = () => {
    const data = localStorage.getItem(FAV_PLACES_KEY);
    if (!data || data === '[]') return toast.error(t.dbEmpty);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voicecal_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t.backupCreated);
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(json));
          toast.success(t.backupRestored);
          setTimeout(() => window.location.reload(), 1500); 
        } else throw new Error('Invalid format');
      } catch (err) { toast.error(t.backupError); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[var(--bg-main)] flex flex-col overflow-hidden pt-safe">
      <div className="flex items-center justify-between px-4 h-11 border-b border-white/10 shrink-0">
        <button onClick={onClose} className="text-[var(--primary)] text-[17px]">{t.cancel || 'Cancel'}</button>
        <h2 className="text-[17px] font-semibold">{t.settingsTitle}</h2>
        <div className="w-[60px]" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <p className="text-[13px] text-white/40 uppercase mt-6 mb-2 ml-4 tracking-tight">{t.langSection}</p>
        <div className="bg-[var(--bg-surface)] rounded-xl px-4 overflow-hidden">
          <SettingsRow label={t.interfaceLang} icon={<Globe />} bgColor="bg-[#007AFF]">
            <div className="flex bg-[var(--bg-surface-elevated)] p-0.5 rounded-lg">
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
        <div className="bg-[var(--bg-surface)] rounded-xl px-4 overflow-hidden">
          <SettingsRow label={t.organizer} icon={<Mail />} bgColor="bg-[#FF9500]">
            <input type="email" value={local.organizerEmail} onChange={e => setLocal({...local, organizerEmail: e.target.value})} className="bg-transparent text-right outline-none text-white w-full placeholder:text-white/20" placeholder="email@example.com" />
          </SettingsRow>
          <SettingsRow label={t.defaultGuests} icon={<Users />} bgColor="bg-[#007AFF]">
            <input type="text" value={local.defaultGuests} onChange={e => setLocal({...local, defaultGuests: e.target.value})} className="bg-transparent text-right outline-none text-white w-full placeholder:text-white/20" placeholder="guest1@mail.com" />
          </SettingsRow>
          <SettingsRow label={t.calendarId} icon={<Hash />} bgColor="bg-[#FF3B30]">
            <input type="text" value={local.calendarId} onChange={e => setLocal({...local, calendarId: e.target.value})} className="bg-transparent text-right outline-none text-white w-full placeholder:text-white/20" placeholder="primary" />
          </SettingsRow>
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-8 mb-2 ml-4 tracking-tight">{t.webhooksSection}</p>
        <div className="bg-[var(--bg-surface)] rounded-xl px-4 overflow-hidden">
          <div className="py-3 border-b border-white/10">
             <div className="flex items-center gap-3 mb-1"><div className="w-7 h-7 rounded-md bg-[#8E8E93] flex items-center justify-center text-white"><LinkIcon size={16} /></div><span className="text-[17px]">{t.decodeWebhook}</span></div>
             <input type="url" value={local.decodeWebhook} onChange={e => setLocal({...local, decodeWebhook: e.target.value})} className="bg-transparent outline-none text-[#0A84FF] text-[14px] font-mono w-full placeholder:text-[#0A84FF]/40" placeholder="https://hook.make.com/..." />
          </div>
          <div className="py-3 border-b border-white/10">
             <div className="flex items-center gap-3 mb-1"><div className="w-7 h-7 rounded-md bg-[#8E8E93] flex items-center justify-center text-white"><LinkIcon size={16} /></div><span className="text-[17px]">{t.saveWebhook}</span></div>
             <input type="url" value={local.saveWebhook} onChange={e => setLocal({...local, saveWebhook: e.target.value})} className="bg-transparent outline-none text-[#0A84FF] text-[14px] font-mono w-full placeholder:text-[#0A84FF]/40" placeholder="https://hook.make.com/..." />
          </div>
          <button onClick={() => { onClose(); onOpenSyncModal(); }} className="w-full flex items-center py-3 text-[var(--primary)] gap-3">
             <div className="w-7 h-7 rounded-md bg-[var(--primary)] flex items-center justify-center text-white"><History size={16} /></div>
             <span className="text-[17px] font-medium">{t.syncHistory}</span>
          </button>
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-8 mb-2 ml-4 tracking-tight">{t.backupSection}</p>
        <div className="bg-[var(--bg-surface)] rounded-xl px-4 overflow-hidden flex flex-col">
          <button onClick={exportBackup} className="flex items-center gap-3 py-3 border-b border-white/10 text-[#0A84FF] active:opacity-50 transition-opacity">
            <div className="w-7 h-7 rounded-md bg-[#0A84FF] flex items-center justify-center text-white"><Download size={16} /></div>
            <span className="text-[17px] font-medium">{t.exportBackup}</span>
          </button>
          
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 py-3 text-[#FF9500] active:opacity-50 transition-opacity">
            <div className="w-7 h-7 rounded-md bg-[#FF9500] flex items-center justify-center text-white"><Upload size={16} /></div>
            <span className="text-[17px] font-medium">{t.restoreBackup}</span>
          </button>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={importBackup} />
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-8 mb-2 ml-4 tracking-tight">{t.securitySection}</p>
        <div className="bg-[var(--bg-surface)] rounded-xl px-4 overflow-hidden mb-8">
          <SettingsRow label={t.securityKey} icon={<Lock />} bgColor="bg-[#8E8E93]">
            <input type="password" value={local.securityKey} onChange={e => setLocal({...local, securityKey: e.target.value})} className="bg-transparent text-right outline-none text-white w-full placeholder:text-white/20" placeholder="••••••••" />
          </SettingsRow>
          <SettingsRow label={t.debugConsole} icon={<Bug />} bgColor="bg-[#FF9500]">
            <Toggle checked={showDebug} onChange={setShowDebug} />
          </SettingsRow>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)] to-transparent pb-safe-16">
        <button onClick={handleSave} className="w-full h-14 bg-[var(--primary)] text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-transform">{t.saveSettings}</button>
      </div>
    </div>
  );
};

// ==========================================
// 4. PLACES DATABASE MODAL (CLEAN FULL SCREEN)
// ==========================================
interface PlacesDatabaseModalProps {
  open: boolean; onClose: () => void; places: FavoritePlace[]; setPlaces: (p: FavoritePlace[]) => void; onSelect?: (location: string) => void; t: Dictionary;
}

export const PlacesDatabaseModal = ({ 
  open, onClose, places, setPlaces, onSelect, t
}: PlacesDatabaseModalProps) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', location: '' });

  useEffect(() => { if (open) { setSearch(''); setEditingId(null); } }, [open]);
  if (!open) return null;

  const filteredPlaces = places.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (window.confirm(t.confirmDelete)) {
      const updated = places.filter(p => p.id !== id);
      setPlaces(updated);
      localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(updated));
    }
  };

  const startEdit = (place: FavoritePlace) => {
    setEditingId(place.id); setEditForm({ title: place.title, location: place.location });
  };

  const saveEdit = (id: string) => {
    const updated = places.map(p => p.id === id ? { ...p, title: editForm.title.trim(), location: editForm.location.trim() } : p);
    updated.sort((a, b) => a.title.localeCompare(b.title));
    setPlaces(updated);
    localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(updated));
    setEditingId(null);
    toast.success(t.placeUpdated);
  };

  const openGoogleMaps = (e: React.MouseEvent, location: string) => {
    e.stopPropagation(); 
    window.open(`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(location)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[var(--bg-main)] flex flex-col pt-safe">
      
      <div className="flex items-center justify-between px-4 h-11 border-b border-white/10 bg-[var(--bg-main)]/80 backdrop-blur-xl sticky top-0 shrink-0">
        <button onClick={onClose} className="text-[var(--primary)] text-[17px] font-medium">{t.cancel}</button>
        <h2 className="text-[17px] font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[var(--primary)]" /> {onSelect ? t.selectAddress : t.dbTitle}
        </h2>
        <div className="w-[60px] flex justify-end">
          {!onSelect && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const data = localStorage.getItem(FAV_PLACES_KEY);
                if (data && data !== '[]') {
                  navigator.clipboard.writeText(data);
                  toast.success(t.copied);
                }
              }} 
              className="text-[var(--primary)]"
            >
              <Copy className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      <div className="px-4 py-3 border-b border-white/10 shrink-0 bg-[var(--bg-surface)]/50">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-white/20" />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder={t.searchDb} 
            className="w-full bg-white/5 border border-transparent rounded-lg pl-10 pr-4 py-2 text-[16px] text-white placeholder:text-white/20 focus:outline-none focus:bg-white/10 transition-all" 
          />
        </div>
        <p className="text-[11px] text-white/20 mt-2.5 ml-1 uppercase tracking-widest font-bold">{t.found}: {filteredPlaces.length}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-safe-24 space-y-3 custom-scrollbar">
        {filteredPlaces.length === 0 ? (
           <div className="text-center py-20 text-white/20 font-medium">{t.noLocFound}</div>
        ) : (
          filteredPlaces.map((place) => (
            <div 
              key={place.id} 
              className={`bg-[var(--bg-surface)] rounded-2xl p-4 transition-all active:scale-[0.98] active:bg-[var(--bg-surface-elevated)] ${onSelect ? 'cursor-pointer' : ''}`}
              onClick={() => { 
                if (onSelect && editingId !== place.id) onSelect(place.location); 
              }}
            >
              {editingId === place.id ? (
                <div className="space-y-3" onClick={e => e.stopPropagation()}>
                  <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-black/40 text-white px-4 py-3 rounded-xl outline-none focus:border-[var(--primary)] border border-transparent" />
                  <input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} className="w-full bg-black/40 text-white px-4 py-3 rounded-xl outline-none focus:border-[var(--primary)] border border-transparent" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm font-bold text-white/40">Cancel</button>
                    <button onClick={() => saveEdit(place.id)} className="px-5 py-2 bg-[var(--primary)] text-white rounded-lg font-bold">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-[17px] truncate leading-tight mb-1">{place.title || 'Untitled'}</h3>
                    <div 
                      onClick={(e) => { if (!onSelect) openGoogleMaps(e, place.location); }} 
                      className={`flex items-start gap-1.5 text-white/30 ${!onSelect ? 'cursor-pointer hover:text-[var(--primary)]' : ''}`} 
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-[3px]" />
                      <span className="text-[14px] break-words leading-tight">{place.location}</span>
                    </div>
                  </div>
                  
                  {!onSelect && (
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => startEdit(place)} className="p-2 text-white/20 hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(place.id)} className="p-2 text-white/20 hover:text-[var(--danger)] transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ==========================================
// 5. REVIEW SCREEN (ART DIRECTOR APPROVED)
// ==========================================
export const InputRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 last:border-0 min-h-[56px]">
    <span className="text-[15px] text-white/40 font-medium w-28 shrink-0">{label}</span>
    <div className="flex-1 flex justify-end items-center">{children}</div>
  </div>
);

interface ReviewScreenProps {
  parsedEvent: ParsedEvent; setParsedEvent: (event: ParsedEvent) => void; rawInputStore: string; t: Dictionary; 
  onCancel: () => void; onSave: () => void; onLocationChange: (loc: string) => void;
  locationSuggestions: string[]; showLocationDropdown: boolean; onSelectLocation: (loc: string) => void; onOpenDatabase: () => void;
}

export const ReviewScreen = ({ 
  parsedEvent, setParsedEvent, rawInputStore, t, onCancel, onSave, 
  onLocationChange, locationSuggestions, showLocationDropdown, onSelectLocation, onOpenDatabase
}: ReviewScreenProps) => (
  <div className="fixed inset-0 bg-[var(--bg-main)] z-[150] flex flex-col pt-safe">
    <div className="flex items-center justify-between px-4 h-11 border-b border-white/10 bg-[var(--bg-main)]/80 backdrop-blur-xl sticky top-0 shrink-0">
      <button onClick={onCancel} className="text-[var(--primary)] text-[17px] font-medium">{t.cancel}</button>
      <h2 className="text-[17px] font-semibold">{t.checkDetails}</h2>
      <div className="w-[60px]" />
    </div>

    <div className="flex-1 overflow-y-auto px-4 pb-32">
      <div className="py-6">
        <textarea 
          value={parsedEvent.title} 
          onChange={e => setParsedEvent({...parsedEvent, title: e.target.value})} 
          className="w-full bg-transparent text-white text-[24px] font-bold outline-none resize-none placeholder:text-white/10" 
          rows={2} 
        />
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl overflow-hidden mb-6">
        <InputRow label={t.date}>
          <input type="date" value={parsedEvent.date} onChange={e => setParsedEvent({...parsedEvent, date: e.target.value})} className="bg-transparent text-right outline-none text-white text-[17px]" />
        </InputRow>
        <InputRow label={t.time}>
          <input type="time" value={parsedEvent.time} onChange={e => setParsedEvent({...parsedEvent, time: e.target.value})} className="bg-transparent text-right outline-none text-white text-[17px]" />
        </InputRow>
        <InputRow label={t.duration}>
          <select 
            value={parsedEvent.duration} 
            onChange={e => setParsedEvent({...parsedEvent, duration: e.target.value})} 
            className="bg-transparent text-white text-[17px] outline-none appearance-none cursor-pointer w-full text-right text-align-last-right"
          >
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">1 h</option>
            <option value="120">2 h</option>
          </select>
        </InputRow>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl mb-6 relative">
        <InputRow label={t.location}>
          <input 
            type="text" 
            value={parsedEvent.location} 
            onChange={e => onLocationChange(e.target.value)} 
            className="bg-transparent text-right outline-none text-white w-full placeholder:text-white/10 text-[17px]" 
            placeholder="Address" 
          />
          <button onClick={onOpenDatabase} className="ml-3 text-[var(--primary)] active:opacity-50 transition-opacity">
            <BookOpen size={20} />
          </button>
        </InputRow>
        
        {showLocationDropdown && (
          <div className="absolute z-50 left-0 right-0 top-[56px] bg-[var(--bg-surface-elevated)] border border-white/10 rounded-b-xl shadow-2xl max-h-48 overflow-y-auto">
            {locationSuggestions.map((loc, i) => (
              <button key={i} onClick={() => onSelectLocation(loc)} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 border-b border-white/5 last:border-0 truncate transition-colors">
                <MapPin size={14} className="inline mr-2 text-[var(--primary)]" /> {loc}
              </button>
            ))}
          </div>
        )}
        
        <InputRow label={t.guestsLabel}>
          <input 
            type="text" 
            value={parsedEvent.guests} 
            onChange={e => setParsedEvent({...parsedEvent, guests: e.target.value})} 
            className="bg-transparent text-right outline-none text-white w-full placeholder:text-white/10" 
            placeholder="email1, email2" 
          />
        </InputRow>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl overflow-hidden mb-6">
        <InputRow label={t.taskMode}>
          <Toggle checked={!!parsedEvent.isTask} onChange={(v) => setParsedEvent({...parsedEvent, isTask: v})} />
        </InputRow>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl overflow-hidden mb-6 p-4">
        <label className="text-[13px] text-white/20 mb-2 font-bold uppercase tracking-widest block">{t.descLabel}</label>
        <textarea 
          value={parsedEvent.description} 
          onChange={e => setParsedEvent({...parsedEvent, description: e.target.value})} 
          className="w-full bg-transparent text-[15px] text-white/80 outline-none resize-none placeholder:text-white/10" 
          rows={4} 
        />
      </div>

      {rawInputStore && rawInputStore.trim() !== '' && (
        <div className="bg-[var(--bg-surface)] rounded-xl p-4 mb-8">
          <p className="text-[12px] text-white/40 mb-1 font-bold uppercase tracking-widest">{t.promptLabel}</p>
          <p className="text-[15px] text-white/60 leading-relaxed italic">{rawInputStore}</p>
        </div>
      )}
    </div>

    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/90 to-transparent pb-safe-16 px-4">
      <button onClick={onSave} className="w-full h-14 bg-[var(--primary)] text-white font-bold text-[17px] rounded-2xl shadow-lg active:scale-95 transition-transform">
        {t.saveToCalendar}
      </button>
    </div>
  </div>
);

// ==========================================
// 8. TASKS LIST MODAL (Хвосты)
// ==========================================
export const TasksListModal = ({ open, onClose, tasks, onMarkDone, onReschedule, t }: { 
  open: boolean; onClose: () => void; tasks: ParsedEvent[]; onMarkDone: (id: number) => void; onReschedule: (task: ParsedEvent) => void; t: Dictionary;
}) => {
  const [activeTab, setActiveTab] = useState<'overdue' | 'upcoming'>('overdue');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!open) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter(t => t.date <= todayStr).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const upcomingTasks = tasks.filter(t => t.date > todayStr).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const displayedTasks = activeTab === 'overdue' ? overdueTasks : upcomingTasks;

  return (
    <div className="fixed inset-0 z-[400] bg-[var(--bg-main)] flex flex-col pt-safe">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/5 bg-[var(--bg-main)]/80 backdrop-blur-xl sticky top-0 shrink-0">
        <button onClick={onClose} className="text-[var(--primary)] text-[17px] font-medium">{t.cancel}</button>
        <h2 className="text-[17px] font-semibold flex items-center gap-2">
          <History className="w-5 h-5 text-[var(--primary)]" /> {t.tasksTitle}
        </h2>
        <div className="w-[60px]" /> 
      </div>

      {/* TABS */}
      <div className="px-4 py-5 shrink-0">
        <div className="flex items-center p-1 bg-[var(--bg-surface)] rounded-[11px] w-full shadow-inner">
          <button 
            onClick={() => { setActiveTab('overdue'); setExpandedId(null); }}
            className={`flex-1 flex items-center justify-center h-[34px] gap-2 rounded-[8px] transition-all duration-200 ${
              activeTab === 'overdue' ? 'bg-[#636366] shadow-md text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <span className="text-[14px] font-semibold">{t.overdue}</span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold min-w-[20px] text-center ${
              activeTab === 'overdue' ? 'bg-black/20 text-white' : 'bg-white/5 text-[var(--danger)]'
            }`}>
              {overdueTasks.length}
            </span>
          </button>

          <button 
            onClick={() => { setActiveTab('upcoming'); setExpandedId(null); }}
            className={`flex-1 flex items-center justify-center h-[34px] gap-2 rounded-[8px] transition-all duration-200 ${
              activeTab === 'upcoming' ? 'bg-[#636366] shadow-md text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <span className="text-[14px] font-semibold">{t.upcoming}</span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold min-w-[20px] text-center ${
              activeTab === 'upcoming' ? 'bg-black/20 text-white' : 'bg-white/5 text-[var(--success)]'
            }`}>
              {upcomingTasks.length}
            </span>
          </button>
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-safe-24 space-y-4 custom-scrollbar mask-linear-gradient">
        {displayedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pb-32 opacity-30">
             <Check size={56} className="mb-4 text-[var(--primary)]" />
             <p className="text-[17px] font-medium">{t.noTasks}</p>
          </div>
        ) : (
          displayedTasks.map((task) => {
            const isOverdue = task.date <= todayStr;
            
            return (
              <div 
                key={task.id} 
                onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                className="bg-[var(--bg-surface)] rounded-[20px] p-5 flex flex-col shadow-sm cursor-pointer transition-all active:scale-[0.98] active:bg-[var(--bg-surface-elevated)] border border-white/5"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1 mr-4">
                    <h3 className="font-bold text-white text-[18px] tracking-tight truncate leading-tight">{task.title}</h3>
                    <p className={`text-[14px] mt-1.5 font-medium ${isOverdue ? 'text-[var(--danger)]' : 'text-white/40'}`}>
                      {task.date} • {task.time}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onReschedule(task); }}
                      className="p-2.5 text-[var(--info)] rounded-xl active:opacity-50 transition-opacity"
                      style={{ backgroundColor: 'rgba(var(--info-rgb), 0.1)' }}
                    >
                      <Calendar size={20} strokeWidth={2} />
                    </button>

                    <button 
                      onClick={(e) => { e.stopPropagation(); onMarkDone(task.id); }}
                      className="px-5 py-2.5 text-[var(--success)] text-[15px] font-bold rounded-xl active:opacity-50 transition-opacity"
                      style={{ backgroundColor: 'rgba(var(--success-rgb), 0.15)' }}
                    >
                      {t.done}
                    </button>
                  </div>
                </div>

                {expandedId === task.id && task.description && (
                  <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-[15px] text-white/60 whitespace-pre-wrap leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};