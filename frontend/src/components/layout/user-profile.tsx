import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, Palette, Shield, Key, ActivitySquare, LogOut, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';

export function UserProfile() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'My Profile', icon: User, path: '/settings?tab=profile' },
    { label: 'Settings', icon: Settings, path: '/settings' },
    { label: 'Appearance', icon: Palette, path: '/settings?tab=appearance' },
    { label: 'Security', icon: Shield, path: '/settings?tab=security' },
    { label: 'API Keys', icon: Key, path: '/settings?tab=api-keys' },
    { label: 'Activity Log', icon: ActivitySquare, path: '/settings?tab=activity' },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-colors outline-none"
      >
        <div className="h-8 w-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User size={16} className="text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-64 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
          >
            {/* User Info Header */}
            <div className="p-4 border-b border-white/5 bg-zinc-900/50 flex items-center gap-3">
              <div className="relative group">
                <div className="h-12 w-12 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-muted-foreground" />
                  )}
                </div>
                {/* Upload Overlay */}
                <div 
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} className="text-white" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{user?.username || 'Administrator'}</span>
                <span className="text-xs text-muted-foreground">{user?.role || 'Super Admin'}</span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2 space-y-0.5">
              {navItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    navigate(item.path);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Logout */}
            <div className="p-2 border-t border-white/5 bg-zinc-900/30">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors text-left"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
