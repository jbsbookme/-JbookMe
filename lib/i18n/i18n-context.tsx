'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from './translations';

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Get initial language from localStorage or default to English
function getInitialLanguage(): Language {
  // User requested English-only UI
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Default to English - will be updated in useEffect if saved preference exists
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  // Load saved language from localStorage on mount
  useEffect(() => {
    const saved = getInitialLanguage();
    setLanguageState(saved);
    setMounted(true);
  }, []);

  // Save language to localStorage when it changes
  const setLanguage = (_lang: Language) => {
    // User requested English-only UI
    setLanguageState('en');
    if (typeof window !== 'undefined') {
      localStorage.setItem('bookme-language', 'en');
    }
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
        {children}
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
