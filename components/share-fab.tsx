'use client';

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n/i18n-context';

export function ShareFAB() {
  const { t } = useI18n();

  const handleShare = async () => {
    const url = window.location.origin;
    const shareData = {
      url,
    };

    try {
      // Check if Web Share API is available
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success(t('common.shareSuccess'));
      } else {
        // Fallback: Copy link to clipboard
        await navigator.clipboard.writeText(url);
        toast.success(t('common.linkCopied'));
      }
    } catch (error: unknown) {
      const errorName =
        typeof error === 'object' && error !== null && 'name' in error
          ? String((error as { name?: unknown }).name)
          : '';

      // User cancelled or error occurred
      if (errorName !== 'AbortError') {
        console.error('Error sharing:', error);
        // Try clipboard as final fallback
        try {
          await navigator.clipboard.writeText(url);
          toast.success(t('common.linkCopied'));
        } catch {
          toast.error(t('common.shareError'));
        }
      }
    }
  };

  return (
    <motion.button
      onClick={handleShare}
      className="fixed bottom-24 right-5 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-[#00f0ff] via-[#00d0dd] to-[#ffd700] shadow-xl shadow-[#00f0ff]/30 flex items-center justify-center active:scale-95 transition-all duration-300"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: 0.5
      }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#ffd700] opacity-50 blur-md group-hover:opacity-70 transition-opacity" />
      
      {/* Icon */}
      <Share2 className="w-6 h-6 text-black relative z-10 drop-shadow-md transition-transform" />
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-black/90 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {t('common.shareApp')}
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
      </div>
    </motion.button>
  );
}
