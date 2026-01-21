'use client';

import { useRouter } from 'next/navigation';
import { Button, type ButtonProps } from '@/components/ui/button';

type HistoryBackButtonProps = Omit<ButtonProps, 'onClick'> & {
  fallbackHref: string;
};

export function HistoryBackButton({ fallbackHref, ...buttonProps }: HistoryBackButtonProps) {
  const router = useRouter();

  const hideOnTouch =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(pointer: coarse)').matches || /Android/i.test(navigator.userAgent));

  if (hideOnTouch) return null;

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
