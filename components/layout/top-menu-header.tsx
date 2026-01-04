'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/i18n-context';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

export function TopMenuHeader() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { data: session, status } = useSession() || {};
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Match BottomNav visibility rules
  const isBarberDetailRoute =
    pathname?.startsWith('/barberos/') ||
    (!!pathname && /^\/[a-z]{2}\/barberos\//i.test(pathname));

  if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/registro') ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/asistente') ||
    isBarberDetailRoute ||
    pathname?.startsWith('/dashboard/admin') ||
    pathname?.startsWith('/dashboard/barbero')
  ) {
    return null;
  }

  if (!mounted) return null;

  const isAuthenticated = status === 'authenticated' && !!session;
  const authHrefFor = (callbackUrl: string) => `/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const menuHref = isAuthenticated ? '/menu' : authHrefFor('/menu');
  const dashboardHref = isAuthenticated ? '/dashboard' : authHrefFor('/dashboard');

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-7xl">
        <Link href={dashboardHref} className="flex items-center space-x-3">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden">
            <Image src="/logo.png" alt="JBookMe Logo" fill className="object-contain" priority />
          </div>
          <span className="text-xl font-bold">
            <span className="text-[#00f0ff]">JBook</span>
            <span className="text-[#ffd700]">Me</span>
          </span>
        </Link>

        <Link
          href={menuHref}
          aria-label={t('nav.menu')}
          className="inline-flex items-center text-[#4dd0e1] drop-shadow-[0_0_6px_rgba(77,208,225,0.4)] font-bold"
        >
          <Menu className="w-6 h-6" />
        </Link>
      </div>
    </header>
  );
}
