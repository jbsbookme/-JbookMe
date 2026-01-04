'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export function AssistantFAB() {
  return (
    <Link href="/asistente">
      <motion.div
        className="fixed bottom-36 right-5 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-[#00f0ff] via-[#0099ff] to-[#0066ff] shadow-xl shadow-[#00f0ff]/40 flex items-center justify-center cursor-pointer group hover:shadow-[#00f0ff]/60 transition-all duration-300"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: 'spring',
          stiffness: 260,
          damping: 20,
          delay: 0.3
        }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#0066ff] opacity-60 blur-lg group-hover:opacity-80 transition-opacity" />
        
        {/* Icon */}
        <Sparkles className="w-6 h-6 text-white relative z-10 drop-shadow-lg group-hover:rotate-12 transition-transform" />
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-black/90 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          AI Assistant
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
        </div>
      </motion.div>
    </Link>
  );
}
