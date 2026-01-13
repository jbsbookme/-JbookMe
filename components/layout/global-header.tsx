'use client';

import { useSession } from 'next-auth/react';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Share2, Menu } from 'lucide-react';
import { NotificationsBell } from '@/components/notifications-bell';
import { LanguageSelector } from '@/components/language-selector';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n/i18n-context';

export function GlobalHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession() || {};
  const { user } = useUser();
  const { t } = useI18n();

  // Keep auth pages clean (no header overlay while logging in).
  if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/registro') ||
    pathname?.startsWith('/auth')
  ) {
    return null;
  }

  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const displayName = user?.name || session?.user?.name || '';
  const avatarUrl = session?.user?.image || user?.image || '';

  const getInitials = (name: string) => {
    const cleaned = name.trim().replace(/\s+/g, ' ');
    if (!cleaned) return 'U';
    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  };

  const authHrefFor = (callbackUrl: string) =>
    `/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const menuHref = isAuthenticated ? '/menu' : authHrefFor('/menu');

  const handleShare = async () => {
    try {
      const shareData = {
        title: 'JBookMe',
        text: t('common.shareText'),
        url: window.location.origin,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        toast.success(t('common.shareSuccess'));
        return;
      }

      await navigator.clipboard.writeText(window.location.origin);
      toast.success(t('common.linkCopied'));
    } catch (error: unknown) {
      const errorName =
        typeof error === 'object' && error !== null && 'name' in error
          ? String((error as { name?: unknown }).name)
          : '';

      if (errorName !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(window.location.origin);
          toast.success(t('common.linkCopied'));
        } catch {
          toast.error(t('common.shareError'));
        }
      }
    }
  };

  return (
    <header
      className="sticky top-0 z-50 w-full bg-black border-b border-gray-800"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container mx-auto flex h-11 sm:h-14 items-center justify-between px-4 max-w-7xl">
        <div className="flex items-center gap-2 min-w-0">
          <Image
            src="/logo.png"
            alt="JBookMe"
            width={28}
            height={28}
            priority
            className="h-5 w-5 sm:h-6 sm:w-6"
          />
          <span className="text-white font-semibold text-xs sm:text-sm truncate drop-shadow-[0_0_10px_rgba(255,215,0,0.35)]">
            JBookMe
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Header actions: Menu, Share, Notifications, Avatar, Logout */}
          <div className="hidden sm:block">
            <LanguageSelector />
          </div>

          <Button
            asChild
            type="button"
            variant="outline"
            size="sm"
            aria-label={t('nav.menu')}
            className="border-transparent bg-white/5 text-white hover:bg-white/10 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <a href={menuHref}>
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShare}
            aria-label={t('common.shareApp')}
            className="border-transparent bg-white/5 text-white hover:bg-white/10 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          <NotificationsBell />

          {isAuthenticated ? (
            <div className="ml-1 sm:ml-2 flex items-center">
              {avatarUrl ? (
                <div className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border border-white/10">
                  <Image
                    src={avatarUrl}
                    alt={displayName ? `${displayName} avatar` : 'User avatar'}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  aria-label={displayName ? `${displayName} initials` : 'User initials'}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/10 text-white flex items-center justify-center text-xs sm:text-sm font-bold"
                >
                  {getInitials(displayName)}
                </div>
              )}
            </div>
          ) : null}

        </div>
      </div>
    </header>
  );
}
