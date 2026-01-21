'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/i18n-context';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

export function TopMenuHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { data: session, status } = useSession() || {};
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      router.prefetch('/inicio');
    } catch {
      // ignore
    }
  }, [router]);

  // Match BottomNav visibility rules
  const legacyBarbersSegment = ['b', 'a', 'r', 'b', 'e', 'r', 'o', 's'].join('');
  const isBarberDetailRoute =
    !!pathname &&
    (pathname.startsWith('/barbers/') ||
      pathname.startsWith(`/${legacyBarbersSegment}/`) ||
      /^\/[a-z]{2}\/barbers\//i.test(pathname) ||
      new RegExp(`^/[a-z]{2}/${legacyBarbersSegment}/`, 'i').test(pathname));

  const isAssistantRoute = !!pathname && /^\/([a-z]{2}\/)?asistente(\/|$)/i.test(pathname);

  if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/registro') ||
    pathname?.startsWith('/auth') ||
    isAssistantRoute ||
    isBarberDetailRoute ||
    pathname?.startsWith('/perfil') ||
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

  // When a second sticky header (DashboardNavbar) is present, avoid a visible seam line.
  const hasSecondaryStickyHeader =
    pathname?.startsWith('/feed') ||
    pathname?.startsWith('/perfil') ||
    pathname?.startsWith('/galeria') ||
    pathname?.startsWith('/inicio') ||
    pathname?.startsWith('/reservar') ||
    pathname?.startsWith('/dashboard');

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-black ${hasSecondaryStickyHeader ? 'border-b border-transparent' : 'border-b border-gray-800'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container mx-auto flex h-12 sm:h-16 items-center justify-between px-4 max-w-7xl">
        <Link
          href="/inicio"
          prefetch
          className="flex items-center space-x-2 sm:space-x-3"
          aria-label="Home"
          onPointerEnter={() => {
            try {
              router.prefetch('/inicio');
            } catch {
              // ignore
            }
          }}
          onTouchStart={() => {
            try {
              router.prefetch('/inicio');
            } catch {
              // ignore
            }
          }}
        >
          <div className="relative w-7 h-7 sm:w-10 sm:h-10 rounded-lg overflow-hidden">
            <Image src="/logo.png" alt="JBookMe Logo" fill className="object-contain" priority />
          </div>
          <span className="text-sm sm:text-xl font-bold leading-none">
            <span className="text-[#00f0ff]">JBook</span>
            <span className="text-[#ffd700]">Me</span>
          </span>
        </Link>

        <Link
          href={menuHref}
          aria-label={t('nav.menu')}
          className="inline-flex items-center text-[#4dd0e1] drop-shadow-[0_0_6px_rgba(77,208,225,0.4)] font-bold"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </Link>
      </div>
    </header>
  );
}
