'use client';

import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { messaging } from '@/lib/firebase';

export function PushNotificationButton() {
  const [mounted, setMounted] = useState(false);
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } =
    usePushNotifications();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render if not mounted, not supported, or Firebase messaging is not available
  if (!mounted || !isSupported || !messaging) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading || permission === 'denied'}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4 fill-[#00f0ff] text-[#00f0ff]" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {isSubscribed ? 'Notifications On' : 'Enable Notifications'}
      </span>
    </Button>
  );
}
