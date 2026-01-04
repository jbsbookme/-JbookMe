import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { toast } from 'sonner';

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
    // Listen for foreground messages
    if (messaging && isSubscribed) {
      try {
        const unsubscribe = onMessage(messaging, (payload) => {
          console.log('Foreground message received:', payload);
          
          if (payload.notification) {
            toast(payload.notification.title || 'Notification', {
              description: payload.notification.body,
            });
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('[PushNotifications] Error setting up message listener:', error);
      }
    }
  }, [isSubscribed]);

  const subscribe = async () => {
    if (!isSupported) {
      toast.error('Notifications are not supported on this device');
      return;
    }

    if (!messaging) {
      console.log('[PushNotifications] Messaging not available');
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

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (!token) {
        throw new Error('Unable to get FCM token');
      }

      // Save subscription to backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          endpoint: token, // Using FCM token as endpoint
          keys: {
            p256dh: token, // Placeholder for FCM
            auth: token, // Placeholder for FCM
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
    if (!messaging) {
      console.log('[PushNotifications] Messaging not available for unsubscribe');
      toast.error('Notifications are not configured');
      return;
    }

    setIsLoading(true);

    try {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      // Remove subscription from backend
      const response = await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: token,
        }),
      });

      if (!response.ok) {
        throw new Error('Error removing subscription');
      }

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
