import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

interface CollapseButtonProps {
  isExpanded: boolean;
  onClick: () => void;
}

export function CollapseButton({ isExpanded, onClick }: CollapseButtonProps) {
  return (
    <button
      onClick={onClick}
      className="hidden md:flex items-center justify-center w-[40px] h-[40px] rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer outline-none"
    >
      <motion.div
        animate={{ rotate: isExpanded ? 0 : 180 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <ChevronLeft size={20} />
      </motion.div>
    </button>
  );
}
