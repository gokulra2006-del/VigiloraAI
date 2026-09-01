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
