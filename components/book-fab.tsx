'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export function BookFAB() {
  const router = useRouter();

  const handleBooking = () => {
    // Redirect to booking flow
    router.push('/reservar');
  };

  return (
    <motion.button
      onClick={handleBooking}
      className="fixed z-[60] rounded-full bg-gradient-to-b from-[#00f0ff] via-[#00d0dd] to-[#ffd700] shadow-lg shadow-[#00f0ff]/20 flex items-center justify-center transition-all duration-300 hover:shadow-xl hover:shadow-[#00f0ff]/40"
      style={{
        width: '46px',
        height: '104px',
        right: '-12px',
        top: '58%',
        transform: 'translateY(-50%)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: 0.3,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Book appointment"
    >
      <span className="flex flex-col-reverse items-center justify-center text-black font-black text-base select-none leading-none">
        {['B', 'O', 'O', 'K'].map((ch, idx) => (
          <span key={`${ch}-${idx}`} className={idx === 0 ? '' : 'mt-1'}>
            {ch}
          </span>
        ))}
      </span>
    </motion.button>
  );
}
