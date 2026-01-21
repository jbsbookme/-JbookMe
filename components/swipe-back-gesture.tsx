'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

function isStandaloneDisplayMode(): boolean {
  try {
    // iOS Safari
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navAny = navigator as any;
    if (typeof navAny?.standalone === 'boolean') return navAny.standalone;
    return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  } catch {
    return false;
  }
}

function isAndroid(): boolean {
  try {
    return /Android/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

function isCapacitorNative(): boolean {
  try {
    // Capacitor injects a global "Capacitor" object in native builds.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    return Boolean(w?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

function isCoarsePointer(): boolean {
  try {
    return window.matchMedia?.('(pointer: coarse)').matches ?? false;
  } catch {
    return false;
  }
}

function isInOptOutZone(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('[data-swipeback-ignore], [data-swipeback="ignore"]'));
}

function hasHorizontalScrollableParent(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  let el: HTMLElement | null = target;
  while (el && el !== document.body) {
    try {
      const style = window.getComputedStyle(el);
      const overflowX = style.overflowX;
      const canScrollX = overflowX === 'auto' || overflowX === 'scroll';
      if (canScrollX && el.scrollWidth > el.clientWidth + 2) return true;
    } catch {
      // ignore
    }
    el = el.parentElement;
  }

  return false;
}

function hideBackArrowControlsOnTouch() {
  if (!isCoarsePointer()) return;

  const candidates = Array.from(document.querySelectorAll('a, button'));
  for (const el of candidates) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.hasAttribute('data-back-arrow-keep')) continue;

    // Only target controls that visually look like an icon-only "back" arrow.
    const hasLeftArrowIcon = Boolean(el.querySelector('svg.lucide-arrow-left'));
    if (!hasLeftArrowIcon) continue;

    const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
    const isExplicitBack = aria === 'back' || aria === 'volver' || aria === 'atrás' || aria === 'atras';

    // If it has any real text, don't hide (e.g. carousel "Previous slide" uses sr-only text).
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    const looksIconOnly = text.length === 0;

    if (!isExplicitBack && !looksIconOnly) continue;

    // Mark so we don't waste time re-hiding.
    if (el.getAttribute('data-back-arrow-hidden') === 'true') continue;
    el.setAttribute('data-back-arrow-hidden', 'true');
    el.style.display = 'none';
  }
}

function resolveFallbackHref(pathname: string): string {
  if (pathname.startsWith('/barberos/')) return '/barberos';
  if (pathname.startsWith('/dashboard')) return '/dashboard/cliente';
  if (pathname.startsWith('/menu')) return '/inicio';
  return '/inicio';
}

export function SwipeBackGesture() {
  const router = useRouter();
  const pathname = usePathname() || '/';

  useEffect(() => {
    // Enable for touch devices. We prioritize Android + native/standalone where
    // the OS/browser gesture is often missing.
    const shouldEnable = isCoarsePointer() && (isStandaloneDisplayMode() || isAndroid() || isCapacitorNative());
    if (!shouldEnable) return;

    const EDGE_PX = 24;
    const TRIGGER_DX = 80;
    const MAX_DY = 40;

    let tracking = false;
    let startX = 0;
    let startY = 0;
    let triggered = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (isEditableTarget(e.target)) return;
      if (isInOptOutZone(e.target)) return;
      if (hasHorizontalScrollableParent(e.target)) return;

      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      triggered = false;
      tracking = startX <= EDGE_PX;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking || triggered) return;
      if (e.touches.length !== 1) return;

      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      // Cancel if it looks like vertical scrolling.
      if (Math.abs(dy) > MAX_DY) {
        tracking = false;
        return;
      }

      if (dx > TRIGGER_DX) {
        triggered = true;
        tracking = false;

        // Router back relies on history. If there's no history entry (deep link),
        // fall back to a sensible page.
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(resolveFallbackHref(pathname));
        }
      }
    };

    const onTouchEnd = () => {
      tracking = false;
      triggered = false;
    };

    // Passive listeners to avoid blocking scroll performance.
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [router, pathname]);

  useEffect(() => {
    // Hide leftover icon-only back arrows across pages (mobile/touch).
    hideBackArrowControlsOnTouch();

    // Pages can render after hydration; observe briefly.
    const observer = new MutationObserver(() => hideBackArrowControlsOnTouch());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
