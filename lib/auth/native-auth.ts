'use client';

import { Capacitor, CapacitorCookies } from '@capacitor/core';
import { getAuth, signOut as firebaseSignOut } from 'firebase/auth';
import { app as firebaseApp } from '@/lib/firebase';

const NATIVE_FIRST_CLEAR_KEY = 'native-auth-cleared-v1';

export function isNativeApp() {
  if (typeof window === 'undefined') return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function getRootDomain(hostname: string) {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  return parts.slice(parts.length - 2).join('.');
}

function expireCookie(name: string, domain?: string) {
  const base = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = domain ? `${base}; Domain=${domain}` : base;
}

export async function clearWebAuthStorage() {
  if (typeof window === 'undefined') return;

  // NextAuth + app cookies
  try {
    const cookieNames = document.cookie
      .split(';')
      .map((c) => c.trim().split('=')[0])
      .filter(Boolean);

    const hostname = window.location.hostname;
    const rootDomain = getRootDomain(hostname);

    cookieNames.forEach((name) => {
      expireCookie(name);
      expireCookie(name, hostname);
      if (rootDomain !== hostname) {
        expireCookie(name, `.${rootDomain}`);
      }
    });
  } catch {
    // ignore
  }

  try {
    await CapacitorCookies.clearAllCookies();
  } catch {
    // ignore
  }

  try {
    localStorage.clear();
  } catch {
    // ignore
  }

  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }

  try {
    if ('indexedDB' in window && 'databases' in indexedDB) {
      const dbs = await indexedDB.databases();
      await Promise.all(dbs.map((db) => (db.name ? indexedDB.deleteDatabase(db.name) : null)));
    }
  } catch {
    // ignore
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // ignore
  }

  try {
    if (firebaseApp) {
      const auth = getAuth(firebaseApp);
      await firebaseSignOut(auth);
    }
  } catch {
    // ignore
  }
}

export async function enforceNativeLoginGuard() {
  if (!isNativeApp()) return;

  const forceEveryLaunch = process.env.NEXT_PUBLIC_NATIVE_FORCE_LOGOUT === 'true';
  const hasCleared = localStorage.getItem(NATIVE_FIRST_CLEAR_KEY) === '1';

  if (!forceEveryLaunch && hasCleared) return;

  await clearWebAuthStorage();
  localStorage.setItem(NATIVE_FIRST_CLEAR_KEY, '1');

  const path = window.location.pathname || '/';
  const isAuthRoute = path.startsWith('/auth') || path.startsWith('/login') || path.startsWith('/registro');
  if (!isAuthRoute) {
    window.location.replace('/auth');
  }
}
