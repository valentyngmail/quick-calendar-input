import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, Settings, X, Globe, Mail, Lock, Link as LinkIcon, 
  History, Loader2, Hash, Users, Bug, Check, CheckSquare, 
  BookOpen, Search, MapPin, Edit2, Trash2, Calendar, Clock, ArrowRight, 
  Copy, Download, Upload, Plus, ArrowUp, ZapOff, ChevronLeft, CheckCircle2
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
    <div className="flex items-center gap-3 shrink-0 mr-4">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white ${bgColor}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 16, strokeWidth: 2.5 })}
      </div>
      <span className="text-[17px] tracking-tight whitespace-nowrap">{label}</span>
    </div>
    <div className="flex-1 flex justify-end min-w-0">
      {children}
    </div>
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
      <div className="bg-[var(--bg-surface)] border border-white/10 rounded-[20px] w-full max-w-sm p-6 flex flex-col shadow-2xl">
         <div className="flex items-center gap-3 mb-4 text-[var(--primary)]">
           <History size={24} />
           <h2 className="text-xl font-bold text-white tracking-tight">{t.syncDbTitle}</h2>
         </div>
         <p className="text-[14px] text-white/60 mb-6 leading-relaxed">
           {t.syncDbDesc}
         </p>
         <label className="text-[12px] font-bold text-white/40 uppercase mb-2 block tracking-wider">{t.fetchWebhookLabel}</label>
         <input 
           type="url" placeholder="https://hook.make.com/..." 
           value={settings.fetchLocationsWebhook}
           onChange={e => onSaveSettings({...settings, fetchLocationsWebhook: e.target.value})}
           className="bg-black border border-white/10 rounded-xl px-4 py-3 mb-6 w-full text-[var(--info)] text-sm outline-none focus:border-[var(--primary)] transition-colors"
         />
         <div className="flex gap-3 mt-2">
           <button onClick={onClose} className="flex-1 py-3.5 bg-white/10 text-white rounded-xl font-bold active:opacity-50 transition-opacity">{t.cancel}</button>
           <button 
             onClick={() => onSync(settings.fetchLocationsWebhook)}
             disabled={isSyncing || !settings.fetchLocationsWebhook}
             className="flex-1 py-3.5 bg-[var(--primary)] text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
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
  appLang: 'ru' | 'en' | 'de'; setAppLang: (lang: 'ru' | 'en' | 'de') => void; skipTranslation: boolean; setSkipTranslation: (skip: boolean) => void;
  testMode: boolean; setTestMode: (test: boolean) => void; // <-- ДОБАВИЛИ ЭТУ СТРОКУ
  t: Dictionary;
}

