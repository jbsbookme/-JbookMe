'use client';

import { useEffect } from 'react';

function isRunningInCapacitor() {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
  };

  try {
    if (w.Capacitor?.isNativePlatform?.()) return true;
  } catch {
    // ignore
  }

  // Fallback heuristics for some builds.
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  return /Capacitor|WKWebView/i.test(ua);
}

export function RegisterServiceWorker() {
  useEffect(() => {
    let cancelled = false;
    const swVersion = process.env.NEXT_PUBLIC_SW_VERSION || 'local';
    const swUrl = `/service-worker.js?sw=${encodeURIComponent(swVersion)}`;

    (async () => {
      try {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;

        // In Capacitor, SW caching can easily cause "some changes show, others don't".
        // Prefer always-fresh network content in the native shell.
        if (isRunningInCapacitor()) {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
          } catch {
            // ignore
          }

          try {
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(
                keys
                  .filter((k) => k.startsWith('bookme-'))
                  .map((k) => caches.delete(k))
              );
            }
          } catch {
            // ignore
          }

          return;
        }

        const existing = await navigator.serviceWorker.getRegistration('/');
        const existingUrl = existing?.active?.scriptURL || existing?.installing?.scriptURL || '';
        if (existingUrl && !existingUrl.includes(`sw=${encodeURIComponent(swVersion)}`)) {
          try {
            await existing?.unregister();
          } catch {
            // ignore
          }
        }

        const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
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
