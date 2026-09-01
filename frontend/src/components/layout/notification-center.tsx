import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  category: 'system' | 'alert' | 'update';
  read: boolean;
  timestamp: string;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'High CPU Usage', message: 'AI Model Server is experiencing high load.', category: 'alert', read: false, timestamp: '2m ago' },
  { id: '2', title: 'System Update', message: 'VIGILORA AI v2.4.1 has been deployed.', category: 'system', read: false, timestamp: '1h ago' },
  { id: '3', title: 'New Camera Added', category: 'update', message: 'Camera CAM-045 has been provisioned.', read: true, timestamp: '3h ago' },
];

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors relative outline-none"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 ring-2 ring-[#09090b]"></span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
          >
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              <div className="flex gap-2">
                <button onClick={markAllRead} className="text-[11px] text-muted-foreground hover:text-white transition-colors flex items-center gap-1" title="Mark all as read">
                  <Check size={12} /> Mark all read
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={cn(
                      "p-3 rounded-lg text-sm transition-colors relative group",
                      notification.read ? "bg-transparent text-muted-foreground" : "bg-white/5 text-white"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold">{notification.title}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{notification.timestamp}</span>
                    </div>
                    <p className="text-xs opacity-80 leading-relaxed pr-6">{notification.message}</p>
                    
                    {!notification.read && (
                      <button 
                        onClick={() => markAsRead(notification.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md bg-zinc-800 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700"
                        title="Mark as read"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-2 border-t border-white/5 bg-zinc-900/30">
                <button 
                  onClick={clearAll}
                  className="w-full py-1.5 text-xs text-muted-foreground hover:text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={12} /> Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
