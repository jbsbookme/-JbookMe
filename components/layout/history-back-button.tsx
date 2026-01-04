'use client';

import { useRouter } from 'next/navigation';
import { Button, type ButtonProps } from '@/components/ui/button';

type HistoryBackButtonProps = Omit<ButtonProps, 'onClick'> & {
  fallbackHref: string;
};

export function HistoryBackButton({ fallbackHref, ...buttonProps }: HistoryBackButtonProps) {
  const router = useRouter();

  return (
    <Button
      {...buttonProps}
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
    />
  );
}
