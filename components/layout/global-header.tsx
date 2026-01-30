'use client';

import { useSession } from 'next-auth/react';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Share2, Menu, User as UserIcon, MessageCircle, LayoutDashboard, LogOut } from 'lucide-react';
import { NotificationsBell } from '@/components/notifications-bell';
import { LanguageSelector } from '@/components/language-selector';
import toast from 'react-hot-toast';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n/i18n-context';
import { sharePayload } from '@/lib/share';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession() || {};
  const { user } = useUser();
  const { t, language } = useI18n();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      setUserMenuOpen(false);
      await signOut({ redirect: false });
    } finally {
      // Hard navigation ensures all client state (session + cached UI) resets.
      window.location.assign('/');
    }
  };

  useEffect(() => {
    // Prefetch Home route to make header tap feel instant on mobile/PWA.
    try {
      router.prefetch('/inicio');
    } catch {
      // ignore
    }
  }, [router]);

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
  const avatarUrl = user?.image || session?.user?.image || '';
  const role = (session?.user as any)?.role || (user as any)?.role || '';
  const isAdmin = String(role).toUpperCase() === 'ADMIN';
  const isBarber = ['BARBER', 'STYLIST'].includes(String(role).toUpperCase());
  const dashboardHref = isAdmin ? '/dashboard/admin' : isBarber ? '/dashboard/barbero' : '/perfil';

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
      const url = window.location.href;
      const shareData = {
        title: typeof document !== 'undefined' ? document.title : 'JBookMe',
        url,
      };

      const shared = await sharePayload(shareData);
      if (shared) {
        toast.success(t('common.shareSuccess'));
        return;
      }

      // Desktop Safari often lacks Web Share. Show a visible fallback dialog.
      setShareDialogOpen(true);
      return;

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success(t('common.linkCopied'));
        return;
      }

      // Legacy copy fallback for Safari edge cases.
      try {
        const el = document.createElement('textarea');
        el.value = url;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.top = '0';
        el.style.left = '0';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        toast.success(t('common.linkCopied'));
        return;
      } catch {
        // ignore
      }

      setShareDialogOpen(true);
    } catch (error: unknown) {
      const errorName =
        typeof error === 'object' && error !== null && 'name' in error
          ? String((error as { name?: unknown }).name)
          : '';

      if (errorName !== 'AbortError') {
        setShareDialogOpen(true);
      }
    }
  };

  return (
    <header
      className="sticky top-0 z-50 w-full bg-black border-b border-gray-800"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container mx-auto flex h-11 sm:h-14 items-center justify-between px-4 max-w-7xl">
        <Link
          href="/inicio"
          prefetch
          className="flex items-center gap-2 min-w-0"
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
        </Link>
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
              <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={displayName ? `${displayName} menu` : language === 'es' ? 'Cuenta' : 'Account'}
                    className="rounded-full cursor-pointer touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/50"
                    onClick={(e) => {
                      // Radix PopoverTrigger toggles on click. In controlled mode,
                      // opening on pointerdown can result in an immediate close on click.
                      // Prevent Radix default toggle and manage it here.
                      e.preventDefault();
                      setUserMenuOpen((prev) => !prev);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setUserMenuOpen(true);
                    }}
                  >
                    {avatarUrl ? (
                      <div
                        className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border border-white/10"
                        style={{ WebkitTouchCallout: 'none' } as any}
                      >
                        <Image
                          src={avatarUrl}
                          alt={displayName ? `${displayName} avatar` : 'User avatar'}
                          fill
                          sizes="36px"
                          className="object-cover select-none pointer-events-none"
                          draggable={false}
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
                  </button>
                </PopoverTrigger>

                <PopoverContent align="end" className="w-56 p-2 bg-[#0b0b0b] border border-white/10 text-white z-[1000]">
                  <div className="px-2 py-1.5 text-sm font-semibold truncate">
                    {displayName || t('common.user')}
                  </div>
                  <div className="h-px bg-white/10 my-1" />

                  <button
                    type="button"
                    className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-white/5"
                    onClick={() => {
                      setUserMenuOpen(false);
                      router.push('/perfil');
                    }}
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>{t('nav.profile')}</span>
                  </button>

                  <button
                    type="button"
                    className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-white/5"
                    onClick={() => {
                      setUserMenuOpen(false);
                      router.push(dashboardHref);
                    }}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{isAdmin || isBarber ? t('nav.dashboard') : t('nav.profile')}</span>
                  </button>

                  <button
                    type="button"
                    className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-white/5"
                    onClick={() => {
                      setUserMenuOpen(false);
                      router.push('/inbox');
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{t('nav.inbox') || 'Inbox'}</span>
                  </button>

                  <div className="h-px bg-white/10 my-1" />

                  <button
                    type="button"
                    className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-red-300 hover:bg-white/5"
                    onClick={() => {
                      setUserMenuOpen(false);
                      void handleLogout();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t('common.logout') || 'Logout'}</span>
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          ) : null}

        </div>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="bg-[#0b0b0b] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{t('common.shareApp') || 'Share'}</DialogTitle>
            <DialogDescription className="text-gray-300">
              {language === 'es'
                ? 'Copia el enlace y compártelo donde quieras.'
                : 'Copy the link and share it anywhere.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Input readOnly value={typeof window !== 'undefined' ? window.location.href : ''} />
            <div className="text-xs text-gray-400">
              {language === 'es'
                ? 'En Safari computadora puede que no salga el share sheet.'
                : 'Desktop Safari may not show a share sheet.'}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              className="bg-[#00f0ff] text-black hover:bg-[#00d9e6]"
              onClick={() => {
                try {
                  const url = window.location.href;
                  if (navigator.clipboard?.writeText) {
                    void navigator.clipboard.writeText(url).then(() => toast.success(t('common.linkCopied')));
                  } else {
                    window.prompt(language === 'es' ? 'Copia este enlace:' : 'Copy this link:', url);
                  }
                } catch {
                  toast.error(t('common.shareError'));
                }
              }}
            >
              {language === 'es' ? 'Copiar enlace' : 'Copy link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
