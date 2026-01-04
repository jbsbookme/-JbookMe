'use client';

import { Home, Sparkles, Plus, MessageCircle, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useState, useEffect } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession() || {};
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Solo ocultar en páginas de auth y dashboards de admin/barbero
  if (pathname?.startsWith('/login') || 
      pathname?.startsWith('/registro') ||
      pathname?.startsWith('/auth') ||
      pathname?.startsWith('/dashboard/admin') ||
      pathname?.startsWith('/dashboard/barbero')) {
    return null;
  }

  if (!mounted) return null;

  const isAuthenticated = status === 'authenticated' && !!session;
  const authHrefFor = (callbackUrl: string) => `/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const navItems = [
    {
      name: t('nav.home'),
      icon: Home,
      href: isAuthenticated ? '/feed' : authHrefFor('/feed'),
      active: pathname === '/feed' || pathname === '/',
      isCreate: false
    },
    {
      name: t('nav.explore'),
      icon: Sparkles,
      href: '/galeria-genero',
      active: pathname === '/galeria-genero' || pathname === '/galeria',
      isCreate: false
    },
    {
      name: t('nav.post'),
      icon: Plus,
      href: isAuthenticated ? '/dashboard/cliente/publicar' : authHrefFor('/dashboard/cliente/publicar'),
      active: pathname === '/dashboard/cliente/publicar',
      isCreate: true
    },
    {
      name: t('nav.chat'),
      icon: MessageCircle,
      href: isAuthenticated ? '/inbox' : authHrefFor('/inbox'),
      active: pathname?.startsWith('/inbox') || false,
      isCreate: false
    },
    {
      name: t('nav.profile'),
      icon: User,
      href: isAuthenticated ? '/perfil' : authHrefFor('/perfil'),
      active: pathname === '/perfil' || pathname === '/dashboard/cliente',
      isCreate: false
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-gray-800 pb-safe">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active;
            
            // Special styling for create button
            if (item.isCreate && isAuthenticated) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex flex-col items-center justify-center flex-1 h-full"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-pink-500 flex items-center justify-center active:scale-110 transition-all duration-300 shadow-[0_0_25px_rgba(236,72,153,0.9)] animate-pulse">
                    <Icon className="w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]" strokeWidth={3} />
                  </div>
                </Link>
              );
            }
            
            // TODOS los botones: AZUL BAJITO normal, AMARILLO activo
            const colors = {
              normal: 'text-[#4dd0e1] drop-shadow-[0_0_6px_rgba(77,208,225,0.4)]',
              active: 'text-[#ffd700] drop-shadow-[0_0_15px_rgba(255,215,0,1)]'
            };
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full min-w-[60px] min-h-[60px]"
              >
                <div className={`flex flex-col items-center justify-center transition-all duration-300 active:scale-95 ${
                  isActive ? 'scale-125' : 'scale-100'
                }`}>
                  <Icon
                    className={`w-7 h-7 mb-1 transition-all duration-300 ${
                      isActive 
                        ? colors.active
                        : colors.normal
                    }`}
                  />
                  <span className={`text-xs font-bold transition-all duration-300 ${
                    isActive 
                      ? colors.active
                      : colors.normal
                  }`}>
                    {item.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}