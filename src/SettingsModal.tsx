import React, { useState, useEffect } from 'react';
import { Settings, X, Globe, Mail, Lock, Link as LinkIcon, RefreshCw, History, Loader2, Hash, Users, Bug, Check } from 'lucide-react';
import { toast } from 'sonner';
import { AppSettings } from './types';

// Описываем структуру словаря. Заменяем any на string.
interface Dictionary {
  settingsTitle: string;
  langSection: string;
  interfaceLang: string;
  skipTrans: string;
  identitySection: string;
  webhooksSection: string;
  syncHistory: string;
  prefsSection: string;
  saveSettings: string;
  showDebug?: string;
  // Используем string, так как все значения в словаре — это тексты
  [key: string]: string | undefined; 
}

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

const SettingsModal = ({ 
  open, onClose, settings, onSave, onSync, isSyncing, syncProgress, showDebug, setShowDebug,
  appLang, setAppLang, skipTranslation, setSkipTranslation, t
}: SettingsModalProps) => {
  const [local, setLocal] = useState<AppSettings>({ ...settings });

  useEffect(() => { 
    if (open) setLocal({ ...settings }); 
  }, [open, settings]);

  if (!open) return null;

  const handleSave = () => {
    onSave(local);
    toast.success('Settings saved');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto" onMouseDown={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl my-auto" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> {t.settingsTitle}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
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
                <input 
                  type="checkbox" 
                  checked={skipTranslation} 
                  onChange={e => { setSkipTranslation(e.target.checked); localStorage.setItem('skipTrans', String(e.target.checked)); }} 
                  className="rounded border-border text-primary focus:ring-primary w-5 h-5" 
                />
             </label>
          </section>

          <section className="space-y-3 pt-2">
             <h3 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-border pb-1">{t.identitySection}</h3>
             <SettingInput label="Organizer Email" icon={<Mail className="w-4 h-4"/>} value={local.organizerEmail} onChange={(v) => setLocal({...local, organizerEmail: v})} placeholder="me@example.com" />
             <SettingInput label="Security Key" icon={<Lock className="w-4 h-4"/>} value={local.securityKey} onChange={(v) => setLocal({...local, securityKey: v})} placeholder="Your Secret Password" type="password" />
          </section>

          <section className="space-y-3 pt-2">
             <h3 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-border pb-1">{t.webhooksSection}</h3>
             <SettingInput label="Decode Webhook (Gemini)" icon={<LinkIcon className="w-4 h-4"/>} value={local.decodeWebhook} onChange={(v) => setLocal({...local, decodeWebhook: v})} placeholder="https://hook.make.com/..." />
             <SettingInput label="Save Webhook (Calendar)" icon={<LinkIcon className="w-4 h-4"/>} value={local.saveWebhook} onChange={(v) => setLocal({...local, saveWebhook: v})} placeholder="https://hook.make.com/..." />
             <SettingInput label="Fetch Locations (Optional)" icon={<RefreshCw className="w-4 h-4"/>} value={local.fetchLocationsWebhook} onChange={(v) => setLocal({...local, fetchLocationsWebhook: v})} placeholder="https://hook.make.com/..." />
             
             <button 
                onClick={() => onSync(local.fetchLocationsWebhook || '')} 
                disabled={isSyncing || !local.fetchLocationsWebhook}
                className="relative w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-50 overflow-hidden"
             >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span className="truncate">{syncProgress || "Syncing..."}</span>
                  </>
                ) : (
                  <>
                    <History className="w-4 h-4 shrink-0" />
                    <span>{t.syncHistory}</span>
                  </>
                )}
             </button>
          </section>

          <section className="space-y-3 pt-2">
             <h3 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-border pb-1">{t.prefsSection}</h3>
             <SettingInput label="Calendar ID" icon={<Hash className="w-4 h-4"/>} value={local.calendarId} onChange={(v) => setLocal({...local, calendarId: v})} placeholder="primary" />
             <div>
               <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><Users className="w-4 h-4" /> Default Guests</label>
               <textarea value={local.defaultGuests} onChange={e => setLocal({...local, defaultGuests: e.target.value})} placeholder="email1, email2" rows={2} className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none" style={{ fontSize: '16px' }} />
             </div>
             
             <div className="flex items-center justify-between p-3 mt-2 bg-muted/50 rounded-lg border border-border">
                <label className="text-xs font-medium text-foreground flex items-center gap-2">
                  <Bug className="w-4 h-4 text-primary" /> {t.showDebug || "Show Debug Console"}
                </label>
                <button 
                  onClick={() => setShowDebug(!showDebug)} 
                  className={`w-10 h-6 rounded-full transition-colors relative focus:outline-none ${showDebug ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${showDebug ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
             </div>
          </section>
        </div>

        <button onClick={handleSave} className="w-full mt-6 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all">
          <Check className="w-5 h-5" /> {t.saveSettings}
        </button>
      </div>
    </div>
  );
};

interface SettingInputProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}

const SettingInput = ({ label, icon, value, onChange, placeholder, type = "text" }: SettingInputProps) => (
  <div className="text-left">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">{icon} {label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all" style={{fontSize: '16px'}} />
  </div>
);

export default SettingsModal;