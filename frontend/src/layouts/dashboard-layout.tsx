import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { motion } from 'framer-motion';
import { ChatAssistant } from '@/components/layout/chat-assistant';

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen max-h-screen w-full bg-background overflow-hidden relative select-none">
      {/* Clean solid background */}

      {/* Sidebar - static, locked to viewport height */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area - independent internal vertical scroll */}
      <main className="flex-1 flex flex-col h-screen max-h-screen overflow-hidden relative z-10 w-full min-w-0">
        {/* Header - static at top */}
        <Header setMobileOpen={setMobileOpen} />
        
        {/* Global Demo Mode Banner */}
        <div className="w-full bg-cyan-950/60 border-b border-cyan-500/30 text-cyan-300 text-[11px] uppercase tracking-wider font-bold py-1.5 px-4 flex items-center justify-center gap-2 z-20 shadow-[0_0_15px_rgba(6,182,212,0.1)] backdrop-blur">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Simulation Mode Active: Platform is populated with live-action demo telemetry for feature demonstration.
        </div>
        
        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-[1600px] w-full"
          >
            <Outlet />
          </motion.div>
        </div>
      </main>

      {/* Floating Chat Assistant */}
      <ChatAssistant />
    </div>
  );
}
