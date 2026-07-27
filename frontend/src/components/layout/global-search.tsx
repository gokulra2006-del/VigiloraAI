import React, { useState, useEffect, useRef } from 'react';
import { Search, Map as MapIcon, CarFront, FileText, Settings, Users, Activity, ShieldAlert, Siren, BrainCircuit, ShieldBan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  category: string;
  path: string;
  icon: React.ElementType;
}

const ALL_SEARCH_ITEMS: SearchResult[] = [
  // Pages
  { id: '1', title: 'Dashboard', category: 'Pages', path: '/dashboard', icon: Activity },
  { id: '2', title: 'Live Feed', category: 'Pages', path: '/feed', icon: Activity },
  { id: '3', title: 'GIS Map', category: 'Pages', path: '/map', icon: MapIcon },
  { id: '4', title: 'Traffic Analytics', category: 'Pages', path: '/traffic', icon: CarFront },
  { id: '5', title: 'AI Models', category: 'Pages', path: '/ai-models', icon: BrainCircuit },
  { id: '6', title: 'Reports', category: 'Pages', path: '/reports', icon: FileText },
  { id: '7', title: 'Incidents', category: 'Pages', path: '/incidents', icon: ShieldAlert },
  { id: '8', title: 'SOC Center', category: 'Pages', path: '/soc', icon: Siren },
  { id: '9', title: 'Threat Intelligence', category: 'Pages', path: '/threats', icon: ShieldBan },
  { id: '10', title: 'Users', category: 'Pages', path: '/users', icon: Users },
  { id: '11', title: 'Settings', category: 'Pages', path: '/settings', icon: Settings },
  
  // Cameras
  { id: 'c1', title: 'CAM-N-101 (Main Gate)', category: 'Cameras', path: '/feed?cam=1', icon: Activity },
  { id: 'c2', title: 'CAM-S-205 (Parking A)', category: 'Cameras', path: '/feed?cam=2', icon: Activity },
  
  // Incidents
  { id: 'i1', title: 'INC-2026-042 (Unauthorized Access)', category: 'Incidents', path: '/incidents?id=INC-2026-042', icon: ShieldAlert },
  { id: 'i2', title: 'INC-2026-043 (Suspicious Vehicle)', category: 'Incidents', path: '/incidents?id=INC-2026-043', icon: ShieldAlert },
  
  // Reports
  { id: 'r1', title: 'Q2 Security Audit Report', category: 'Reports', path: '/reports?id=q2-audit', icon: FileText },
  { id: 'r2', title: 'Weekly Traffic Summary', category: 'Reports', path: '/reports?id=wk-traffic', icon: FileText },
  
  // Users
  { id: 'u1', title: 'Alex Mercer (Admin)', category: 'Users', path: '/users?id=u1', icon: Users },
  { id: 'u2', title: 'Sarah Chen (Analyst)', category: 'Users', path: '/users?id=u2', icon: Users },
  
  // AI Models
  { id: 'm1', title: 'YOLOv10 - Object Detection', category: 'AI Models', path: '/ai-models?model=yolo', icon: BrainCircuit },
  { id: 'm2', title: 'DeepSORT - Vehicle Tracking', category: 'AI Models', path: '/ai-models?model=deepsort', icon: BrainCircuit },
];

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Handle Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredItems = query 
    ? ALL_SEARCH_ITEMS.filter(item => item.title.toLowerCase().includes(query.toLowerCase()) || item.category.toLowerCase().includes(query.toLowerCase()))
    : ALL_SEARCH_ITEMS.slice(0, 5); // Show recent/suggestions if empty

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        navigate(filteredItems[selectedIndex].path);
        setIsOpen(false);
        setQuery('');
      }
    }
  };

  return (
    <>
      <div className="hidden md:flex relative group cursor-text" onClick={() => setIsOpen(true)}>
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-white transition-colors" />
        <div className="h-8 w-64 bg-zinc-900 border border-white/10 rounded-md pl-9 pr-12 flex items-center text-[13px] text-muted-foreground/70 shadow-sm hover:border-white/20 transition-all">
          Search...
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground bg-zinc-800 px-1.5 py-0.5 rounded border border-white/5">
          ⌘K
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh]">
              <motion.div 
                ref={containerRef}
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="w-full max-w-xl bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="relative border-b border-white/5 p-4 flex items-center">
                  <Search size={18} className="text-muted-foreground mr-3" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search pages, models, incidents..."
                    className="flex-1 bg-transparent border-none outline-none text-white text-sm"
                  />
                  <div className="text-[10px] font-mono text-muted-foreground bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5 ml-3">
                    ESC
                  </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                  {filteredItems.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No results found for "{query}"
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {!query && <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Suggestions</div>}
                      {filteredItems.map((item, index) => (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                            index === selectedIndex ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                          )}
                          onClick={() => {
                            navigate(item.path);
                            setIsOpen(false);
                            setQuery('');
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <div className={cn("p-1.5 rounded-md", index === selectedIndex ? "bg-primary/20 text-primary" : "bg-zinc-900")}>
                            <item.icon size={16} />
                          </div>
                          <div className="flex-1 flex justify-between items-center">
                            <span className="text-sm font-medium">{item.title}</span>
                            <span className="text-xs opacity-50">{item.category}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
