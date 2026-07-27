import React from 'react';
import { motion } from 'framer-motion';

interface SidebarGroupProps {
  title: string;
  isExpanded?: boolean;
  children: React.ReactNode;
}

export function SidebarGroup({ title, isExpanded = true, children }: SidebarGroupProps) {
  return (
    <div className="flex flex-col gap-1 mb-1">
      {children}
    </div>
  );
}
