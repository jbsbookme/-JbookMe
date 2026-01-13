'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PromotionsCarousel() {
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      discount: string | null;
      startDate: string;
      endDate: string;
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/promotions', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && res.ok && data?.promotions) {
          setPromotions(Array.isArray(data.promotions) ? data.promotions : []);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (promotions.length === 0) return null;

  const promo = promotions[0];
  const title = promo.discount ? `${promo.title} · ${promo.discount}` : promo.title;

  return (
    <div className="mt-10 max-w-6xl mx-auto">
      <Card className="bg-gradient-to-r from-[#00f0ff]/10 to-[#ffd700]/10 border border-[#00f0ff]/20">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-[#00f0ff] font-semibold">
              Promoción activa
            </p>
            <h3 className="text-white font-bold text-lg truncate">{title}</h3>
            <p className="text-gray-300 text-sm mt-1 line-clamp-2">{promo.message}</p>
          </div>

          <div className="flex gap-2 shrink-0">
            <Link href="/reservar">
              <Button className="bg-gradient-to-r from-[#00f0ff] to-[#00a8cc] hover:opacity-90 text-black font-semibold">
                Book
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
