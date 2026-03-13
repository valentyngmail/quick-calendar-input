import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, X, Search, MapPin, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { FavoritePlace } from './types';
import { FAV_PLACES_KEY } from './constants';

const PlacesDatabaseModal = ({ 
  open, onClose, places, setPlaces, onSelect, t
}: { 
  open: boolean; onClose: () => void; places: FavoritePlace[]; setPlaces: (p: FavoritePlace[]) => void; onSelect?: (location: string) => void; t: Record<string, string>;
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', location: '' });
  
  const [editSuggestions, setEditSuggestions] = useState<string[]>([]);
  const [showEditDropdown, setShowEditDropdown] = useState(false);
  // ИСПРАВЛЕНИЕ 1: Указали правильный тип для таймера
  const editTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchEditLocation = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setEditSuggestions([]);
      setShowEditDropdown(false);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, { 
        headers: { 'Accept-Language': 'ru-RU,en;q=0.9' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        // ИСПРАВЛЕНИЕ 2: Сказали, что у item точно есть строковое поле display_name
        const suggestions = data.map((item: { display_name: string }) => item.display_name).filter(Boolean);
        setEditSuggestions(suggestions);
        setShowEditDropdown(suggestions.length > 0);
      } else {
        setEditSuggestions([]);
        setShowEditDropdown(false);
      }
    // ИСПРАВЛЕНИЕ 3: Заменили err: any на err: unknown
    } catch (err: unknown) {
      setEditSuggestions([]);
      setShowEditDropdown(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      setEditingId(null);
      setEditSuggestions([]);
      setShowEditDropdown(false);
    }
  }, [open]);

  if (!open) return null;

  const safePlaces = Array.isArray(places) ? places : [];
  const safeSearch = (search || '').toLowerCase();

  const filteredPlaces = safePlaces.filter(p => {
    if (!p) return false;
    const title = (p.title || '').toLowerCase();
    const loc = (p.location || '').toLowerCase();
    return title.includes(safeSearch) || loc.includes(safeSearch);
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this address from database?")) {
      const updated = safePlaces.filter(p => p?.id !== id);
      setPlaces(updated);
      localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(updated));
    }
  };

  const startEdit = (place: FavoritePlace) => {
    if (!place) return;
    setEditingId(place.id);
    setEditForm({ title: place.title || '', location: place.location || '' });
    setEditSuggestions([]);
    setShowEditDropdown(false);
  };

  const saveEdit = (id: string) => {
    const updated = safePlaces.map(p => 
      p?.id === id ? { ...p, title: (editForm.title || '').trim(), location: (editForm.location || '').trim() } : p
    );
    updated.sort((a, b) => (a?.title || '').localeCompare(b?.title || ''));
    setPlaces(updated);
    localStorage.setItem(FAV_PLACES_KEY, JSON.stringify(updated));
    setEditingId(null);
    toast.success("Place updated!");
  };

  const handleEditLocationChange = (val: string) => {
    setEditForm({ ...editForm, location: val });
    if (editTimeoutRef.current) clearTimeout(editTimeoutRef.current);
    editTimeoutRef.current = setTimeout(() => searchEditLocation(val), 400);
  };

  const selectEditLocation = (loc: string) => {
    setEditForm({ ...editForm, location: loc });
    setShowEditDropdown(false);
  };

  const openMaps = (e: React.MouseEvent, location: string) => {
    e.stopPropagation();
    if (!location) return;
    window.open(`https://www.openstreetmap.org/search?query=${encodeURIComponent(location)}`, '_blank');
  };

  const safeT = t || {
    selectAddress: 'Select Address', dbTitle: 'Places Database', searchDb: 'Search...', found: 'Found', noLocFound: 'No locations found'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4" onMouseDown={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg h-[80vh] shadow-2xl flex flex-col" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> 
            {onSelect ? safeT.selectAddress : safeT.dbTitle}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
            <input 
              type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={safeT.searchDb}
              className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 px-1">{safeT.found}: {filteredPlaces.length}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredPlaces.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">{safeT.noLocFound}</div>
          ) : (
            filteredPlaces.map(place => {
              if (!place) return null;
              return (
                <div key={place.id} className="bg-background border border-border rounded-xl p-4 shadow-sm group hover:border-primary/40 transition-all flex flex-col">
                  {editingId === place.id ? (
                    <div className="space-y-3">
                      <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-muted text-sm px-3 py-2 rounded-lg border-none focus:ring-1 focus:ring-primary" placeholder="Meeting Title" />
                      
                      <div className="relative">
                        <input 
                          value={editForm.location} 
                          onChange={e => handleEditLocationChange(e.target.value)} 
                          className="w-full bg-muted text-sm px-3 py-2 rounded-lg border-none focus:ring-1 focus:ring-primary" 
                          placeholder="Address" 
                        />
                        {showEditDropdown && (
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-primary/30 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                            {editSuggestions.map((loc, i) => (
                              <button key={i} type="button" onClick={() => selectEditLocation(loc)} className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-primary/10 transition-colors truncate border-b border-border/50 last:border-0">
                                <MapPin className="w-3.5 h-3.5 inline mr-2 text-primary" />{loc}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end mt-2">
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs rounded-lg hover:bg-muted">Cancel</button>
                        <button onClick={() => saveEdit(place.id)} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-bold">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-4">
                      <div className={`flex-1 min-w-0 ${onSelect ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`} onClick={() => { if(onSelect) onSelect(place.location); }}>
                        <h4 className="font-bold text-foreground text-sm truncate">{place.title || 'Untitled Meeting'}</h4>
                        <div onClick={(e) => openMaps(e, place.location)} className={`flex items-start gap-1.5 mt-1 text-blue-500 hover:underline transition-colors ${!onSelect ? 'cursor-pointer' : ''}`} title="Open in OpenStreetMap">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <p className="text-xs break-words">{place.location || 'No address'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => startEdit(place)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(place.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PlacesDatabaseModal;