export const SettingsModal = ({ 
  open, onClose, settings, onSave, onOpenSyncModal, showDebug, setShowDebug,
  appLang, setAppLang, skipTranslation, setSkipTranslation,
  testMode, setTestMode, t
}: SettingsModalProps) => {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [kbOffset, setKbOffset] = useState(0);

  useEffect(() => { 
    if (open) setLocal({ ...settings }); 
    const vv = window.visualViewport;
    if (!vv || !open) { setKbOffset(0); return; }
    
    const onResize = () => {
      const offset = window.innerHeight - vv.height;
      setKbOffset(offset > 50 ? offset : 0);
    };
    
    vv.addEventListener('resize', onResize);
    onResize(); 
    return () => vv.removeEventListener('resize', onResize);
  }, [open, settings]);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
  };

  if (!open) return null;

  const handleSave = () => { onSave(local); toast.success(t.settingsSaved); onClose(); };

  const exportBackup = () => {
    const backup = {
      addresses: JSON.parse(localStorage.getItem(FAV_PLACES_KEY) || '[]'),
      history: JSON.parse(localStorage.getItem('calendarHistory') || '[]'),
      tasks: JSON.parse(localStorage.getItem('pendingTasks') || '[]')
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voicecal_full_backup_${new Date().toISOString().split('T')[0]}.json`;
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
        if (json.addresses || json.history || json.tasks) {
          if (json.addresses) localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(json.addresses));
          if (json.history) localStorage.setItem('calendarHistory', JSON.stringify(json.history));
          if (json.tasks) localStorage.setItem('pendingTasks', JSON.stringify(json.tasks));
          toast.success(t.backupRestored);
          setTimeout(() => window.location.reload(), 1500);
        } else if (Array.isArray(json)) {
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
      
      <div className="flex items-center justify-between px-4 h-16 bg-[var(--bg-main)]/80 backdrop-blur-xl sticky top-0 shrink-0 z-20 border-b border-white/5">
        <button onClick={onClose} className="w-[80px] text-left text-white/50 text-[17px] active:opacity-50 transition-opacity">
          {t.cancel || 'Cancel'}
        </button>
        <h2 className="flex-1 text-center text-[17px] font-semibold text-white tracking-tight">
          {t.settingsTitle}
        </h2>
        <button onClick={handleSave} className="w-[80px] text-right text-[var(--primary)] font-bold text-[17px] active:opacity-50 transition-opacity">
          {t.saveBtn || 'Done'}
        </button>
      </div>

      <div 
        className="flex-1 overflow-y-auto px-4 pt-4 custom-scrollbar transition-all duration-300"
        style={{ paddingBottom: Math.max(80, kbOffset) + 'px' }}
      >
        <p className="text-[13px] text-white/40 uppercase mt-2 mb-2 ml-4 tracking-tight">{t.langSection}</p>
        <div className="bg-[var(--bg-surface)] rounded-xl px-4 overflow-hidden">
          <SettingsRow label={t.interfaceLang} icon={<Globe />} bgColor="bg-[#007AFF]">
            <div className="flex bg-[var(--bg-surface-elevated)] p-0.5 rounded-lg shrink-0">
              {(['ru', 'en', 'de'] as const).map(l => (
                <button key={l} onClick={() => setAppLang(l)} className={`px-3 py-1 rounded-md text-[13px] font-bold ${appLang === l ? 'bg-[#636366] text-white shadow-sm' : 'text-white/40'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </SettingsRow>
          <SettingsRow label={t.translateToGerman} icon={<ArrowRight />} bgColor="bg-[#5856D6]">
            <Toggle checked={!skipTranslation} onChange={(v) => { setSkipTranslation(!v); localStorage.setItem('skipTrans', String(!v)); }} />
          </SettingsRow>
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-10 mb-2 ml-4 tracking-tight">{t.identitySection}</p>
        <div className="bg-[var(--bg-surface)] rounded-xl px-4 overflow-hidden">
          <SettingsRow label={t.organizer} icon={<Mail />} bgColor="bg-[#FF9500]">
            <input type="email" value={local.organizerEmail} onFocus={handleInputFocus} onChange={e => setLocal({...local, organizerEmail: e.target.value})} className="bg-transparent text-right outline-none text-white w-full placeholder:text-white/20 truncate" placeholder="email@example.com" />
          </SettingsRow>
          <SettingsRow label={t.defaultGuests} icon={<Users />} bgColor="bg-[#007AFF]">
            <input type="text" value={local.defaultGuests} onFocus={handleInputFocus} onChange={e => setLocal({...local, defaultGuests: e.target.value})} className="bg-transparent text-right outline-none text-white w-full placeholder:text-white/20 truncate" placeholder="guest1@mail.com" />
          </SettingsRow>
          <SettingsRow label={t.calendarId} icon={<Hash />} bgColor="bg-[#FF3B30]">
            <input type="text" value={local.calendarId} onFocus={handleInputFocus} onChange={e => setLocal({...local, calendarId: e.target.value})} className="bg-transparent text-right outline-none text-white w-full placeholder:text-white/20 truncate" placeholder="primary" />
          </SettingsRow>
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-10 mb-2 ml-4 tracking-tight">{t.webhooksSection || 'INTEGRATIONEN (WEBHOOKS)'}</p>
        <div className="bg-[var(--bg-surface)] rounded-xl px-4 overflow-hidden">
          <SettingsRow label="Decode Webhook" icon={<LinkIcon />} bgColor="bg-[#8E8E93]">
            <input type="url" value={local.decodeWebhook} onFocus={handleInputFocus} onChange={e => setLocal({...local, decodeWebhook: e.target.value})} className="bg-transparent text-right outline-none text-[var(--info)] text-[15px] w-full placeholder:text-white/20 truncate" placeholder="https://hook.make.com/..." />
          </SettingsRow>
          <SettingsRow label="Save Webhook" icon={<LinkIcon />} bgColor="bg-[#8E8E93]">
            <input type="url" value={local.saveWebhook} onFocus={handleInputFocus} onChange={e => setLocal({...local, saveWebhook: e.target.value})} className="bg-transparent text-right outline-none text-[var(--info)] text-[15px] w-full placeholder:text-white/20 truncate" placeholder="https://hook.make.com/..." />
          </SettingsRow>
          
          {/* ПЕРЕКЛЮЧАТЕЛЬ ТЕСТОВОГО РЕЖИМА */}
          <SettingsRow label={t.testModeLabel || "Test Mode (Skip API)"} icon={<ZapOff />} bgColor="bg-[#AF52DE]">
            <Toggle checked={testMode} onChange={(v) => { setTestMode(v); localStorage.setItem('testMode', String(v)); }} />
          </SettingsRow>
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-10 mb-2 ml-4 tracking-tight">{t.addressesSection}</p>
        <div className="bg-[var(--bg-surface)] rounded-xl overflow-hidden flex flex-col">
          <button onClick={() => { onClose(); onOpenSyncModal(); }} className="w-full py-3.5 text-[17px] text-[var(--primary)] active:bg-white/5 transition-colors">
             {t.fetchAddresses}
          </button>
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-10 mb-2 ml-4 tracking-tight">{t.backupSection}</p>
        <div className="bg-[var(--bg-surface)] rounded-xl overflow-hidden flex flex-col">
          <button onClick={exportBackup} className="w-full py-3.5 border-b border-white/10 text-[17px] text-[var(--info)] active:bg-white/5 transition-colors">
            {t.exportBackup}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-3.5 text-[17px] text-[#FF9500] active:bg-white/5 transition-colors">
            {t.restoreBackup}
          </button>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={importBackup} />
        </div>

        <p className="text-[13px] text-white/40 uppercase mt-10 mb-2 ml-4 tracking-tight">{t.securitySection}</p>
        <div className="bg-[var(--bg-surface)] rounded-xl px-4 overflow-hidden mb-8">
          <SettingsRow label={t.securityKey} icon={<Lock />} bgColor="bg-[#8E8E93]">
            <input type="password" value={local.securityKey} onFocus={handleInputFocus} onChange={e => setLocal({...local, securityKey: e.target.value})} className="bg-transparent text-right outline-none text-white w-full placeholder:text-white/20" placeholder="••••••••" />
          </SettingsRow>
          <SettingsRow label={t.debugConsole} icon={<Bug />} bgColor="bg-[#FF9500]">
            <button onClick={() => setShowDebug(true)} className="flex items-center justify-end w-full py-1 active:opacity-50 transition-opacity outline-none">
              <span className="text-white/40 text-[16px] mr-1">Open</span>
              <ArrowRight size={18} className="text-white/30" />
            </button>
          </SettingsRow>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. PLACES DATABASE MODAL (iOS TableView Edition)
// ==========================================
interface OSMItem {
  display_name: string;
  name?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
  };
}
interface SwipeablePlaceItemProps {
  place: FavoritePlace;
  onSelect?: (location: string) => void;
  onEdit: (place: FavoritePlace) => void;
  onDelete: (id: string) => void;
  isEditing: boolean;
  editForm: { title: string; location: string };
  setEditForm: (form: { title: string; location: string }) => void;
  saveEdit: (id: string) => void;
  cancelEdit: () => void;
  t: Dictionary;
}

const SwipeablePlaceItem = ({ 
  place, onSelect, onEdit, onDelete, isEditing, 
  editForm, setEditForm, saveEdit, cancelEdit, t 
}: SwipeablePlaceItemProps) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const startX = useRef(0);
  const startY = useRef(0);
  const isVerticalScroll = useRef(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) { setSuggestions([]); setShowDropdown(false); return; }
    try {
      const lang = localStorage.getItem('appLang') || 'ru';
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`, { headers: { 'Accept-Language': `${lang},en;q=0.9` }});
      if (!res.ok) return;
      const data = await res.json();
      const sugs = data.map((item: OSMItem) => {
        const addr = item.address;
        if (!addr) return item.display_name.split(',').slice(0, 3).join(',');
        const street = addr.road || addr.pedestrian || item.name || '';
        const house = addr.house_number ? ` ${addr.house_number}` : '';
        const city = addr.city || addr.town || addr.village || '';
        return street && city ? `${street}${house}, ${city}` : item.display_name.split(',').slice(0, 3).join(',');
      });
      setSuggestions(sugs);
      setShowDropdown(sugs.length > 0);
    } catch (e) { setSuggestions([]); }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
    isVerticalScroll.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    if (!isVerticalScroll.current && Math.abs(deltaY) > Math.abs(deltaX)) {
      setIsDragging(false);
      setOffsetX(0);
      return;
    }

    isVerticalScroll.current = true;
    if (deltaX < 0) setOffsetX(Math.max(deltaX, -190));
    else setOffsetX(0);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (offsetX < -80) setOffsetX(-190);
    else setOffsetX(0);
  };

  const openGoogleMaps = () => {
    // Official Google Maps Cross-Platform Deep Link
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.location)}`, '_blank');
  };

  if (isEditing) {
    return (
      <div className="px-4 py-4 border-b border-white/5 bg-[var(--bg-main)] animate-in fade-in duration-200">
        {/* 👇 УБИРАЕМ overflow-hidden и добавляем relative z-50 👇 */}
        <div className="bg-[var(--bg-surface)] rounded-xl mb-3 border border-white/10 shadow-sm relative z-50">
          <input 
            value={editForm.title} 
            onChange={e => setEditForm({...editForm, title: e.target.value})} 
            placeholder={t.placeName || "Название"} 
            className="w-full bg-transparent text-white px-4 py-3.5 outline-none border-b border-white/5 placeholder:text-white/30 text-[16px]" 
          />
          <div className="relative">
            <input 
              value={editForm.location} 
              onChange={e => {
                setEditForm({...editForm, location: e.target.value});
                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                searchTimeoutRef.current = setTimeout(() => fetchSuggestions(e.target.value), 400);
              }} 
              placeholder={t.address || "Адрес"} 
              className="w-full bg-transparent text-white px-4 py-3.5 outline-none placeholder:text-white/30 text-[16px]" 
            />
            {showDropdown && (
              <div className="absolute z-50 left-0 right-0 top-full bg-[var(--bg-surface-elevated)] border-t border-white/10 shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                {suggestions.map((loc, i) => (
                  <button key={i} onClick={() => { setEditForm({...editForm, location: loc}); setShowDropdown(false); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 border-b border-white/5 last:border-0 truncate transition-colors">
                    <MapPin size={14} className="inline mr-2 text-[var(--primary)]" /> {loc}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center px-1">
          <button onClick={() => { cancelEdit(); setShowDropdown(false); }} className="text-[16px] text-white/50 hover:text-white/80 transition-colors px-2 py-1">{t.cancel}</button>
          <button onClick={() => { saveEdit(place.id); setShowDropdown(false); }} className="bg-[#FF9500] text-white font-bold text-[15px] px-5 py-2 rounded-lg active:scale-95 transition-transform">{t.saveBtn}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-b border-white/5 overflow-hidden bg-[var(--bg-main)]" style={{ touchAction: 'pan-y' }}>
      <div 
        onTouchStart={!onSelect ? handleTouchStart : undefined}
        onTouchMove={!onSelect ? handleTouchMove : undefined}
        onTouchEnd={!onSelect ? handleTouchEnd : undefined}
        onTouchCancel={!onSelect ? handleTouchEnd : undefined}
        className="flex w-full"
        style={{ transform: `translateX(${offsetX}px)`, transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
      >
        <div 
          onClick={() => {
            if (onSelect) onSelect(place.location); 
            else { if (offsetX < -10) setOffsetX(0); else openGoogleMaps(); }
          }}
          className="w-full shrink-0 px-4 py-3 bg-[var(--bg-main)] flex items-center justify-between active:bg-[#1C1C1E] transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0 pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[var(--primary)] shrink-0">
              <MapPin size={15} />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-semibold text-white text-[16px] truncate leading-tight mb-0.5">{place.title || t.untitled}</h3>
              <p className="text-[13px] text-white/40 truncate leading-tight">{place.location}</p>
            </div>
          </div>
        </div>

        {!onSelect && (
          <div className="flex shrink-0">
            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(place.location); toast.success(t.copied); setOffsetX(0); }} className="w-[60px] bg-[var(--info)] flex flex-col items-center justify-center text-white active:opacity-80"><Copy size={20} /></button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(place); setOffsetX(0); }} className="w-[60px] bg-[#FF9500] flex flex-col items-center justify-center text-white active:opacity-80"><Edit2 size={20} /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(place.id); setOffsetX(0); }} className="w-[70px] bg-[var(--danger)] flex flex-col items-center justify-center text-white active:opacity-80"><Trash2 size={20} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

interface PlacesDatabaseModalProps {
  open: boolean; onClose: () => void; places: FavoritePlace[]; setPlaces: (p: FavoritePlace[]) => void; onSelect?: (location: string) => void; t: Dictionary;
}

export const PlacesDatabaseModal = ({ open, onClose, places, setPlaces, onSelect, t }: PlacesDatabaseModalProps) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', location: '' });
  
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', location: '' });
  
  const [lastDeleted, setLastDeleted] = useState<FavoritePlace | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [addSuggestions, setAddSuggestions] = useState<string[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const addSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAddSuggestions = async (query: string) => {
    if (query.length < 3) { setAddSuggestions([]); setShowAddDropdown(false); return; }
    try {
      const lang = localStorage.getItem('appLang') || 'ru';
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`, { headers: { 'Accept-Language': `${lang},en;q=0.9` }});
      if (!res.ok) return;
      const data = await res.json();
      const sugs = data.map((item: OSMItem) => {
        const addr = item.address;
        if (!addr) return item.display_name.split(',').slice(0, 3).join(',');
        const street = addr.road || addr.pedestrian || item.name || '';
        const house = addr.house_number ? ` ${addr.house_number}` : '';
        const city = addr.city || addr.town || addr.village || '';
        return street && city ? `${street}${house}, ${city}` : item.display_name.split(',').slice(0, 3).join(',');
      });
      setAddSuggestions(sugs);
      setShowAddDropdown(sugs.length > 0);
    } catch (e) { setAddSuggestions([]); }
  };

  useEffect(() => { 
    if (open) { setSearch(''); setEditingId(null); setLastDeleted(null); setIsAdding(false); setAddForm({ title: '', location: '' }); } 
  }, [open]);
  if (!open) return null;

  const filteredPlaces = places.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase()));

  const handleAddNew = () => {
    if (!addForm.location.trim()) return;
    const newPlace = { id: Date.now().toString(), title: addForm.title.trim() || t.untitled || 'Untitled', location: addForm.location.trim() };
    const updated = [newPlace, ...places].sort((a, b) => a.title.localeCompare(b.title));
    setPlaces(updated);
    localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(updated));
    setIsAdding(false); setAddForm({ title: '', location: '' });
    toast.success(t.placeUpdated || 'Added!');
  };

  const handleDelete = (id: string) => {
    const placeToDelete = places.find(p => p.id === id);
    if (!placeToDelete) return;
    const updated = places.filter(p => p.id !== id);
    setPlaces(updated);
    localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(updated));
    setLastDeleted(placeToDelete);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => setLastDeleted(null), 5000);
  };

  const handleUndo = () => {
    if (!lastDeleted) return;
    const restored = [...places, lastDeleted].sort((a, b) => a.title.localeCompare(b.title));
    setPlaces(restored);
    localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(restored));
    setLastDeleted(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  const startEdit = (place: FavoritePlace) => { setEditingId(place.id); setEditForm({ title: place.title, location: place.location }); };

  const saveEdit = (id: string) => {
    const updated = places.map(p => p.id === id ? { ...p, title: editForm.title.trim(), location: editForm.location.trim() } : p);
    updated.sort((a, b) => a.title.localeCompare(b.title));
    setPlaces(updated);
    localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(updated));
    setEditingId(null);
    toast.success(t.placeUpdated);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[var(--bg-main)] flex flex-col pt-safe">
      <div className="flex items-center justify-between px-4 h-16 bg-[var(--bg-main)]/80 backdrop-blur-xl sticky top-0 shrink-0 z-20">
        <button onClick={onClose} className="w-[80px] text-left text-[var(--primary)] text-[17px] font-medium active:opacity-50 transition-opacity">{t.cancel}</button>
        <h2 className="flex-1 text-center text-[17px] font-semibold text-white tracking-tight">{onSelect ? t.selectAddress : t.dbTitle}</h2>
        <div className="w-[80px] flex justify-end items-center gap-3">
          {!onSelect ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); const data = localStorage.getItem(FAV_PLACES_KEY); if (data && data !== '[]') { navigator.clipboard.writeText(data); toast.success(t.copied); } }} className="text-[var(--primary)] active:opacity-50 transition-opacity"><Copy className="w-5 h-5" /></button>
              <button onClick={() => setIsAdding(!isAdding)} className="text-[var(--primary)] active:opacity-50 transition-opacity"><Plus className="w-6 h-6" /></button>
            </>
          ) : <BookOpen className="w-5 h-5 text-white/20" />}
        </div>
      </div>
      
      <div className="px-4 py-3 shrink-0 bg-[var(--bg-main)] z-10 border-b border-white/5">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-white/30" />
          <input 
            type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchDb} 
            className="w-full bg-[#1C1C1E] rounded-[10px] pl-10 pr-4 py-2 text-[16px] text-white placeholder:text-white/40 focus:outline-none transition-all" 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-safe-24 custom-scrollbar relative">
        {isAdding && (
          <div className="px-4 py-4 border-b border-white/5 bg-[var(--bg-main)] animate-in fade-in slide-in-from-top-2 duration-200">
            {/* 👇 УБИРАЕМ overflow-hidden и добавляем relative z-50 👇 */}
            <div className="bg-[var(--bg-surface)] rounded-xl mb-3 border border-white/10 shadow-sm relative z-50">
              <input 
                value={addForm.title} onChange={e => setAddForm({...addForm, title: e.target.value})} placeholder={t.placeName || "Название"} 
                className="w-full bg-transparent text-white px-4 py-3.5 outline-none border-b border-white/5 placeholder:text-white/30 text-[16px]" 
              />
              <div className="relative">
                <input 
                  value={addForm.location} onChange={e => { setAddForm({...addForm, location: e.target.value}); if (addSearchTimeoutRef.current) clearTimeout(addSearchTimeoutRef.current); addSearchTimeoutRef.current = setTimeout(() => fetchAddSuggestions(e.target.value), 400); }} 
                  placeholder={t.address || "Адрес"} className="w-full bg-transparent text-white px-4 py-3.5 outline-none placeholder:text-white/30 text-[16px]" 
                />
                {showAddDropdown && (
                  <div className="absolute z-50 left-0 right-0 top-full bg-[var(--bg-surface-elevated)] border-t border-white/10 shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                    {addSuggestions.map((loc, i) => (
                      <button key={i} onClick={() => { setAddForm({...addForm, location: loc}); setShowAddDropdown(false); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 border-b border-white/5 last:border-0 truncate transition-colors"><MapPin size={14} className="inline mr-2 text-[var(--primary)]" /> {loc}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center px-1">
              <button onClick={() => { setIsAdding(false); setShowAddDropdown(false); }} className="text-[16px] text-white/50 hover:text-white/80 transition-colors px-2 py-1">{t.cancel}</button>
              <button onClick={() => { handleAddNew(); setShowAddDropdown(false); }} disabled={!addForm.location.trim()} className="bg-[var(--primary)] text-white font-bold text-[15px] px-5 py-2 rounded-lg disabled:opacity-40 active:scale-95 transition-all">{t.saveBtn || 'Save'}</button>
            </div>
          </div>
        )}

        {filteredPlaces.length === 0 ? (
           <div className="text-center py-20 text-white/20 font-medium">{t.noLocFound}</div>
        ) : (
          <div className="pb-safe-24">
            {filteredPlaces.map((place) => (
              <SwipeablePlaceItem key={place.id} place={place} onSelect={onSelect} onEdit={startEdit} onDelete={handleDelete} isEditing={editingId === place.id} editForm={editForm} setEditForm={setEditForm} saveEdit={saveEdit} cancelEdit={() => setEditingId(null)} t={t} />
            ))}
          </div>
        )}
      </div>

      {lastDeleted && (
        <div className="absolute bottom-10 left-4 right-4 z-[9999] bg-[#2C2C2E] border border-white/10 rounded-[16px] p-4 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300">
          <span className="text-white text-[16px] font-medium">{t.deleted}</span>
          <button onClick={handleUndo} className="text-[var(--info)] font-bold text-[16px] active:opacity-50 transition-opacity px-4 py-2 bg-[var(--info)]/10 rounded-xl">Undo</button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 5. REVIEW SCREEN 
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
}: ReviewScreenProps) => {

  const [kbOffset, setKbOffset] = useState(0);

  useEffect(() => { 
    const vv = window.visualViewport;
    if (!vv) { setKbOffset(0); return; }
    const onResize = () => { const offset = window.innerHeight - vv.height; setKbOffset(offset > 50 ? offset : 0); };
    vv.addEventListener('resize', onResize);
    onResize(); 
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-main)] z-[150] flex flex-col pt-safe">
      <div className="flex items-center justify-between px-4 h-16 bg-[var(--bg-main)]/80 backdrop-blur-xl sticky top-0 shrink-0 z-20">
        <button onClick={onCancel} className="w-[80px] text-left text-[var(--primary)] text-[17px] font-medium active:opacity-50 transition-opacity">{t.cancel}</button>
        <h2 className="flex-1 text-center text-[17px] font-semibold text-white tracking-tight">{t.checkDetails}</h2>
        <div className="w-[80px] flex justify-end"><Check className="w-5 h-5 text-white/20" /></div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 custom-scrollbar transition-all duration-300" style={{ paddingBottom: `calc(128px + ${kbOffset}px)` }}>
        <div className="pt-4 pb-3">
          <textarea value={parsedEvent.title} onFocus={handleInputFocus} onChange={e => setParsedEvent({...parsedEvent, title: e.target.value})} className="w-full bg-transparent text-white text-[24px] font-bold outline-none resize-none placeholder:text-white/10" rows={2} />
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl overflow-hidden mb-6">
          <InputRow label={t.date}><input type="date" value={parsedEvent.date} onFocus={handleInputFocus} onChange={e => setParsedEvent({...parsedEvent, date: e.target.value})} className="bg-transparent text-right outline-none text-white text-[17px]" /></InputRow>
          <InputRow label={t.time}><input type="time" value={parsedEvent.time} onFocus={handleInputFocus} onChange={e => setParsedEvent({...parsedEvent, time: e.target.value})} className="bg-transparent text-right outline-none text-white text-[17px]" /></InputRow>
          <InputRow label={t.duration}>
            <select value={parsedEvent.duration} onFocus={handleInputFocus} onChange={e => setParsedEvent({...parsedEvent, duration: e.target.value})} className="bg-transparent text-white text-[17px] outline-none appearance-none cursor-pointer w-full text-right text-align-last-right">
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="60">1 h</option>
              <option value="120">2 h</option>
            </select>
          </InputRow>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl mb-6 relative">
          <InputRow label={t.location}>
            <input type="text" value={parsedEvent.location} onFocus={handleInputFocus} onChange={e => onLocationChange(e.target.value)} className="bg-transparent text-right outline-none text-white w-full min-w-0 placeholder:text-white/10 text-[17px]" placeholder={t.address || "Address"} />
            {parsedEvent.location && <button onClick={() => onLocationChange('')} className="ml-2 p-1 text-white/30 hover:text-white/60 active:scale-95 transition-all"><X size={18} /></button>}
            <button onClick={onOpenDatabase} className="ml-3 p-1 text-[var(--primary)] active:opacity-50 transition-opacity"><BookOpen size={20} /></button>
          </InputRow>
          
          {showLocationDropdown && (
            <div className="absolute z-50 left-0 right-0 top-[56px] bg-[var(--bg-surface-elevated)] border border-white/10 rounded-b-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
              {locationSuggestions.map((loc, i) => (
                <button key={i} onClick={() => onSelectLocation(loc)} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 border-b border-white/5 last:border-0 truncate transition-colors"><MapPin size={14} className="inline mr-2 text-[var(--primary)]" /> {loc}</button>
              ))}
            </div>
          )}
          
          <InputRow label={t.guestsLabel}>
            <input type="text" value={parsedEvent.guests} onFocus={handleInputFocus} onChange={e => setParsedEvent({...parsedEvent, guests: e.target.value})} className="bg-transparent text-right outline-none text-white w-full min-w-0 placeholder:text-white/10" placeholder="email1, email2" />
            {parsedEvent.guests && <button onClick={() => setParsedEvent({...parsedEvent, guests: ''})} className="ml-2 p-1 text-white/30 hover:text-white/60 active:scale-95 transition-all"><X size={18} /></button>}
          </InputRow>
        </div>
        
        <div className="bg-[var(--bg-surface)] rounded-xl overflow-hidden mb-6">
          <InputRow label={t.taskMode || "Aufgabenkontrolle"}>
            <Toggle checked={!!parsedEvent.isTask} onChange={(v) => setParsedEvent({...parsedEvent, isTask: v})} />
          </InputRow>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl overflow-hidden mb-8 p-4">
          <label className="text-[13px] text-white/20 mb-2 font-bold uppercase tracking-widest block">{t.descLabel}</label>
          <textarea value={parsedEvent.description} onFocus={handleInputFocus} onChange={e => setParsedEvent({...parsedEvent, description: e.target.value})} className="w-full bg-transparent text-[15px] text-white/80 outline-none resize-none placeholder:text-white/10" rows={8} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/90 to-transparent pb-safe-16 px-4">
        <button onClick={onSave} className="w-full h-14 bg-[var(--primary)] text-white font-bold text-[17px] rounded-2xl shadow-lg active:scale-95 transition-transform">{t.saveToCalendar}</button>
      </div>
    </div>
  );
};

// ==========================================
// 8. TASKS LIST MODAL
// ==========================================
export const TasksListModal = ({ open, onClose, tasks, setTasks, onReschedule, t }: { 
  open: boolean; onClose: () => void; tasks: ParsedEvent[]; setTasks: (tasks: ParsedEvent[]) => void; onReschedule: (task: ParsedEvent) => void; t: Dictionary;
}) => {
  const [activeTab, setActiveTab] = useState<'overdue' | 'upcoming'>('overdue');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Новый стейт для выполненных задач
  const [completedTasks, setCompletedTasks] = useState<ParsedEvent[]>([]);

  useEffect(() => { 
    if (open) { 
      setCompletedTasks(JSON.parse(localStorage.getItem('completedTasks') || '[]'));
    } 
  }, [open]);

  if (!open) return null;

  // Точное время и дата
  const now = new Date();
  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  // Функция строгой проверки: меньше сегодняшней даты ИЛИ сегодня, но время уже прошло
  const isOverdueCheck = (t: ParsedEvent) => t.date < todayStr || (t.date === todayStr && t.time < timeStr);

  const overdueTasks = tasks.filter(isOverdueCheck).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const upcomingTasks = tasks.filter(t => !isOverdueCheck(t)).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const displayedTasks = activeTab === 'overdue' ? overdueTasks : upcomingTasks;

  // 1. Выполнение задачи (перенос вниз)
  const handleMarkDone = (task: ParsedEvent) => {
    // Удаляем из активных
    const updatedPending = tasks.filter(t => t.id !== task.id);
    setTasks(updatedPending);
    
    // Добавляем в выполненные (храним последние 50 штук, чтобы не забивать память)
    const updatedCompleted = [task, ...completedTasks].slice(0, 50);
    setCompletedTasks(updatedCompleted);
    localStorage.setItem('completedTasks', JSON.stringify(updatedCompleted));
  };

  // 2. Восстановление задачи (перенос наверх)
  const handleRestore = (task: ParsedEvent) => {
    const updatedCompleted = completedTasks.filter(t => t.id !== task.id);
    setCompletedTasks(updatedCompleted);
    localStorage.setItem('completedTasks', JSON.stringify(updatedCompleted));

    const updatedPending = [...tasks, task].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    setTasks(updatedPending);
  };

  // 3. Окончательное удаление
  const handleDeleteCompleted = (id: number) => {
    const updatedCompleted = completedTasks.filter(t => t.id !== id);
    setCompletedTasks(updatedCompleted);
    localStorage.setItem('completedTasks', JSON.stringify(updatedCompleted));
  };

  return (
    <div className="fixed inset-0 z-[400] bg-[var(--bg-main)] flex flex-col pt-safe">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 h-16 bg-[var(--bg-main)]/80 backdrop-blur-xl sticky top-0 shrink-0 z-20">
        <button 
          onClick={onClose} 
          className="w-[100px] flex items-center text-[var(--primary)] text-[17px] active:opacity-50 transition-opacity -ml-2"
        >
          <ChevronLeft size={24} className="mr-0.5" />
          <span className="mt-[1px]">{t.back || 'Zurück'}</span>
        </button>
        <h2 className="flex-1 text-center text-[17px] font-semibold text-white tracking-tight">
          {t.tasksTitle || "Meine Aufgaben"}
        </h2>
        <div className="w-[80px]" />
      </div>

      {/* HIG Segmented Control */}
      <div className="px-4 pt-2 pb-3 shrink-0 border-b border-white/5 bg-[var(--bg-main)] z-10">
        <div className="flex bg-[#1C1C1E] p-1 rounded-lg">
          <button 
            onClick={() => { setActiveTab('overdue'); setExpandedId(null); }}
            className={`flex-1 py-1.5 text-[13px] font-semibold rounded-md transition-all ${activeTab === 'overdue' ? 'bg-[#636366] text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}
          >
            {t.overdue || "Überfällig"} ({overdueTasks.length})
          </button>
          <button 
            onClick={() => { setActiveTab('upcoming'); setExpandedId(null); }}
            className={`flex-1 py-1.5 text-[13px] font-semibold rounded-md transition-all ${activeTab === 'upcoming' ? 'bg-[#636366] text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}
          >
            {t.upcoming || "Anstehend"} ({upcomingTasks.length})
          </button>
        </div>
      </div>

      {/* СПИСОК ЗАДАЧ */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-safe-24 custom-scrollbar">
        
        {/* АКТИВНЫЕ ЗАДАЧИ */}
        <div className="space-y-3">
          {displayedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
               <Check size={56} className="mb-4 text-[var(--primary)]" />
               <p className="text-[17px] font-medium">{activeTab === 'overdue' ? t.noOverdue : t.noUpcoming}</p>
            </div>
          ) : (
            displayedTasks.map((task) => {
              const isOverdue = isOverdueCheck(task);
              return (
                <div key={task.id} onClick={() => setExpandedId(expandedId === task.id ? null : task.id)} className="bg-[var(--bg-surface)] rounded-[16px] p-4 flex flex-col shadow-sm cursor-pointer transition-all active:scale-[0.98] active:bg-[var(--bg-surface-elevated)] border border-white/5">
                  <div className="flex items-start gap-3">
                    <button onClick={(e) => { e.stopPropagation(); handleMarkDone(task); }} className="mt-0.5 shrink-0 w-6 h-6 rounded-full border-[1.5px] border-white/30 active:border-[var(--success)] active:bg-[var(--success)]/20 transition-colors flex items-center justify-center text-transparent active:text-[var(--success)]">
                      <Check size={14} strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1 pr-2">
                      <h3 className="font-semibold text-white text-[17px] tracking-tight truncate leading-tight">{task.title}</h3>
                      <p className={`text-[13px] mt-1 font-medium ${isOverdue ? 'text-[var(--danger)]' : 'text-white/40'}`}>{task.date} • {task.time}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onReschedule(task); }} className="p-2 -mt-2 -mr-2 text-[var(--info)] rounded-full active:bg-white/10 transition-colors">
                      <Calendar size={18} />
                    </button>
                  </div>
                  {expandedId === task.id && task.description && (
                    <div className="mt-4 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <p className="text-[14px] text-white/60 whitespace-pre-wrap leading-relaxed">{task.description}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ВЫПОЛНЕННЫЕ ЗАДАЧИ (Плотный список) */}
        {completedTasks.length > 0 && (
          <div className="mt-10 mb-8 animate-in fade-in duration-300">
            <h3 className="text-[12px] font-bold text-white/30 uppercase tracking-widest px-1 mb-3 border-b border-white/10 pb-2">
              Erledigt ({completedTasks.length})
            </h3>
            <div className="flex flex-col">
              {completedTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between py-2.5 px-1 border-b border-white/5 last:border-0 group">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button 
                      onClick={() => handleRestore(task)} 
                      className="shrink-0 text-[var(--success)]/40 active:text-[var(--success)] transition-colors p-1 -ml-1"
                      title="Wiederherstellen"
                    >
                      {/* Убедись, что CheckCircle2 импортирован в начале файла! */}
                      <CheckCircle2 size={20} strokeWidth={2} />
                    </button>
                    <span className="text-[15px] font-medium text-white/40 line-through truncate tracking-tight">
                      {task.title}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeleteCompleted(task.id)} 
                    className="shrink-0 text-white/20 active:text-[var(--danger)] active:scale-95 transition-all p-2 -mr-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};