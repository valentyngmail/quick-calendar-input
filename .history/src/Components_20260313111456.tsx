import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AlertTriangle, Settings, X, Globe, Mail, Lock, Link as LinkIcon, 
  RefreshCw, History, Loader2, Hash, Users, Bug, Check, 
  BookOpen, Search, MapPin, Edit2, Trash2 
} from 'lucide-react';
import { toast } from 'sonner';

// Импортируем типы и константы из Core (или старых файлов, пока не переименовал)
import { AppSettings, FavoritePlace } from './types';
import { FAV_PLACES_KEY } from './constants';

type Dictionary = Record<string, string>;

// ==========================================
// 1. INPUT FIELD (Поле ввода для форм)
// ==========================================
interface InputFieldProps {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export const InputField = ({ 
  icon, label, type, value, onChange, placeholder, required, error 
}: InputFieldProps) => (
  <div className="text-left w-full">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
      {icon} {label} {required && <span className="text-destructive">*</span>}
    </label>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full bg-muted border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary transition-all ${error ? 'border-destructive ring-1 ring-destructive/50' : 'border-border'}`}
      style={{ fontSize: '16px' }}
    />
    {error && (
      <p className="mt-1 text-xs text-destructive flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> {error}
      </p>
    )}
  </div>
);

// ==========================================
// 2. SETTINGS MODAL (Настройки)
// ==========================================
interface SettingsModalProps {
  open: boolean; onClose: () => void; settings: AppSettings; onSave: (s: AppSettings) => void;
  onSync: (url: string) => void; isSyncing: boolean; syncProgress: string;
  showDebug: boolean; setShowDebug: (show: boolean) => void;
  appLang: 'ru' | 'en' | 'de'; setAppLang: (lang: 'ru' | 'en' | 'de') => void;
  skipTranslation: boolean; setSkipTranslation: (skip: boolean) => void; t: Dictionary; 
}

export const SettingsModal = ({ 
  open, onClose, settings, onSave, onSync, isSyncing, syncProgress, showDebug, setShowDebug,
  appLang, setAppLang, skipTranslation, setSkipTranslation, t
}: SettingsModalProps) => {
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  useEffect(() => { if (open) setLocal({ ...settings }); }, [open, settings]);
  if (!open) return null;

  const handleSave = () => { onSave(local); toast.success('Settings saved'); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto" onMouseDown={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl my-auto" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> {t.settingsTitle}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-left pb-2">
          <section className="space-y-3 bg-primary/5 p-3 rounded-xl border border-primary/10">
             <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5"><Globe className="w-4 h-4"/> {t.langSection}</h3>
             <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium">{t.interfaceLang}:</span>
                <div className="flex bg-background border border-border rounded-lg p-1">
                    {(['ru', 'en', 'de'] as const).map(l => (
                        <button key={l} onClick={() => { setAppLang(l); localStorage.setItem('appLang', l); }} 
                                className={`px-2 py-1 rounded-md text-sm transition-all ${appLang === l ? 'bg-primary text-primary-foreground shadow-sm' : 'opacity-50 hover:opacity-100'}`}>
                            {l === 'ru' ? '🇷🇺' : l === 'en' ? '🇺🇸' : '🇩🇪'}
                        </button>
                    ))}
                </div>
             </div>
             <label className="flex items-center justify-between mt-3 cursor-pointer">
                <span className="text-sm font-medium">{t.skipTrans}:</span>
                <input type="checkbox" checked={skipTranslation} onChange={e => { setSkipTranslation(e.target.checked); localStorage.setItem('skipTrans', String(e.target.checked)); }} className="rounded border-border text-primary focus:ring-primary w-5 h-5" />
             </label>
          </section>
          <section className="space-y-3 pt-2">
             <h3 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-border pb-1">{t.identitySection}</h3>
             <SettingInput label="Organizer Email" icon={<Mail className="w-4 h-4"/>} value={local.organizerEmail} onChange={(v) => setLocal({...local, organizerEmail: v})} placeholder="me@example.com" />
             <SettingInput label="Security Key" icon={<Lock className="w-4 h-4"/>} value={local.securityKey} onChange={(v) => setLocal({...local, securityKey: v})} placeholder="Secret" type="password" />
          </section>
          <section className="space-y-3 pt-2">
             <h3 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-border pb-1">{t.webhooksSection}</h3>
             <SettingInput label="Decode Webhook" icon={<LinkIcon className="w-4 h-4"/>} value={local.decodeWebhook} onChange={(v) => setLocal({...local, decodeWebhook: v})} placeholder="https://..." />
             <SettingInput label="Save Webhook" icon={<LinkIcon className="w-4 h-4"/>} value={local.saveWebhook} onChange={(v) => setLocal({...local, saveWebhook: v})} placeholder="https://..." />
             <button onClick={() => onSync(local.fetchLocationsWebhook || '')} disabled={isSyncing || !local.fetchLocationsWebhook} className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-50">
                {isSyncing ? <><Loader2 className="w-4 h-4 animate-spin" /><span>{syncProgress || "Syncing..."}</span></> : <><History className="w-4 h-4" /><span>{t.syncHistory}</span></>}
             </button>
          </section>
        </div>
        <button onClick={handleSave} className="w-full mt-6 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl"><Check className="w-5 h-5" /> {t.saveSettings}</button>
      </div>
    </div>
  );
};

// Вспомогательный компонент для настроек
const SettingInput = ({ label, icon, value, onChange, placeholder, type = "text" }: { label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void; placeholder: string; type?: string; }) => (
  <div className="text-left">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">{icon} {label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all" style={{fontSize: '16px'}} />
  </div>
);

// ==========================================
// 3. PLACES DATABASE MODAL (База мест)
// ==========================================
export const PlacesDatabaseModal = ({ 
  open, onClose, places, setPlaces, onSelect, t
}: { 
  open: boolean; onClose: () => void; places: FavoritePlace[]; setPlaces: (p: FavoritePlace[]) => void; onSelect?: (location: string) => void; t: Record<string, string>;
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', location: '' });
  const [editSuggestions, setEditSuggestions] = useState<string[]>([]);
  const [showEditDropdown, setShowEditDropdown] = useState(false);
  const editTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchEditLocation = useCallback(async (query: string) => {
    if (!query || query.length < 3) { setEditSuggestions([]); setShowEditDropdown(false); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, { headers: { 'Accept-Language': 'ru-RU,en;q=0.9' }});
      const data = await res.json();
      if (Array.isArray(data)) {
        const suggestions = data.map((item: { display_name: string }) => item.display_name).filter(Boolean);
        setEditSuggestions(suggestions);
        setShowEditDropdown(suggestions.length > 0);
      }
    } catch (err: unknown) { setShowEditDropdown(false); }
  }, []);

  useEffect(() => { if (open) { setSearch(''); setEditingId(null); setShowEditDropdown(false); } }, [open]);
  if (!open) return null;

  const filteredPlaces = (Array.isArray(places) ? places : []).filter(p => {
    const s = search.toLowerCase();
    return (p?.title || '').toLowerCase().includes(s) || (p?.location || '').toLowerCase().includes(s);
  });

  const saveEdit = (id: string) => {
    const updated = places.map(p => p?.id === id ? { ...p, title: editForm.title.trim(), location: editForm.location.trim() } : p);
    setPlaces(updated);
    localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(updated));
    setEditingId(null);
    toast.success("Place updated!");
  };

  const safeT = t || { selectAddress: 'Select Address', dbTitle: 'Places Database', searchDb: 'Search...', found: 'Found', noLocFound: 'No locations found' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4" onMouseDown={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-lg h-[80vh] shadow-2xl flex flex-col" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> {onSelect ? safeT.selectAddress : safeT.dbTitle}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={safeT.searchDb} className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredPlaces.map(place => (
            <div key={place.id} className="bg-background border border-border rounded-xl p-4 flex flex-col group">
              {editingId === place.id ? (
                <div className="space-y-2">
                  <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-muted p-2 rounded text-sm" />
                  <input value={editForm.location} onChange={e => { setEditForm({...editForm, location: e.target.value}); if (editTimeoutRef.current) clearTimeout(editTimeoutRef.current); editTimeoutRef.current = setTimeout(() => searchEditLocation(e.target.value), 400); }} className="w-full bg-muted p-2 rounded text-sm" />
                  <div className="flex justify-end gap-2"><button onClick={() => setEditingId(null)} className="text-xs">Cancel</button><button onClick={() => saveEdit(place.id)} className="text-xs font-bold text-primary">Save</button></div>
                </div>
              ) : (
                <div className="flex justify-between items-start" onClick={() => onSelect?.(place.location)}>
                  <div className="flex-1"><h4 className="font-bold text-sm">{place.title}</h4><p className="text-xs text-blue-500">{place.location}</p></div>
                  <div className="flex gap-1"><button onClick={(e) => { e.stopPropagation(); setEditingId(place.id); setEditForm({title: place.title, location: place.location}); }} className="p-1 hover:text-primary"><Edit2 className="w-4 h-4"/></button></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};