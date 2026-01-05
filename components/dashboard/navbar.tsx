'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Calendar, LogOut, Share2, User, Sparkles } from 'lucide-react';
import { NotificationsBell } from '@/components/notifications-bell';
import { LanguageSelector } from '@/components/language-selector';
import { useI18n } from '@/lib/i18n/i18n-context';
import { usePathname } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { toast } from 'sonner';

type Props = {
  showQuickBook?: boolean;
};

export function DashboardNavbar({ showQuickBook = false }: Props) {
  const { data: session } = useSession() || {};
  const pathname = usePathname();
  const { user } = useUser();
  useI18n();

  // If the global top header is visible, offset this navbar below it.
  const isTopHeaderHidden =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/registro') ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/perfil') ||
    pathname?.startsWith('/dashboard/admin') ||
    pathname?.startsWith('/dashboard/barbero');

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: 'JBookMe',
        text: 'Book your appointment on JBookMe.',
        url: window.location.origin,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Shared');
        return;
      }

      await navigator.clipboard.writeText(window.location.origin);
      toast.success('Link copied');
    } catch (error: unknown) {
      const errorName =
        typeof error === 'object' && error !== null && 'name' in error
          ? String((error as { name?: unknown }).name)
          : '';

      if (errorName !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(window.location.origin);
          toast.success('Link copied');
        } catch {
          toast.error('Unable to share');
        }
      }
    }
  };

  // TopMenuHeader includes safe-area padding; match it here to avoid 1px seams on iOS.
  const topClass = isTopHeaderHidden
    ? 'top-0'
    : 'top-[calc(3.5rem+env(safe-area-inset-top))] sm:top-[calc(4rem+env(safe-area-inset-top))]';

  return (
    <nav
      className={`sticky ${topClass} z-50 w-full border-b border-gray-800 bg-black`}
      style={isTopHeaderHidden ? { paddingTop: 'env(safe-area-inset-top)' } : undefined}
    >
      <div className="container mx-auto flex h-16 items-center justify-end px-4 max-w-7xl">
        <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
          {showQuickBook ? (
            <Link href="/reservar" aria-label="Book">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff] hover:bg-[#00f0ff]/15 hover:border-[#00f0ff]/40 shadow-[0_0_10px_rgba(0,240,255,0.18)] inline-flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#00f0ff]" />
                <span className="text-[11px] font-semibold tracking-wide">BOOK</span>
              </Button>
            </Link>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShare}
            aria-label="Share"
            className="border-transparent bg-white/5 text-white hover:bg-white/10 hover:text-white h-8 w-8 p-0"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <NotificationsBell />
          <LanguageSelector />
          <div className="hidden sm:flex items-center space-x-2 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">
            {(user?.image || session?.user?.image) ? (
              <div className="relative w-7 h-7 rounded-full overflow-hidden border border-white/20">
                <Image
                  src={user?.image || session?.user?.image || ''}
                  alt={(user?.name || session?.user?.name) ? `${user?.name || session?.user?.name} profile photo` : 'Profile photo'}
                  fill
                  className="object-cover"
                  sizes="28px"
                />
              </div>
            ) : (
              <User className="w-5 h-5" />
            )}
            <span className="text-sm">{user?.name || session?.user?.name || 'User'}</span>
          </div>
          <Link href="/asistente">
            <Button
              variant="outline"
              size="sm"
              className="border-transparent bg-gradient-to-r from-[#00f0ff] via-[#9945ff] to-[#00f0ff] text-white hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(0,240,255,0.8)] h-8 w-8 p-0"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_0_8px_rgba(255,255,255,1)]" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="ml-1 border-transparent bg-gradient-to-r from-red-500 via-orange-500 to-red-500 text-white hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(255,0,0,0.8)] h-8 w-8 p-0"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_0_8px_rgba(255,255,255,1)]" />
          </Button>
        </div>
      </div>
    </nav>
  );
}