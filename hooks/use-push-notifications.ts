import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getServiceWorkerRegistration() {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;

  return navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if push notifications are supported
    const checkSupport = () => {
      const supported =
        typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  useEffect(() => {
    // On mount, register SW and detect existing subscription
    if (!isSupported) return;

    let cancelled = false;
    (async () => {
      try {
        const reg = await getServiceWorkerRegistration();
        if (!reg) return;
        const existing = await reg.pushManager.getSubscription();
        if (!cancelled) {
          setIsSubscribed(!!existing);
        }
      } catch (error) {
        console.error('[PushNotifications] Error checking subscription:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSupported]);

  const subscribe = async () => {
    if (!isSupported) {
      toast.error('Notifications are not supported on this device');
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      toast.error('Notifications are not configured');
      return;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        toast.error('Permission is required to send notifications');
        return;
      }

      const reg = await getServiceWorkerRegistration();
      if (!reg) {
        toast.error('Service worker is not available');
        return;
      }

      const existing = await reg.pushManager.getSubscription();
      const subscription =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const json = subscription.toJSON();

      // Save subscription to backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Error saving subscription');
      }

      setIsSubscribed(true);
      toast.success('Notifications enabled!');
    } catch (error) {
      console.error('[PushNotifications] Error subscribing:', error);
      toast.error('Error enabling notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);

    try {
      const reg = await getServiceWorkerRegistration();
      const subscription = reg ? await reg.pushManager.getSubscription() : null;
      if (!subscription) {
        setIsSubscribed(false);
        return;
      }

      // Remove subscription from backend
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      if (!response.ok) {
        throw new Error('Error removing subscription');
      }

      await subscription.unsubscribe();

      setIsSubscribed(false);
      toast.success('Notifications disabled');
    } catch (error) {
      console.error('[PushNotifications] Error unsubscribing:', error);
      toast.error('Error disabling notifications');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  };
}
