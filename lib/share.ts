'use client';

import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
};

export async function sharePayload(payload: SharePayload): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share(payload);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      await (navigator as Navigator & { share?: (data: SharePayload) => Promise<void> }).share?.(payload);
      return true;
    }
  } catch {
    // fall through
  }

  return false;
}
