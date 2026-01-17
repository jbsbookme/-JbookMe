'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;

        const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
        // Proactively check for updates so users get the latest build sooner.
        await registration.update();
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
