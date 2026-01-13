'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from './translations';

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'bookme-language';

function readSavedLanguage(): Language | null {
  if (typeof window === 'undefined') return null;
  const raw = (localStorage.getItem(LANGUAGE_STORAGE_KEY) || '').trim();
  return raw === 'es' || raw === 'en' ? raw : null;
}

function persistLanguage(lang: Language) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore
  }

  // Optional: cookie for simple persistence across tabs.
  // Not used server-side in this app, but harmless and sometimes handy.
  try {
    const maxAgeSeconds = 60 * 60 * 24 * 365;
    document.cookie = `${LANGUAGE_STORAGE_KEY}=${encodeURIComponent(lang)}; path=/; max-age=${maxAgeSeconds}`;
  } catch {
    // ignore
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Default to English; we only switch if the user explicitly chose Spanish before.
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  // Load saved language from localStorage on mount
  useEffect(() => {
    const saved = readSavedLanguage();
    if (saved) setLanguageState(saved);
    setMounted(true);
  }, []);

  // Keep <html lang="..."> in sync for accessibility.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    persistLanguage(lang);
  };

  // Translation function with fallback support
  const t = (key: string): string => {
    try {
      const keys = key.split('.');
      let value: unknown = translations[language];

      // Navigate through nested keys
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          // Fallback to English if key not found
          value = translations.en;
          for (const fallbackKey of keys) {
            if (value && typeof value === 'object' && fallbackKey in value) {
              value = (value as Record<string, unknown>)[fallbackKey];
            } else {
              console.warn(`Translation key not found: ${key}`);
              return key; // Return key itself if not found
            }
          }
          return typeof value === 'string' ? value : key;
        }
      }

      return typeof value === 'string' ? value : key;
    } catch (error) {
      console.error(`Translation error for key: ${key}`, error);
      return key;
    }
  };

  // Avoid hydration mismatch by showing nothing until mounted
  if (!mounted) {
    return (
      <I18nContext.Provider value={{ language: 'en', setLanguage, t }}>
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
