import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, ChevronRight } from 'lucide-react';
import { GlobalSearch } from './global-search';
import { NotificationCenter } from './notification-center';
import { UserProfile } from './user-profile';

export function Header({ setMobileOpen }: { setMobileOpen: (open: boolean) => void }) {
  const location = useLocation();

  // Simple utility to format path into a readable title
  const getPageTitle = () => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' ');
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-30">
      
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-2 -ml-2 rounded-md hover:bg-white/5 text-muted-foreground transition-colors outline-none"
        >
          <Menu size={18} />
        </button>

        {/* Breadcrumb / Title */}
        <div className="hidden sm:flex items-center text-[13px] text-muted-foreground font-medium">
          <span className="hover:text-foreground cursor-pointer transition-colors">Acme Corp</span>
          <ChevronRight size={14} className="mx-2 opacity-50" />
          <span className="text-foreground">{getPageTitle()}</span>
        </div>
        
        {/* Mobile Title */}
        <div className="sm:hidden font-semibold text-foreground text-[15px]">
          {getPageTitle()}
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        
        {/* Global Search */}
        <GlobalSearch />

        {/* System Status */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-white/5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-medium text-muted-foreground">Connected</span>
        </div>

        {/* Actions & Profile */}
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <UserProfile />
        </div>
        
      </div>
    </header>
  );
}
