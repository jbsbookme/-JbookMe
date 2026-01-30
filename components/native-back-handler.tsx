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

    const handler = App.addListener('backButton', () => {
      const canGoBack = window.history.length > 1;
      if (canGoBack) {
        router.back();
        return;
      }

      // If no history, exit app (Android default behavior)
      App.exitApp();
    });

    return () => {
      handler.remove();
    };
  }, [router, pathname]);

  return null;
}
