'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function SessionProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <SessionProvider 
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      {children}
    </SessionProvider>
  );
}
