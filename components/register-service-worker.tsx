'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;

        const existing = await navigator.serviceWorker.getRegistration('/');
        if (existing) return;

        await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      } catch (error) {
        if (!cancelled) {
          console.error('[PWA] Service worker registration failed:', error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
