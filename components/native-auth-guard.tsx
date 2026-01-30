'use client';

import { useEffect } from 'react';
import { enforceNativeLoginGuard } from '@/lib/auth/native-auth';

export function NativeAuthGuard() {
  useEffect(() => {
    enforceNativeLoginGuard();
  }, []);

  return null;
}
