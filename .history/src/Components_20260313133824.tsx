import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, Settings, X, Globe, Mail, Lock, Link as LinkIcon, 
  RefreshCw, History, Loader2, Hash, Users, Bug, Check, 
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
  <button onClick={() => onChange(!checked)} className={`w-[51px] h-[31px] rounded-full transition-colors relative focus:outline-none ${checked ? 'bg-[#34C759]' : 'bg-[#39393D]'}`}>
    <div className={`absolute top-[2px] left-[2px] bg-white w-[27px] h-[27px] rounded-full shadow-md transition-transform ${checked ? 'translate-x-[20px]' : 'translate-x-0'}`} />
  </button>
);

const SettingsRow = ({ label, icon, bgColor, children }: { label: string; icon: React.ReactNode; bgColor: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-0 min-h-[44px]">
    <div className="flex items-center gap-3">
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
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (s: AppSettings) => void;
  onSync: (url: string) => void;
  isSyncing: boolean;
  syncProgress: string;
}

export const SyncModal = ({ open, onClose, settings, onSaveSettings, onSync, isSyncing, syncProgress }: SyncModalProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-sm p-6 flex flex-col shadow-2xl">
         <div className="flex items-center gap-3 mb-4 text-[#34C759]">
           <History size={24} />
           <h2 className="text-xl font-bold text-white">Sync Database</h2>
         </div>
         <p className="text-[14px] text-white/60 mb-6 leading-relaxed">
           To sync your 3-year location history, you need to activate the <b>"Fetch Locations"</b> scenario in your Make.com account and paste the Webhook URL below.
         </p>
         <label className="text-[12px] font-bold text-white/40 uppercase mb-2 block tracking-wider">Fetch Webhook URL</label>
         <input 
           type="url" placeholder="https://hook.make.com/..." 
           value={settings.fetchLocationsWebhook}
           onChange={e => onSaveSettings({...settings, fetchLocationsWebhook: e.target.value})}
           className="bg-black border border-white/10 rounded-xl px-4 py-3 mb-6 w-full text-[#0A84FF] text-sm outline-none focus:border-[#34C759]"
         />
         <div className="flex gap-3 mt-2">
           <button onClick={onClose} className="flex-1 py-3.5 bg-white/10 text-white rounded-xl font-bold active:scale-95 transition-transform">Cancel</button>
           <button 
             onClick={() => onSync(settings.fetchLocationsWebhook)}
             disabled={isSyncing || !settings.fetchLocationsWebhook}
             className="flex-1 py-3.5 bg-[#34C759] text-black rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
           >
             {isSyncing && <Loader2 className="animate-spin" size={18}/>}
             {isSyncing ? 'Syncing...' : 'Start Sync'}
           </button>
         </div>
         {syncProgress && <p className="text-center text-[#34C759] text-xs mt-4 font-bold">{syncProgress}</p>}
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

  const handleSave = () => { onSave(local); toast.success('Settings saved'); onClose(); };

  // --- ФУНКЦИИ БЭКАПА В ФАЙЛ ---
  const exportBackup = () => {
    const data = localStorage.getItem(FAV_PLACES_KEY);
    if (!data || data === '[]') return toast.error('Database is empty!');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voicecal_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup file created!');
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
          toast.success('Backup successfully restored!');
          setTimeout(() => window.location.reload(), 1500); 
        } else throw new Error('Invalid format');
      } catch (err) { toast.error('Failed to read backup file.'); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
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
          <SettingsRow label={t.organizer} icon={<Mail />} bgColor="bg-[#FF9500]">
            <input type="email" value={local.organizerEmail} onChange={e => setLocal({...local, organizerEmail: e.target.value})} className="bg-transparent text-right outline-none text-white/60 w-full" placeholder="email" />
          </SettingsRow>
          <SettingsRow label={t.defaultGuests} icon={<Users />} bgColor="bg-[#007AFF]">
            <input type="text" value={local.defaultGuests} onChange={e => setLocal({...local, defaultGuests: e.target.value})} className="bg-transparent text-right outline-none text-white/60 w-full" placeholder="emails" />
          </SettingsRow>
          <SettingsRow label={t.calendarId} icon={<Hash />} bgColor="bg-[#FF3B30]">
            <input type="text" value={local.calendarId} onChange={e => setLocal({...local, calendarId: e.target.value})} className="bg-transparent text-right outline-none text-white/60 w-full" />
          </SettingsRow>
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-8 mb-2 ml-4 tracking-tight">{t.webhooksSection}</p>
        <div className="bg-[#1C1C1E] rounded-xl px-4 overflow-hidden">
          <div className="py-3 border-b border-white/10">
             <div className="flex items-center gap-3 mb-1"><div className="w-7 h-7 rounded-md bg-[#8E8E93] flex items-center justify-center text-white"><LinkIcon size={16} /></div><span className="text-[17px]">{t.decodeWebhook}</span></div>
             <input type="url" value={local.decodeWebhook} onChange={e => setLocal({...local, decodeWebhook: e.target.value})} className="bg-transparent outline-none text-[#0A84FF] text-[14px] font-mono w-full" placeholder="https://hook..." />
          </div>
          <div className="py-3 border-b border-white/10">
             <div className="flex items-center gap-3 mb-1"><div className="w-7 h-7 rounded-md bg-[#8E8E93] flex items-center justify-center text-white"><LinkIcon size={16} /></div><span className="text-[17px]">{t.saveWebhook}</span></div>
             <input type="url" value={local.saveWebhook} onChange={e => setLocal({...local, saveWebhook: e.target.value})} className="bg-transparent outline-none text-[#0A84FF] text-[14px] font-mono w-full" placeholder="https://hook..." />
          </div>
          <button onClick={() => { onClose(); onOpenSyncModal(); }} className="w-full flex items-center py-3 text-[#34C759] gap-3">
             <div className="w-7 h-7 rounded-md bg-[#34C759] flex items-center justify-center text-white"><History size={16} /></div>
             <span className="text-[17px] font-medium">{t.syncHistory}</span>
          </button>
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-8 mb-2 ml-4 tracking-tight">{t.backupSection}</p>
        <div className="bg-[#1C1C1E] rounded-xl px-4 overflow-hidden flex flex-col">
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
        <div className="bg-[#1C1C1E] rounded-xl px-4 overflow-hidden mb-8">
          <SettingsRow label={t.securityKey} icon={<Lock />} bgColor="bg-[#8E8E93]">
            <input type="password" value={local.securityKey} onChange={e => setLocal({...local, securityKey: e.target.value})} className="bg-transparent text-right outline-none text-white/60 w-full" />
          </SettingsRow>
          <SettingsRow label={t.debugConsole} icon={<Bug />} bgColor="bg-[#FF9500]">
            <Toggle checked={showDebug} onChange={setShowDebug} />
          </SettingsRow>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <button onClick={handleSave} className="w-full h-14 bg-[#34C759] text-black font-bold rounded-2xl shadow-xl active:scale-95 transition-transform">{t.saveSettings}</button>
      </div>
    </div>
  );
};

