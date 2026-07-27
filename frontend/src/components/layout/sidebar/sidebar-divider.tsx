import React from 'react';
import { motion } from 'framer-motion';

interface SidebarDividerProps {
  isExpanded?: boolean;
}

export function SidebarDivider({ isExpanded }: SidebarDividerProps) {
  // We remove the divider as per instructions "Remove unnecessary divider spacing" 
  // relying instead on the group margin-bottom for separation.
  return null;
}
