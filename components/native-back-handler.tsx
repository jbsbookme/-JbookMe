'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function NativeBackHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handler: Awaited<ReturnType<typeof App.addListener>> | null = null;

    App.addListener('backButton', () => {
      const canGoBack = window.history.length > 1;
      if (canGoBack) {
        router.back();
        return;
      }

      // If no history, exit app (Android default behavior)
      App.exitApp();
    }).then((listener) => {
      handler = listener;
    });

    return () => {
      handler?.remove();
      handler = null;
    };
  }, [router, pathname]);

  return null;
}
