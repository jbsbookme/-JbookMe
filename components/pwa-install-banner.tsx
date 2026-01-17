'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>; 
};

const DISMISS_KEY = 'pwa-install-banner-dismissed-v1';

function isIos() {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    !!nav.standalone ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
  );
}

function wasDismissed() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(DISMISS_KEY) === '1';
}

function markDismissed() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // ignore
  }
}

export function PwaInstallBanner() {
  const pathname = usePathname();
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'android' | 'ios' | null>(null);

  const allowOnThisRoute = useMemo(() => {
    const path = pathname || '';
    if (path.startsWith('/dashboard')) return false;
    if (path.startsWith('/auth')) return false;
    if (path.startsWith('/login')) return false;
    if (path.startsWith('/registro')) return false;
    return true;
  }, [pathname]);

  useEffect(() => {
    if (!allowOnThisRoute) return;
    if (wasDismissed()) return;
    if (isStandaloneMode()) return;

    // iOS: no install prompt event. Show a simple hint.
    if (isIos()) {
      setMode('ios');
      setVisible(true);
    }

    const handler = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      event.preventDefault();
      deferredPromptRef.current = event;

      setMode('android');
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [allowOnThisRoute]);

  if (!allowOnThisRoute || !visible) return null;

  const onDismiss = () => {
    markDismissed();
    setVisible(false);
  };

  const onInstall = async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) {
      // iOS has no programmatic install.
      return;
    }

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        markDismissed();
        setVisible(false);
      }
    } catch {
      // If anything goes wrong, let the user dismiss.
    }
  };

  return (
    <div className="fixed left-0 right-0 top-[calc(env(safe-area-inset-top))] z-[60] px-3 pt-3">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-lg border border-gray-800 bg-black/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">Install JBookMe</div>
          {mode === 'ios' ? (
            <div className="text-xs text-gray-300">
              On iPhone: tap Share → Add to Home Screen.
            </div>
          ) : (
            <div className="text-xs text-gray-300">
              Get the app icon on your phone for faster booking.
            </div>
          )}
        </div>

        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          {mode === 'android' ? (
            <Button size="sm" onClick={onInstall} className="whitespace-nowrap">
              Install
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="whitespace-nowrap text-gray-300 hover:text-white"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
