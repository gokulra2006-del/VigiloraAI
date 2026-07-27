import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User as UserIcon, Settings, Bell, Paintbrush, Shield, ChevronDown, UserCircle, Settings2, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

export function SidebarFooter({ isExpanded = true }: { isExpanded?: boolean }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const menuItems = [
    { icon: UserCircle, label: 'My Profile' },
    { icon: UserIcon, label: 'Account' },
    { icon: Settings2, label: 'Preferences' },
    { icon: Shield, label: 'Security' },
    { icon: Paintbrush, label: 'Theme' },
    { icon: HelpCircle, label: 'Help' },
  ];

  return (
    <div className="mt-auto pt-4 flex flex-col justify-center px-2 pb-4 relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={cn(
          "relative group cursor-pointer outline-none flex items-center transition-all duration-300 rounded-[10px] hover:bg-white/5 justify-between gap-2 p-2 w-full",
          !isExpanded && "justify-center p-1"
        )}
        title={!isExpanded ? user.username : undefined}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative shrink-0 mx-auto">
            <div className="w-[36px] h-[36px] rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-white text-[12px] font-semibold uppercase group-hover:border-white/20 transition-colors">
              {user.username.substring(0, 2)}
            </div>
            {/* Online Status Indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0B0B0F]" />
          </div>
          
          <div 
            className={cn(
              "flex flex-col text-left overflow-hidden whitespace-nowrap transition-all duration-300",
              !isExpanded && "w-0 opacity-0"
            )}
          >
            <span className="text-[14px] font-medium text-white capitalize leading-tight">{user.username}</span>
            <span className="text-[12px] text-zinc-500 capitalize leading-tight mt-0.5">{user.role === 'admin' ? 'System Administrator' : user.role}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="text-muted-foreground shrink-0">
            <ChevronDown size={16} className={cn("transition-transform duration-200", dropdownOpen && "rotate-180")} />
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full mb-2 bg-[#1C1C22] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden left-2 min-w-[200px]"
          >
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                className="w-full flex items-center gap-3 px-3 py-2 text-[14px] font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors outline-none text-left"
                onClick={() => setDropdownOpen(false)}
              >
                <item.icon size={16} className="shrink-0" />
                {item.label}
              </button>
            ))}
            <div className="h-[1px] bg-white/10 my-1.5 mx-2" />
            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-[14px] font-medium text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition-colors outline-none text-left"
            >
              <LogOut size={16} className="shrink-0" />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