// ==========================================
// 4. PLACES DATABASE MODAL
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
    if (window.confirm("Delete this address from database?")) {
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
    toast.success("Place updated!");
  };

  const openGoogleMaps = (e: React.MouseEvent, location: string) => {
    e.stopPropagation(); window.open(`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(location)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
          <h2 className="text-[17px] font-bold text-white flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#34C759]" /> {onSelect ? t.selectAddress : t.dbTitle}</h2>
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const data = localStorage.getItem(FAV_PLACES_KEY);
                if (data && data !== '[]') {
                  navigator.clipboard.writeText(data);
                  toast.success('Database copied to clipboard!');
                } else {
                  toast.error('Database is empty!');
                }
              }} 
              className="p-2 text-[#34C759] hover:bg-[#34C759]/20 rounded-xl transition-colors"
              title="Copy Database Text"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition-colors rounded-xl"><X className="w-5 h-5" /></button>
          </div>
        </div>
        
        <div className="p-4 border-b border-white/10 bg-black/20">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-white/40" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchDb} className="w-full bg-[#2C2C2E] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#34C759] transition-all" />
          </div>
          <p className="text-[11px] text-white/40 mt-2 px-1 uppercase tracking-wider">{t.found}: {filteredPlaces.length}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredPlaces.length === 0 ? (
             <div className="text-center py-10 text-white/40">{t.noLocFound}</div>
          ) : (
            filteredPlaces.map(place => (
              <div key={place.id} className="bg-[#2C2C2E] border border-white/5 rounded-xl p-4 flex flex-col">
                {editingId === place.id ? (
                  <div className="space-y-3">
                    <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-black/40 text-sm text-white px-3 py-2 rounded-lg outline-none focus:border-[#34C759] border border-transparent" placeholder="Meeting Title" />
                    <input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} className="w-full bg-black/40 text-sm text-white px-3 py-2 rounded-lg outline-none focus:border-[#34C759] border border-transparent" placeholder="Address" />
                    <div className="flex gap-2 justify-end mt-2">
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs font-medium text-white/60 hover:text-white">Cancel</button>
                      <button onClick={() => saveEdit(place.id)} className="px-4 py-2 text-xs bg-[#34C759] text-black rounded-lg font-bold">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start gap-4">
                    <div className={`flex-1 min-w-0 ${onSelect ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`} onClick={() => { if(onSelect) onSelect(place.location); }}>
                      <h4 className="font-bold text-white text-[15px] truncate">{place.title || 'Untitled Meeting'}</h4>
                      <div onClick={(e) => openGoogleMaps(e, place.location)} className={`flex items-start gap-1.5 mt-1.5 text-[#0A84FF] hover:text-[#34C759] transition-colors ${!onSelect ? 'cursor-pointer' : ''}`} title="Open in Google Maps">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <p className="text-[13px] break-words leading-tight">{place.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(place)} className="p-2 text-white/40 hover:text-[#34C759] rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(place.id)} className="p-2 text-white/40 hover:text-[#FF453A] rounded-lg"><Trash2 className="w-4 h-4" /></button>
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

// ==========================================
// 5. REVIEW SCREEN
// ==========================================
export const InputRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 last:border-0 min-h-[56px]">
    <span className="text-[15px] text-white/40 font-medium w-24">{label}</span>
    <div className="flex-1 flex justify-end items-center">{children}</div>
  </div>
);

interface ReviewScreenProps {
  parsedEvent: ParsedEvent; 
  setParsedEvent: (event: ParsedEvent) => void; 
  rawInputStore: string; 
  t: Dictionary; 
  onCancel: () => void; 
  onSave: () => void; 
  onLocationChange: (loc: string) => void;
  locationSuggestions: string[];
  showLocationDropdown: boolean;
  onSelectLocation: (loc: string) => void;
  onOpenDatabase: () => void;
}

export const ReviewScreen = ({ 
  parsedEvent, setParsedEvent, rawInputStore, t, onCancel, onSave, 
  onLocationChange, locationSuggestions, showLocationDropdown, onSelectLocation, onOpenDatabase
}: ReviewScreenProps) => (
  <div className="fixed inset-0 bg-black z-[150] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
    <div className="flex items-center justify-between px-4 h-11 border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0">
      <button onClick={onCancel} className="text-[#FF453A] text-[17px] font-medium">{t.cancel}</button>
      <h2 className="text-[17px] font-semibold">{t.checkDetails}</h2>
      <div className="w-[60px]" />
    </div>

    <div className="flex-1 overflow-y-auto px-4 pb-32">
      <div className="py-6">
        <textarea value={parsedEvent.title} onChange={e => setParsedEvent({...parsedEvent, title: e.target.value})} className="w-full bg-transparent text-[24px] font-bold outline-none resize-none placeholder:text-white/20" rows={2} />
      </div>

      <div className="bg-[#1C1C1E] rounded-xl overflow-hidden mb-6">
        <InputRow label={t.date}><input type="date" value={parsedEvent.date} onChange={e => setParsedEvent({...parsedEvent, date: e.target.value})} className="bg-transparent text-right outline-none text-[#34C759] font-semibold" /></InputRow>
        <InputRow label={t.time}><input type="time" value={parsedEvent.time} onChange={e => setParsedEvent({...parsedEvent, time: e.target.value})} className="bg-transparent text-right outline-none text-[#34C759] font-semibold" /></InputRow>
        <InputRow label="Duration">
          <select dir="rtl" value={parsedEvent.duration} onChange={e => setParsedEvent({...parsedEvent, duration: e.target.value})} className="bg-transparent text-white/60 outline-none appearance-none w-full">
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
          </select>
        </InputRow>
      </div>

      <div className="bg-[#1C1C1E] rounded-xl mb-6 relative">
        <InputRow label={t.location}>
          <input type="text" value={parsedEvent.location} onChange={e => onLocationChange(e.target.value)} className="bg-transparent text-right outline-none text-white/60 w-full" placeholder="Address" />
          <button onClick={onOpenDatabase} className="ml-3 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-[#34C759]">
            <BookOpen size={18} />
          </button>
        </InputRow>
        
        {showLocationDropdown && (
          <div className="absolute z-50 left-0 right-0 top-[56px] bg-[#2C2C2E] border border-white/10 rounded-b-xl shadow-2xl max-h-48 overflow-y-auto">
            {locationSuggestions.map((loc, i) => (
              <button key={i} onClick={() => onSelectLocation(loc)} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 border-b border-white/5 last:border-0 truncate transition-colors">
                <MapPin size={14} className="inline mr-2 text-[#34C759]" /> {loc}
              </button>
            ))}
          </div>
        )}
        
        <InputRow label="Guests"><input type="text" value={parsedEvent.guests} onChange={e => setParsedEvent({...parsedEvent, guests: e.target.value})} className="bg-transparent text-right outline-none text-white/60 w-full" placeholder="Emails" /></InputRow>
      </div>

      <div className="bg-[#1C1C1E] rounded-xl overflow-hidden mb-6 p-4">
        <label className="text-[13px] text-white/40 mb-2 font-bold uppercase tracking-widest block">Description</label>
        <textarea value={parsedEvent.description} onChange={e => setParsedEvent({...parsedEvent, description: e.target.value})} className="w-full bg-transparent text-[15px] outline-none resize-none placeholder:text-white/20" rows={4} />
      </div>

      <div className="bg-[#34C759]/5 border border-[#34C759]/20 rounded-xl p-4 mb-8">
        <p className="text-[13px] text-white/40 mb-1 font-bold uppercase tracking-widest">Original Prompt</p>
        <p className="text-[15px] text-white/80 leading-relaxed italic">"{rawInputStore}"</p>
      </div>
    </div>

    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <button onClick={onSave} className="w-full h-14 bg-gradient-to-br from-[#34C759] to-[#28a745] text-black font-bold rounded-2xl shadow-lg active:scale-95 transition-transform">{t.saveSettings}</button>
    </div>
  </div>
);