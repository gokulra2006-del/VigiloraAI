import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, ChevronLeft, ChevronRight } from 'lucide-react';
import { sidebarSections } from '@/config/sidebar';
import { SidebarItem } from './sidebar-item';
import { SidebarGroup } from './sidebar-group';
import { SidebarFooter } from './sidebar-footer';
import { SidebarDivider } from './sidebar-divider';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar_expanded');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_expanded', String(isExpanded));
  }, [isExpanded]);
  
  const SidebarContent = () => (
    <div className="flex flex-col h-full py-5 px-3 relative">
      {/* Header section (Branding) */}
      <div className="flex items-center shrink-0 mb-8 h-[44px] px-2">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-[12px] whitespace-nowrap w-full text-left outline-none"
        >
          {isExpanded ? (
            <>
              <div className="flex-shrink-0 w-[36px] h-[36px] flex items-center justify-center bg-zinc-900 rounded-[10px] border border-white/10 shadow-sm transition-transform hover:scale-105">
                <BrainCircuit size={22} className="text-white" />
              </div>
              <span className="text-[17px] font-semibold text-white tracking-tight">
                SentinelVision
              </span>
            </>
          ) : (
            <div className="flex-shrink-0 w-[36px] h-[36px] flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-[10px] border border-white/10 shadow-sm transition-colors mx-auto">
              <ChevronRight size={20} className="text-white" />
            </div>
          )}
        </button>

        {/* Mobile Close Button (only visible on mobile overlay) */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setMobileOpen(false);
          }}
          className="md:hidden ml-auto flex items-center justify-center w-[40px] h-[40px] rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer outline-none shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="flex flex-col overflow-y-auto overflow-x-hidden scrollbar-none mb-auto">
        {sidebarSections.map((section, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <SidebarDivider />}
            <SidebarGroup title={section.title} isExpanded={isExpanded}>
              {section.items.map((item) => (
                <SidebarItem 
                  key={item.path} 
                  item={item} 
                  isExpanded={isExpanded}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </SidebarGroup>
          </React.Fragment>
        ))}
      </div>
      
      <SidebarFooter isExpanded={isExpanded} />
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside
        className="hidden md:flex flex-col h-screen shrink-0 z-40 sticky top-0 bg-[#0B0B0F] border-r border-[rgba(255,255,255,0.08)] rounded-r-[16px] relative transition-all duration-300"
        style={{ width: isExpanded ? '270px' : '72px' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 w-[270px] flex flex-col z-50 md:hidden shadow-2xl bg-[#0B0B0F] border-r border-[rgba(255,255,255,0.08)] rounded-r-[16px]"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
