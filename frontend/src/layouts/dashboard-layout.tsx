import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { motion } from 'framer-motion';
import { ChatAssistant } from '@/components/layout/chat-assistant';

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background overflow-hidden relative">
      {/* Clean solid background */}

      {/* Sidebar - responsive and collapsible */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden relative z-10 w-full">
        {/* Header - includes search, notifications, and mobile toggle */}
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
