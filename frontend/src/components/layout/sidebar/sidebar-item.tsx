import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SidebarItemConfig } from '@/config/sidebar';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  item: SidebarItemConfig;
  isExpanded?: boolean;
  onNavigate?: () => void;
}

export function SidebarItem({ item, isExpanded = true, onNavigate }: SidebarItemProps) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(item.path);

  return (
    <div className="relative group flex w-full justify-start px-2">
      <Link
        to={item.path}
        onClick={onNavigate}
        className={cn(
          "relative flex items-center h-[44px] rounded-[10px] transition-all duration-300 cursor-pointer outline-none w-full gap-[12px]",
          isExpanded ? "px-[12px]" : "justify-center px-0",
          isActive 
            ? "bg-white/10 text-white shadow-sm" 
            : "text-white/60 hover:bg-white/5 hover:text-white"
        )}
        title={!isExpanded ? item.label : undefined}
      >
        <div className="flex items-center justify-center shrink-0 w-[24px] h-[24px]">
          <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-300" />
        </div>
        
        <span 
          className={cn(
            "text-[14px] font-medium tracking-wide whitespace-nowrap transition-all duration-300",
            !isExpanded && "w-0 opacity-0 overflow-hidden"
          )}
        >
          {item.label}
        </span>
      </Link>
    </div>
  );
}
