'use client';

import { useSession, signOut } from 'next-auth/react';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Share2, LogOut, User as UserIcon } from 'lucide-react';
import { NotificationsBell } from '@/components/notifications-bell';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';

export function GlobalHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession() || {};
  const { user } = useUser();

  // Keep auth pages clean (no header overlay while logging in).
  if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/registro') ||
    pathname?.startsWith('/auth')
  ) {
    return null;
  }

  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const userName = user?.name || session?.user?.name || '';

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

  return (
    <header
      className="sticky top-0 z-50 w-full bg-black border-b border-gray-800"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container mx-auto flex h-12 sm:h-16 items-center justify-end px-4 max-w-7xl">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Order (required): Share, Notifications, User name, Logout */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShare}
            aria-label="Share"
            className="border-transparent bg-white/5 text-white hover:bg-white/10 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          <NotificationsBell />

          <div className="ml-1 sm:ml-2 flex items-center gap-2 text-white min-w-0">
            {isAuthenticated ? (
              <>
                <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/80 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[220px]">
                  {userName || 'User'}
                </span>
              </>
            ) : null}
          </div>

          {isAuthenticated ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              aria-label="Logout"
              className="ml-1 border-transparent bg-white/5 text-white hover:bg-white/10 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
