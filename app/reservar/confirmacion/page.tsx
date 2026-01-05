'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConfirmacionReservaPage() {
  const params = useSearchParams();
  const router = useRouter();

  const barber = params.get('barber');
  const service = params.get('service');
  const date = params.get('date');
  const time = params.get('time');
  const price = params.get('price');

  const shopName = "JB's Barbershop";

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-gradient-to-br from-[#00f0ff]/10 to-[#ffd700]/10 border border-[#00f0ff]/30 rounded-2xl p-8 text-center shadow-[0_0_40px_rgba(0,240,255,0.25)]">
        
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-20 h-20 text-[#ffd700] drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">
          Appointment confirmed
        </h1>

        {/* Message */}
        <p className="text-gray-300 mb-6">
          Thank you for booking with{' '}
          <span className="text-[#00f0ff] font-semibold">{shopName}</span>.
        </p>

        {/* Summary */}
        <div className="bg-black/40 border border-gray-700 rounded-xl p-5 text-left text-gray-200 space-y-2 mb-6">
          <p><strong>Professional:</strong> {barber}</p>
          <p><strong>Service:</strong> {service}</p>
          <p><strong>Date:</strong> {date}</p>
          <p><strong>Time:</strong> {time}</p>
          <p><strong>Price:</strong> <span className="text-[#ffd700] font-semibold">${price}</span></p>
        </div>

        {/* Button */}
        <Button
          onClick={() => {
            router.replace('/perfil');
          }}
          className="w-full bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-bold py-3 text-lg hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all"
        >
          Go to profile
        </Button>
      </div>
    </div>
  );
}
