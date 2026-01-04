'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, Users, ArrowLeft } from 'lucide-react';

export default function GaleriaGeneroPage() {
  const router = useRouter();

  const handleGenderSelect = (gender: 'MALE' | 'FEMALE') => {
    router.push(`/galeria?gender=${gender}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Back button */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.push('/feed');
            }
          }}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-[#00f0ff] transition-colors mb-8"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="sr-only">Back</span>
        </button>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Select a <span className="text-[#00f0ff] neon-text">Gallery</span>
          </h1>
          <p className="text-gray-400 text-lg">What style do you want to explore?</p>
        </motion.div>

        {/* Gender Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Male Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              onClick={() => handleGenderSelect('MALE')}
              className="group relative overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1e] border-2 border-[#00f0ff]/30 hover:border-[#00f0ff] cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,240,255,0.5)]"
            >
              <div className="p-8 flex flex-col items-center justify-center min-h-[250px]">
                <div className="w-20 h-20 rounded-full bg-[#00f0ff]/10 flex items-center justify-center mb-6 group-hover:bg-[#00f0ff]/20 transition-colors">
                  <User className="w-10 h-10 text-[#00f0ff]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#00f0ff] transition-colors">
                  Men&apos;s Cuts
                </h3>
                <p className="text-gray-400 text-center">
                  Modern and classic men&apos;s styles
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Female Gallery */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card
              onClick={() => handleGenderSelect('FEMALE')}
              className="group relative overflow-hidden bg-gradient-to-br from-[#2e1a2e] to-[#1e0f1e] border-2 border-pink-500/30 hover:border-pink-500 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,182,193,0.5)]"
            >
              <div className="p-8 flex flex-col items-center justify-center min-h-[250px]">
                <div className="w-20 h-20 rounded-full bg-pink-500/10 flex items-center justify-center mb-6 group-hover:bg-pink-500/20 transition-colors">
                  <Users className="w-10 h-10 text-pink-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">
                  Women&apos;s Cuts
                </h3>
                <p className="text-gray-400 text-center">
                  Elegant styles and trending looks
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* All Gallery Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8"
        >
          <Button
            variant="ghost"
            onClick={() => router.push('/galeria')}
            className="text-gray-400 hover:text-white"
          >
            View full gallery
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
